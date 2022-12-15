import Meerkat from '@fabianbormann/meerkat';
import type { PeerConnectApi, BrowserConnectApi } from './types';

export default class DAppPeerConnect {
  private meerkat: Meerkat;

  constructor(
    seed?: string,
    announce?: Array<string>,
    loggingEnabled?: boolean
  ) {
    this.meerkat = new Meerkat({
      seed: seed,
      announce: announce,
      loggingEnabled: loggingEnabled,
    });

    const logger = this.meerkat.logger;
    logger.info(`The generated meerkat address is: ${this.meerkat.address()}`);

    var connected = false;
    this.meerkat.on('connections', function (clients) {
      if (clients == 0 && connected == false) {
        connected = true;
        logger.info('server ready');
      }
      logger.info(`${clients} clients connected`);
    });

    this.meerkat.register(
      'api',
      (address: string, args: { api: PeerConnectApi }, callback: Function) => {
        const api: BrowserConnectApi = {
          apiVersion: args.api.apiVersion,
          icon: args.api.icon,
          identifier: address,
        };

        for (const method of args.api.methods) {
          api[method] = (params: Array<any>) =>
            new Promise((resolve, reject) => {
              this.meerkat.rpc(
                address,
                'invoke',
                [method, ...params],
                (result: any) => resolve(result)
              );
            });
        }

        (window as any).cardano = (window as any).cardano || {};
        (window as any).cardano[args.api.name] = api;
        logger.info(`injected api of ${args.api.name} into window.cardano`);
      }
    );
  }

  getLogger() {
    return this.meerkat.logger;
  }

  getAddress() {
    return this.meerkat.address();
  }

  getSeed() {
    return this.meerkat.seed;
  }
}
