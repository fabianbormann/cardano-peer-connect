export default class AutoConnectHelper {
  private static autoConnectKey = 'cardano-peer-autoconnect-id';
  private static discoveryPeerIdKey = 'cardano-peer-discovery-id';
  private static walletDiscoveryPeerIdKey = 'cardano-wallet-discovery-address';

  public static addAutoConnectId = (id: string): void => {
    if (this.isAutoConnectId(id)) return;

    const ids = this.getAutoConnectIds();
    ids.push(id);
    localStorage.setItem(this.autoConnectKey, JSON.stringify(ids));
  };

  public static getAutoConnectIds = (): string[] => {
    return JSON.parse(localStorage.getItem(this.autoConnectKey) ?? '[]');
  };

  public static isAutoConnectId = (id: string): boolean => {
    return this.getAutoConnectIds().includes(id);
  };

  public static resetAutoConnectIds = (): void => {
    localStorage.setItem(this.autoConnectKey, JSON.stringify([]));
  };

  public static removeAutoConnectId = (id: string): void => {
    const ids = this.getAutoConnectIds();
    const index = ids.indexOf(id);
    if (index !== -1) {
      ids.splice(index, 1);
      localStorage.setItem(this.autoConnectKey, JSON.stringify(ids));
    }
  };

  public static saveDiscoveryPeerId = (id: string): void => {
    localStorage.setItem(this.discoveryPeerIdKey, id);
  };

  public static saveWalletDiscoveryPeerId = (id: string): void => {
    localStorage.setItem(this.walletDiscoveryPeerIdKey, id);
  };

  public static getWalletDiscoveryPeerId = (): string | null => {
    return localStorage.getItem(this.walletDiscoveryPeerIdKey);
  };
}
