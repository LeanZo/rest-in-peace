import { useState, useEffect, useRef } from "react";
import type { HttpMethod } from "@/core/models/primitives";
import { HTTP_METHODS, METHOD_COLORS } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface MethodSelectProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

export function MethodSelect({ value, onChange }: MethodSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center bg-surface-overlay border border-border-default rounded-lg",
          "px-3 pr-7 text-xs font-mono font-bold min-h-[38px]",
          "outline-none cursor-pointer transition-colors",
          "focus:border-accent-purple",
          METHOD_COLORS[value],
        )}
      >
        {value}
      </button>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-transform",
          open && "rotate-180",
        )}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-surface-overlay border border-border-default rounded-lg shadow-xl py-1 min-w-full animate-[fadeIn_100ms_ease-out]">
          {HTTP_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs font-mono font-bold transition-colors",
                "hover:bg-surface-hover",
                METHOD_COLORS[m],
                m === value && "bg-surface-hover",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
