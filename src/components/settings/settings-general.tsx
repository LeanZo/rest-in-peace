import { useSettingsStore } from "@/stores/settings-store";

export function SettingsGeneral() {
  const keepHistory = useSettingsStore((s) => s.keepHistory);
  const setKeepHistory = useSettingsStore((s) => s.setKeepHistory);

  return (
    <div className="p-5 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-4">General</h3>
        <div className="space-y-4">
          <ToggleRow
            label="Keep request history"
            description="Save request and response history for each request"
            checked={keepHistory}
            onChange={setKeepHistory}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group">
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 focus-visible:outline-none
          ${checked ? "bg-accent-purple" : "bg-surface-input"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm
            transform transition-transform duration-200
            ${checked ? "translate-x-4" : "translate-x-0"}
          `}
        />
      </button>
    </label>
  );
}
