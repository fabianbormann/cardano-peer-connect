import Meerkat from '@fabianbormann/meerkat';
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
import { LogLevel } from '@fabianbormann/meerkat/dist/types';
import AutoConnectHelper from './lib/AutoConnectHelper';
import PeerConnectIdenticon from './lib/PeerConnectIdenticon';

export default abstract class CardanoPeerConnect {
  protected meerkats: Map<string, Meerkat> = new Map<string, Meerkat>();
  protected walletInfo: IWalletInfo;
  protected onConnect: (connectMessage: IConnectMessage) => void;
  protected onDisconnect: (connectMessage: IConnectMessage) => void;
  protected onServerShutdown: (connectMessage: IConnectMessage) => void;
  protected onApiInject: (connectMessage: IConnectMessage) => void;
  protected identicon: string | null = null;
  protected meerkat: Meerkat | null = null;
  protected logLevel: LogLevel = 'info';

  protected DAppDiscoveryMeerkat: Meerkat | null = null;
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
  protected announceEndpoints: string[];

  constructor(
    walletInfo: IWalletInfo,
    args: {
      seed?: string | null;
      announce?: string[];
      discoverySeed?: string | null;
      logLevel?: LogLevel;
    } = {}
  ) {
    this.walletInfo = walletInfo;

    this.seed = args.seed ?? null;
    this.discoverySeed = args.discoverySeed ?? null;
    this.announceEndpoints = args.announce ?? [
      'wss://tracker.openwebtorrent.com',
      'wss://dev.btt.cf-identity-wallet.metadata.dev.cf-deployments.org',
      'wss://tracker.files.fm:7073/announce',
      'ws://tracker.files.fm:7072/announce',
      'wss://tracker.openwebtorrent.com:443/announce',
    ];
    this.logLevel = args.logLevel ?? 'info';

    this.onConnect = (connectMessage: IConnectMessage) => {};
    this.onDisconnect = (connectMessage: IConnectMessage) => {};
    this.onServerShutdown = () => {};
    this.onApiInject = () => {};

    this.setUpDiscoveryMeerkat();
  }

  protected setLogLevel = (level: LogLevel) => {
    this.logLevel = level;

    if (this.meerkat) {
      this.meerkat.logger.logLevel = level;
    }
    if (this.DAppDiscoveryMeerkat) {
      this.DAppDiscoveryMeerkat.logger.logLevel = level;
    }
  };

  protected setUpDiscoveryMeerkat = () => {
    this.DAppDiscoveryMeerkat = new Meerkat({
      announce: this.announceEndpoints,
      seed: this.discoverySeed ? this.discoverySeed : undefined,
      loggingEnabled: true,
    }).setMaxListeners(20);

    this.clearSeen();

    this.DAppDiscoveryMeerkat.logger.logLevel = this.logLevel;

    this.DAppDiscoveryMeerkat?.logger.debug(
      'WALLET: discovery address:',
      this.DAppDiscoveryMeerkat.address()
    );

    if (!this.discoverySeed) {
      AutoConnectHelper.saveWalletAutoDiscoverySeed(
        this.DAppDiscoveryMeerkat.seed
      );
    }

    this.DAppDiscoveryMeerkat.register(
      'connect',
      (
        address: string,
        params: { dappAddress: string },
        callback: (args: any) => void
      ) => {
        this.DAppDiscoveryMeerkat?.logger.debug(
          'Wallet: DApp is connecting to discovery server!',
          params.dappAddress
        );

        this.connect(params.dappAddress);

        callback(true);
      }
    );

    this.addMeerkat(
      this.DAppDiscoveryMeerkat.address(),
      this.DAppDiscoveryMeerkat
    );
  };

  public getDiscoveryMeerkatSeed = (): string | null => {
    return this.DAppDiscoveryMeerkat?.seed ?? null;
  };

