# Cardano Peer Connect

<p align="left">
<img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/fabianbormann/cardano-peer-connect/test.yml?label=Tests&style=for-the-badge" />
<img alt="Release" src="https://img.shields.io/github/actions/workflow/status/fabianbormann/cardano-peer-connect/release.yml?label=Release&style=for-the-badge" />
<img alt="Bundle" src="https://img.shields.io/github/actions/workflow/status/fabianbormann/cardano-peer-connect/bundle.yml?label=Bundle&style=for-the-badge" />
<img alt="Publish" src="https://img.shields.io/github/actions/workflow/status/fabianbormann/cardano-peer-connect/publish.yml?label=Publish&style=for-the-badge" />
<a href="https://conventionalcommits.org"><img alt="conventionalcommits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&style=for-the-badge" /></a>
</p>

This library aims to provide simple interfaces to implement [CIP-0045](https://github.com/cardano-foundation/CIPs/pull/395) for dApps and wallets.
If you want to see `cardano-peer-connect` in action, please visit the [cip-0045-demo-implementation](https://github.com/fabianbormann/cip-0045-demo-implementation) repository.

<img src="https://user-images.githubusercontent.com/1525818/209772566-54ac650b-efb2-4f84-8f7b-eaeedb6f5f90.gif" width="600" />

## Getting Started

```zsh
npm i @fabianbormann/cardano-peer-connect
```

### Infos for usage in the wallet

Extend the base CardanoPeerConnect class for your wallet:

```js
class BoostPeerConnect extends CardanoPeerConnect {
  constructor(name: string, apiVersion: string, icon: string) {
    super({
      name: name,
      version: apiVersion,
      icon: icon,
    });

    //further actions to let you wallet know about the new connection
    // ...
  }

  // and implement all CIP-30 functions
  getRewardAddresses(): Promise<Cbor[]> {
    return new Promise((resolve, reject) => {
      //in here you determine the reward addresses for yur wallet used
      const rewardAddresses = [
        'e1820506cb0ce54ae75.....7265e8792cb86afc94e0872',
      ];

      return resolve(rewardAddresses);
    });
  }

  //...
}
```

Then create an instance of that class in your code and add a callback to let your wallet know about the connection status.

```js
import {
  CardanoPeerConnect,
  DAppPeerConnect,
} from '@fabianbormann/cardano-peer-connect';
import { IConnectMessage } from '@fabianbormann/cardano-peer-connect/dist/src/types';

// the id the dapp is showing you.
const dAppIdentifier = 'bYUh6Bn6A........388LR1JCrED';

peerConnect.value = new BoostPeerConnect(
  'Your wallet name',
  '1.0.1',
  '<img src="data:image/png;base64,iVB.....>' //your wallet logo
);

/**
 * Define a callback to handle all connection attempts. This will be called by the DApp when a connection is
 * tried to be established.
 */
peerConnect.value.setOnConnect((message: IConnectMessage) => {
  connectStatus.value = message;

  if (!message.dApp.address) {
    // every dapp should send some infos about it.
  }

  if (message.dApp.address !== dAppIdentifier) {
    // the connected dapp id should match the one that the user requested
  }

  if (message.error) {
    //handle the connection error (message.errorMessage)
  }

  //now handle the message and show which dapp was connected to your wallet
});

// finally try to connect to the dapp
const seed = peerConnect.value.connect(
  dAppIdentifier,
  [
    'https://pro.passwordchaos.gimbalabs.io',
    'wss://tracker.files.fm:7073/announce',
    'wss://tracker.btorrent.xyz',
    'ws://tracker.files.fm:7072/announce',
    'wss://tracker.openwebtorrent.com:443/announce',
  ],
  getPeerSeed()
);

//seed will be the unique connection id between you and the dapp
//The connection is not yet established. The user needs to grant the permission to establish the connection on the
//dapp side. See next section on how a DApp must implement this.
```

### Infos for usage in DApp site

This is the necessary minimal implementation a DApp provider has to do, to get his app connected to peer connect.

```html
<script src="https://fabianbormann.github.io/cardano-peer-connect/latest/index.js"></script>
<script>

  // Give your app some basic information that will be displayed to the client wallet when he is connecting to your DApp.
  const dAppInfo: IDAppInfos = {
    name: 'An awesome DApp',
    url: 'http://an-awesome-dapp-url.tld/'
  }

  // Define a function that will be called when the client tries to connect to your DApp.
  const verifyConnection = (
    walletInfo: IWalletInfo,
    callback: (granted: boolean) => void
  ) => {
    callback(//
      window.confirm(`Do you want to connect to wallet ${walletInfo.name} (${walletInfo.address})?`)
    );

  const dAppConnect = new DAppPeerConnect({
    dAppInfo: dAppInfo,
    verifyConnection: verifyConnection,
    onApiInject: onApiInject, // will be call when api was successfully injected
    onApiEject: onApiEject,   // will be call when api was ejected
  });

  // This is the code (identifier) that the client needs to enter into the wallet to connect to your dapp
  const clientConnectCode = dAppConnect.getAddress()

  // Create and insert a QR code on your DApp, so the user can scan it easily in their app
  dAppConnect.generateQRCode(document.getElementById('qr-code'));

  //after the api was injected you cann call all cip-30 function on window.cardanop2p as you would on window.cardano
</script>
```
