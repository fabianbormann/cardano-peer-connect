import {
  Client,
  preprod,
  Assets,
  TransactionHash,
  TransactionMetadatum,
} from '@evolution-sdk/evolution';
import { PROVIDER_URL, PROVIDER_KEY } from './config';

/**
 * Builds a self-send transaction with CIP-20 (label 674) message metadata,
 * signs it with the connected CIP-30 wallet, and submits it through the wallet
 * (the client is assembled with `.withCip30(api)`). The Blockfrost-compatible
 * provider is used only to read protocol parameters while building.
 *
 * `timestamp` is passed in so this stays a pure function of its inputs.
 * Returns the submitted transaction hash (hex).
 */
export async function buildSignSubmitSelfSend(
  api: unknown,
  timestamp: number,
): Promise<string> {
  const read = Client.make(preprod).withBlockfrost({
    baseUrl: PROVIDER_URL,
    ...(PROVIDER_KEY ? { projectId: PROVIDER_KEY } : {}),
  });
  const client = read.withCip30(api as Parameters<typeof read.withCip30>[0]);

  // The wallet's own address (typed), as the self-send recipient.
  const ownAddress = await client.address();

  // CIP-20 (674) message metadata: { msg: [ "...", "..." ] }
  const metadata = TransactionMetadatum.fromEntries([
    [
      TransactionMetadatum.text('msg'),
      TransactionMetadatum.array([
        TransactionMetadatum.text('CIP-45 demo tx via Evolution SDK'),
        TransactionMetadatum.text(String(timestamp)),
      ]),
    ],
  ]);

  const built = await client
    .newTx()
    .payToAddress({ address: ownAddress, assets: Assets.fromLovelace(1_000_000n) })
    .attachMetadata({ label: 674n, metadata })
    .build();

  const signed = await built.sign(); // wallet signTx (approval prompt)
  const hash = await signed.submit(); // wallet submitTx
  return TransactionHash.toHex(hash);
}