  public getDiscoveryMeerkatAddress = (): string | null => {
    return this.DAppDiscoveryMeerkat?.address() ?? null;
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

  public getMeercat(identifier: string): Meerkat | undefined {
    return this.meerkats.get(identifier);
  }

  public clearSeen = () => {
    if (this.meerkat) {
      this.meerkat.logger.debug('WALLET: meerkat clear all seen clients.');
      this.meerkat.seen = {};
    }

    if (this.DAppDiscoveryMeerkat) {
      this.DAppDiscoveryMeerkat.logger.debug(
        'WALLET: discovery meerkat clear all seen clients.'
      );
      this.DAppDiscoveryMeerkat.seen = {};
    }
  };

  public injectApi = (identifier: string, overwrite: boolean = false) => {
    if (!this.meerkat) {
      throw new Error('Merrkat not connected.');
    }

    const expApiTypeMapping = createTypeMapping(
      this._cip30ExperimentalApi ?? new ExperimentalContainer<any>({})
    );
    const expFullApiTypeMapping = createTypeMapping(
      this._cip30EnableExperimentalApi ?? new ExperimentalContainer<any>({})
    );

    let args = {
      api: {
        apiVersion: this.walletInfo.version,
        name: this.walletInfo.name,
        icon: this.walletInfo.icon,
        methods: this.cip30Functions,
        experimentalApi: serializeTypeMapping(expApiTypeMapping),
        fullExperimentalApi: serializeTypeMapping(expFullApiTypeMapping),
      },
      overwrite: overwrite,
    };

    this.meerkat.rpc(
      identifier,
      'api',
      args,
      (connectMessage: IConnectMessage) => {
        if (!this.meerkat) {
          throw new Error('Meerkat not connected.');
        }

        if (connectMessage.error) {
          this.meerkat.logger.warn(
            'Api could note be injected. Error: ' + connectMessage.errorMessage
              ? connectMessage.errorMessage
              : 'unknown error.'
          );
        }

        this.onApiInject(connectMessage);
      }
    );
  };

  public connect(identifier: string): string {
    this.meerkat = new Meerkat({
      identifier: identifier,
      announce: this.announceEndpoints,
      seed: this.seed ?? undefined,
    }).setMaxListeners(20);
    this.meerkat.logger.logLevel = this.logLevel;

    this.meerkat?.logger.debug(
      'WALLET: calling to connect to DApp:',
      identifier
    );

    this.meerkat.register(
      'shutdown',
      async (address: string, args: IConnectMessage, callback: Function) => {
        if (address !== args.dApp.address) {
          throw new Error(
            `Address ${args.address} tries to send shutdown for server, ${args.address}.`
          );
        }

        this.clearSeen();
        this.onServerShutdown(args);

        this.meerkat?.logger.debug(
          'WALLET: setup discovery again after server did shutdown.'
        );

        this.setUpDiscoveryMeerkat();
      }
    );

    this.meerkat.register(
      'invoke',
      async (address: string, args: Array<any>, callback: Function) => {
        const cip30Function = args[0] as Cip30Function;

        if (address === identifier) {
          const result = await (<any>this[cip30Function])(...args.splice(1));
          if (typeof result !== 'undefined') {
            callback(result);
          }
        }
      }
    );

    registerExperimentalEndpoint(
      this.meerkat,
      'invokeExperimental',
      this._cip30ExperimentalApi!,
      identifier
    );
    registerExperimentalEndpoint(
      this.meerkat,
      'invokeEnableExperimental',
      this._cip30EnableExperimentalApi!,
      identifier
    );

    this.meerkat.on('server', () => {
      this.meerkat?.logger.debug(
        'WALLET: DApp server seen, create connection!'
      );

      if (!this.meerkat) {
        throw new Error('Meerkat not connected.');
      }

      this.meerkat.rpc(
        identifier,
        'connect',
        this.walletInfo,
        (connectStatus: IConnectMessage) => {
          this.meerkat?.logger.debug(
            'WALLET: DApp now connected with status:',
            connectStatus
          );

          if (connectStatus.connected) {
            this.injectApi(identifier);

            if (this.DAppDiscoveryMeerkat) {
              //close discovery meerkat as we are connected
              this.meerkat?.logger.debug(
                'WALLET: Close discovery after successfully connected to server.'
              );
              this.DAppDiscoveryMeerkat.close();
            }
          } else {
            if (!this.meerkat) {
              throw new Error('Merrkat not connected.');
            }

            this.meerkat.logger.warn(
              'Connection failed. Another wallet has already been connected to this dApp.'
            );
          }

          this.generateIdenticon();

          if (this.DAppDiscoveryMeerkat?.address()) {
            this.meerkat!.rpc(
              identifier,
              'setDiscovery',
              { walletDiscoveryAddress: this.DAppDiscoveryMeerkat.address() },
              (connectStatus: boolean) => {
                this.meerkat?.logger.debug(
                  'WALLET: result of setDiscovery call',
                  connectStatus
                );
              }
            );
          } else {
            this.meerkat?.logger.debug(
              'WALLET: discovery meerkat has no address ?'
            );
          }

          this.meerkat?.logger.debug(
            'WALLET: calling onConnect event callback from wallet!',
            this.onConnect
          );

          this.onConnect(connectStatus);
        }
      );
    });

    this.addMeerkat(identifier, this.meerkat);

    return this.meerkat.seed;
  }

  protected addMeerkat = (identifier: string, meerkat: Meerkat) => {
    const meerkatInstance = this.meerkats.get(identifier);
    if (meerkatInstance) {
      try {
        meerkatInstance.close();
      } catch (e: any) {
        this.meerkat?.logger.warn('Error closing meerkat connection', e);
      }
      this.meerkats.delete(identifier);
    }

    this.meerkats.set(identifier, meerkat);
  };

  protected getMeerkat = (identifier: string): Meerkat | null => {
    return this.meerkats.get(identifier) ?? null;
  };

  public generateIdenticon = () => {
    if (!this.meerkat?.address()) {
      throw new Error('Server meerkat address not defined.');
    }

    if (!this.meerkat?.identifier) {
      throw new Error('Client meerkat address not defined.');
    }

    this.identicon = PeerConnectIdenticon.getBase64Identicon(
      this.meerkat?.address() + this.meerkat?.identifier
    );
  };

  public disconnect(address: string) {
    if (!this.meerkat) {
      throw new Error('Meerkat not connected.');
    }

    this.meerkat.rpc(
      address,
      'disconnect',
      this.walletInfo,
      (connectStatus: IConnectMessage) => {
        if (this.meerkat) {
          this.meerkat.close();
        }

        this.clearSeen();
        this.onDisconnect(connectStatus);

        this.meerkat?.logger.debug(
          'WALLET: setup discovery after disconnect was called'
        );
        this.setUpDiscoveryMeerkat();
      }
    );
  }

  public getIdenticon = () => {
    return this.identicon;
  };

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
