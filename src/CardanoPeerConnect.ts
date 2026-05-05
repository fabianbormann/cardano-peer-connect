import Peer from 'peerjs';
import type { DataConnection, PeerOptions } from 'peerjs';
import type {
  Cip30Function,
  Cbor,
  Paginate,
  Bytes,
  Cip30DataSignature,
  IConnectMessage,
  IWalletInfo,
} from './types';
import {
  Value,
  ExperimentalContainer,
  createTypeMapping,
  serializeTypeMapping,
  registerExperimentalEndpoint,
} from './lib/ExperimentalContainer';
import { LogLevel, Logger } from './lib/Logger';
import AutoConnectHelper from './lib/AutoConnectHelper';
import PeerConnectIdenticon from './lib/PeerConnectIdenticon';
import { PeerRpc } from './lib/PeerRpc';
import { getPersistentId } from './lib/PeerIdHelper';

export default abstract class CardanoPeerConnect {
  protected walletInfo: IWalletInfo;
  protected onConnect: (connectMessage: IConnectMessage) => void;
  protected onDisconnect: (connectMessage: IConnectMessage) => void;
  protected onServerShutdown: (connectMessage: IConnectMessage) => void;
  protected onApiInject: (connectMessage: IConnectMessage) => void;
  protected identicon: string | null = null;
  protected logLevel: LogLevel = 'info';
  protected logger: Logger;

  protected walletPeer: Peer | null = null;
  protected discoveryPeer: Peer | null = null;
  protected activeConn: DataConnection | null = null;
  protected activeRpc: PeerRpc | null = null;
  protected dappIdentifier: string | null = null;

  // https://cips.cardano.org/cips/cip30/
  protected cip30Functions: Array<Cip30Function> = [
    'getNetworkId',
    'getUtxos',
    'getCollateral',
    'getBalance',
    'getUsedAddresses',
    'getUnusedAddresses',
    'getChangeAddress',
    'getRewardAddresses',
    'signTx',
    'signData',
    'submitTx',
  ];

  protected _cip30ExperimentalApi?: ExperimentalContainer<any>;
  protected _cip30EnableExperimentalApi?: ExperimentalContainer<any>;

  protected seed: string | null;
  protected discoverySeed: string | null;
  protected peerJsConfig: PeerOptions;

  constructor(
    walletInfo: IWalletInfo,
    args: {
      seed?: string | null;
      /** @deprecated WebTorrent trackers are no longer used. Use peerJsConfig instead. */
      announce?: string[];
      discoverySeed?: string | null;
      logLevel?: LogLevel;
      /** PeerJS server configuration. Defaults to the public PeerJS server. */
      peerJsConfig?: PeerOptions;
    } = {}
  ) {
    this.walletInfo = walletInfo;

    this.seed = args.seed ?? null;
    this.discoverySeed = args.discoverySeed ?? null;
    this.peerJsConfig = args.peerJsConfig ?? {};
    this.logLevel = args.logLevel ?? 'info';

    this.logger = new Logger({
      scope: 'CardanoPeerConnect',
      logLevel: this.logLevel,
    });

    this.onConnect = () => {};
    this.onDisconnect = () => {};
    this.onServerShutdown = () => {};
    this.onApiInject = () => {};

    this.setUpDiscoveryPeer();
  }

  protected setLogLevel = (level: LogLevel) => {
    this.logLevel = level;
    this.logger.logLevel = level;
  };

  /**
   * Creates (or reuses) the wallet's discovery peer — a long-lived PeerJS
   * peer that listens for incoming auto-connect requests from DApps.
   *
   * The discovery peer ID is derived from discoverySeed (when provided) and
   * persisted in localStorage, replacing the former meerkat discovery seed.
   */
  protected setUpDiscoveryPeer = () => {
    if (this.discoveryPeer && !this.discoveryPeer.destroyed) {
      return;
    }

    const storageKey = `peer-connect-wallet-discovery${
      this.discoverySeed ? `-${this.discoverySeed}` : ''
    }-id`;
    const discoveryId = getPersistentId(storageKey, 'wallet-disc');

    this.logger.debug('WALLET: discovery peer ID:', discoveryId);
    AutoConnectHelper.saveWalletAutoDiscoverySeed(discoveryId);

    if (this.discoveryPeer) {
      try {
        this.discoveryPeer.destroy();
      } catch (_) {}
    }

    this.discoveryPeer = new Peer(discoveryId, this.peerJsConfig);

    this.discoveryPeer.on('open', (id: string) => {
      this.logger.debug('WALLET: discovery peer open, ID:', id);
    });

    this.discoveryPeer.on('connection', (conn: DataConnection) => {
      this.logger.debug(
        'WALLET: DApp connecting to discovery peer from:',
        conn.peer
      );

      const rpc = new PeerRpc(conn, this.logger);

      conn.on('open', () => {
        this.logger.debug('WALLET: DApp discovery connection open');
      });

      conn.on('data', (data: unknown) => rpc.onData(data));
      conn.on('error', (err: Error) =>
        this.logger.warn('WALLET: discovery connection error', err)
      );

      rpc.register(
        'connect',
        (
          _address: string,
          params: { dappAddress: string },
          callback: (result: boolean) => void
        ) => {
          this.logger.debug(
            'WALLET: DApp connecting via discovery, dApp address:',
            params.dappAddress
          );
          this.connect(params.dappAddress);
          callback(true);
        }
      );
    });

    this.discoveryPeer.on('error', (err: Error) => {
      this.logger.warn('WALLET: discovery peer error:', err);
    });
  };

