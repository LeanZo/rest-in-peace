import type { BaseEntity, EntityId } from "./primitives";

export interface EnvironmentVariable {
  id: EntityId;
  name: string;
  initialValue: string;
  currentValue: string;
  isSecret: boolean;
  enabled: boolean;
}

export interface Environment extends BaseEntity {
  collectionId: EntityId;
  name: string;
  variables: EnvironmentVariable[];
}

export type ResolvedVariableMap = ReadonlyMap<string, string>;
