import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  historyPanelOpen: boolean;
  envManagerOpen: boolean;
  activeRequestTab: string;
  activeResponseTab: string;

  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  toggleHistoryPanel: () => void;
  setEnvManagerOpen: (open: boolean) => void;
  setActiveRequestTab: (tab: string) => void;
  setActiveResponseTab: (tab: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  sidebarWidth: 260,
  historyPanelOpen: false,
  envManagerOpen: false,
  activeRequestTab: "params",
  activeResponseTab: "body",

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  toggleHistoryPanel: () =>
    set((s) => ({ historyPanelOpen: !s.historyPanelOpen })),

  setEnvManagerOpen: (open) => set({ envManagerOpen: open }),

  setActiveRequestTab: (tab) => set({ activeRequestTab: tab }),
  setActiveResponseTab: (tab) => set({ activeResponseTab: tab }),
}));
