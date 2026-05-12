import { useEffect } from "react";
import { AppLayout } from "@/layouts/app-layout";
import { MainContent } from "@/layouts/main-content";
import { TopBar } from "@/components/top-bar/top-bar";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CenterPanel } from "@/components/center-panel";
import { HistoryPanel } from "@/components/history/history-panel";
import { EnvManager } from "@/components/environments/env-manager";
import { SettingsManager } from "@/components/settings/settings-manager";
import { StatusBar } from "@/components/status-bar";
import { useCollectionStore } from "@/stores/collection-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useHistoryStore } from "@/stores/history-store";
import { useCookieStore } from "@/stores/cookie-store";
import { useUIStore } from "@/stores/ui-store";
import { useRequestStore } from "@/stores/request-store";
import { useSettingsStore } from "@/stores/settings-store";
import { checkAndDownload } from "@/core/services/updater";

export function App() {
  useEffect(() => {
    const load = async () => {
      await Promise.all([
        useCollectionStore.getState().loadFromStorage(),
        useCollectionStore.getState().loadExpandedState(),
        useEnvironmentStore.getState().loadFromStorage(),
        useHistoryStore.getState().loadFromStorage(),
        useCookieStore.getState().loadFromStorage(),
        useSettingsStore.getState().loadFromStorage(),
      ]);
      const requests = useCollectionStore.getState().requests;
      await useRequestStore.getState().loadTabState(requests);

      if (useSettingsStore.getState().autoUpdate) {
        checkAndDownload();
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  const envManagerOpen = useUIStore((s) => s.envManagerOpen);
  const setEnvManagerOpen = useUIStore((s) => s.setEnvManagerOpen);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const activeTab = useRequestStore((s) =>
    s.openTabs.find((t) => t.id === s.activeTabId),
  );
  const draftCollectionId = useRequestStore((s) =>
    s.activeTabId ? s.drafts.get(s.activeTabId)?.collectionId ?? null : null,
  );
  const folderCollectionId = useCollectionStore((s) =>
    activeTab?.type === "folder" ? s.folders.get(activeTab.entityId)?.collectionId ?? null : null,
  );
  const activeCollectionId = activeTab?.type === "collection"
    ? activeTab.entityId
    : activeTab?.type === "folder"
      ? folderCollectionId
      : draftCollectionId;

  return (
    <AppLayout
      topBar={<TopBar />}
      statusBar={<StatusBar />}
    >
      <MainContent
        sidebar={<Sidebar />}
        center={<CenterPanel />}
        rightPanel={<HistoryPanel />}
      />
      <EnvManager
        isOpen={envManagerOpen}
        onClose={() => setEnvManagerOpen(false)}
        collectionId={activeCollectionId}
      />
      <SettingsManager
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </AppLayout>
  );
}
