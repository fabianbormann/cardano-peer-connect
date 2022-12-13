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

  connect(identifier: string, announce?: Array<string>): void {
    const meerkat = new Meerkat({ identifier: identifier, announce: announce });

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

    for (const cip30Function of cip30Functions) {
      meerkat.register(
        cip30Function,
        (address: string, args: Array<any>, callback: Function) => {
          if (address === identifier) {
            const result = (<any>this[cip30Function])(...args);
            if (typeof result !== 'undefined') {
              callback(result);
            }
          }
        }
      );

      meerkat.on('server', () => {
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
      });
    }

    this.meerkats.push(meerkat);
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