  /** Returns the discovery peer's ID (formerly called the "discovery seed"). */
  public getDiscoveryMeerkatSeed = (): string | null => {
    return this.discoveryPeer?.id ?? null;
  };

  /** Returns the discovery peer's ID (the address other peers connect to). */
  public getDiscoveryMeerkatAddress = (): string | null => {
    return this.discoveryPeer?.id ?? null;
  };

  public setOnConnect = (
    onConnectCallback: (connectMessage: IConnectMessage) => void
  ) => {
    this.onConnect = onConnectCallback;
  };

  public setOnDisconnect = (
    onDisconnectCallback: (connectMessage: IConnectMessage) => void
  ) => {
    this.onDisconnect = onDisconnectCallback;
  };

  public setOnServerShutdown = (
    onServerShutdown: (connectMessage: IConnectMessage) => void
  ) => {
    this.onServerShutdown = onServerShutdown;
  };

  public setOnApiInject = (
    onApiInject: (connectMessage: IConnectMessage) => void
  ) => {
    this.onApiInject = onApiInject;
  };

  public setExperimentalApi<T extends Record<keyof T, Value>>(
    dynamicObj: ExperimentalContainer<T>
  ): void {
    this._cip30ExperimentalApi = dynamicObj;
  }

  public setEnableExperimentalApi<T extends Record<keyof T, Value>>(
    dynamicObj: ExperimentalContainer<T>
  ): void {
    this._cip30EnableExperimentalApi = dynamicObj;
  }

  /** @deprecated No longer returns a meaningful value. */
  public getMeercat(_identifier: string): undefined {
    return undefined;
  }

  /** No-op — peer tracking is now handled internally. */
  public clearSeen = () => {};

  public injectApi = (overwrite: boolean = false) => {
    if (!this.activeRpc) {
      throw new Error('Not connected to a DApp.');
    }

    const expApiTypeMapping = createTypeMapping(
      this._cip30ExperimentalApi ?? new ExperimentalContainer<any>({})
    );
    const expFullApiTypeMapping = createTypeMapping(
      this._cip30EnableExperimentalApi ?? new ExperimentalContainer<any>({})
    );

    const args = {
      api: {
        apiVersion: this.walletInfo.version,
        name: this.walletInfo.name,
        icon: this.walletInfo.icon,
        methods: this.cip30Functions,
        experimentalApi: serializeTypeMapping(expApiTypeMapping),
        fullExperimentalApi: serializeTypeMapping(expFullApiTypeMapping),
      },
      overwrite,
    };

    this.activeRpc.call('api', args, (connectMessage: IConnectMessage) => {
      if (connectMessage.error) {
        this.logger.warn(
          'Api could not be injected. Error: ' +
            (connectMessage.errorMessage ?? 'unknown error.')
        );
      }
      this.onApiInject(connectMessage);
    });
  };

