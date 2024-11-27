import Meerkat from '@fabianbormann/meerkat';
import type {
  PeerConnectApi,
  DAppPeerConnectParameters,
  Cip30Api,
  Cip30Function,
  IConnectMessage,
  IDAppInfos,
  IWalletInfo,
} from './types';
import QRCode from 'qrcode-svg';
import { Value, buildApiCalls } from './lib/ExperimentalContainer';
import AutoConnectHelper from './lib/AutoConnectHelper';
import PeerConnectIdenticon from './lib/PeerConnectIdenticon';
import { Logger, LogLevel } from './lib/Logger';

export default class DAppPeerConnect {
  private meerkat: Meerkat;
  private walletDiscoveryMeerkat: Meerkat | null = null;

  private connectedWallet: string | null = null;
  protected enableLogging: boolean = false;
  protected logger: Logger;
  protected logLevel: LogLevel = 'info';

  protected readonly dAppInfo: IDAppInfos;

  protected identicon: string | null = null;

  protected onConnect?: (address: string, walletInfo?: IWalletInfo) => void;
  protected onDisconnect?: (address: string) => void;
  protected onApiEject?: (name: string, address: string) => void;
  protected onApiInject?: (name: string, address: string) => void;

  protected setUpDiscoveryMeerkcat = (
    announce: Array<string>,
    address?: string
  ) => {
    if (address || AutoConnectHelper.getWalletDiscoveryAddress()) {
      this.meerkat.logger.debug(
        'DApp: create discovery with address',
        address ?? AutoConnectHelper.getWalletDiscoveryAddress()
      );
      this.meerkat.logger.debug(
        'DApp: create discovery with seed',
        AutoConnectHelper.getWalletAutoDiscoverySeed()
      );

      this.walletDiscoveryMeerkat = new Meerkat({
        seed: AutoConnectHelper.getWalletAutoDiscoverySeed() ?? undefined,
        announce: announce,
        loggingEnabled: this.enableLogging,
        identifier: address ?? AutoConnectHelper.getWalletDiscoveryAddress()!,
      }).setMaxListeners(20);
      this.walletDiscoveryMeerkat.logger.logLevel = this.logLevel as LogLevel;

      this.meerkat.logger.debug(
        'DApp: walletDiscoveryMeerkat address:',
        this.walletDiscoveryMeerkat.address()
      );

      AutoConnectHelper.saveWalletAutoDiscoverySeed(
        this.walletDiscoveryMeerkat.seed
      );

      this.meerkat.logger.debug(
        'DApp: Adding onServer event for discover wallet discovery meerkat.'
      );

      this.walletDiscoveryMeerkat.on('server', () => {
        this.meerkat.logger.debug(
          'DApp: SERVER discovery: received on server event'
        );

        if (!this.walletDiscoveryMeerkat) {
          throw new Error('Meerkat not connected.');
        }

        this.meerkat.logger.debug(
          'DApp: SERVER discovery: Calling rpc connect on wallet.'
        );

        this.walletDiscoveryMeerkat.rpc(
          AutoConnectHelper.getWalletDiscoveryAddress()!,
          'connect',
          { dappAddress: this.meerkat.address() },
          (connectStatus: any) => {
            this.meerkat.logger.debug(
              'DApp: SERVER discovery: Client connect status: ',
              connectStatus
            );
          }
        );
      });
    }
  };

  public setLogLevel = (level: LogLevel, meerkat: boolean = false) => {
    this.logLevel = level;
    this.logger.logLevel = level;

    if (this.meerkat && meerkat) {
      this.meerkat.logger.logLevel = level as LogLevel;
    }

    if (this.walletDiscoveryMeerkat && meerkat) {
      this.walletDiscoveryMeerkat.logger.logLevel = level as LogLevel;
    }
  };

