import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="text-text-muted mb-3 opacity-40">{icon}</div>
      )}
      <h3 className="text-sm font-medium text-text-secondary mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-text-muted max-w-[240px] mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
