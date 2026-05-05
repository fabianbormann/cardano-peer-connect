# Cardano Peer Connect

<p align="left">
<img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/fabianbormann/cardano-peer-connect/test.yml?label=Tests&style=for-the-badge" />
<img alt="Release" src="https://img.shields.io/github/actions/workflow/status/fabianbormann/cardano-peer-connect/release.yml?label=Release&style=for-the-badge" />
<img alt="Bundle" src="https://img.shields.io/github/actions/workflow/status/fabianbormann/cardano-peer-connect/bundle.yml?label=Bundle&style=for-the-badge" />
<img alt="Publish" src="https://img.shields.io/github/actions/workflow/status/fabianbormann/cardano-peer-connect/publish.yml?label=Publish&style=for-the-badge" />
<a href="https://conventionalcommits.org"><img alt="conventionalcommits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&style=for-the-badge" /></a>
</p>

An updated [CIP-0045](https://github.com/cardano-foundation/CIPs/pull/395) implementation that lets wallets and DApps communicate directly over WebRTC using [PeerJS](https://peerjs.com) as the signaling layer. Previously WebTorrents were used but the user experience wasn't great and sometimes the connection would fail to establish. Some WebTorrent libraries became outdated and unmaintained. This updated approach is more robust and works across all major browsers.

## How it works

```
Wallet                          Signaling server              DApp
  │                                    │                        │
  │   new Peer(walletId)               │                        │
  │──────────────────────────────────> │                        │
  │                                    │   new Peer(dappId)     │
  │                                    │ <──────────────────────│
  │                                    │                        │
  │      wallet.connect(dappId)        │                        │
  │──────────────────────────────────> │ ──────────────────────>│
  │                                    │    WebRTC offer/answer │
  │ <──────────────────────────────────────────────────────────>│
  │                                    │                        │
  │◄══════════════ direct WebRTC data channel ════════════════► │
  │                                    │                        │
  │  connect RPC → DApp accepts        │                        │
  │  injectApi RPC → window.cardano[walletName] populated       │
  │                                    │                        │
```

The signaling server is only used to broker the initial WebRTC handshake. All CIP-30 traffic flows through the encrypted peer-to-peer data channel.

## Installation

```sh
npm install @fabianbormann/cardano-peer-connect
```

## DApp integration

```typescript
import { DAppPeerConnect } from '@fabianbormann/cardano-peer-connect';

const dAppConnect = new DAppPeerConnect({
  dAppInfo: {
    name: 'My DApp',
    url: 'https://my-dapp.io',
  },

  // Called when a wallet tries to connect. Omit to accept all connections.
  verifyConnection: (walletInfo, callback) => {
    const granted = window.confirm(
      `Connect wallet "${walletInfo.name}"?`
    );
    callback(granted, false);
  },

  onConnect: (address, walletInfo) => {
    console.log('Wallet connected:', walletInfo?.name, address);
  },

  onDisconnect: (address) => {
    console.log('Wallet disconnected:', address);
  },

  // Called once window.cardano[walletName] has been populated.
  onApiInject: (walletName, address) => {
    console.log(`${walletName} API ready`);
  },

  onApiEject: (walletName, address) => {
    console.log(`${walletName} API removed`);
  },
});

// Show the peer ID to the user (as text or QR code) so the wallet can connect.
console.log('DApp peer ID:', dAppConnect.getAddress());
dAppConnect.generateQRCode(document.getElementById('qr-code'));

// After onApiInject fires, call CIP-30 methods through window.cardano:
//
//   const api = await window.cardano['my-p2p-wallet'].enable();
//   const networkId = await api.getNetworkId();
```

### DAppPeerConnect parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `dAppInfo` | `{ name, url, icon? }` | Metadata shown to the connecting wallet. |
| `verifyConnection` | `(walletInfo, callback) => void` | Optional gating function. Call `callback(true, allowAutoConnect)` to accept. |
| `onConnect` | `(address, walletInfo?) => void` | Fires when a wallet establishes the connection. |
| `onDisconnect` | `(address) => void` | Fires when the wallet disconnects. |
| `onApiInject` | `(name, address) => void` | Fires when `window.cardano[name]` has been populated. |
| `onApiEject` | `(name, address) => void` | Fires when the wallet API has been removed from `window.cardano`. |
| `useWalletDiscovery` | `boolean` | Enable auto-connect via a stored wallet discovery peer ID. Default: `false`. |
| `walletDiscoveryPeerId` | `string` | Initial wallet discovery peer ID to connect to when `useWalletDiscovery` is `true`. |
| `peerJsConfig` | `PeerOptions` | PeerJS configuration. Defaults to the public `0.peerjs.com` server. |
| `loggingEnabled` | `boolean` | Enable console logging. |

## Wallet integration

Extend `CardanoPeerConnect` and implement all CIP-30 methods:

```typescript
import {
  CardanoPeerConnect,
  IConnectMessage,
} from '@fabianbormann/cardano-peer-connect';

class MyWallet extends CardanoPeerConnect {
  constructor() {
    super(
      {
        name: 'my-p2p-wallet',  // must contain 'p2p'
        version: '1.0.0',
        icon: 'data:image/png;base64,...',
        requestAutoconnect: false,
      },
      {
        // peerJsConfig: { ... },  // optional; defaults to 0.peerjs.com
      }
    );
  }

  // ── CIP-30 implementation ────────────────────────────────────

  async getNetworkId(): Promise<number> {
    return 1; // mainnet
  }

  async getUtxos(amount?, paginate?): Promise<Cbor[] | null> {
    return myWalletApi.getUtxos(amount, paginate);
  }

  async getBalance(): Promise<Cbor> {
    return myWalletApi.getBalance();
  }

  async getUsedAddresses(): Promise<Cbor[]> {
    return myWalletApi.getUsedAddresses();
  }

  async getUnusedAddresses(): Promise<Cbor[]> {
    return myWalletApi.getUnusedAddresses();
  }

  async getChangeAddress(): Promise<Cbor> {
    return myWalletApi.getChangeAddress();
  }

  async getRewardAddresses(): Promise<Cbor[]> {
    return myWalletApi.getRewardAddresses();
  }

  async getCollateral(params?): Promise<Cbor[] | null> {
    return myWalletApi.getCollateral(params);
  }

  async signTx(tx: Cbor, partialSign: boolean): Promise<Cbor> {
    return myWalletApi.signTx(tx, partialSign);
  }

  async signData(addr: string, payload: Bytes): Promise<Cip30DataSignature> {
    return myWalletApi.signData(addr, payload);
  }

  async submitTx(tx: Cbor): Promise<string> {
    return myWalletApi.submitTx(tx);
  }
}
```

Connect to a DApp by passing its peer ID:

```typescript
const wallet = new MyWallet();

wallet.setOnConnect((message: IConnectMessage) => {
  if (message.connected) {
    console.log('Connected to DApp:', message.dApp.name);
  } else {
    console.warn('Connection rejected:', message.errorMessage);
  }
});

wallet.setOnDisconnect((message: IConnectMessage) => {
  console.log('Disconnected from DApp');
});

// dappPeerId comes from scanning the DApp's QR code or copy-pasting the peer ID
wallet.connect(dappPeerId);
```

### CardanoPeerConnect methods

| Method | Description |
|--------|-------------|
| `connect(dappPeerId)` | Connect to a DApp peer ID. Returns the wallet's own peer ID. |
| `disconnect(address)` | Gracefully disconnect from the current DApp. |
| `injectApi(overwrite?)` | Push the CIP-30 API to the DApp. Called automatically after a successful connect. |
| `getDiscoveryAddress()` | Returns the wallet's discovery peer ID used for auto-connect. |
| `setOnConnect(callback)` | Register a callback for connection events. |
| `setOnDisconnect(callback)` | Register a callback for disconnect events. |
| `setOnServerShutdown(callback)` | Register a callback for when the DApp shuts down. |
| `setOnApiInject(callback)` | Register a callback for when the API injection completes. |
| `setExperimentalApi(container)` | Attach an `ExperimentalContainer` exposed via `api.experimental`. |
| `setEnableExperimentalApi(container)` | Attach an `ExperimentalContainer` exposed via `enable().experimental`. |
| `generateIdenticon()` | Generate a connection identicon from the wallet + DApp peer IDs. |
| `getIdenticon()` | Returns the base64 identicon string, or `null` if not yet generated. |

## Using a self-hosted signaling server

By default both sides connect to the public PeerJS server at `0.peerjs.com`. For production you should run your own. The `peer` npm package provides one:

```sh
npx peerjs --port 9000
```

Then pass `peerJsConfig` to both sides:

```typescript
const peerJsConfig = {
  host: 'your-signaling-server.example.com',
  port: 443,
  path: '/',
  secure: true,
};

// DApp
const dAppConnect = new DAppPeerConnect({ dAppInfo, peerJsConfig, ... });

// Wallet
class MyWallet extends CardanoPeerConnect {
  constructor() {
    super(walletInfo, { peerJsConfig });
  }
}
```

## Local development

Start a local signaling server and a static file server, then open the test pages in separate browser tabs:

```sh
npx peerjs --port 9000   # signaling server
npx serve . --listen 3000 # static files
```

Open `http://localhost:3000/test/e2e/test_dApp.html` in one tab and `http://localhost:3000/test/e2e/test_wallet.html` in another, paste the DApp peer ID into the wallet page and click **Connect**.

## Running tests

```sh
npm test
```

The Playwright test suite starts both servers automatically and runs three end-to-end tests:

1. DApp initialises, shows a valid peer ID, and renders a QR code.
2. DApp and wallet exchange a `getNetworkId` call over a live WebRTC connection.
3. DApp and wallet complete a full `signData` roundtrip and the decoded signature is verified.
