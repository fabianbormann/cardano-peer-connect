import Meerkat from '@fabianbormann/meerkat';
import type {
  PeerConnectApi,
  DAppPeerConnectParameters,
  Cip30Api,
  Cip30Function,
  Cbor,
  Paginate,
  Bytes,
  Cip30DataSignature,
  IConnectMessage,
  IDAppInfos,
  IWalletInfo
} from './types';
import QRCode from 'qrcode-svg';
import Logger from '@fabianbormann/meerkat/dist/logger';

export class DAppPeerConnect {

  private meerkat: Meerkat;
  private connectedWallet: string | null = null;
  logger: Logger;

  private readonly dAppInfo: IDAppInfos

  protected onConnect?: (address: string) => void;
  protected onDisconnect?: (address: string) => void;
  protected onApiEject?: (name: string, address: string) => void;
  protected onApiInject?: (name: string, address: string) => void;
  constructor({
    dAppInfo,
    seed,
    announce,
    loggingEnabled,
    verifyConnection,
    onConnect,
    onDisconnect,
    onApiEject,
    onApiInject,
  }: DAppPeerConnectParameters) {

    this.dAppInfo = dAppInfo

    this.meerkat = new Meerkat({
      seed: seed || localStorage.getItem('meerkat-dapp-seed') || undefined,
      announce: announce,
      loggingEnabled: loggingEnabled,
    });

    if(onConnect) {
      this.onConnect = onConnect
    }

    if(onDisconnect) {
      this.onDisconnect = onDisconnect
    }

    if(onApiEject) {
      this.onApiEject = onApiEject
    }

    if(onApiInject) {
      this.onApiInject = onApiInject
    }

    localStorage.setItem('meerkat-dapp-seed', this.meerkat.seed);

    this.logger = this.meerkat.logger;
    this.logger.info(
      `The generated meerkat address is: ${this.meerkat.address()}`
    );

    this.dAppInfo.address = this.meerkat.address()

    var connected = false;

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

      this.leftServer(address)
    })

    this.meerkat.register(
      'connect',
      (address: string, walletInfo: IWalletInfo, callback: (args: IConnectMessage) => void) => {

        if (!this.connectedWallet) {
          const connectWallet = (granted: boolean) => {

            if (granted) {

              this.connectedWallet = address;
              this.logger.info(`Successfully connected ${this.connectedWallet}`);

              callback({
                dApp: this.dAppInfo,
                address: address,
                connected: true,
                error: false
              });

              if (this.onConnect) {

                this.onConnect(address);
              }
            } else {

              callback({
                dApp: this.dAppInfo,
                address: address,
                connected: false,
                error: true,
                errorMessage: `User denied connection to ${address}`
              })

              this.logger.info(`User denied connection to ${address}`);
            }
          };

          if (typeof verifyConnection !== 'undefined') {
            verifyConnection({
              ...walletInfo,
              address: address
            }, connectWallet);
          } else {
            connectWallet(true);
          }
        } else if (this.connectedWallet === address) {

          this.logger.info(
            `Connection has already been established to ${address}.`
          )

          callback({
            address: address,
            dApp: this.dAppInfo,
            connected: true,
            error: false
          });

        } else {

          callback({
            dApp: this.dAppInfo,
            address: address,
            connected: false,
            error: false,
            errorMessage: 'Connection failed. Another wallet has already been connected to this dApp.'
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
    this.meerkat.register('disconnect',

      (address: string, walletInfo: IWalletInfo, callback: (args: IConnectMessage) => void) => {

        if (this.connectedWallet) {

          if(this.connectedWallet !== address) {

            this.logger.info(`Unregistered address ${address} is calling disconnect.`)

            callback({
              dApp: this.dAppInfo,
              connected: false,
              error: true,
              errorMessage: 'Unregistered address ${address} is calling disconnect.'
            })

            return
          }

          this.logger.info(`Wallet ${this.connectedWallet} is calling disconnect.`)

          callback({
            dApp: this.dAppInfo,
            connected: false,
            error: false
          })

          this.leftServer(address)

          this.connectedWallet = null

          return
        }

        this.logger.info(`Calling disconnect with no connected wallet.`)

        callback({
          dApp: this.dAppInfo,
          connected: false,
          error: true,
          errorMessage: 'No wallet is connected.'
        })
      }
    );

    this.meerkat.register(
      'api',
      (address: string, args: { api: PeerConnectApi }, callback: (args: IConnectMessage) => void) => {

        if (address !== this.connectedWallet) {

          return;
        }

        const injectedClients = this.getInjectedApis();
        if (injectedClients.includes(address)) {

          this.logger.info(`${address} already injected`);

          return;
        }

        const api: {
          [key in Cip30Function]?: Function;
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

        const cip30Api: Cip30Api = {
          apiVersion: args.api.apiVersion,
          name: args.api.name,
          icon: args.api.icon,
          identifier: address,
          isEnabled: () => new Promise((resolve, reject) => resolve(true)),
          enable: () => new Promise((resovle, reject) => resovle(api)),
        };

        if(this.isWalletNameInjected(args.api.name)) {

          this.logger.info(`Not injecting wallet api. API for wallet '${args.api.name}' is already injected.`)
          return callback({
            dApp: this.dAppInfo,
            connected: false,
            error: true,
            errorMessage: `Wallet with name ${args.api.name} is already injected.`
          })
        }

        if(!this.isP2pWalletCompliantName(args.api.name)) {
          this.logger.warn(`Injected wallet does not contain 'p2p' in name, this is discouraged. `)
        }

        (window as any).cardano = (window as any).cardano || {};
        (window as any).cardano[args.api.name] = cip30Api;
        this.logger.info(
          `injected api of ${args.api.name} into window.cardano`
        );

        if (onApiInject) {
          onApiInject(args.api.name, address);
        }
      }
    );
  }

  private     leftServer = (address: string) => {

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
        delete (window as any).cardano[apiName];
        if (this.onApiEject) {
          this.onApiEject(apiName, address);
        }
      } else {
        this.logger.info(
          `${this.connectedWallet} disconnected. Cleanup was not necessary.`
        );
      }
    }
  }

  public shutdownServer = () => {

      if(this.connectedWallet) {

        const status: IConnectMessage = {
          connected: false,
          error: false,
          errorMessage: 'Server is closing connections.',
          dApp: this.dAppInfo
        }

        this.meerkat.rpc(
          this.connectedWallet,
          'shutdown',
          status,
          () => {}
        );
    }
  }

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

    return Object.keys(globalCardano).find((apiName) => apiName === name)
  }

  /**
   * Checks if wallet name contains the string p2p to distinguish from other injection.
   * @param name
   */
  private isP2pWalletCompliantName = (name: string) => {

    return name.includes("p2p")
  }

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
    return this.connectedWallet
  }

  getAddress() {
    return this.meerkat.address();
  }

  getSeed() {
    return this.meerkat.seed;
  }
}

