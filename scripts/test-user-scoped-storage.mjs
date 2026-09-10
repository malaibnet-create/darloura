import assert from 'node:assert/strict';

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

globalThis.window = {
  localStorage: new MemoryStorage(),
  sessionStorage: new MemoryStorage(),
  dispatchEvent() {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

const {
  scopedStorageKey,
  setActiveLearningUser,
  userSessionStorage,
  userStorage,
} = await import('../lib/user-scoped-storage.mjs');

window.localStorage.setItem('shared-progress-key', 'legacy-unscoped-value');

setActiveLearningUser('student-a');
userStorage.setItem('shared-progress-key', 'student-a-value');
userSessionStorage.setItem('draft', 'student-a-draft');

setActiveLearningUser('student-b');
assert.equal(userStorage.getItem('shared-progress-key'), null, 'Student B must not see Student A progress.');
assert.equal(userSessionStorage.getItem('draft'), null, 'Student B must not see Student A session drafts.');
userStorage.setItem('shared-progress-key', 'student-b-value');

setActiveLearningUser('student-a');
assert.equal(userStorage.getItem('shared-progress-key'), 'student-a-value');
assert.equal(userSessionStorage.getItem('draft'), 'student-a-draft');

setActiveLearningUser(null);
assert.equal(userStorage.getItem('shared-progress-key'), null, 'Guest storage must be isolated from signed-in students.');
assert.equal(window.localStorage.getItem('shared-progress-key'), 'legacy-unscoped-value', 'Old unscoped data must not be claimed by a student automatically.');

assert.notEqual(
  scopedStorageKey('same-key', 'user:student-a'),
  scopedStorageKey('same-key', 'user:student-b'),
  'Each student must receive a unique physical storage key.',
);

console.log('User-scoped storage isolation tests passed.');

