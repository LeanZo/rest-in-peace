import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type ContextMenuItem =
  | { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }
  | { separator: true };

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function useContextMenu() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const close = useCallback(() => setPos(null), []);

  return { pos, onContextMenu, close };
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 4}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 4}px`;
    }
  }, []);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleDown, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[100] bg-surface-overlay border border-border-default rounded-lg shadow-xl py-1 min-w-[160px] animate-[fadeIn_100ms_ease-out]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => {
        if ("separator" in item) {
          return <div key={i} className="my-1 border-t border-border-subtle" />;
        }
        return (
          <button
            key={i}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            disabled={item.disabled}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left",
              item.danger
                ? "text-danger hover:bg-danger/10"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
              item.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {item.icon && (
              <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
