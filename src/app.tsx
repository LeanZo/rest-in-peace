import { useEffect } from "react";
import { AppLayout } from "@/layouts/app-layout";
import { MainContent } from "@/layouts/main-content";
import { TopBar } from "@/components/top-bar/top-bar";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CenterPanel } from "@/components/center-panel";
import { HistoryPanel } from "@/components/history/history-panel";
import { EnvManager } from "@/components/environments/env-manager";
import { StatusBar } from "@/components/status-bar";
import { useCollectionStore } from "@/stores/collection-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useHistoryStore } from "@/stores/history-store";
import { useCookieStore } from "@/stores/cookie-store";
import { useUIStore } from "@/stores/ui-store";
import { useRequestStore } from "@/stores/request-store";

export function App() {
  useEffect(() => {
    const load = async () => {
      await Promise.all([
        useCollectionStore.getState().loadFromStorage(),
        useCollectionStore.getState().loadExpandedState(),
        useEnvironmentStore.getState().loadFromStorage(),
        useHistoryStore.getState().loadFromStorage(),
        useCookieStore.getState().loadFromStorage(),
      ]);
      const requests = useCollectionStore.getState().requests;
      await useRequestStore.getState().loadTabState(requests);
    };
    load();
  }, []);

  const envManagerOpen = useUIStore((s) => s.envManagerOpen);
  const setEnvManagerOpen = useUIStore((s) => s.setEnvManagerOpen);
  const activeCollectionId = useRequestStore((s) => {
    if (!s.activeTabId) return null;
    return s.drafts.get(s.activeTabId)?.collectionId ?? null;
  });

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
    </AppLayout>
  );
}
