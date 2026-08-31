import type { DataConnection } from 'peerjs';
import { Logger } from './Logger';

type RpcHandler = (
  address: string,
  args: any,
  callback: (result: any) => void,
  error?: (err: any) => void
) => void;

interface RpcRequest {
  _rpcId: string;
  _method: string;
  _args: any;
}

interface RpcResponse {
  _rpcId: string;
  _result?: any;
  _error?: any;
}

export interface RpcCallOptions {
  /** Per-call timeout in ms. 0 disables the timeout. Defaults to the instance timeout (30s). */
  timeoutMs?: number;
  /** Invoked when the remote side sends an _error frame or the call times out. */
  onError?: (error: any) => void;
}

/** Normalize a thrown value into a JSON-safe RPC error payload (CIP-30 error objects pass through verbatim). */
export function toRpcError(e: unknown): any {
  if (e && typeof e === 'object' && !(e instanceof Error)) {
    try {
      return JSON.parse(JSON.stringify(e));
    } catch (_) {
      /* fall through */
    }
  }
  if (e instanceof Error) return { code: -2, info: e.message };
  return { code: -2, info: String(e) };
}

export class PeerRpc {
  private handlers = new Map<string, RpcHandler>();
  private pending = new Map<
    string,
    {
      callback: (result: any) => void;
      onError?: (error: any) => void;
      timer: ReturnType<typeof setTimeout> | null;
    }
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

  call(
    method: string,
    args: any,
    callback: (result: any) => void,
    options: RpcCallOptions = {}
  ): void {
    const rpcId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        this.pending.delete(rpcId);
        this.logger.warn(`PeerRpc: call '${method}' timed out`);
        if (options.onError) {
          options.onError({ code: -2, info: `PeerRpc: call '${method}' timed out` });
        } else {
          callback({ error: 'timeout' });
        }
      }, timeoutMs);
    }

    this.pending.set(rpcId, { callback, onError: options.onError, timer });
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
      handler(
        this.conn.peer,
        data._args,
        (result: any) => {
          this.send({ _rpcId: data._rpcId, _result: result === undefined ? null : result });
        },
        (err: any) => {
          this.send({ _rpcId: data._rpcId, _error: err === undefined ? null : err });
        }
      );
      return;
    }

    if (typeof data._rpcId === 'string' && ('_result' in data || '_error' in data)) {
      const entry = this.pending.get(data._rpcId);
      if (entry) {
        if (entry.timer) clearTimeout(entry.timer);
        this.pending.delete(data._rpcId);
        if ('_error' in data) {
          if (entry.onError) entry.onError(data._error);
          else entry.callback({ error: data._error });
        } else {
          entry.callback(data._result);
        }
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
    for (const entry of this.pending.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      if (entry.onError) {
        entry.onError({ code: -2, info: 'PeerRpc: connection closed' });
      } else {
        entry.callback({ error: 'connection closed' });
      }
    }
    this.pending.clear();
    this.handlers.clear();
  }
}
