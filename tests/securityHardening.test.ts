import assert from 'node:assert/strict';
import test from 'node:test';
import { clearCachedUser, readCachedUser, writeCachedUser } from '../src/lib/auth/authHelpers';

class TestStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

test('cached auth shell omits sensitive profile fields and never uses persistent storage', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const localStorage = new TestStorage();
  const sessionStorage = new TestStorage();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage, sessionStorage },
  });

  try {
    writeCachedUser({
      id: 'user-1',
      username: 'safe-name',
      name: 'Safe Name',
      email: 'private@example.test',
      bio: 'private bio',
      college: 'private college',
      coinsBalance: 99,
      isVerified: true,
    });

    assert.deepEqual(readCachedUser(), {
      id: 'user-1',
      username: 'safe-name',
      name: 'Safe Name',
      isVerified: true,
    });
    assert.equal(localStorage.length, 0);
    clearCachedUser();
    assert.equal(sessionStorage.length, 0);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
