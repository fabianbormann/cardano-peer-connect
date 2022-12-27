import Meerkat from '@fabianbormann/meerkat';
import type { PeerConnectApi, BrowserConnectApi } from './types';
import type {
  Cip30Function,
  Cbor,
  Paginate,
  Bytes,
  Cip30DataSignature,
} from './types';
import QRCode from 'qrcode-svg';
import Logger from '@fabianbormann/meerkat/dist/logger';

export class DAppPeerConnect {
  private meerkat: Meerkat;
  private connectedWallet: string | null = null;
  logger: Logger;

  constructor(
    seed?: string,
    announce?: Array<string>,
    loggingEnabled?: boolean
  ) {
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
        const globalCardano = (window as any).cardano || {};
        const apiName = Object.keys(globalCardano).find(
          (apiName) => globalCardano[apiName].identifier === address
        );
        if (apiName) {
          this.logger.info(
            `${this.connectedWallet} disconnected. ${apiName} has been removed from the global window object`
          );
          delete (window as any).cardano[apiName];
        } else {
          this.logger.info(
            `${this.connectedWallet} disconnected. Cleanup was not necessary.`
          );
        }
      }
    });

    this.meerkat.register(
      'connect',
      (address: string, args: any, callback: Function) => {
        if (!this.connectedWallet) {
          this.connectedWallet = address;
          this.logger.info(`Successfully connected ${this.connectedWallet}`);
          callback(true);
        } else if (this.connectedWallet === address) {
          this.logger.info(
            `Connection has already been established to ${address}.`
          );
        } else {
          this.logger.info(
            'Connection failed. Another wallet has already been connected to this dApp.'
          );
          callback(false);
        }
      }
    );

    this.meerkat.register(
      'api',
      (address: string, args: { api: PeerConnectApi }, callback: Function) => {
        if (address !== this.connectedWallet) {
          return;
        }

        const injectedClients = this.getInjectedApis();
        if (injectedClients.includes(address)) {
          this.logger.info(`${address} already injected`);
          return;
        }

        const api: BrowserConnectApi = {
          apiVersion: args.api.apiVersion,
          icon: args.api.icon,
          identifier: address,
        };

        for (const method of args.api.methods) {
          api[method] = (params: Array<any>) => {
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

        (window as any).cardano = (window as any).cardano || {};
        (window as any).cardano[args.api.name] = api;
        this.logger.info(
          `injected api of ${args.api.name} into window.cardano`
        );
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
  abstract apiVersion: string;
  abstract name: string;
  abstract icon: string;
  meerkats: Array<Meerkat> = [];

  constructor() {}

  getMeercat(identifier: string): Meerkat | undefined {
    return this.meerkats.find((meerkat) => meerkat.identifier === identifier);
  }

  disconnect(identifier: string) {
    const meerkat = this.getMeercat(identifier);
    if (meerkat) {
      meerkat.close();
      this.meerkats = this.meerkats.filter(
        (meerkat) => meerkat.identifier !== identifier
      );
    }
  }

  connect(
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
      (address: string, args: Array<any>, callback: Function) => {
        const cip30Function = args[0] as Cip30Function;
        if (address === identifier) {
          const result = (<any>this[cip30Function])(...args.slice(1));
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
            apiVersion: this.apiVersion,
            name: this.name,
            icon: this.icon,
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
      meerkat.rpc(identifier, 'connect', {}, (isConnected: boolean) => {
        if (isConnected) {
          injectApi();
        } else {
          meerkat.logger.warn(
            'Connection failed. Another wallet has already been connected to this dApp.'
          );
        }
      });
    });

    this.meerkats.push(meerkat);
    return meerkat.seed;
  }

  abstract getNetworkId(): number;
  abstract getUtxos(amount?: Cbor, paginate?: Paginate): Cbor[] | null;
  abstract getCollateral(params?: { amount?: Cbor }): Cbor[] | null;
  abstract getBalance(): Cbor;
  abstract getUsedAddresses(): Cbor[];
  abstract getUnusedAddresses(): Cbor[];
  abstract getChangeAddress(): Cbor;
  abstract getRewardAddresses(): Cbor[];
  abstract signTx(tx: Cbor, partialSign: boolean): Cbor;
  abstract signData(addr: string, payload: Bytes): Cip30DataSignature;
  abstract submitTx(tx: Cbor): string;
}
