import { Value } from './lib/ExperimentalContainer';

export type Cip30Function =
  | 'getNetworkId'
  | 'getUtxos'
  | 'getCollateral'
  | 'getBalance'
  | 'getUsedAddresses'
  | 'getUnusedAddresses'
  | 'getChangeAddress'
  | 'getRewardAddresses'
  | 'signTx'
  | 'signData'
  | 'submitTx';

export type ExperimentalRpcEndpoint =
  | 'invokeExperimental'
  | 'invokeEnableExperimental';

export type Cbor = string;
export type Bytes = string;

export type Paginate = {
  page: number;
  limit: number;
};

type CoseSign1CborHex = string;
type CoseKeyCborHex = string;

export type Cip30DataSignature = {
  key: CoseKeyCborHex;
  signature: CoseSign1CborHex;
};

export type deviceType = 'mobile' | 'desktop'
export type mobileOsType = 'ios' | 'android'
export type appType = 'browser' | 'pwa' | 'native'

export type osInfo = {
  deviceType: deviceType,
  mobileOsType?: mobileOsType,
  mobileType?: appType,
  url?: String
}

export type PeerConnectApi = {
  apiVersion: string;
  name: string;
  icon: string;
  methods: Array<Cip30Function>;
  experimentalApi: string; // This is a serialized TypeMapping
  fullExperimentalApi: string; // This is a serialized TypeMapping
};

export type Cip30Api = {
  enable: () => Promise<{
    [key in Cip30Function | 'experimental']?: Function | Record<string, Value>;
  }>;
  isEnabled: () => Promise<boolean>;
  experimental: Record<string, Value>;
  apiVersion: string;
  icon: string;
  name: string;
  identifier: string;
};

export interface IDAppInfos {
  name: string;
  url: string;
  address: string;
  icon?: string;
}

export interface IConnectMessage {
  dApp: IDAppInfos;
  address?: string;
  connected: boolean;
  error: boolean;
  errorMessage?: string;
  autoConnect?: boolean;
}

export interface IWalletInfo {
  address?: string;
  name: string;
  version: string;
  icon: string;
  requestAutoconnect?: boolean;
  osInfo?: osInfo
}

export interface DAppPeerConnectParameters {
  dAppInfo: Omit<IDAppInfos, 'address'>;
  seed?: string;
  discoverySeed?: string;
  announce?: Array<string>;
  loggingEnabled?: boolean;
  verifyConnection?: (
    walletInfo: IWalletInfo,
    callback: (granted: boolean, allowAutoConnect: boolean, walletInfo?: IWalletInfo) => void
  ) => void;
  onConnect?: (address: string, walletInfo?: IWalletInfo) => void;
  onDisconnect?: (address: string) => void;
  onApiEject?: (name: string, address: string) => void;
  onApiInject?: (name: string, address: string) => void;
  useWalletDiscovery?: boolean;
}
