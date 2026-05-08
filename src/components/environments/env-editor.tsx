import { useMemo } from "react";
import { useEnvironmentStore } from "@/stores/environment-store";
import type { EntityId } from "@/core/models/primitives";
import type { EnvironmentVariable } from "@/core/models/environment";
import { Button } from "@/primitives/button";

interface EnvEditorProps {
  envId: EntityId;
}

export function EnvEditor({ envId }: EnvEditorProps) {
  const allEnvironments = useEnvironmentStore((s) => s.environments);
  const env = useMemo(
    () => allEnvironments.find((e) => e.id === envId),
    [allEnvironments, envId],
  );
  const addVariable = useEnvironmentStore((s) => s.addVariable);
  const updateVariable = useEnvironmentStore((s) => s.updateVariable);
  const deleteVariable = useEnvironmentStore((s) => s.deleteVariable);

  if (!env) return null;

  const handleAdd = () => {
    addVariable(envId, "");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Variables — {env.name}
        </span>
        <Button variant="ghost" size="sm" onClick={handleAdd}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-muted border-b border-border-subtle">
              <th className="text-left font-medium px-3 py-1.5 w-8"></th>
              <th className="text-left font-medium px-3 py-1.5">Name</th>
              <th className="text-left font-medium px-3 py-1.5">Initial Value</th>
              <th className="text-left font-medium px-3 py-1.5">Current Value</th>
              <th className="text-left font-medium px-3 py-1.5 w-16">Secret</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {env.variables.map((v) => (
              <VariableRow
                key={v.id}
                variable={v}
                onUpdate={(patch) => updateVariable(envId, v.id, patch)}
                onDelete={() => deleteVariable(envId, v.id)}
              />
            ))}
          </tbody>
        </table>

        {env.variables.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-text-muted">No variables defined</p>
            <p className="text-xs text-text-muted mt-1">
              Use <code className="px-1 py-0.5 rounded bg-surface-hover text-accent-purple">{"{{VAR_NAME}}"}</code> in requests
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function VariableRow({
  variable,
  onUpdate,
  onDelete,
}: {
  variable: EnvironmentVariable;
  onUpdate: (patch: Partial<EnvironmentVariable>) => void;
  onDelete: () => void;
}) {
  return (
    <tr className="group border-b border-border-subtle/50 hover:bg-surface-hover/30">
      <td className="px-3 py-1">
        <input
          type="checkbox"
          checked={variable.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="w-3.5 h-3.5 rounded border-border-default bg-surface-base accent-accent-purple cursor-pointer"
        />
      </td>
      <td className="px-3 py-1">
        <input
          value={variable.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="VARIABLE_NAME"
          className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-muted/50 font-mono"
        />
      </td>
      <td className="px-3 py-1">
        <input
          value={variable.initialValue}
          onChange={(e) => onUpdate({ initialValue: e.target.value })}
          placeholder="initial value"
          className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-muted/50"
        />
      </td>
      <td className="px-3 py-1">
        <input
          type={variable.isSecret ? "password" : "text"}
          value={variable.currentValue}
          onChange={(e) => onUpdate({ currentValue: e.target.value })}
          placeholder="current value"
          className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-muted/50"
        />
      </td>
      <td className="px-3 py-1 text-center">
        <input
          type="checkbox"
          checked={variable.isSecret}
          onChange={(e) => onUpdate({ isSecret: e.target.checked })}
          className="w-3.5 h-3.5 rounded border-border-default bg-surface-base accent-accent-purple cursor-pointer"
        />
      </td>
      <td className="px-1 py-1">
        <button
          onClick={onDelete}
          className="p-1 rounded opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-error transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
