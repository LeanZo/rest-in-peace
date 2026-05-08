import { create } from "zustand";
import type { CookieData } from "@/core/models/cookie";
import type { EntityId } from "@/core/models/primitives";
import { mergeCookies, getCookiesForUrl } from "@/core/services/cookie-jar";
import { getStorage } from "@/core/adapters/storage";

interface CookieState {
  jars: Map<EntityId, CookieData[]>;

  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;

  getCookiesForCollection: (collectionId: EntityId) => CookieData[];
  getCookiesForRequest: (collectionId: EntityId, url: string) => CookieData[];
  storeCookiesFromResponse: (collectionId: EntityId, cookies: CookieData[]) => void;
  addCookie: (collectionId: EntityId, cookie: CookieData) => void;
  updateCookie: (collectionId: EntityId, index: number, cookie: CookieData) => void;
  deleteCookie: (collectionId: EntityId, index: number) => void;
  clearJar: (collectionId: EntityId) => void;
}

export const useCookieStore = create<CookieState>((set, get) => ({
  jars: new Map(),

  loadFromStorage: async () => {
    const storage = getStorage();
    const data = await storage.get<[EntityId, CookieData[]][]>("cookies");
    if (data) set({ jars: new Map(data) });
  },

  saveToStorage: async () => {
    const storage = getStorage();
    await storage.set("cookies", [...get().jars.entries()]);
  },

  getCookiesForCollection: (collectionId) => {
    return get().jars.get(collectionId) ?? [];
  },

  getCookiesForRequest: (collectionId, url) => {
    const cookies = get().jars.get(collectionId) ?? [];
    return getCookiesForUrl(cookies, url);
  },

  storeCookiesFromResponse: (collectionId, cookies) => {
    if (cookies.length === 0) return;
    set((s) => {
      const newJars = new Map(s.jars);
      const existing = newJars.get(collectionId) ?? [];
      newJars.set(collectionId, mergeCookies(existing, cookies));
      return { jars: newJars };
    });
    get().saveToStorage();
  },

  addCookie: (collectionId, cookie) => {
    set((s) => {
      const newJars = new Map(s.jars);
      const existing = newJars.get(collectionId) ?? [];
      newJars.set(collectionId, [...existing, cookie]);
      return { jars: newJars };
    });
    get().saveToStorage();
  },

  updateCookie: (collectionId, index, cookie) => {
    set((s) => {
      const newJars = new Map(s.jars);
      const existing = [...(newJars.get(collectionId) ?? [])];
      if (index >= 0 && index < existing.length) {
        existing[index] = cookie;
        newJars.set(collectionId, existing);
      }
      return { jars: newJars };
    });
    get().saveToStorage();
  },

  deleteCookie: (collectionId, index) => {
    set((s) => {
      const newJars = new Map(s.jars);
      const existing = [...(newJars.get(collectionId) ?? [])];
      existing.splice(index, 1);
      newJars.set(collectionId, existing);
      return { jars: newJars };
    });
    get().saveToStorage();
  },

  clearJar: (collectionId) => {
    set((s) => {
      const newJars = new Map(s.jars);
      newJars.set(collectionId, []);
      return { jars: newJars };
    });
    get().saveToStorage();
  },
}));
