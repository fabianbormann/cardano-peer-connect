// Keyless Blockfrost-compatible endpoint (Yaci-Store). Overridable so the
// provider can be swapped (e.g. a local ACAO proxy during dev, or real
// Blockfrost) without code changes.
export const PROVIDER_URL: string =
  import.meta.env.VITE_PROVIDER_URL ?? 'https://node0-showcase.yano-x.io/api/v1';
export const PROVIDER_KEY: string = import.meta.env.VITE_PROVIDER_KEY ?? '';

// CIP-45 signaling (peerjs). Defaults to the CF-hosted server.
export const PEERJS = {
  host: import.meta.env.VITE_PEERJS_HOST ?? 'peerjs.dev.ecosyseng.cf-deployments.org',
  port: Number(import.meta.env.VITE_PEERJS_PORT ?? 443),
  path: import.meta.env.VITE_PEERJS_PATH ?? '/',
  secure: true,
};

// Preprod explorer for the submitted tx hash.
export const explorerTxUrl = (hash: string): string =>
  `https://preprod.cardanoscan.io/transaction/${hash}`;
