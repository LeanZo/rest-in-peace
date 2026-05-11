import { useSettingsStore } from "@/stores/settings-store";
import { checkForUpdates, downloadUpdate, installUpdate } from "@/core/services/updater";
import { Button } from "@/primitives/button";
import { isTauri } from "@/core/adapters/platform";

export function SettingsUpdates() {
  const autoUpdate = useSettingsStore((s) => s.autoUpdate);
  const setAutoUpdate = useSettingsStore((s) => s.setAutoUpdate);
  const checkingForUpdates = useSettingsStore((s) => s.checkingForUpdates);
  const downloadingUpdate = useSettingsStore((s) => s.downloadingUpdate);
  const updateAvailable = useSettingsStore((s) => s.updateAvailable);
  const updateReady = useSettingsStore((s) => s.updateReady);
  const updateVersion = useSettingsStore((s) => s.updateVersion);

  const handleCheckForUpdates = async () => {
    const found = await checkForUpdates();
    if (found) await downloadUpdate();
  };

  return (
    <div className="p-5 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-4">Updates</h3>

        {!isTauri() && (
          <div className="rounded-lg bg-surface-input border border-border-subtle p-3 mb-4">
            <p className="text-xs text-text-muted">
              Auto-updates are only available in the desktop app.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm text-text-primary">Automatic updates</p>
              <p className="text-xs text-text-muted mt-0.5">
                Check for updates when the app starts and download them automatically
              </p>
            </div>
            <button
              role="switch"
              aria-checked={autoUpdate}
              onClick={() => setAutoUpdate(!autoUpdate)}
              className={`
                relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
                transition-colors duration-200 focus-visible:outline-none
                ${autoUpdate ? "bg-accent-purple" : "bg-surface-input"}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm
                  transform transition-transform duration-200
                  ${autoUpdate ? "translate-x-4" : "translate-x-0"}
                `}
              />
            </button>
          </label>

          <div className="pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">Check for updates</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {updateReady
                    ? `Version ${updateVersion} is ready to install`
                    : updateAvailable
                      ? `Version ${updateVersion} is downloading...`
                      : "Check if a new version is available"}
                </p>
              </div>

              {updateReady ? (
                <Button variant="success" size="sm" onClick={installUpdate}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 00-9-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Restart &amp; Update
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCheckForUpdates}
                  isLoading={checkingForUpdates || downloadingUpdate}
                  disabled={!isTauri()}
                >
                  Check Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
