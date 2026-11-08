export const SETTINGS_KEY = 'ctf.v1';
export const SETTINGS_BACKUP_KEY = 'ctf.v1.corrupt';
export function loadSettings(storage, defaults) {
  let raw;
  try {
    raw = storage.getItem(SETTINGS_KEY);
  } catch {
    return {
      data: structuredClone(defaults),
      error: 'storage.unavailable'
    };
  }
  if (raw == null) return {
    data: structuredClone(defaults),
    error: null
  };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.settings || typeof parsed.settings !== 'object') throw new Error('Invalid settings');
    return {
      data: {
        settings: {
          ...defaults.settings,
          ...parsed.settings
        },
        self: {
          ...defaults.self,
          ...parsed.self
        },
        activeGroupId: parsed.activeGroupId ?? null
      },
      error: null
    };
  } catch {
    try {
      storage.setItem(SETTINGS_BACKUP_KEY, raw);
    } catch {
      /* Keep defaults even when backup storage is unavailable. */
    }
    return {
      data: structuredClone(defaults),
      error: 'storage.corruptSettings'
    };
  }
}
export function saveSettings(storage, {
  settings,
  self,
  activeGroupId
}) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({
      version: 1,
      settings,
      self,
      activeGroupId
    }));
    return {
      ok: true
    };
  } catch (error) {
    return {
      ok: false,
      error: error.name === 'QuotaExceededError' ? 'storage.errorQuota' : 'storage.errorWrite'
    };
  }
}
