# React Demo dApp + GitHub Pages Deploy — Design

**Date:** 2026-09-04
**Repo:** `cardano-peer-connect` (branch `feat/cip45-1.3.0`)
**Status:** Approved (approach)

## Goal

A deployable React demo dApp that connects to a CIP-45 wallet (e.g. GeroWallet)
over WebRTC, exercises **every** CIP-30 method, and builds/signs/submits a real
self-send transaction *with metadata* using Evolution SDK
(`@evolution-sdk/evolution`, Intersect MBO), submitted through the wallet.
Published as a static GitHub Pages site from a CI pipeline in this repo.

Non-goals: replacing the plain-HTML e2e test pages (they stay; the e2e suite
depends on them); automating the on-chain round-trip in CI; supporting more than
one provider or network in v1.

## Decisions (locked)

- **Network:** Preprod. **Provider:** the keyless Blockfrost-compatible endpoint
  `https://node0-showcase.yano-x.io/api/v1` (Yaci-Store; preprod, epoch 311 at
  design time), via Lucid's `Blockfrost` provider with an empty key. Koios was
  ruled out — its responses carry no `Access-Control-Allow-Origin`, so browsers
  block it; yano-x had the same gap but its engineer is enabling ACAO. Provider
  is used only to read protocol parameters for *building*; **submission goes
  through the wallet's `submitTx`** (via `makeWalletFromAPI`), which is the point
  of the test. Fallback if yano-x CORS regresses: real Blockfrost with a preprod
  key injected at build (it sends `ACAO: *`). Base URL is a Vite env var so the
  provider can be swapped without code changes.
  - Local dev/testing before yano-x CORS is live: a tiny local ACAO proxy in
    front of yano-x (documented in the app README), pointed at via the env var.
- **Coexistence:** new `examples/react-dapp/` sub-project; plain-HTML pages
  under `test/e2e/` unchanged.
- **Library source:** the app depends on this repo's own library via
  `"@fabianbormann/cardano-peer-connect": "file:../.."` so it always tracks the
  local build (CI builds the library first).
- **Signaling:** CF server (`peerjs.dev.ecosyseng.cf-deployments.org:443`) by
  default, overridable via a Vite env var.

## Architecture

```
examples/react-dapp/
  package.json          # react, react-dom, @evolution-sdk/evolution,
                        # file:../.. for the peer-connect lib; vite + ts devdeps
  vite.config.ts        # base: '/cardano-peer-connect/', wasm/top-level-await plugins
  tsconfig.json
  index.html
  src/
    main.tsx            # React root
    App.tsx             # top-level: owns the DAppPeerConnect instance + UI state
    peer.ts             # creates DAppPeerConnect, exposes connect state + injected api
    evolutionTx.ts          # buildSignSubmitSelfSend(api): the Evolution SDK flow
    config.ts           # network, koios url, signaling config from import.meta.env
    components/
      ConnectionPanel.tsx  # QR + peer id + copy + lifecycle log
      ReadMethods.tsx      # buttons for the 8 read methods + run-all
      SignDataPanel.tsx    # address + message + sign
      TxPanel.tsx          # build+sign+submit self-send-with-metadata + tx hash link
```

### Connection (peer.ts / ConnectionPanel)

- Instantiate `new DAppPeerConnect({ dAppInfo, peerJsConfig, useWalletDiscovery,
  onConnect, onDisconnect, onApiInject, onApiEject })`, mirroring the HTML test
  page's wiring but as React state.
- Render the QR (`generateQRCode`) and peer id, a copy button (with the
  clipboard fallback we added), and a lifecycle-event log fed by the four
  callbacks.
- On `onApiInject(name)`, capture `window.cardano[name.toLowerCase()]` as the
  injected CIP-30 provider and store it in React state; clear it on
  `onApiEject`/`onDisconnect`.

### Read methods (ReadMethods)

One button per method — `getNetworkId`, `getBalance`, `getUtxos`,
`getCollateral`, `getUsedAddresses`, `getUnusedAddresses`, `getChangeAddress`,
`getRewardAddresses` — plus "Run all" (sequential). Each calls
`(await api.enable())[method]()` and renders the JSON result or the error object.

### Sign data (SignDataPanel)

Address + message inputs; `api.signData(addr, hex(msg))`; render `{signature,
key}` or the error. Reuses the existing hex helper.

### Transaction (evolutionTx.ts / TxPanel)

`buildSignSubmitSelfSend(api)`:

