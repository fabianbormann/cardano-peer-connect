import type { DataConnection } from 'peerjs';
import { Logger } from './Logger';

type RpcHandler = (
  address: string,
  args: any,
  callback: (result: any) => void
) => void;

interface RpcRequest {
  _rpcId: string;
  _method: string;
  _args: any;
}

interface RpcResponse {
  _rpcId: string;
  _result: any;
}

/**
 * Thin RPC layer over a PeerJS DataConnection.
 *
 * Mirrors the meerkat .register() / .rpc() API so the rest of the codebase
 * can be ported with minimal changes:
 *
 *   meerkat.register(method, handler)  →  rpc.register(method, handler)
 *   meerkat.rpc(addr, method, args, cb) →  rpc.call(method, args, cb)
 *
 * Wire format (sent as JSON string):
 *   Request  { _rpcId, _method, _args }
 *   Response { _rpcId, _result }
 */
export class PeerRpc {
  private handlers = new Map<string, RpcHandler>();
  private pending = new Map<
    string,
    { callback: (result: any) => void; timer: ReturnType<typeof setTimeout> }
  >();

  private conn: DataConnection;
  private logger: Logger;
  private timeoutMs: number;

  constructor(conn: DataConnection, logger: Logger, timeoutMs = 30_000) {
    this.conn = conn;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
  }

  get peerId(): string {
    return this.conn.peer;
  }

  register(method: string, handler: RpcHandler): void {
    this.handlers.set(method, handler);
  }

  call(method: string, args: any, callback: (result: any) => void): void {
    const rpcId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const timer = setTimeout(() => {
      this.pending.delete(rpcId);
      this.logger.warn(`PeerRpc: call '${method}' timed out`);
      callback({ error: 'timeout' });
    }, this.timeoutMs);

    this.pending.set(rpcId, { callback, timer });
    this.send({ _rpcId: rpcId, _method: method, _args: args });
  }

  onData(raw: unknown): void {
    let data: any;
    try {
      data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      this.logger.warn('PeerRpc: failed to parse incoming message');
      return;
    }

    if (typeof data._method === 'string') {
      const handler = this.handlers.get(data._method);
      if (!handler) {
        this.logger.warn(`PeerRpc: no handler registered for '${data._method}'`);
        return;
      }
      handler(this.conn.peer, data._args, (result: any) => {
        this.send({ _rpcId: data._rpcId, _result: result });
      });
      return;
    }

    if (typeof data._rpcId === 'string' && '_result' in data) {
      const entry = this.pending.get(data._rpcId);
      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(data._rpcId);
        entry.callback(data._result);
      }
    }
  }

  private send(payload: RpcRequest | RpcResponse): void {
    try {
      this.conn.send(JSON.stringify(payload));
    } catch (e) {
      this.logger.error('PeerRpc: failed to send message', e);
    }
  }

  destroy(): void {
    for (const { timer } of this.pending.values()) {
      clearTimeout(timer);
    }
    this.pending.clear();
    this.handlers.clear();
  }
}
