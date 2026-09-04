import { Lucid, Blockfrost } from '@lucid-evolution/lucid';
import type { WalletApi } from '@lucid-evolution/lucid';
import { NETWORK, PROVIDER_URL, PROVIDER_KEY } from './config';

/**
 * Builds a self-send transaction with CIP-20 (label 674) message metadata,
 * signs it with the connected wallet, and submits it through the wallet's own
 * submitTx (via selectWallet.fromAPI). The provider is used only to read
 * protocol parameters while building.
 *
 * `timestamp` is passed in so this stays a pure function of its inputs.
 * Returns the submitted transaction hash.
 */
export async function buildSignSubmitSelfSend(
  api: WalletApi,
  timestamp: number,
): Promise<string> {
  const lucid = await Lucid(new Blockfrost(PROVIDER_URL, PROVIDER_KEY), NETWORK);
  lucid.selectWallet.fromAPI(api);

  const ownAddress = await lucid.wallet().address();

  const tx = await lucid
    .newTx()
    .pay.ToAddress(ownAddress, { lovelace: 1_000_000n })
    .attachMetadata(674, {
      msg: ['CIP-45 demo tx via Evolution SDK', String(timestamp)],
    })
    .complete();

  const signed = await tx.sign.withWallet().complete();
  return signed.submit();
}
