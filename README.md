# Cardano Peer Connect

<p align="left">
<img alt="semantic-release: angular" src="https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release" />
</p>

This library aims to provide simple interfaces to implement [CIP-????](https://github.com/cardano-foundation/CIPs/pull/395) for dApps and wallets.
If you want to see ```cardano-peer-connect``` in action, please visit the [cip-xxxx-demo-implementation](https://github.com/fabianbormann/cip-xxxx-demo-implementation) repository.

<img src="https://user-images.githubusercontent.com/1525818/209772566-54ac650b-efb2-4f84-8f7b-eaeedb6f5f90.gif" width="600" />

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
