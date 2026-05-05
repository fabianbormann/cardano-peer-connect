import Peer from 'peerjs';
import type { DataConnection, PeerOptions } from 'peerjs';
import type {
  PeerConnectApi,
  DAppPeerConnectParameters,
  Cip30Api,
  Cip30Function,
  IConnectMessage,
  IDAppInfos,
  IWalletInfo,
} from './types';
import QRCode from 'qrcode-svg';
import { Value, buildApiCalls } from './lib/ExperimentalContainer';
import AutoConnectHelper from './lib/AutoConnectHelper';
import PeerConnectIdenticon from './lib/PeerConnectIdenticon';
import { Logger, LogLevel } from './lib/Logger';
import { PeerRpc } from './lib/PeerRpc';
import { getPersistentId } from './lib/PeerIdHelper';

export default class DAppPeerConnect {
  private peer: Peer;
  private walletDiscoveryPeer: Peer | null = null;

  private activeRpc: PeerRpc | null = null;
  private connectedWallet: string | null = null;

  protected enableLogging: boolean = false;
  protected logger: Logger;
  protected logLevel: LogLevel = 'info';
  protected readonly dAppInfo: IDAppInfos;
  protected identicon: string | null = null;

  protected onConnect?: (address: string, walletInfo?: IWalletInfo) => void;
  protected onDisconnect?: (address: string) => void;
  protected onApiEject?: (name: string, address: string) => void;
  protected onApiInject?: (name: string, address: string) => void;

  private readonly peerJsConfig: PeerOptions;
  private readonly discoverySeed: string | undefined;

  /**
   * Creates the DApp's outbound discovery peer that connects to the wallet's
   * discovery address and triggers auto-connect.
   */
  private setUpDiscoveryPeer = (address?: string) => {
    const walletDiscoveryAddress =
      address ?? AutoConnectHelper.getWalletDiscoveryAddress();
    if (!walletDiscoveryAddress) return;

    this.logger.debug(
      'DApp: setting up discovery peer targeting wallet at',
      walletDiscoveryAddress
    );

    if (this.walletDiscoveryPeer && !this.walletDiscoveryPeer.destroyed) {
      this.walletDiscoveryPeer.destroy();
    }

    const storageKey = `peer-connect-dapp-discovery${
      this.discoverySeed ? `-${this.discoverySeed}` : ''
    }-id`;
    const discoveryId = getPersistentId(storageKey, 'dapp-disc');
    AutoConnectHelper.saveWalletAutoDiscoverySeed(discoveryId);

    this.walletDiscoveryPeer = new Peer(discoveryId, this.peerJsConfig);

    this.walletDiscoveryPeer.on('open', () => {
      if (!this.walletDiscoveryPeer) return;

      this.logger.debug(
        'DApp: discovery peer open, connecting to wallet discovery:',
        walletDiscoveryAddress
      );

      const conn = this.walletDiscoveryPeer.connect(walletDiscoveryAddress, {
        reliable: true,
      });
      const rpc = new PeerRpc(conn, this.logger);

      conn.on('open', () => {
        this.logger.debug(
          'DApp: discovery connected to wallet, calling connect RPC'
        );
        rpc.call(
          'connect',
          { dappAddress: this.peer.id },
          (status: any) => {
            this.logger.debug('DApp: discovery connect RPC response:', status);
          }
        );
      });

      conn.on('data', (data: unknown) => rpc.onData(data));
      conn.on('error', (err: Error) =>
        this.logger.warn('DApp: discovery connection error', err)
      );
    });

    this.walletDiscoveryPeer.on('error', (err: Error) => {
      this.logger.warn('DApp: discovery peer error', err);
    });
  };

  public setLogLevel = (level: LogLevel) => {
    this.logLevel = level;
    this.logger.logLevel = level;
  };

  constructor({
    dAppInfo,
    seed,
    discoverySeed,
    announce,
    loggingEnabled,
    verifyConnection,
    onConnect,
    onDisconnect,
    onApiEject,
    onApiInject,
    useWalletDiscovery,
    peerJsConfig,
  }: DAppPeerConnectParameters) {
    if (loggingEnabled) {
      this.enableLogging = loggingEnabled;
    }

    this.logger = new Logger({
      scope: 'DAppPeerConnect',
      logLevel: 'info',
      enabled: loggingEnabled,
    });

    if (announce) {
      this.logger.warn(
        'DApp: the announce option (WebTorrent trackers) is no longer supported. Use peerJsConfig to configure a PeerJS server.'
      );
    }

    this.discoverySeed = discoverySeed;
    this.peerJsConfig = peerJsConfig ?? {};

    const storageKey = `peer-connect-dapp${seed ? `-${seed}` : ''}-id`;
    const persistentId = getPersistentId(storageKey, 'dapp');

    this.peer = new Peer(persistentId, this.peerJsConfig);

    this.dAppInfo = { ...dAppInfo, address: persistentId };

    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
    this.onApiEject = onApiEject;
    this.onApiInject = onApiInject;

    this.logger.info(`DApp peer ID: ${persistentId}`);

    this.peer.on('open', (id: string) => {
      this.logger.info('DApp peer server ready, ID:', id);
      this.dAppInfo.address = id;
    });

    this.peer.on('connection', (conn: DataConnection) => {
      this.logger.info('DApp: incoming wallet connection from', conn.peer);
      this.setUpWalletConnection(conn, verifyConnection, useWalletDiscovery);
    });

    this.peer.on('error', (err: Error) => {
      this.logger.error('DApp peer error:', err);
    });

    this.peer.on('disconnected', () => {
      this.logger.warn('DApp peer disconnected from signaling server');
    });

    if (useWalletDiscovery) {
      setTimeout(() => {
        this.setUpDiscoveryPeer(discoverySeed);
      }, 1000);
    }
  }