  constructor({
    dAppInfo,
    seed,
    discoverySeed,
    announce,
    loggingEnabled,
    verifyConnection,
    onConnect,
    onDisconnect,
    onApiEject,
    onApiInject,
    useWalletDiscovery,
  }: DAppPeerConnectParameters) {
    if (loggingEnabled) {
      this.enableLogging = loggingEnabled;
    }

    if (!announce) {
      announce = [
        'wss://tracker.openwebtorrent.com',
        'wss://dev.btt.cf-identity-wallet.metadata.dev.cf-deployments.org',
        'wss://tracker.files.fm:7073/announce',
        'ws://tracker.files.fm:7072/announce',
        'wss://tracker.openwebtorrent.com:443/announce',
      ];
    }

    this.meerkat = new Meerkat({
      seed: seed || localStorage.getItem('meerkat-dapp-seed') || undefined,
      announce: announce,
      loggingEnabled: loggingEnabled,
    }).setMaxListeners(20);

    this.dAppInfo = {
      ...dAppInfo,
      address: this.meerkat.address(),
    };

    this.logger = new Logger({
      scope: 'DAppPeerConnect',
      logLevel: 'info',
      enabled: loggingEnabled,
    });
    this.meerkat.logger.logLevel = this.logLevel as LogLevel;

    if (useWalletDiscovery) {
      setTimeout(() => {
        //initialize discovery meerkat 1 second later
        this.setUpDiscoveryMeerkcat(announce!, discoverySeed);
      }, 1000);
    }

    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
    this.onApiEject = onApiEject;
    this.onApiInject = onApiInject;

    localStorage.setItem('meerkat-dapp-seed', this.meerkat.seed);

    this.logger.info(
      `The generated meerkat address is: ${this.meerkat.address()}`
    );

    this.dAppInfo.address = this.meerkat.address();

    let connected = false;

    this.meerkat.on('connections', () => {
      if (!connected) {
        connected = true;
        this.logger.info('server ready');
      }
    });

    this.meerkat.on('seen', (address) => {
      const globalCardano = (window as any).cardano || {};
      if (
        Object.keys(globalCardano).find(
          (apiName) => globalCardano[apiName].identifier === address
        )
      ) {
        this.logger.info(`Saw address ${address}`);
      } else {
        this.logger.info(
          `Saw address ${address} but it has not injected it's api yet`
        );
      }
    });

    this.meerkat.on('left', (address: string) => {
      this.leftServer(address);
    });

    this.meerkat.register(
      'connect',
      (
        address: string,
        walletInfo: IWalletInfo,
        callback: (args: IConnectMessage) => void
      ) => {
        if (!this.connectedWallet) {
          const connectWallet = (
            granted: boolean,
            allowAutoConnect: boolean = false,
            connectedWalletInfo?: IWalletInfo
          ) => {
            if (walletInfo.requestAutoconnect && granted && allowAutoConnect) {
              AutoConnectHelper.addAutoConnectId(address);
            }

            if (granted) {
              this.connectedWallet = address;
              this.logger.info(
                `Successfully connected ${this.connectedWallet}`
              );

              callback({
                dApp: this.dAppInfo,
                address: address,
                connected: true,
                error: false,
                autoConnect: allowAutoConnect,
              });

              this.generateIdenticon();

              if (this.onConnect) {
                this.onConnect(address, connectedWalletInfo);
              }
            } else {
              callback({
                dApp: this.dAppInfo,
                address: address,
                connected: false,
                error: true,
                errorMessage: `User denied connection to ${address}`,
                autoConnect: allowAutoConnect,
              });

              this.logger.info(`User denied connection to ${address}`);
            }
          };

          if (typeof verifyConnection !== 'undefined') {
            if (AutoConnectHelper.isAutoConnectId(address)) {
              connectWallet(true, true, walletInfo);
            } else {
              verifyConnection(
                {
                  ...walletInfo,
                  address: address,
                },
                connectWallet
              );
            }
          } else {
            connectWallet(true);
          }
        } else if (this.connectedWallet === address) {
          this.logger.info(
            `Connection has already been established to ${address}.`
          );

          callback({
            address: address,
            dApp: this.dAppInfo,
            connected: true,
            error: false,
          });
        } else {
          callback({
            dApp: this.dAppInfo,
            address: address,
            connected: false,
            error: false,
            errorMessage:
              'Connection failed. Another wallet has already been connected to this dApp.',
          });

          this.logger.info(
            'Connection failed. Another wallet has already been connected to this dApp.'
          );
        }
      }
    );

    /**
     * Client signals that it is disconnecting
     */
    this.meerkat.register(
      'disconnect',

      (
        address: string,
        walletInfo: IWalletInfo,
        callback: (args: IConnectMessage) => void
      ) => {
        if (this.connectedWallet) {
          if (this.connectedWallet !== address) {
            this.logger.info(
              `Unregistered address ${address} is calling disconnect.`
            );

            callback({
              dApp: this.dAppInfo,
              connected: false,
              error: true,
              errorMessage:
                'Unregistered address ${address} is calling disconnect.',
            });

            return;
          }

          this.logger.info(
            `Wallet ${this.connectedWallet} is calling disconnect.`
          );

          callback({
            dApp: this.dAppInfo,
            connected: false,
            error: false,
          });

          this.leftServer(address);
          this.connectedWallet = null;

          return;
        }

        this.logger.info(`Calling disconnect with no connected wallet.`);

        callback({
          dApp: this.dAppInfo,
          connected: false,
          error: true,
          errorMessage: 'No wallet is connected.',
        });
      }
    );

    this.meerkat.register(
      'setDiscovery',
      (
        address: string,
        args: { walletDiscoveryAddress: string },
        callback: (args: boolean) => void
      ) => {
        this.logger.debug('DApp: SERVER: setDiscovery with:', args);

        if (useWalletDiscovery) {
          AutoConnectHelper.saveWalletDiscoveryAddress(
            args.walletDiscoveryAddress
          );

          return callback(true);
        } else {
          return callback(false);
        }
      }
    );

    this.meerkat.register(
      'api',
      (
        address: string,
        args: { api: PeerConnectApi; overwrite?: boolean },
        callback: (args: IConnectMessage) => void
      ) => {
        if (address !== this.connectedWallet) {
          return;
        }

        const injectedClients = this.getInjectedApis();
        if (injectedClients.includes(address) && !args.overwrite) {
          this.logger.info(`${address} already injected`);
          return;
        }

        const api: {
          [key in Cip30Function | 'experimental']?:
            | Function
            | Record<string, Value>;
        } = {};

        for (const method of args.api.methods) {
          api[method] = (...params: Array<any>) => {
            return new Promise((resolve, reject) => {
              if (typeof params === 'undefined') {
                params = [];
              }

              this.meerkat.rpc(
                address,
                'invoke',
                [method, ...params],
                (result: any) => resolve(result)
              );
            });
          };
        }

        const initialExperimentalApi = buildApiCalls(
          this.meerkat,
          address,
          args.api.experimentalApi,
          'invokeExperimental'
        );

        const fullExperimentalApi = buildApiCalls(
          this.meerkat,
          address,
          args.api.fullExperimentalApi,
          'invokeEnableExperimental'
        );

        api['experimental'] = fullExperimentalApi;

        const cip30Api: Cip30Api = {
          apiVersion: args.api.apiVersion,
          name: args.api.name,
          icon: args.api.icon,
          identifier: address,
          experimental: initialExperimentalApi,
          isEnabled: () => new Promise((resolve, reject) => resolve(true)),
          enable: () => new Promise((resovle, reject) => resovle(api)),
        };

        if (this.isWalletNameInjected(args.api.name) && !args.overwrite) {
          this.logger.info(
            `Not injecting wallet api. API for wallet '${args.api.name}' is already injected.`
          );
          return callback({
            dApp: this.dAppInfo,
            connected: false,
            error: true,
            errorMessage: `Wallet with name ${args.api.name} is already injected.`,
          });
        }

        if (!this.isP2pWalletCompliantName(args.api.name)) {
          this.logger.warn(
            `Injected wallet does not contain 'p2p' in name, this is discouraged. `
          );
        }

        (window as any).cardano = (window as any).cardano || {};
        (window as any).cardano[args.api.name.toLowerCase()] = cip30Api;
        this.logger.info(
          `injected api of ${args.api.name} into window.cardano`
        );

        callback({
          dApp: this.dAppInfo,
          connected: true,
          error: false,
        });

        if (onApiInject) {
          onApiInject(args.api.name, address);
        }
      }
    );
  }

