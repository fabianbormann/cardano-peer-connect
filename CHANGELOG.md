# Changelog

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
