export default class AutoConnectHelper {
  private static storageKey = 'cardano-peer-autoconnect-id';
  private static discoveryStorageKey = 'cardano-peer-discovery-id';
  private static walletDiscoveryStorageKey = 'cardano-wallet-discovery-address';

  public static addAutoConnectId = (id: string): void => {
    let autoConnectIds = [];

    const ids = localStorage.getItem(this.storageKey);

    if (ids !== null) {
      autoConnectIds = JSON.parse(ids);
    }

    if (this.isAutoConnectId(id)) {
      return;
    }

    autoConnectIds.push(id);

    localStorage.setItem(this.storageKey, JSON.stringify(autoConnectIds));
  };

  public static getAutoConnectIds = (): string[] => {
    return JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
  };

  public static isAutoConnectId = (id: string): boolean => {
    return this.getAutoConnectIds().includes(id);
  };

  public static resetAutoConnectIds = (): void => {
    localStorage.setItem(this.storageKey, JSON.stringify([]));
  };

  public static removeAutoConnectId = (id: string): void => {
    let autoConnectIds = [];
    const ids = localStorage.getItem(this.storageKey);

    if (ids !== null) {
      autoConnectIds = JSON.parse(ids);
    }

    const index = autoConnectIds.indexOf(id);

    if (index !== -1) {
      autoConnectIds = autoConnectIds.splice(index, 1);

      localStorage.setItem(this.storageKey, JSON.stringify(autoConnectIds));
      return;
    }
  };

  public static saveWalletAutoDiscoverySeed = (id: string): void => {
    localStorage.setItem(this.discoveryStorageKey, id);
  };

  public static getWalletAutoDiscoverySeed = (): string | null => {
    return localStorage.getItem(this.discoveryStorageKey);
  };

  public static saveWalletDiscoveryAddress = (id: string): void => {
    localStorage.setItem(this.walletDiscoveryStorageKey, id);
  };

  public static getWalletDiscoveryAddress = (): string | null => {
    return localStorage.getItem(this.walletDiscoveryStorageKey);
  };
}
