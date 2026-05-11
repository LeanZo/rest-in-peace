import { isTauri } from "@/core/adapters/platform";
import { useSettingsStore } from "@/stores/settings-store";

type Update = Awaited<ReturnType<typeof import("@tauri-apps/plugin-updater").check>> & {};

let pendingUpdate: Update | null = null;

export async function checkForUpdates(): Promise<boolean> {
  if (!isTauri()) return false;

  const store = useSettingsStore.getState();
  store.setUpdateStatus({ checkingForUpdates: true, updateError: false, upToDate: false });

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (update) {
      pendingUpdate = update;
      store.setUpdateStatus({
        updateAvailable: true,
        updateVersion: update.version,
        updateNotes: update.body ?? null,
        checkingForUpdates: false,
      });
      return true;
    }

    store.setUpdateStatus({ checkingForUpdates: false, upToDate: true });
    return false;
  } catch {
    store.setUpdateStatus({ checkingForUpdates: false, updateError: true });
    return false;
  }
}

export async function downloadUpdate(): Promise<boolean> {
  if (!pendingUpdate) return false;

  const store = useSettingsStore.getState();
  store.setUpdateStatus({ downloadingUpdate: true });

  try {
    await pendingUpdate.download();
    store.setUpdateStatus({
      downloadingUpdate: false,
      updateReady: true,
    });
    return true;
  } catch {
    store.setUpdateStatus({ downloadingUpdate: false });
    return false;
  }
}

export async function installUpdate(): Promise<void> {
  if (!pendingUpdate) return;

  try {
    await pendingUpdate.install();
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch {
    // installation triggers restart, errors here are expected during shutdown
  }
}

export async function checkAndDownload(): Promise<void> {
  const found = await checkForUpdates();
  if (found) await downloadUpdate();
}
