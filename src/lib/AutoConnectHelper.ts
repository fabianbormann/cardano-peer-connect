import type { PeerConnectStorage } from '../types';
import { localStorageAdapter } from './PeerIdHelper';

export default class AutoConnectHelper {
  private static autoConnectKey = 'cardano-peer-autoconnect-id';
  private static discoveryPeerIdKey = 'cardano-peer-discovery-id';
  private static walletDiscoveryPeerIdKey = 'cardano-wallet-discovery-address';

  private static storage: PeerConnectStorage = localStorageAdapter;

  public static setStorage(storage: PeerConnectStorage): void {
    this.storage = storage;
  }

  public static addAutoConnectId = (id: string): void => {
    if (this.isAutoConnectId(id)) return;

    const ids = this.getAutoConnectIds();
    ids.push(id);
    this.storage.set(this.autoConnectKey, JSON.stringify(ids));
  };

  public static getAutoConnectIds = (): string[] => {
    return JSON.parse(this.storage.get(this.autoConnectKey) ?? '[]');
  };

  public static isAutoConnectId = (id: string): boolean => {
    return this.getAutoConnectIds().includes(id);
  };

  public static resetAutoConnectIds = (): void => {
    this.storage.set(this.autoConnectKey, JSON.stringify([]));
  };

  public static removeAutoConnectId = (id: string): void => {
    const ids = this.getAutoConnectIds();
    const index = ids.indexOf(id);
    if (index !== -1) {
      ids.splice(index, 1);
      this.storage.set(this.autoConnectKey, JSON.stringify(ids));
    }
  };

  public static saveDiscoveryPeerId = (id: string): void => {
    this.storage.set(this.discoveryPeerIdKey, id);
  };

  public static saveWalletDiscoveryPeerId = (id: string): void => {
    this.storage.set(this.walletDiscoveryPeerIdKey, id);
  };

  public static getWalletDiscoveryPeerId = (): string | null => {
    return this.storage.get(this.walletDiscoveryPeerIdKey);
  };
}
