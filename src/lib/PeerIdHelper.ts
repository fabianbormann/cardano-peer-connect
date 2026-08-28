import type { PeerConnectStorage } from '../types';

export const localStorageAdapter: PeerConnectStorage = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key),
};

function generateDeviceId(prefix: string): string {
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency ?? 'unknown'),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `${prefix}-${Math.abs(hash).toString(36)}-${Date.now().toString(24)}`;
}

export function getPersistentId(
  storageKey: string,
  prefix: string,
  storage: PeerConnectStorage = localStorageAdapter
): string {
  const stored = storage.get(storageKey);
  if (stored) return stored;
  const id = generateDeviceId(prefix);
  storage.set(storageKey, id);
  return id;
}
