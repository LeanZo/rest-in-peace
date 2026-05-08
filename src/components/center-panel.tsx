import { useCallback, useMemo } from "react";
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
import type { RequestConfig } from "@/core/models/request";

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

  const draft = useMemo(
    () => (activeTabId ? drafts.get(activeTabId) : undefined),
    [drafts, activeTabId],
  );
  const activeTab = useMemo(
    () => openTabs.find((t) => t.id === activeTabId),
    [openTabs, activeTabId],
  );
  const execution = useMemo(
    () => (activeTabId ? (executions.get(activeTabId) ?? IDLE_EXECUTION) : IDLE_EXECUTION),
    [executions, activeTabId],
  );

  const handleSend = useCallback(async () => {
    const tabId = useRequestStore.getState().activeTabId;
    const currentDraft = tabId ? useRequestStore.getState().drafts.get(tabId) : null;
    if (!tabId || !currentDraft) return;

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

      addHistoryEntry(
        currentDraft.id,
        currentDraft.collectionId,
        result.resolvedRequest!,
        result.response,
        env?.name ?? null,
      );
    }
  }, [sendRequest, cancelRequest, updateRequest, getActiveVariables, getCookies, storeCookies, addHistoryEntry]);

  useKeyboardShortcuts({ onSend: handleSend });

  if (!draft || !activeTab || !activeTabId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-text-muted/20 mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" className="mx-auto">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
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