  private setUpWalletConnection(
    conn: DataConnection,
    verifyConnection: DAppPeerConnectParameters['verifyConnection'],
    useWalletDiscovery: DAppPeerConnectParameters['useWalletDiscovery']
  ) {
    const rpc = new PeerRpc(conn, this.logger);

    conn.on('open', () => {
      this.logger.info('DApp: wallet connection established with', conn.peer);

      const globalCardano = (window as any).cardano || {};
      if (
        Object.keys(globalCardano).find(
          (k) => globalCardano[k].identifier === conn.peer
        )
      ) {
        this.logger.info(`Saw address ${conn.peer}`);
      } else {
        this.logger.info(
          `Saw address ${conn.peer} but it has not injected its API yet`
        );
      }
    });

    conn.on('close', () => {
      this.logger.info('DApp: wallet connection closed:', conn.peer);
      this.leftServer(conn.peer);
      if (this.activeRpc === rpc) {
        rpc.destroy();
        this.activeRpc = null;
      }
    });

    conn.on('error', (err: Error) => {
      this.logger.error('DApp: wallet connection error:', err);
    });

    conn.on('data', (data: unknown) => rpc.onData(data));

    rpc.register(
      'connect',
      (
        address: string,
        walletInfo: IWalletInfo,
        callback: (args: IConnectMessage) => void
      ) => {
        if (!this.connectedWallet) {
          const connectWallet = (
            granted: boolean,
            allowAutoConnect: boolean = false,
            connectedWalletInfo?: IWalletInfo
          ) => {
            if (walletInfo.requestAutoconnect && granted && allowAutoConnect) {
              AutoConnectHelper.addAutoConnectId(address);
            }

            if (granted) {
              this.connectedWallet = address;
              this.activeRpc = rpc;
              this.logger.info(`Successfully connected ${this.connectedWallet}`);

              callback({
                dApp: this.dAppInfo,
                address,
                connected: true,
                error: false,
                autoConnect: allowAutoConnect,
              });

              this.generateIdenticon();

              if (this.onConnect) {
                this.onConnect(address, connectedWalletInfo);
              }
            } else {
              callback({
                dApp: this.dAppInfo,
                address,
                connected: false,
                error: true,
                errorMessage: `User denied connection to ${address}`,
                autoConnect: allowAutoConnect,
              });
              this.logger.info(`User denied connection to ${address}`);
            }
          };

          if (typeof verifyConnection !== 'undefined') {
            if (AutoConnectHelper.isAutoConnectId(address)) {
              connectWallet(true, true, walletInfo);
            } else {
              verifyConnection({ ...walletInfo, address }, connectWallet);
            }
          } else {
            connectWallet(true);
          }
        } else if (this.connectedWallet === address) {
          this.logger.info(
            `Connection already established to ${address}.`
          );
          callback({
            address,
            dApp: this.dAppInfo,
            connected: true,
            error: false,
          });
        } else {
          callback({
            dApp: this.dAppInfo,
            address,
            connected: false,
            error: false,
            errorMessage:
              'Connection failed. Another wallet has already been connected to this dApp.',
          });
          this.logger.info(
            'Connection failed. Another wallet has already been connected to this dApp.'
          );
        }
      }
    );

    rpc.register(
      'disconnect',
      (
        address: string,
        _walletInfo: IWalletInfo,
        callback: (args: IConnectMessage) => void
      ) => {
        if (this.connectedWallet) {
          if (this.connectedWallet !== address) {
            this.logger.info(
              `Unregistered address ${address} is calling disconnect.`
            );
            callback({
              dApp: this.dAppInfo,
              connected: false,
              error: true,
              errorMessage: `Unregistered address ${address} is calling disconnect.`,
            });
            return;
          }

          this.logger.info(
            `Wallet ${this.connectedWallet} is calling disconnect.`
          );
          callback({ dApp: this.dAppInfo, connected: false, error: false });
          this.leftServer(address);
          this.connectedWallet = null;
          return;
        }

        this.logger.info('Calling disconnect with no connected wallet.');
        callback({
          dApp: this.dAppInfo,
          connected: false,
          error: true,
          errorMessage: 'No wallet is connected.',
        });
      }
    );

    rpc.register(
      'setDiscovery',
      (
        _address: string,
        args: { walletDiscoveryAddress: string },
        callback: (args: boolean) => void
      ) => {
        this.logger.debug('DApp: setDiscovery with:', args);

        if (useWalletDiscovery) {
          AutoConnectHelper.saveWalletDiscoveryAddress(
            args.walletDiscoveryAddress
          );
          return callback(true);
        } else {
          return callback(false);
        }
      }
    );

    rpc.register(
      'api',
      (
        address: string,
        args: { api: PeerConnectApi; overwrite?: boolean },
        callback: (args: IConnectMessage) => void
      ) => {
        if (address !== this.connectedWallet) return;

        const injectedClients = this.getInjectedApis();
        if (injectedClients.indexOf(address) !== -1 && !args.overwrite) {
          this.logger.info(`${address} already injected`);
          return;
        }

        const api: {
          [key in Cip30Function | 'experimental']?:
            | Function
            | Record<string, Value>;
        } = {};

        for (const method of args.api.methods) {
          api[method] = (...params: Array<any>) =>
            new Promise((resolve) => {
              rpc.call('invoke', [method, ...params], (result: any) =>
                resolve(result)
              );
            });
        }

        const initialExperimentalApi = buildApiCalls(
          rpc,
          args.api.experimentalApi,
          'invokeExperimental'
        );

        const fullExperimentalApi = buildApiCalls(
          rpc,
          args.api.fullExperimentalApi,
          'invokeEnableExperimental'
        );

        api['experimental'] = fullExperimentalApi;

        const cip30Api: Cip30Api = {
          apiVersion: args.api.apiVersion,
          name: args.api.name,
          icon: args.api.icon,
          identifier: address,
          experimental: initialExperimentalApi,
          isEnabled: () => Promise.resolve(true),
          enable: () => Promise.resolve(api),
        };

        if (this.isWalletNameInjected(args.api.name) && !args.overwrite) {
          this.logger.info(
            `Not injecting wallet api. API for wallet '${args.api.name}' is already injected.`
          );
          return callback({
            dApp: this.dAppInfo,
            connected: false,
            error: true,
            errorMessage: `Wallet with name ${args.api.name} is already injected.`,
          });
        }

        if (!this.isP2pWalletCompliantName(args.api.name)) {
          this.logger.warn(
            `Injected wallet does not contain 'p2p' in name, this is discouraged.`
          );
        }

        (window as any).cardano = (window as any).cardano || {};
        (window as any).cardano[args.api.name.toLowerCase()] = cip30Api;
        this.logger.info(
          `injected api of ${args.api.name} into window.cardano`
        );

        callback({ dApp: this.dAppInfo, connected: true, error: false });

        if (this.onApiInject) {
          this.onApiInject(args.api.name, address);
        }
      }
    );
  }

