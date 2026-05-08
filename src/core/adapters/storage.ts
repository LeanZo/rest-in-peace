import { isTauri } from "./platform";

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

class LocalStorageAdapter implements StorageAdapter {
  private prefix = "rip:";

  async get<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(this.prefix + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        result.push(key.substring(this.prefix.length));
      }
    }
    return result;
  }
}

class TauriStorageAdapter implements StorageAdapter {
  private store: Awaited<ReturnType<typeof import("@tauri-apps/plugin-store").Store.load>> | null = null;

  private async getStore() {
    if (!this.store) {
      const { Store } = await import("@tauri-apps/plugin-store");
      this.store = await Store.load("rest-in-peace-data.json");
    }
    return this.store;
  }

  async get<T>(key: string): Promise<T | null> {
    const store = await this.getStore();
    const value = await store.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const store = await this.getStore();
    await store.set(key, value);
    await store.save();
  }

  async delete(key: string): Promise<void> {
    const store = await this.getStore();
    await store.delete(key);
    await store.save();
  }

  async keys(): Promise<string[]> {
    const store = await this.getStore();
    return store.keys();
  }
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!adapter) {
    adapter = isTauri() ? new TauriStorageAdapter() : new LocalStorageAdapter();
  }
  return adapter;
}