Authoritative implementation: `src/evolutionTx.ts`. Evolution SDK's Client API
(not Lucid's) — assemble a client from the Blockfrost-compatible provider + the
CIP-30 wallet, build a self-send with label-674 metadata, sign, submit:

```ts
import { Client, preprod, Assets, TransactionHash, TransactionMetadatum }
  from '@evolution-sdk/evolution';

const read = Client.make(preprod).withBlockfrost({ baseUrl: PROVIDER_URL });
const client = read.withCip30(api);                 // wallet = the CIP-45 CIP-30 api
const ownAddress = await client.address();
const metadata = TransactionMetadatum.fromEntries([[
  TransactionMetadatum.text('msg'),
  TransactionMetadatum.array([
    TransactionMetadatum.text('CIP-45 demo tx via Evolution SDK'),
    TransactionMetadatum.text(String(timestamp)),
  ]),
]]);
const built = await client.newTx()
  .payToAddress({ address: ownAddress, assets: Assets.fromLovelace(1_000_000n) })
  .attachMetadata({ label: 674n, metadata })
  .build();                                          // provider params + wallet utxos
const signed = await built.sign();                   // api.signTx (wallet approval)
const hash = await signed.submit();                  // api.submitTx (wallet submits)
return TransactionHash.toHex(hash);
```

- `timestamp` is passed in (not read from `Date.now()` inside a pure helper) so
  the caller controls it.
- TxPanel calls it on button click, shows a spinner while pending, then the tx
  hash as a link to `https://preprod.cardanoscan.io/transaction/<hash>` (and a
  Koios link), or the error object. Disabled until the api is injected.
- Metadata label **674** is the CIP-20 message standard; value is a `msg` array
  (each element ≤ 64 chars).

### config.ts

```ts
export const NETWORK = 'Preprod';
export const PROVIDER_URL = import.meta.env.VITE_PROVIDER_URL ?? 'https://node0-showcase.yano-x.io/api/v1';
export const PROVIDER_KEY = import.meta.env.VITE_PROVIDER_KEY ?? ''; // yano-x is keyless
export const PEERJS = {
  host: import.meta.env.VITE_PEERJS_HOST ?? 'peerjs.dev.ecosyseng.cf-deployments.org',
  port: Number(import.meta.env.VITE_PEERJS_PORT ?? 443),
  path: import.meta.env.VITE_PEERJS_PATH ?? '/',
  secure: true,
};
```

## Bundling notes

- Evolution SDK pulls WASM (CML) and uses top-level await, so `vite.config.ts`
  needs `vite-plugin-wasm` + `vite-plugin-top-level-await`, and
  `build.target: 'es2022'` (or esnext). `optimizeDeps.esbuildOptions.target`
  set accordingly.
- `base: '/cardano-peer-connect/'` so asset URLs resolve under the project
  Pages path.
- Node polyfills: Lucid is browser-ready, but if a `Buffer`/`process` reference
  surfaces at build time, add `vite-plugin-node-polyfills` (only if needed —
  confirmed during implementation, not added speculatively).

## Deployment (`.github/workflows/deploy-demo.yml`)

- Triggers: `push` to `main` (paths: `src/**`, `examples/react-dapp/**`,
  the workflow itself) + `workflow_dispatch`.
- Permissions: `pages: write`, `id-token: write`, `contents: read`. Concurrency
  group `pages`.
- Steps: checkout → setup-node 20 → `npm ci` + `npm run build` (root library) →
  `cd examples/react-dapp && npm ci && npm run build` → `actions/upload-pages-artifact`
  (path `examples/react-dapp/dist`) → `actions/deploy-pages`.
- **One-time manual:** repo Settings → Pages → Source = "GitHub Actions".
- Result URL: `https://fabianbormann.github.io/cardano-peer-connect/`.

## Testing

- **CI gate for the app:** `tsc --noEmit` + `vite build` must succeed (a broken
  demo must not deploy). Optionally a Playwright smoke test that the built app
  renders the connect panel + a peer id (no wallet needed) — added only if cheap.
- **Existing library e2e (11 tests):** untouched; still runs via `test.yml`.
- **On-chain round-trip:** manual — pair from a funded Preprod GeroWallet, run
  Run-all → signData → build+sign+submit, confirm the tx hash resolves on
  cardanoscan. Not automatable in CI (needs a funded wallet + live peer).

## Risks / dependencies

- **Deploys from `main`:** the deployed dApp uses this repo's library, so the
  in-flight CIP-45 fixes (esp. the `window.cardano` read-only guard, or the demo
  crashes on any multi-wallet page) must reach `main`/npm before the Pages site
  is useful. Flagged for the merge order.
- **Funded Preprod wallet** required for the submit step (faucet:
  https://docs.cardano.org/cardano-testnets/tools/faucet).
- Koios public rate limits — fine for demo traffic; note in the UI if a build
  call fails with 429.
```
