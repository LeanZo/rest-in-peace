import { create } from "zustand";
import type { ResponseData } from "@/core/models/response";
import type { RequestConfig, ResolvedRequest } from "@/core/models/request";
import type { EnvironmentVariable } from "@/core/models/environment";
import type { CookieData } from "@/core/models/cookie";
import { executeRequest } from "@/core/services/request-executor";

type ExecutionStatus = "idle" | "sending" | "success" | "error" | "cancelled";

interface Execution {
  status: ExecutionStatus;
  response: ResponseData | null;
  resolvedRequest: ResolvedRequest | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

interface ExecutionState {
  executions: Map<string, Execution>;
  abortControllers: Map<string, AbortController>;

  sendRequest: (
    tabId: string,
    request: RequestConfig,
    variables: EnvironmentVariable[],
    cookies: CookieData[],
  ) => Promise<void>;
  cancelRequest: (tabId: string) => void;
  clearExecution: (tabId: string) => void;
  getExecution: (tabId: string) => Execution;
}

const IDLE_EXECUTION: Execution = {
  status: "idle",
  response: null,
  resolvedRequest: null,
  error: null,
  startedAt: null,
  completedAt: null,
};

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  executions: new Map(),
  abortControllers: new Map(),

  sendRequest: async (tabId, request, variables, cookies) => {
    get().cancelRequest(tabId);

    const controller = new AbortController();
    set((s) => {
      const newExecs = new Map(s.executions);
      newExecs.set(tabId, {
        status: "sending",
        response: null,
        resolvedRequest: null,
        error: null,
        startedAt: Date.now(),
        completedAt: null,
      });
      const newAbort = new Map(s.abortControllers);
      newAbort.set(tabId, controller);
      return { executions: newExecs, abortControllers: newAbort };
    });

    try {
      const result = await executeRequest(
        request,
        variables,
        cookies,
        controller.signal,
      );

      set((s) => {
        const newExecs = new Map(s.executions);
        newExecs.set(tabId, {
          status: "success",
          response: result.response,
          resolvedRequest: result.resolvedRequest,
          error: null,
          startedAt: s.executions.get(tabId)?.startedAt ?? null,
          completedAt: Date.now(),
        });
        return { executions: newExecs };
      });
    } catch (err) {
      if (controller.signal.aborted) {
        set((s) => {
          const newExecs = new Map(s.executions);
          newExecs.set(tabId, {
            status: "cancelled",
            response: null,
            resolvedRequest: null,
            error: "Request cancelled",
            startedAt: s.executions.get(tabId)?.startedAt ?? null,
            completedAt: Date.now(),
          });
          return { executions: newExecs };
        });
        return;
      }

      set((s) => {
        const newExecs = new Map(s.executions);
        newExecs.set(tabId, {
          status: "error",
          response: null,
          resolvedRequest: null,
          error: err instanceof Error ? err.message : "Request failed",
          startedAt: s.executions.get(tabId)?.startedAt ?? null,
          completedAt: Date.now(),
        });
        return { executions: newExecs };
      });
    }
  },

  cancelRequest: (tabId) => {
    const controller = get().abortControllers.get(tabId);
    if (controller) {
      controller.abort();
      set((s) => {
        const newAbort = new Map(s.abortControllers);
        newAbort.delete(tabId);
        return { abortControllers: newAbort };
      });
    }
  },

  clearExecution: (tabId) => {
    set((s) => {
      const newExecs = new Map(s.executions);
      newExecs.delete(tabId);
      return { executions: newExecs };
    });
  },

  getExecution: (tabId) => {
    return get().executions.get(tabId) ?? IDLE_EXECUTION;
  },
}));

window.addEventListener("beforeunload", () => {
  const { abortControllers } = useExecutionStore.getState();
  for (const controller of abortControllers.values()) {
    controller.abort();
  }
});
