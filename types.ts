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

export interface DAppPeerConnectParameters {
  seed?: string;
  announce?: Array<string>;
  loggingEnabled?: boolean;
  verifyConnection?: (
    address: string,
    callback: (granted: boolean) => void
  ) => void;
  onConnect?: (address: string) => void;
  onDisconnect?: (address: string) => void;
  onApiEject?: (name: string, address: string) => void;
  onApiInject?: (name: string, address: string) => void;
}