  private leftServer = (address: string) => {
    if (address === this.connectedWallet) {
      this.connectedWallet = null;

      if (this.onDisconnect) {
        this.onDisconnect(address);
      }

      const globalCardano = (window as any).cardano || {};
      const apiName = Object.keys(globalCardano).find(
        (k) => globalCardano[k].identifier === address
      );
      if (apiName) {
        this.logger.info(
          `${address} disconnected. ${apiName} removed from window.cardano`
        );
        delete (window as any).cardano[apiName.toLowerCase()];
        if (this.onApiEject) {
          this.onApiEject(apiName, address);
        }
      } else {
        this.logger.info(`${address} disconnected. Cleanup was not necessary.`);
      }
    }
  };

  public shutdownServer = () => {
    if (this.connectedWallet && this.activeRpc) {
      const status: IConnectMessage = {
        connected: false,
        error: false,
        errorMessage: 'Server is closing connections.',
        dApp: this.dAppInfo,
      };
      this.activeRpc.call('shutdown', status, () => {});
    }
  };

  private getInjectedApis(): string[] {
    const globalCardano = (window as any).cardano || {};
    return Object.keys(globalCardano)
      .filter((k) => typeof globalCardano[k].identifier === 'string')
      .map((k) => globalCardano[k].identifier as string);
  }

  private isWalletNameInjected = (name: string) => {
    const globalCardano = (window as any).cardano || {};
    return Object.keys(globalCardano).find((k) => k === name.toLowerCase());
  };

  private isP2pWalletCompliantName = (name: string) => name.includes('p2p');

  generateQRCode(canvas: HTMLElement) {
    const data = `${this.peer.id}:peerjs:${Date.now()}`;
    const qrcode = new QRCode({
      content: data,
      padding: 4,
      width: 256,
      height: 256,
      color: '#000000',
      background: '#ffffff',
      ecl: 'M',
    });
    canvas.innerHTML = qrcode.svg();
  }

  getConnectedWallet() {
    return this.connectedWallet;
  }

  getAddress() {
    return this.peer.id;
  }

  /** Returns the DApp's persistent peer ID (replaces the former meerkat seed). */
  getSeed() {
    return this.peer.id;
  }

  public generateIdenticon = () => {
    this.identicon = PeerConnectIdenticon.getBase64Identicon(
      this.connectedWallet + this.getAddress()
    );
  };

  public getIdenticon = () => this.identicon;
}
