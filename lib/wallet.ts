import Meerkat from '@fabianbormann/meerkat';
import type {
  Cip30Function,
  Cbor,
  Paginate,
  Bytes,
  Cip30DataSignature,
} from './types';

export default abstract class CardanoPeerConnect {
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

  connect(identifier: string, announce?: Array<string>, seed?: string): string {
    const meerkat = new Meerkat({
      identifier: identifier,
      announce: announce,
      seed: seed,
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

    meerkat.on('server', injectApi);

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
