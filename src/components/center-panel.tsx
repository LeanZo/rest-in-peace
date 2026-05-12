import { useCallback, useMemo } from "react";
import ripIcon from "@/media/images/REST in Peace - Outline - 90.png";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useRequestStore } from "@/stores/request-store";
import { useExecutionStore } from "@/stores/execution-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useCollectionStore } from "@/stores/collection-store";
import { useCookieStore } from "@/stores/cookie-store";
import { useHistoryStore } from "@/stores/history-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { RequestPanel } from "./request/request-panel";
import { ResponsePanel } from "./response/response-panel";
import { DocsPanel } from "./docs/docs-panel";
import type { RequestConfig } from "@/core/models/request";
import { extractRouteParams } from "@/core/services/url-parser";

const IDLE_EXECUTION = {
  status: "idle" as const,
  response: null,
  resolvedRequest: null,
  error: null,
  startedAt: null,
  completedAt: null,
};

export function CenterPanel() {
  const activeTabId = useRequestStore((s) => s.activeTabId);
  const drafts = useRequestStore((s) => s.drafts);
  const openTabs = useRequestStore((s) => s.openTabs);
  const updateDraft = useRequestStore((s) => s.updateDraft);
  const updateRequest = useCollectionStore((s) => s.updateRequest);

  const sendRequest = useExecutionStore((s) => s.sendRequest);
  const cancelRequest = useExecutionStore((s) => s.cancelRequest);
  const executions = useExecutionStore((s) => s.executions);

  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);
  const getCookies = useCookieStore((s) => s.getCookiesForCollection);
  const storeCookies = useCookieStore((s) => s.storeCookiesFromResponse);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const activeTab = useMemo(
    () => openTabs.find((t) => t.id === activeTabId),
    [openTabs, activeTabId],
  );
  const draft = useMemo(
    () => (activeTabId ? drafts.get(activeTabId) : undefined),
    [drafts, activeTabId],
  );
  const execution = useMemo(
    () => (activeTabId ? (executions.get(activeTabId) ?? IDLE_EXECUTION) : IDLE_EXECUTION),
    [executions, activeTabId],
  );

  const handleSend = useCallback(async () => {
    const tabId = useRequestStore.getState().activeTabId;
    const currentTab = useRequestStore.getState().openTabs.find((t) => t.id === tabId);
    if (!tabId || !currentTab || currentTab.type !== "request") return;

    const currentDraft = useRequestStore.getState().drafts.get(tabId);
    if (!currentDraft) return;

    const exec = useExecutionStore.getState().executions.get(tabId);
    if (exec?.status === "sending") {
      cancelRequest(tabId);
      return;
    }

    updateRequest(currentDraft.id, currentDraft);

    const collection = useCollectionStore
      .getState()
      .collections.find((c) => c.id === currentDraft.collectionId);

    const variables = getActiveVariables(
      currentDraft.collectionId,
      collection?.activeEnvironmentId ?? null,
    );
    const cookies = getCookies(currentDraft.collectionId);

    await sendRequest(tabId, currentDraft, variables, cookies);

    const result = useExecutionStore.getState().executions.get(tabId);
    if (result?.response) {
      if (result.response.cookies.length > 0) {
        storeCookies(currentDraft.collectionId, result.response.cookies);
      }

      const env = collection?.activeEnvironmentId
        ? useEnvironmentStore.getState().getEnvironment(collection.activeEnvironmentId)
        : undefined;

      const activeRouteParamNames = new Set(extractRouteParams(currentDraft.url));
      const activeRouteParams: Record<string, string> = {};
      for (const [name, value] of Object.entries(currentDraft.routeParams)) {
        if (activeRouteParamNames.has(name)) {
          activeRouteParams[name] = value;
        }
      }

      addHistoryEntry(
        currentDraft.id,
        currentDraft.collectionId,
        result.resolvedRequest!,
        result.response,
        env?.name ?? null,
        {
          method: currentDraft.method,
          url: currentDraft.url,
          headers: currentDraft.headers,
          params: currentDraft.params,
          body: currentDraft.body,
          auth: currentDraft.auth,
          routeParams: activeRouteParams,
        },
      );
    }
  }, [sendRequest, cancelRequest, updateRequest, getActiveVariables, getCookies, storeCookies, addHistoryEntry]);

  useKeyboardShortcuts({ onSend: handleSend });

  if (!activeTab || !activeTabId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-text-muted/20 mb-4">
            <div
              className="mx-auto"
              style={{
                width: 256,
                height: 256,
                WebkitMaskImage: `url(${ripIcon})`,
                maskImage: `url(${ripIcon})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                backgroundColor: "currentColor",
              }}
            />
          </div>
          <h2 className="text-lg font-semibold text-text-secondary mb-1">
            REST in Peace
          </h2>
          <p className="text-sm text-text-muted">
            Select or create a request to get started
          </p>
        </div>
      </div>
    );
  }

  if (activeTab.type === "collection" || activeTab.type === "folder") {
    return <DocsPanel key={activeTab.id} tabId={activeTab.id} type={activeTab.type} entityId={activeTab.entityId} />;
  }

  if (!draft) return null;

  const handleUpdate = (patch: Partial<RequestConfig>) => {
    updateDraft(activeTabId, patch);
  };

  return (
    <PanelGroup direction="vertical" className="h-full">
      <Panel defaultSize={55} minSize={25}>
        <RequestPanel
          draft={draft}
          isLoading={execution.status === "sending"}
          onUpdate={handleUpdate}
          onSend={handleSend}
        />
      </Panel>

      <PanelResizeHandle className="h-px bg-border-subtle hover:bg-accent-purple/50 transition-colors data-[resize-handle-active]:bg-accent-purple" />

      <Panel defaultSize={45} minSize={20}>
        <ResponsePanel execution={execution} />
      </Panel>
    </PanelGroup>
  );
}
