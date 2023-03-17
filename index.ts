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
import { identicon } from '@basementuniverse/marble-identicons';
import {
  Value,
  ExperimentalContainer,

  buildApiCalls,
  createTypeMapping,
  serializeTypeMapping,
  registerExperimentalEndpoint
} from './lib/ExperimentalContainer';

class DAppPeerConnect {

  private meerkat: Meerkat;
  private connectedWallet: string | null = null;
  logger: Logger;

  private readonly dAppInfo: IDAppInfos

  protected identicon: string | null = null

  protected onConnect?: (address: string) => void;
  protected onDisconnect?: (address: string) => void;
  protected onApiEject?: (name: string, address: string) => void;
  protected onApiInject?: (name: string, address: string) => void;

  private connectBackTimeout

  private startParams: DAppPeerConnectParameters

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
    this.startParams = {
      dAppInfo,
      seed,
      announce,
      loggingEnabled,
      verifyConnection,
      onConnect,
      onDisconnect,
      onApiEject,
      onApiInject,
    }

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

    let shouldConnectBack = false

   const createTimeout = () => {

     return setTimeout(() => {

       if(this.connectBackTimeout) {

         clearTimeout(this.connectBackTimeout)
       }

       if(!connected || !lastConnectedWalletSeen) {

         console.log('wait as not connected nor wallet not seen', connected, lastConnectedWalletSeen)

         this.connectBackTimeout = createTimeout()

         return
       }

       doConnectBack()

     },1000)
   }

    const doConnectBack = () => {
      console.log('timeout to connect to wallet activated')

      shouldConnectBack = true
      // this.connectBack()
    }


    this.meerkat.on('server', () => {

      if(!this.meerkat) {

        throw new Error('Meerkat not connected.')
      }

      console.log('SERVER: got event!')

      if(shouldConnectBack) {

        this.connectBack()

        // this.meerkat.rpc(identifier, 'connect', this.walletInfo, (connectStatus: IConnectMessage) => {
        //
        //   if (connectStatus.connected) {
        //
        //     injectApi();
        //
        //   } else {
        //
        //
        //     if(!this.meerkat) {
        //
        //       throw new Error('Merrkat not connected.')
        //     }
        //
        //     this.meerkat.logger.warn(
        //       'Connection failed. Another wallet has already been connected to this dApp.'
        //     )
        //   }
        //
        //   this.generateIdenticon()
        //
        //   this.onConnect(connectStatus)
        // });
      }

    });

    this.connectBackTimeout = createTimeout()

    let lastConnectedWalletSeen = false

