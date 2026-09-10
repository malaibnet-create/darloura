const STORAGE_PREFIX = 'darlugha:v2';
const ACTIVE_IDENTITY_KEY = 'darlugha:active-storage-identity:v2';
const GUEST_IDENTITY = 'guest';

let activeIdentity = null;

function browserWindow() {
  return typeof window === 'undefined' ? null : window;
}

function normalizeUserId(userId) {
  if (typeof userId !== 'string') return null;
  const value = userId.trim();
  return value ? `user:${value}` : null;
}

function readRememberedIdentity() {
  const browser = browserWindow();
  if (!browser?.sessionStorage) return GUEST_IDENTITY;
  try {
    const remembered = browser.sessionStorage.getItem(ACTIVE_IDENTITY_KEY);
    return remembered === GUEST_IDENTITY || remembered?.startsWith('user:')
      ? remembered
      : GUEST_IDENTITY;
  } catch {
    return GUEST_IDENTITY;
  }
}

export function getActiveLearningIdentity() {
  if (!activeIdentity) activeIdentity = readRememberedIdentity();
  return activeIdentity;
}

export function setActiveLearningUser(userId) {
  const browser = browserWindow();
  const nextIdentity = normalizeUserId(userId) || GUEST_IDENTITY;
  const previousIdentity = getActiveLearningIdentity();
  activeIdentity = nextIdentity;

  if (browser?.sessionStorage) {
    try {
      browser.sessionStorage.setItem(ACTIVE_IDENTITY_KEY, nextIdentity);
    } catch {
      // Storage can be unavailable in strict privacy modes. The in-memory
      // identity still keeps the current page isolated.
    }
  }

  if (browser && previousIdentity !== nextIdentity) {
    browser.dispatchEvent(new CustomEvent('darlugha-storage-identity-changed', {
      detail: { identity: nextIdentity },
    }));
  }

  return nextIdentity;
}

export function scopedStorageKey(key, identity = getActiveLearningIdentity()) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(identity)}:${key}`;
}

function createScopedStorage(storageName) {
  function storage() {
    const browser = browserWindow();
    return browser?.[storageName] || null;
  }

  return Object.freeze({
    getItem(key) {
      try {
        return storage()?.getItem(scopedStorageKey(key)) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        storage()?.setItem(scopedStorageKey(key), String(value));
      } catch {
        // Lesson progress should remain usable when browser storage is blocked.
      }
    },
    removeItem(key) {
      try {
        storage()?.removeItem(scopedStorageKey(key));
      } catch {
        // Removing a missing or unavailable key is intentionally harmless.
      }
    },
  });
}

export const userStorage = createScopedStorage('localStorage');
export const userSessionStorage = createScopedStorage('sessionStorage');