export abstract class CardanoPeerConnect {

  protected meerkats: Array<Meerkat> = [];
  protected walletInfo: IWalletInfo
  protected onConnect:                  (connectMessage: IConnectMessage) => void
  protected onDisconnect:               (connectMessage: IConnectMessage) => void
  protected onServerShutdown:           (connectMessage: IConnectMessage) => void
  protected onApiInject:                (connectMessage: IConnectMessage) => void

  protected meerkat : Meerkat | null = null

  constructor(walletInfo: IWalletInfo) {

    this.walletInfo           = walletInfo

    this.onConnect            = (connectMessage: IConnectMessage) => {}
    this.onDisconnect         = (connectMessage: IConnectMessage) => {}
    this.onServerShutdown     = () => {}
    this.onApiInject          = () => {}
  }

  public setOnConnect         = (onConnectCallback: (connectMessage: IConnectMessage) => void) => {

    this.onConnect            = onConnectCallback
  }

  public setOnDisconnect      = (onDisconnectCallback: (connectMessage: IConnectMessage) => void) => {

    this.onDisconnect         = onDisconnectCallback
  }

  public setOnServerShutdown  = (onServerShutdown: (connectMessage: IConnectMessage) => void) => {

    this.onServerShutdown     = onServerShutdown
  }

