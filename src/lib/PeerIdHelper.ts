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
    hash = hash & hash; // 32-bit integer
  }

  const deviceHash = Math.abs(hash).toString(36);
  const timestamp = Date.now().toString(24);
  return `${prefix}-${deviceHash}-${timestamp}`;
}

/**
 * Returns a persistent peer ID for the given localStorage key.
 * On first call the ID is generated from a device fingerprint and stored;
 * subsequent calls return the same stored value.
 *
 * The seed parameter (when provided) is used as a namespace in the storage
 * key so that different seed values yield independent stable identities,
 * preserving backwards-compatible behaviour with the previous meerkat seed.
 */
export function getPersistentId(storageKey: string, prefix: string): string {
  const stored = localStorage.getItem(storageKey);
  if (stored) return stored;
  const id = generateDeviceId(prefix);
  localStorage.setItem(storageKey, id);
  return id;
}
