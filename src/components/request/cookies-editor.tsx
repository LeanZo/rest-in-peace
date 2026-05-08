import { useMemo } from "react";
import { useCookieStore } from "@/stores/cookie-store";
import type { EntityId } from "@/core/models/primitives";
import type { CookieData } from "@/core/models/cookie";
import { Button } from "@/primitives/button";

interface CookiesEditorProps {
  collectionId: EntityId;
}

const EMPTY_COOKIES: CookieData[] = [];

export function CookiesEditor({ collectionId }: CookiesEditorProps) {
  const jars = useCookieStore((s) => s.jars);
  const cookies = useMemo(
    () => jars.get(collectionId) ?? EMPTY_COOKIES,
    [jars, collectionId],
  );
  const deleteCookie = useCookieStore((s) => s.deleteCookie);
  const clearJar = useCookieStore((s) => s.clearJar);

  return (
    <div className="flex flex-col gap-2">
      {cookies.length > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => clearJar(collectionId)}>
            Clear All
          </Button>
        </div>
      )}

      {cookies.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-xs text-text-muted">
          No cookies stored for this collection
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted text-left">
                <th className="font-medium pb-2 pr-4">Name</th>
                <th className="font-medium pb-2 pr-4">Value</th>
                <th className="font-medium pb-2 pr-4">Domain</th>
                <th className="font-medium pb-2 pr-4">Path</th>
                <th className="font-medium pb-2 pr-4">Flags</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {cookies.map((cookie, index) => (
                <CookieRow
                  key={`${cookie.domain}-${cookie.name}-${index}`}
                  cookie={cookie}
                  onDelete={() => deleteCookie(collectionId, index)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CookieRow({
  cookie,
  onDelete,
}: {
  cookie: CookieData;
  onDelete: () => void;
}) {
  const flags = [
    cookie.httpOnly && "HttpOnly",
    cookie.secure && "Secure",
    cookie.sameSite && `SameSite=${cookie.sameSite}`,
  ].filter(Boolean);

  return (
    <tr className="group border-t border-border-subtle hover:bg-surface-hover/30">
      <td className="py-1.5 pr-4 font-mono text-accent-purple whitespace-nowrap">
        {cookie.name}
      </td>
      <td className="py-1.5 pr-4 font-mono text-text-secondary max-w-[200px] truncate">
        {cookie.value}
      </td>
      <td className="py-1.5 pr-4 text-text-muted whitespace-nowrap">{cookie.domain}</td>
      <td className="py-1.5 pr-4 text-text-muted">{cookie.path}</td>
      <td className="py-1.5 pr-4">
        <div className="flex gap-1 flex-wrap">
          {flags.map((flag) => (
            <span key={flag as string} className="px-1.5 py-0.5 rounded bg-surface-hover text-text-muted text-[10px]">
              {flag}
            </span>
          ))}
        </div>
      </td>
      <td className="py-1.5">
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
