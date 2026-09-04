# CIP-45 React Demo dApp

A deployable demo dApp that connects to a CIP-45 wallet (e.g. GeroWallet) over
WebRTC, exercises every CIP-30 method, and builds/signs/**submits** a real
self-send transaction with metadata on **Preprod** using
[Evolution SDK](https://github.com/anastasia-labs/lucid-evolution). Submission
goes through the wallet's `submitTx`; the provider (a keyless Blockfrost-compatible
endpoint) is used only to read protocol parameters while building.

Live: https://fabianbormann.github.io/cardano-peer-connect/

## Local development

```bash
# from the repo root — build the library first (the app depends on file:../..)
npm ci && npm run build

cd examples/react-dapp
npm install
npm run dev
```

Open the printed localhost URL, then pair from the wallet using the shown peer
ID (or QR). You need a **funded Preprod wallet** to submit the transaction
(faucet: https://docs.cardano.org/cardano-testnets/tools/faucet).

## Configuration (Vite env vars)

| Var | Default | Purpose |
| --- | --- | --- |
| `VITE_PROVIDER_URL` | `https://node0-showcase.yano-x.io/api/v1` | Blockfrost-compatible base URL for protocol params |
| `VITE_PROVIDER_KEY` | `` (empty) | project id; yano-x is keyless |
| `VITE_PEERJS_HOST` / `_PORT` / `_PATH` | CF signaling server | CIP-45 signaling |

Set them in `examples/react-dapp/.env.local` (gitignored).

### Provider CORS

The provider must send `Access-Control-Allow-Origin` on its responses or the
browser blocks it (Koios and some Blockfrost-compatible nodes don't by default).
If yano-x CORS is temporarily unavailable, run a local ACAO proxy and point the
app at it:

```bash
# minimal local proxy on :8888 that adds ACAO and forwards to yano-x
npx local-cors-proxy --proxyUrl https://node0-showcase.yano-x.io --port 8888
# then, in .env.local:
#   VITE_PROVIDER_URL=http://localhost:8888/proxy/api/v1
```

(or the equivalent Cloudflare Transform Rule on the provider side for production).

## Deployment

Pushed to `main`, the `.github/workflows/deploy-demo.yml` workflow builds the
library, then this app (`vite build`, `base: /cardano-peer-connect/`), and
publishes to GitHub Pages. One-time: repo **Settings → Pages → Source = GitHub
Actions**.
