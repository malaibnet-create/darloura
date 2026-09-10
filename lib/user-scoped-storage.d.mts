export type LearningStorageIdentity = 'guest' | `user:${string}`;

export type UserScopedStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function getActiveLearningIdentity(): LearningStorageIdentity;
export function setActiveLearningUser(userId: string | null | undefined): LearningStorageIdentity;
export function scopedStorageKey(key: string, identity?: LearningStorageIdentity): string;

export const userStorage: UserScopedStorage;
export const userSessionStorage: UserScopedStorage;

