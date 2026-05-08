export function StatusBar() {
  return (
    <div className="h-7 flex items-center px-3 bg-surface-raised border-t border-border-subtle text-[11px] text-text-muted shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
        <span>Ready</span>
      </div>
    </div>
  );
}
