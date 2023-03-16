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

export type PeerConnectApi = {
  apiVersion: string;
  name: string;
  icon: string;
  methods: Array<Cip30Function>;
};

export type Cip30Api = {
  enable: () => Promise<{
    [key in Cip30Function]?: Function;
  }>;
  isEnabled: () => Promise<boolean>;
  apiVersion: string;
  icon: string;
  name: string;
  identifier: string;
};

export interface IDAppInfos {

  name: string,
  url: string,
  address?: string
}

export interface IConnectMessage {

  dApp: IDAppInfos
  address?: string,
  connected: boolean,
  error: boolean,
  errorMessage?: string,
  autoConnect?: boolean

}

export interface IWalletInfo {

  address?: string,
  name: string,
  version: string,
  icon: string
  requestAutoconnect?: boolean
}


export interface DAppPeerConnectParameters {
  dAppInfo: IDAppInfos,
  seed?: string;
  announce?: Array<string>;
  loggingEnabled?: boolean;
  verifyConnection?: (
    walletInfo: IWalletInfo,
    callback: (granted: boolean, allowAutoConnect: boolean) => void
  ) => void;
  onConnect?: (address: string) => void;
  onDisconnect?: (address: string) => void;
  onApiEject?: (name: string, address: string) => void;
  onApiInject?: (name: string, address: string) => void;
}
