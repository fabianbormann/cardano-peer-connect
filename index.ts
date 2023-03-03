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
      if (address === this.connectedWallet) {
        this.connectedWallet = null;

        if (onDisconnect) {
          onDisconnect(address);
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
          if (onApiEject) {
            onApiEject(apiName, address);
          }
        } else {
          this.logger.info(
            `${this.connectedWallet} disconnected. Cleanup was not necessary.`
          );
        }
      }
    })

    this.meerkat.register(
      'connect',
      (address: string, walletInfo: IWalletInfo, callback: (args: IConnectMessage) => void) => {

        if (!this.connectedWallet) {
          const connectWallet = (granted: boolean) => {
            if (granted) {
              this.connectedWallet = address;
              this.logger.info(
                `Successfully connected ${this.connectedWallet}`
              );
              callback({
                dApp: this.dAppInfo,
                connected: true,
                error: false
              });

              if (onConnect) {
                onConnect(address);
              }
            } else {

              callback({
                dApp: this.dAppInfo,
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
            dApp: this.dAppInfo,
            connected: true,
            error: false
          });

        } else {

          callback({
            dApp: this.dAppInfo,
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

    this.meerkat.register(
      'api',
      (address: string, args: { api: PeerConnectApi }, callback: Function) => {

        if (address !== this.connectedWallet) {

          console.log('SERVER: api called from non registered address.')

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

  private getInjectedApis() {
    const globalCardano = (window as any).cardano || {};
    return Object.keys(globalCardano)
      .filter((client) => typeof globalCardano[client].identifier === 'string')
      .map((client) => globalCardano[client].identifier);
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

  constructor(
    walletInfo: IWalletInfo,
  ) {

    this.walletInfo           = walletInfo

    this.onConnect            = (connectMessage: IConnectMessage) => {}

  }

  public setOnConnect                = (onConnectCallback: (connectMessage: IConnectMessage) => void) => {

    this.onConnect            = onConnectCallback
  }

  public getMeercat(identifier: string): Meerkat | undefined {
    return this.meerkats.find((meerkat) => meerkat.identifier === identifier);
  }

  public disconnect(identifier: string) {
    const meerkat = this.getMeercat(identifier);
    if (meerkat) {
      meerkat.close();
      this.meerkats = this.meerkats.filter(
        (meerkat) => meerkat.identifier !== identifier
      );
    }
  }

  public connect(
    identifier: string,
    announce?: Array<string>,
    seed?: string | null
  ): string {
    const meerkat = new Meerkat({
      identifier: identifier,
      announce: announce,
      seed: seed ? seed : undefined,
    });
    meerkat.register(
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
      meerkat.rpc(
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
        () => {}
      );
    };

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

    meerkat.on('server', () => {

      meerkat.rpc(identifier, 'connect', this.walletInfo, (connectStatus: IConnectMessage) => {

        if (connectStatus.connected) {

          injectApi();

        } else {

          meerkat.logger.warn(
            'Connection failed. Another wallet has already been connected to this dApp.'
          )
        }

        this.onConnect(connectStatus)
      });
    });

    this.meerkats.push(meerkat);
    return meerkat.seed;
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
