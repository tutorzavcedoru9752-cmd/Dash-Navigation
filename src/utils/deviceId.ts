/**
 * Manages unique device identification in localStorage.
 * Ensures consistent bookmark configuration across VPN / IP changes.
 */
export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem('dash_device_id');
    if (existing && existing.trim().length > 0) {
      return existing.trim();
    }
    
    // Generate new UUID
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      
    localStorage.setItem('dash_device_id', newId);
    return newId;
  } catch (e) {
    return 'fallback_device_' + Date.now();
  }
}

export function saveDeviceId(id: string): void {
  try {
    localStorage.setItem('dash_device_id', id.trim());
  } catch (e) {
    console.error('Failed to save device id:', e);
  }
}

export function generateNewDeviceId(): string {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  saveDeviceId(newId);
  return newId;
}
