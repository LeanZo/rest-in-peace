import { cn } from "@/lib/cn";
import type { HttpMethod } from "@/core/models/primitives";
import { METHOD_BG_COLORS } from "@/lib/constants";

interface MethodBadgeProps {
  method: HttpMethod;
  size?: "sm" | "md";
}

export function MethodBadge({ method, size = "md" }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-semibold uppercase rounded",
        METHOD_BG_COLORS[method],
        size === "sm" ? "text-[10px] px-1.5 py-0.5 min-w-[36px]" : "text-xs px-2 py-0.5 min-w-[44px]",
      )}
    >
      {method}
    </span>
  );
}

interface StatusBadgeProps {
  code: number;
  text?: string;
}

export function StatusBadge({ code, text }: StatusBadgeProps) {
  const color =
    code >= 200 && code < 300
      ? "bg-status-2xx/15 text-status-2xx"
      : code >= 300 && code < 400
        ? "bg-status-3xx/15 text-status-3xx"
        : code >= 400 && code < 500
          ? "bg-status-4xx/15 text-status-4xx"
          : "bg-status-5xx/15 text-status-5xx";

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded",
        color,
      )}
    >
      {code}
      {text && <span className="ml-1 font-normal">{text}</span>}
    </span>
  );
}