  public connect(identifier: string): string {
    this.dappIdentifier = identifier;

    // Close any existing connection before opening a new one
    if (this.activeRpc) {
      this.activeRpc.destroy();
      this.activeRpc = null;
    }
    if (this.activeConn?.open) {
      this.activeConn.close();
    }
    this.activeConn = null;

    const storageKey = `peer-connect-wallet${
      this.seed ? `-${this.seed}` : ''
    }-id`;
    const walletId = getPersistentId(storageKey, 'wallet');

    this.logger.debug('WALLET: connecting to DApp:', identifier);

    const doConnect = () => {
      const attemptConnection = (attempts: number) => {
        const conn = this.walletPeer!.connect(identifier, { reliable: true });
        this.activeConn = conn;
        const rpc = new PeerRpc(conn, this.logger);
        this.activeRpc = rpc;

        rpc.register(
          'shutdown',
          async (
            address: string,
            args: IConnectMessage,
            _callback: Function
          ) => {
            if (address !== args.dApp.address) {
              throw new Error(
                `Address mismatch in shutdown: ${address} vs ${args.dApp.address}`
              );
            }
            rpc.destroy();
            this.activeRpc = null;
            this.activeConn = null;
            this.onServerShutdown(args);
            this.logger.debug(
              'WALLET: server shutdown, re-establishing discovery'
            );
            this.setUpDiscoveryPeer();
          }
        );

        rpc.register(
          'invoke',
          async (
            address: string,
            args: Array<any>,
            callback: Function
          ) => {
            const cip30Function = args[0] as Cip30Function;
            if (address === identifier) {
              const result = await (this as any)[cip30Function](
                ...args.slice(1)
              );
              if (typeof result !== 'undefined') {
                callback(result);
              }
            }
          }
        );

        registerExperimentalEndpoint(
          rpc,
          'invokeExperimental',
          this._cip30ExperimentalApi ?? new ExperimentalContainer<any>({}),
          identifier
        );
        registerExperimentalEndpoint(
          rpc,
          'invokeEnableExperimental',
          this._cip30EnableExperimentalApi ??
            new ExperimentalContainer<any>({}),
          identifier
        );

        conn.on('open', () => {
          this.logger.debug(
            'WALLET: connection to DApp open, calling connect RPC'
          );

          rpc.call('connect', this.walletInfo, (connectStatus: IConnectMessage) => {
            this.logger.debug('WALLET: DApp connect response:', connectStatus);

            if (connectStatus.connected) {
              this.injectApi();

              if (this.discoveryPeer?.id) {
                rpc.call(
                  'setDiscovery',
                  { walletDiscoveryAddress: this.discoveryPeer.id },
                  (status: boolean) => {
                    this.logger.debug('WALLET: setDiscovery result:', status);
                  }
                );
              }
            } else {
              this.logger.warn(
                'WALLET: connection rejected:',
                connectStatus.errorMessage
              );
            }

            this.generateIdenticon();
            this.onConnect(connectStatus);
          });
        });

        conn.on('error', (err: Error) => {
          this.logger.warn(
            `WALLET: connection error (attempt ${attempts}):`,
            err
          );
          if (this.activeRpc === rpc && attempts < 25) {
            setTimeout(() => attemptConnection(attempts + 1), 200);
          } else if (attempts >= 25) {
            this.logger.error(
              'WALLET: failed to connect after 25 attempts'
            );
          }
        });

        conn.on('close', () => {
          this.logger.info('WALLET: connection to DApp closed');
          if (this.activeRpc === rpc) {
            rpc.destroy();
            this.activeRpc = null;
            this.activeConn = null;
          }
        });

        conn.on('data', (data: unknown) => rpc.onData(data));
      };

      attemptConnection(1);
    };

    if (!this.walletPeer || this.walletPeer.destroyed) {
      this.walletPeer = new Peer(walletId, this.peerJsConfig);
      this.walletPeer.on('error', (err: Error) =>
        this.logger.error('WALLET: peer error:', err)
      );
      this.walletPeer.once('open', doConnect);
    } else if (this.walletPeer.open) {
      doConnect();
    } else {
      this.walletPeer.once('open', doConnect);
    }

    return walletId;
  }

  public generateIdenticon = () => {
    if (!this.walletPeer?.id || !this.dappIdentifier) {
      throw new Error(
        'Cannot generate identicon: missing peer ID or DApp identifier.'
      );
    }
    this.identicon = PeerConnectIdenticon.getBase64Identicon(
      this.walletPeer.id + this.dappIdentifier
    );
  };

  public disconnect(_address: string) {
    if (!this.activeRpc) {
      throw new Error('Not connected to a DApp.');
    }

    this.activeRpc.call(
      'disconnect',
      this.walletInfo,
      (connectStatus: IConnectMessage) => {
        if (this.activeConn?.open) {
          this.activeConn.close();
        }
        if (this.activeRpc) {
          this.activeRpc.destroy();
          this.activeRpc = null;
        }
        this.activeConn = null;

        this.onDisconnect(connectStatus);
        this.logger.debug('WALLET: setup discovery after disconnect');
        this.setUpDiscoveryPeer();
      }
    );
  }

  public getIdenticon = () => this.identicon;

  protected abstract getNetworkId(): Promise<number>;
  protected abstract getUtxos(
    amount?: Cbor,
    paginate?: Paginate
  ): Promise<Cbor[] | null>;
  protected abstract getCollateral(params?: {
    amount?: Cbor;
  }): Promise<Cbor[] | null>;
  protected abstract getBalance(): Promise<Cbor>;
  protected abstract getUsedAddresses(): Promise<Cbor[]>;
  protected abstract getUnusedAddresses(): Promise<Cbor[]>;
  protected abstract getChangeAddress(): Promise<Cbor>;
  protected abstract getRewardAddresses(): Promise<Cbor[]>;
  protected abstract signTx(tx: Cbor, partialSign: boolean): Promise<Cbor>;
  protected abstract signData(
    addr: string,
    payload: Bytes
  ): Promise<Cip30DataSignature>;
  protected abstract submitTx(tx: Cbor): Promise<string>;
}
