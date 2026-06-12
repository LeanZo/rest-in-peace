// Generates `src-tauri/tauri.windows.conf.json` so the `rip` CLI binary gets
// bundled into the Windows installer at the install root (next to the app, on PATH).
//
// Why generate instead of commit?
//   Tauri's build script copies `bundle.resources` on every `cargo build` (dev and
//   release), erroring if a source file is missing. If this config were committed,
//   a plain `tauri dev` on a fresh checkout would fail until `dist-cli/rip.exe` was
//   built. Generating it only when building the installer keeps `tauri dev`
//   decoupled from the CLI binary. The file is gitignored.
//
// Why the map form `{ "../dist-cli/rip.exe": "rip.exe" }` (not `["../dist-cli/rip.exe"]`)?
//   With the array form Tauri rewrites the leading `..` to `_up_`, landing the binary
//   at `…\REST in Peace\_up_\dist-cli\rip.exe` — not the install root the PATH hook
//   points at. The map form sets an explicit target so it lands at `…\rip.exe`.
//
// Pass --no-updater for local builds: it disables updater artifacts, which otherwise
// require the TAURI_SIGNING_PRIVATE_KEY secret (CI has it; local machines don't).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(new URL("../src-tauri/tauri.windows.conf.json", import.meta.url));

const config = {
  $schema: "https://raw.githubusercontent.com/nicehash/tauri/v2/crates/tauri-config-schema/schema.json",
  bundle: {
    resources: { "../dist-cli/rip.exe": "rip.exe" },
  },
};

if (process.argv.includes("--no-updater")) {
  config.bundle.createUpdaterArtifacts = false;
}

writeFileSync(target, JSON.stringify(config, null, 2) + "\n");
console.log(`Generated ${target}${process.argv.includes("--no-updater") ? " (updater artifacts disabled)" : ""}`);