  private leftServer = (address: string) => {
    if (address === this.connectedWallet) {
      this.connectedWallet = null;

      if (this.onDisconnect) {
        this.onDisconnect(address);
      }

      const globalCardano = (window as any).cardano || {};
      const apiName = Object.keys(globalCardano).find(
        (apiName) => globalCardano[apiName].identifier === address
      );
      if (apiName) {
        this.logger.info(
          `${this.connectedWallet} disconnected. ${apiName} has been removed from the global window object`
        );
        delete (window as any).cardano[apiName.toLowerCase()];
        if (this.onApiEject) {
          this.onApiEject(apiName, address);
        }
      } else {
        this.logger.info(
          `${this.connectedWallet} disconnected. Cleanup was not necessary.`
        );
      }
    }
  };

  public shutdownServer = () => {
    if (this.connectedWallet) {
      const status: IConnectMessage = {
        connected: false,
        error: false,
        errorMessage: 'Server is closing connections.',
        dApp: this.dAppInfo,
      };

      this.meerkat.rpc(this.connectedWallet, 'shutdown', status, () => {});
    }
  };

  private getInjectedApis() {
    const globalCardano = (window as any).cardano || {};
    return Object.keys(globalCardano)
      .filter((client) => typeof globalCardano[client].identifier === 'string')
      .map((client) => globalCardano[client].identifier);
  }

  /**
   * Checks if wallet with name is already injected into global cardano namespace.
   * @param name
   */
  private isWalletNameInjected = (name: string) => {
    const globalCardano = (window as any).cardano || {};

    return Object.keys(globalCardano).find(
      (apiName) => apiName === name.toLowerCase()
    );
  };

  /**
   * Checks if wallet name contains the string p2p to distinguish from other injection.
   * @param name
   */
  private isP2pWalletCompliantName = (name: string) => {
    return name.includes('p2p');
  };

  generateQRCode(canvas: HTMLElement) {
    const data = `${this.meerkat.address()}:meerkat:${new Date().getTime()}`;
    var qrcode = new QRCode({
      content: data,
      padding: 4,
      width: 256,
      height: 256,
      color: '#000000',
      background: '#ffffff',
      ecl: 'M',
    });
    canvas.innerHTML = qrcode.svg();
  }

  getConnectedWallet() {
    return this.connectedWallet;
  }

  getAddress() {
    return this.meerkat.address();
  }

  getSeed() {
    return this.meerkat.seed;
  }

  public generateIdenticon = () => {
    this.identicon = PeerConnectIdenticon.getBase64Identicon(
      this.connectedWallet + this.getAddress()
    );
  };

  public getIdenticon = () => {
    return this.identicon;
  };
}
