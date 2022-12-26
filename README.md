# Cardano Peer Connect

This library aims to provide simple interfaces to implement [CIP-????](https://github.com/cardano-foundation/CIPs/pull/395) for dApps and wallets.

## Getting Started

```zsh
npm i @fabianbormann/cardano-peer-connect
```

### ES6/ES7

```js
import { CardanoPeerConnect, DAppPeerConnect } from '@fabianbormann/cardano-peer-connect';

class BoostPeerConnect extends CardanoPeerConnect {
  apiVersion: string = '1.0.0';
  name: string = 'MyWallet';
  icon: string = 'data:image/svg+xml,%3Csvg%20xmlns...';

  getRewardAddresses(): string[] { ... }
  ...
}
```

### Browser

```html
<script src="https://fabianbormann.github.io/cardano-peer-connect/bundle.min.js"></script>
<script>
  const dAppConnect = new CardanoPeerConnect.DAppPeerConnect();

  dAppConnect.generateQRCode(document.getElementById('qr-code'));
  document.getElementById('address').innerText = dAppConnect.getAddress();
</script>
```
