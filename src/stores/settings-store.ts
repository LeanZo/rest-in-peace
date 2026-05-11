import { create } from "zustand";
import { getStorage } from "@/core/adapters/storage";

interface SettingsState {
  keepHistory: boolean;
  autoUpdate: boolean;

  updateAvailable: boolean;
  updateReady: boolean;
  updateVersion: string | null;
  updateNotes: string | null;
  checkingForUpdates: boolean;
  downloadingUpdate: boolean;
  updateError: boolean;
  upToDate: boolean;

  setKeepHistory: (value: boolean) => void;
  setAutoUpdate: (value: boolean) => void;
  setUpdateStatus: (status: {
    updateAvailable?: boolean;
    updateReady?: boolean;
    updateVersion?: string | null;
    updateNotes?: string | null;
    checkingForUpdates?: boolean;
    downloadingUpdate?: boolean;
    updateError?: boolean;
    upToDate?: boolean;
  }) => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

interface PersistedSettings {
  keepHistory: boolean;
  autoUpdate: boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  keepHistory: true,
  autoUpdate: true,

  updateAvailable: false,
  updateReady: false,
  updateVersion: null,
  updateNotes: null,
  checkingForUpdates: false,
  downloadingUpdate: false,
  updateError: false,
  upToDate: false,

  setKeepHistory: (value) => {
    set({ keepHistory: value });
    get().saveToStorage();
  },

  setAutoUpdate: (value) => {
    set({ autoUpdate: value });
    get().saveToStorage();
  },

  setUpdateStatus: (status) => set(status),

  loadFromStorage: async () => {
    const data = await getStorage().get<PersistedSettings>("settings");
    if (data) {
      set({
        keepHistory: data.keepHistory ?? true,
        autoUpdate: data.autoUpdate ?? true,
      });
    }
  },

  saveToStorage: async () => {
    const { keepHistory, autoUpdate } = get();
    await getStorage().set<PersistedSettings>("settings", {
      keepHistory,
      autoUpdate,
    });
  },
}));
