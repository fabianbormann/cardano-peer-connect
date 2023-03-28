# Changelog

## [1.2.6](https://github.com/fabianbormann/cardano-peer-connect/compare/v1.2.5...v1.2.6) (2023-03-28)


### Features

* Allow to set discovery seed ([963c771](https://github.com/fabianbormann/cardano-peer-connect/commit/963c771394f35ef61923a43f237aa6b2762c4265))


### Bug Fixes

* Add defaul trackers and remove hardcoded trackers for discovery ([b1f54de](https://github.com/fabianbormann/cardano-peer-connect/commit/b1f54de894201a142ffda2c6e776346a6b89585a))
* add wallet information for autoconnect ([1315193](https://github.com/fabianbormann/cardano-peer-connect/commit/1315193fbd8c24db2d72f1d442db19cef2b9d59f))
* Set correct parameter in verifyConnection ([aff0fc6](https://github.com/fabianbormann/cardano-peer-connect/commit/aff0fc6e8c970068a8d9960c5f72580d55c5eaaf))

## [1.2.5](https://github.com/fabianbormann/cardano-peer-connect/compare/v1.2.4...v1.2.5) (2023-03-24)


### Features

* add a simple dapp e2e test and a testing pipeline ([c4efff5](https://github.com/fabianbormann/cardano-peer-connect/commit/c4efff5a62c4f6e930a014720321bd0505ea628f))
* add logger and refactor big index.ts in smaller modules. closes [#28](https://github.com/fabianbormann/cardano-peer-connect/issues/28) ([732fe10](https://github.com/fabianbormann/cardano-peer-connect/commit/732fe1026abf39641cf7ff6b0eb7cddabe3cf3a0))
* Allow api overwrite ([e9bb87b](https://github.com/fabianbormann/cardano-peer-connect/commit/e9bb87b72cf736ee60c3599f6133cc04ff7784b9))

## [1.2.4](https://github.com/fabianbormann/cardano-peer-connect/compare/v1.2.3...v1.2.4) (2023-03-21)


### Features

* Add bidirectional connection ([9c34b9c](https://github.com/fabianbormann/cardano-peer-connect/commit/9c34b9ce84427d476db501225d041e0630646b90))
* Add useWalletDiscovery parameter ([5f657ee](https://github.com/fabianbormann/cardano-peer-connect/commit/5f657ee71c5f35a18af8144c9828f6c828b92b19))


### Bug Fixes

* inject wallet names in lowercase into the window.cardano object to prevent an odd behavior ([7cccc15](https://github.com/fabianbormann/cardano-peer-connect/commit/7cccc15c36843d1447365d1a1dac0e99214016a8))

## [1.2.3](https://github.com/fabianbormann/cardano-peer-connect/compare/v1.2.2...v1.2.3) (2023-03-17)

### Features

* Allow injection of experimental features as defined in CIP30 ([faf773c](https://github.com/fabianbormann/cardano-peer-connect/commit/faf773c1b33d62368f479c14439a587e366e980c))

### Bug Fixes

* update outdated versions to trigger release that has not been built after the latest github actions run ([93b1c19](https://github.com/fabianbormann/cardano-peer-connect/commit/93b1c19a7f6aff8b74b4b6255e01765607f2ff63))

## [1.2.2](https://github.com/fabianbormann/cardano-peer-connect/compare/v1.2.1...v1.2.2) (2023-03-16)


### Features

* Add autoConnect to ConnectMessage ([c9e4a89](https://github.com/fabianbormann/cardano-peer-connect/commit/c9e4a892acd8341777ccdae9e47b22c43c3a2224))
* Add dependency for marble-identicons ([9171d60](https://github.com/fabianbormann/cardano-peer-connect/commit/9171d602e5e613185600e090ae523a74f1ef5b69))
* Add identicon ([460d5c2](https://github.com/fabianbormann/cardano-peer-connect/commit/460d5c235ec5afecfa3e3cef6db1ffdbf7ad92fb))
* Add requestAutoconnect property ([82b104c](https://github.com/fabianbormann/cardano-peer-connect/commit/82b104c9d7738e2ef1ca8c48e337160395e29faf))
* Added autoconnect implementation ([e1067d2](https://github.com/fabianbormann/cardano-peer-connect/commit/e1067d27ff0dc9c7b95df16e8ef7fa7f965e97e8))

## [1.2.1](https://github.com/fabianbormann/cardano-peer-connect/compare/v1.2.0...v1.2.1) (2023-03-08)


### Features

* add on injected callback ([f96a314](https://github.com/fabianbormann/cardano-peer-connect/commit/f96a3140c23e2e8afde72d39aaf6172454ea26f9))
* Check wallet name is not injected and is compliant ([076ec39](https://github.com/fabianbormann/cardano-peer-connect/commit/076ec395e36fa6696d97138f574c98c2d5d0d772))


### Bug Fixes

* remove last p2p occurrences ([832ffb5](https://github.com/fabianbormann/cardano-peer-connect/commit/832ffb5aea54c0152db778a03425de8992131121))
* use wallet icon for icon property ([c763e13](https://github.com/fabianbormann/cardano-peer-connect/commit/c763e13609433b5ac79c47ef75fd7d3d08c09119))

## [1.2.0](https://github.com/fabianbormann/cardano-peer-connect/compare/v1.0.0...v1.2.0) (2023-03-07)


### Bug Fixes

* increase minor version to prevent conflicts with the npmjs package history ([2351cb4](https://github.com/fabianbormann/cardano-peer-connect/commit/2351cb47609f48fd9e35902292af08957f927a0e))

## 1.0.0 (2023-03-07)


### ⚠ BREAKING CHANGES

* add onApiEject function and use named params
* the connect functions now returns the meerkats seed
* provide seed for a new meerkat

### Features

* add a basic class (interface) for dapps as well ([0d46e8d](https://github.com/fabianbormann/cardano-peer-connect/commit/0d46e8dfc1fe095921625de38f66a99fa3961a12))
* add basic implementation ([f6d4234](https://github.com/fabianbormann/cardano-peer-connect/commit/f6d423466cc5fc1b5ee17593ba8b5535d9eafc66))
* add callback functions ([5f4c9f5](https://github.com/fabianbormann/cardano-peer-connect/commit/5f4c9f5051ebc937ae61b03cfd68a0ced19f2190))
* add connect method to establish the connection before injecting the api ([0038a90](https://github.com/fabianbormann/cardano-peer-connect/commit/0038a9091b577b4d9e8729e3adc47a5ad1c52f06))
* add disconnect method ([80916dd](https://github.com/fabianbormann/cardano-peer-connect/commit/80916ddf09103617e90833fd8a24107407095850))
* add enable and isEnable function to be cip30 compliant ([ef2213c](https://github.com/fabianbormann/cardano-peer-connect/commit/ef2213c6293ef7e92bc2efeb7d83536bd0ee468d))
* Add lifecycle callbacks & subscriber info of the connection ([8d48a8f](https://github.com/fabianbormann/cardano-peer-connect/commit/8d48a8f869ec54754c7270308844d32b6ab1532a))
* add onApiEject function and use named params ([a87c22e](https://github.com/fabianbormann/cardano-peer-connect/commit/a87c22e3bcba2ae6d3aa53db0475dfd873dba8db))
* add qr code generator to dapp interface ([4f0fa87](https://github.com/fabianbormann/cardano-peer-connect/commit/4f0fa8725cb71679c4365eb73cface7a972d7b15))
* **ci:** add github actions for creating a release and publish the bundle to npmjs ([fc94058](https://github.com/fabianbormann/cardano-peer-connect/commit/fc9405843b8e396b179efd978322f0c6249b2dee))
* link the demo repository ([e73fb1a](https://github.com/fabianbormann/cardano-peer-connect/commit/e73fb1af2095872fc8dbdf0a7c49d42eff853de5))
* provide bundle for browser imports ([94ac549](https://github.com/fabianbormann/cardano-peer-connect/commit/94ac5497327dcb1ca08ee6273225dbce6930343f))
* provide seed for a new meerkat ([48d3777](https://github.com/fabianbormann/cardano-peer-connect/commit/48d37770b36ca0a395d709d7ee08fa47d4dcf7f6))
* reduce the amount of listeners ([aa10cb0](https://github.com/fabianbormann/cardano-peer-connect/commit/aa10cb085a52459541c314c7f0c5b5af88e28d96))
* result of the cip30 functions should be async ([a93c753](https://github.com/fabianbormann/cardano-peer-connect/commit/a93c753c616c370a0d52f1e15c3fd7e0be41f4de))
* the connect functions now returns the meerkats seed ([03acaca](https://github.com/fabianbormann/cardano-peer-connect/commit/03acacaf2d2d9e205e193c09b556d50873bf7133))


### Bug Fixes

* add bundle file ([036d3c0](https://github.com/fabianbormann/cardano-peer-connect/commit/036d3c0a2b996d227151561633fef81699a6059e))
* add new bundle version ([b403c1e](https://github.com/fabianbormann/cardano-peer-connect/commit/b403c1ed90213040342ee4b88bd8e7b2651752ef))
* add Readme.md ([f93c06c](https://github.com/fabianbormann/cardano-peer-connect/commit/f93c06c69d9690471ede68f2c3ddc891d9b9a3e0))
* args are now correctly passed to their cip30 function ([fc36b22](https://github.com/fabianbormann/cardano-peer-connect/commit/fc36b22c3c4d35a0ae058eb2c30b3d6bb24321c1))
* resolve bug in invoke function with no params ([86baf7a](https://github.com/fabianbormann/cardano-peer-connect/commit/86baf7a7e2a9d2dfb336bf05c34933d6b4dd3e49))
* seed handling in constructor ([5d25c2c](https://github.com/fabianbormann/cardano-peer-connect/commit/5d25c2c83681750318b7e12a0ee656393408935c))
* use splice instead of slice ([eebad69](https://github.com/fabianbormann/cardano-peer-connect/commit/eebad698b75d76684ed3c9382045cacbb5be9108))