  public setOnApiInject         = (onApiInject: (connectMessage: IConnectMessage) => void) => {

    this.onApiInject          = onApiInject
  }

  public getMeercat(identifier: string): Meerkat | undefined {
    return this.meerkats.find((meerkat) => meerkat.identifier === identifier);
  }

  public connect(
    identifier: string,
    announce?: Array<string>,
    seed?: string | null
  ): string {
    this.meerkat = new Meerkat({
      identifier: identifier,
      announce: announce,
      seed: seed ? seed : undefined,
    });

    this.meerkat.register(
      'shutdown',
      async (address: string, args: IConnectMessage, callback: Function) => {

        if(address !== args.dApp.address) {

          throw new Error(`Address ${args.address} tries to send shutdown for server, ${args.address}.`)
        }

        this.onServerShutdown(args)

      })

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

    const injectApi = () => {

      if(!this.meerkat) {

        throw new Error('Merrkat not connected.')
      }

      this.meerkat.rpc(
        identifier,
        'api',
        {
          api: {
            apiVersion: this.walletInfo.version,
            name: this.walletInfo.name,
            icon: this.walletInfo.name,
            methods: cip30Functions,
          },
        },
        (connectMessage: IConnectMessage) => {

          if(!this.meerkat) {

            throw new Error('Meerkat not connected.')
          }

          if(connectMessage.error) {

            this.meerkat.logger.warn(
              'Api could note be injected. Error: ' + connectMessage.errorMessage ? connectMessage.errorMessage : 'unknown error.'
            )
          }

          this.onApiInject(connectMessage)
        }
      )
    }

    // https://cips.cardano.org/cips/cip30/
    const cip30Functions: Array<Cip30Function> = [
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

    this.meerkat.on('server', () => {

      if(!this.meerkat) {

        throw new Error('Meerkat not connected.')
      }

      this.meerkat.rpc(identifier, 'connect', this.walletInfo, (connectStatus: IConnectMessage) => {

        if (connectStatus.connected) {

          injectApi();

        } else {


          if(!this.meerkat) {

            throw new Error('Merrkat not connected.')
          }

          this.meerkat.logger.warn(
            'Connection failed. Another wallet has already been connected to this dApp.'
          )
        }

        this.onConnect(connectStatus)
      });
    });

    this.meerkats.push(this.meerkat);
    return this.meerkat.seed;
  }


  public disconnect(address: string) {

    if(!this.meerkat) {

      throw new Error('Meerkat not connected.')
    }

    this.meerkat.rpc(address, 'disconnect', this.walletInfo, (connectStatus: IConnectMessage) => {

      if(this.meerkat) {

        this.meerkat.close()
      }

      this.onDisconnect(connectStatus)
    })
  }

  protected abstract getNetworkId(): Promise<number>;
  protected abstract getUtxos(amount?: Cbor, paginate?: Paginate): Promise<Cbor[] | null>;
  protected abstract getCollateral(params?: { amount?: Cbor }): Promise<Cbor[] | null>;
  protected abstract getBalance(): Promise<Cbor>;
  protected abstract getUsedAddresses(): Promise<Cbor[]>;
  protected abstract getUnusedAddresses(): Promise<Cbor[]>;
  protected abstract getChangeAddress(): Promise<Cbor>;
  protected abstract getRewardAddresses(): Promise<Cbor[]>;
  protected abstract signTx(tx: Cbor, partialSign: boolean): Promise<Cbor>;
  protected abstract signData(addr: string, payload: Bytes): Promise<Cip30DataSignature>;
  protected abstract submitTx(tx: Cbor): Promise<string>;
}
