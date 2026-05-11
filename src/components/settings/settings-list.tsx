import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SettingsCategory = "general" | "updates" | "about";

const categories: { id: SettingsCategory; label: string; icon: ReactNode }[] = [
  {
    id: "general",
    label: "General",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    id: "updates",
    label: "Updates",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 00-9-9 9.75 9.75 0 00-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 009 9 9.75 9.75 0 006.74-2.74L21 16" />
        <path d="M16 16h5v5" />
      </svg>
    ),
  },
  {
    id: "about",
    label: "About",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
];

interface SettingsListProps {
  selected: SettingsCategory;
  onSelect: (category: SettingsCategory) => void;
}

export function SettingsList({ selected, onSelect }: SettingsListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-3 py-2 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Settings
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 mx-1 rounded-md text-left transition-colors",
              selected === cat.id
                ? "bg-accent-purple/10 text-text-primary"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
            )}
            style={{ width: "calc(100% - 0.5rem)" }}
            onClick={() => onSelect(cat.id)}
          >
            <span className="shrink-0">{cat.icon}</span>
            <span className="text-sm">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
