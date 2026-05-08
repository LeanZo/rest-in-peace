import { create } from "zustand";
import type { Environment, EnvironmentVariable } from "@/core/models/environment";
import type { EntityId } from "@/core/models/primitives";
import { generateId } from "@/lib/id";
import { getStorage } from "@/core/adapters/storage";

interface EnvironmentState {
  environments: Environment[];

  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;

  createEnvironment: (collectionId: EntityId, name: string) => Environment;
  deleteEnvironment: (id: EntityId) => void;
  updateEnvironment: (id: EntityId, patch: Partial<Pick<Environment, "name">>) => void;
  duplicateEnvironment: (id: EntityId) => Environment | null;

  addVariable: (envId: EntityId, name: string) => void;
  updateVariable: (envId: EntityId, variableId: EntityId, patch: Partial<EnvironmentVariable>) => void;
  deleteVariable: (envId: EntityId, variableId: EntityId) => void;

  importEnvironments: (envs: Environment[]) => void;

  getEnvironmentsForCollection: (collectionId: EntityId) => Environment[];
  getEnvironment: (id: EntityId) => Environment | undefined;
  getActiveVariables: (collectionId: EntityId, activeEnvId: EntityId | null) => EnvironmentVariable[];
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],

  loadFromStorage: async () => {
    const storage = getStorage();
    const data = await storage.get<Environment[]>("environments");
    if (data) set({ environments: data });
  },

  saveToStorage: async () => {
    const storage = getStorage();
    await storage.set("environments", get().environments);
  },

  createEnvironment: (collectionId, name) => {
    const now = new Date().toISOString();
    const env: Environment = {
      id: generateId(),
      collectionId,
      name,
      variables: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ environments: [...s.environments, env] }));
    get().saveToStorage();
    return env;
  },

  deleteEnvironment: (id) => {
    set((s) => ({
      environments: s.environments.filter((e) => e.id !== id),
    }));
    get().saveToStorage();
  },

  updateEnvironment: (id, patch) => {
    set((s) => ({
      environments: s.environments.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
      ),
    }));
    get().saveToStorage();
  },

  duplicateEnvironment: (id) => {
    const env = get().environments.find((e) => e.id === id);
    if (!env) return null;

    const now = new Date().toISOString();
    const newEnv: Environment = {
      ...structuredClone(env),
      id: generateId(),
      name: `${env.name} (copy)`,
      variables: env.variables.map((v) => ({ ...v, id: generateId() })),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ environments: [...s.environments, newEnv] }));
    get().saveToStorage();
    return newEnv;
  },

  addVariable: (envId, name) => {
    const variable: EnvironmentVariable = {
      id: generateId(),
      name,
      initialValue: "",
      currentValue: "",
      isSecret: false,
      enabled: true,
    };
    set((s) => ({
      environments: s.environments.map((e) =>
        e.id === envId
          ? { ...e, variables: [...e.variables, variable] }
          : e,
      ),
    }));
    get().saveToStorage();
  },

  updateVariable: (envId, variableId, patch) => {
    set((s) => ({
      environments: s.environments.map((e) =>
        e.id === envId
          ? {
              ...e,
              variables: e.variables.map((v) =>
                v.id === variableId ? { ...v, ...patch } : v,
              ),
            }
          : e,
      ),
    }));
    get().saveToStorage();
  },

  deleteVariable: (envId, variableId) => {
    set((s) => ({
      environments: s.environments.map((e) =>
        e.id === envId
          ? { ...e, variables: e.variables.filter((v) => v.id !== variableId) }
          : e,
      ),
    }));
    get().saveToStorage();
  },

  importEnvironments: (envs) => {
    set((s) => ({ environments: [...s.environments, ...envs] }));
    get().saveToStorage();
  },

  getEnvironmentsForCollection: (collectionId) => {
    return get().environments.filter((e) => e.collectionId === collectionId);
  },

  getEnvironment: (id) => {
    return get().environments.find((e) => e.id === id);
  },

  getActiveVariables: (collectionId, activeEnvId) => {
    if (!activeEnvId) return [];
    const env = get().environments.find(
      (e) => e.id === activeEnvId && e.collectionId === collectionId,
    );
    return env?.variables ?? [];
  },
}));