    this.meerkat.on('seen', (address) => {

      console.log('seen address', address)

      if(AutoConnectHelper.getLastConnectedWalletId() === address) {
        console.log('did saw last connected wallet')

        lastConnectedWalletSeen = true
      }

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
          const connectWallet = (granted: boolean, allowAutoConnect: boolean = false) => {

            if(walletInfo.requestAutoconnect && granted && allowAutoConnect) {

              AutoConnectHelper.addAutoConnectId(address)
            }

            if (granted) {

              AutoConnectHelper.setLastConnectedWallet(address)

              this.connectedWallet = address;
              this.logger.info(`Successfully connected ${this.connectedWallet}`);

              callback({
                dApp: this.dAppInfo,
                address: address,
                connected: true,
                error: false,
                autoConnect: allowAutoConnect
              });

              this.generateIdenticon()

              if (this.onConnect) {

                this.onConnect(address);
              }
            } else {

              callback({
                dApp: this.dAppInfo,
                address: address,
                connected: false,
                error: true,
                errorMessage: `User denied connection to ${address}`,
                autoConnect: allowAutoConnect
              })

              this.logger.info(`User denied connection to ${address}`);
            }
          };

          if (typeof verifyConnection !== 'undefined') {

            if(AutoConnectHelper.isAutoConnectId(address)) {

              connectWallet(true);

            } else {

              verifyConnection({
                ...walletInfo,
                address: address
              }, connectWallet);
            }

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
          [key in Cip30Function | 'experimental']?: Function | Record<string, Value>;
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


        const initialExperimentalApi = buildApiCalls(this.meerkat, address, args.api.experimentalApi,     'invokeExperimental')
        const fullExperimentalApi    = buildApiCalls(this.meerkat, address, args.api.fullExperimentalApi, 'invokeEnableExperimental')

        api['experimental'] = fullExperimentalApi

        const cip30Api: Cip30Api = {
          apiVersion: args.api.apiVersion,
          name: args.api.name,
          icon: args.api.icon,
          identifier: address,
          experimental: initialExperimentalApi,
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



  public connectBack(): void {

    const connectTo = AutoConnectHelper.getLastConnectedWalletId()

    if(!connectTo) {

      console.log('No old wallet connection found.')

      return
    }



    this.meerkat = new Meerkat({
      seed: this.startParams.seed || localStorage.getItem('meerkat-dapp-seed') || undefined,
      announce: this.startParams.announce,
      loggingEnabled: this.startParams.loggingEnabled,
    });

    this.meerkat.rpc(connectTo, 'connectBack', () => {


      console.log('callback called from remote!')
      // this.generateIdenticon()
    });
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

  public generateIdenticon = () => {

    this.identicon = PeerConnectIdenticon.getBase64Identicon(this.connectedWallet + this.getAddress())
  }

  public getIdenticon = () => {
    return this.identicon
  }
}

abstract class CardanoPeerConnect {

  protected meerkats: Array<Meerkat> = [];
  protected walletInfo: IWalletInfo
  protected onConnect:                  (connectMessage: IConnectMessage) => void
  protected onDisconnect:               (connectMessage: IConnectMessage) => void
  protected onServerShutdown:           (connectMessage: IConnectMessage) => void
  protected onApiInject:                (connectMessage: IConnectMessage) => void
  protected identicon: string | null = null

  protected meerkat : Meerkat
  protected _cip30ExperimentalApi?: ExperimentalContainer<any>;
  protected _cip30EnableExperimentalApi?: ExperimentalContainer<any>;

  constructor(walletInfo: IWalletInfo, seed: null | string) {


    this.walletInfo           = walletInfo

    this.onConnect            = (connectMessage: IConnectMessage) => {}
    this.onDisconnect         = (connectMessage: IConnectMessage) => {}
    this.onServerShutdown     = () => {}
    this.onApiInject          = () => {}

    this.meerkat = new Meerkat({
      announce: [
        'https://pro.passwordchaos.gimbalabs.io',
        'wss://tracker.files.fm:7073/announce',
        'wss://tracker.btorrent.xyz',
        'ws://tracker.files.fm:7072/announce',
        'wss://tracker.openwebtorrent.com:443/announce',
      ],
      seed: seed ? seed : undefined,
    });
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

  public setExperimentalApi<T extends Record<keyof T, Value>>(dynamicObj: ExperimentalContainer<T>): void {

    this._cip30ExperimentalApi = dynamicObj
  }

  public setEnableExperimentalApi<T extends Record<keyof T, Value>>(dynamicObj: ExperimentalContainer<T>): void {

    this._cip30EnableExperimentalApi = dynamicObj
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
      'connectBack',
      async (address: string, args: IConnectMessage, callback: Function) => {

        console.log('connect back called on me!', address)
        //
        // if(address !== args.dApp.address) {
        //
        //   throw new Error(`Address ${args.address} tries to send shutdown for server, ${args.address}.`)
        // }
        //
        // this.onServerShutdown(args)

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
    )

    registerExperimentalEndpoint(this.meerkat, 'invokeExperimental',       this._cip30ExperimentalApi!,       identifier)
    registerExperimentalEndpoint(this.meerkat, 'invokeEnableExperimental', this._cip30EnableExperimentalApi!, identifier)

    const injectApi = () => {

      if(!this.meerkat) {

        throw new Error('Merrkat not connected.')
      }

      const expApiTypeMapping     = createTypeMapping(this._cip30ExperimentalApi       ?? new ExperimentalContainer<any>({}))
      const expFullApiTypeMapping = createTypeMapping(this._cip30EnableExperimentalApi ?? new ExperimentalContainer<any>({}))

      let args = {
        api: {
          apiVersion: this.walletInfo.version,
          name: this.walletInfo.name,
          icon: this.walletInfo.icon,
          methods: cip30Functions,
          experimentalApi: serializeTypeMapping(expApiTypeMapping),
          fullExperimentalApi: serializeTypeMapping(expFullApiTypeMapping)
        },
      };

      this.meerkat.rpc(
        identifier,
        'api',
        args,
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

        this.generateIdenticon()

        this.onConnect(connectStatus)
      });
    });

    this.meerkats.push(this.meerkat);
    return this.meerkat.seed;
  }

  public generateIdenticon = () => {

    if(!this.meerkat?.address()) {
      throw new Error('Server meerkat address not defined.')
    }

    if(!this.meerkat?.identifier) {
      throw new Error('Client meerkat address not defined.')
    }

    this.identicon = PeerConnectIdenticon.getBase64Identicon(this.meerkat?.address() + this.meerkat?.identifier)
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

  public getIdenticon = () => {
    return this.identicon
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


class PeerConnectIdenticon {

  public static getBase64Identicon = (hash: string): string | null => {

    if(hash.length < 68) {

      console.warn('Meerkat connection hash is to short. Not generating identicon.')

      return null
    }

    return identicon(
      hash.split('').reverse().map((char: string, index: number) => (index > 0 && index % 10 === 0) ? '-': char).join(''),
      {
        size: 100,
        baseSeed: 'cardano-peer-connect',
        fontSize: 0.17,
        initialsColours: ['#000000', '#FF0000', '#0000FF']
      }).toDataURL()
  }
}

class AutoConnectHelper {

  private static storageKey = 'cardano-peer-autoconnect-id'
  private static lastConnectedKey = 'cardano-peer-last-wallet-id'

  public static addAutoConnectId = (id: string) :void => {

    let autoConnectIds = []

    const ids = localStorage.getItem(this.storageKey)

    if(ids !== null) {
      autoConnectIds = JSON.parse(ids)
    }

    if(this.isAutoConnectId(id)) {
      return
    }

    autoConnectIds.push(id)

    localStorage.setItem(this.storageKey, JSON.stringify(autoConnectIds));
  }

  public static getAutoConnectIds = (): string[] => {

    return JSON.parse(localStorage.getItem(this.storageKey) ?? '[]')
  }

  public static isAutoConnectId = (id: string): boolean => {

    return this.getAutoConnectIds().includes(id)
  }

  public static resetAutoConnectIds = ():void => {

    localStorage.setItem(this.storageKey, JSON.stringify([]));
  }

  public static removeAutoConnectId = (id: string): void => {
    let autoConnectIds = []
    const ids = localStorage.getItem(this.storageKey)

    if(ids !== null) {
      autoConnectIds = JSON.parse(ids)
    }

    const index = autoConnectIds.indexOf(id)

    if(index !== -1) {
      autoConnectIds = autoConnectIds.splice(index, 1)

      localStorage.setItem(this.storageKey, JSON.stringify(autoConnectIds));
      return
    }
  }

  public static setLastConnectedWallet = (walletId: string) => {

    localStorage.setItem(this.lastConnectedKey, walletId);
  }

  public static getLastConnectedWalletId = (): string | null => {

    return localStorage.getItem(this.lastConnectedKey);
  }
}

export {

  DAppPeerConnect,
  CardanoPeerConnect,

  PeerConnectIdenticon,
  AutoConnectHelper,

  ExperimentalContainer,
}
