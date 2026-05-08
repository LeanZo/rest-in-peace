import { useMemo } from "react";
import type { KeyValueEntry } from "@/core/models/primitives";
import { extractRouteParams, rebuildUrlWithParams } from "@/core/services/url-parser";
import { KeyValueTable } from "@/primitives/key-value-table";

interface ParamsEditorProps {
  url: string;
  params: KeyValueEntry[];
  routeParams: Record<string, string>;
  onUpdate: (patch: { url?: string; params?: KeyValueEntry[]; routeParams?: Record<string, string> }) => void;
}

export function ParamsEditor({ url, params, routeParams, onUpdate }: ParamsEditorProps) {
  const routeParamNames = useMemo(() => extractRouteParams(url), [url]);

  const handleQueryChange = (newParams: KeyValueEntry[]) => {
    const newUrl = rebuildUrlWithParams(url, newParams);
    onUpdate({ url: newUrl, params: newParams });
  };

  const handleRouteParamChange = (name: string, value: string) => {
    onUpdate({ routeParams: { ...routeParams, [name]: value } });
  };

  return (
    <div className="space-y-4">
      {routeParamNames.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Route Parameters
            </span>
            <span className="text-[10px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
              {routeParamNames.length}
            </span>
          </div>
          <div className="border border-border-subtle rounded-md overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr] gap-0 text-xs">
              <div className="px-2 py-1.5 bg-surface-raised border-b border-border-subtle text-text-muted font-medium">
                Parameter
              </div>
              <div className="px-2 py-1.5 bg-surface-raised border-b border-border-subtle text-text-muted font-medium">
                Value
              </div>
              {routeParamNames.map((name) => (
                <div key={name} className="contents">
                  <div className="px-2 py-1.5 border-b border-border-subtle flex items-center">
                    <span className="text-orange-400 font-mono">:{name}</span>
                  </div>
                  <div className="border-b border-border-subtle">
                    <input
                      value={routeParams[name] ?? ""}
                      onChange={(e) => handleRouteParamChange(name, e.target.value)}
                      className="w-full bg-transparent text-text-primary text-xs font-mono px-2 py-1.5 outline-none placeholder:text-text-muted"
                      placeholder={`Enter ${name}...`}
                      spellCheck={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Query Parameters
          </span>
          {params.filter((p) => p.enabled).length > 0 && (
            <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
              {params.filter((p) => p.enabled).length}
            </span>
          )}
        </div>
        <KeyValueTable
          entries={params}
          onChange={handleQueryChange}
          keyPlaceholder="Parameter"
          valuePlaceholder="Value"
        />
      </div>
    </div>
  );
}
