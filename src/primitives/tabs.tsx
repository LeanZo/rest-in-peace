import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: number;
  icon?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pill";
  size?: "sm" | "md";
}

export function Tabs({
  items,
  activeId,
  onChange,
  variant = "underline",
  size = "md",
}: TabsProps) {
  if (variant === "pill") {
    return (
      <div className="flex items-center gap-1 p-0.5 bg-surface-base rounded-lg">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
              activeId === item.id
                ? "bg-surface-overlay text-text-primary"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center border-b border-border-subtle">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "relative px-3 flex items-center gap-1.5 transition-colors duration-150",
            "border-b-2 -mb-px",
            size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm",
            activeId === item.id
              ? "border-accent-purple text-text-primary"
              : "border-transparent text-text-muted hover:text-text-secondary",
          )}
        >
          {item.icon}
          {item.label}
          {item.badge !== undefined && item.badge > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1 rounded-full min-w-[16px] text-center",
                activeId === item.id
                  ? "bg-accent-purple/20 text-accent-purple"
                  : "bg-surface-overlay text-text-muted",
              )}
            >
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
