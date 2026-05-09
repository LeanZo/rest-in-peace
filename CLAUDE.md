# REST in Peace

REST API development and testing tool.

## Tech Stack

- TypeScript 6.0, React 19.2, Vite 8, Tailwind CSS 4.2
- Zustand 5 for state, CodeMirror 6 for editors
- Tauri 2.11 for desktop packaging
- Bun 1.3 as package manager

## Commands

- `bun run dev` — Start Vite dev server at http://localhost:5173
- `bun run build` — Type check + production build
- `bun run test` — Run unit tests with Vitest
- `bun run test:watch` — Watch mode tests
- `bun run tauri dev` — Desktop app with hot reload (requires Rust)
- `bun run tauri build` — Production desktop installer

## Project Structure

- `src/core/models/` — TypeScript interfaces (no runtime code)
- `src/core/services/` — Business logic (pure TS, no React)
- `src/core/adapters/` — Platform abstraction (web vs Tauri)
- `src/stores/` — Zustand stores (one per domain)
- `src/primitives/` — Reusable UI atoms
- `src/components/` — Feature components
- `src/layouts/` — Layout shells
- `src/lib/` — Small utilities
- `src-tauri/` — Tauri/Rust backend (main.rs, tauri.conf.json, capabilities)
- `tests/` — Unit tests

## Desktop App (Tauri)

- `src-tauri/tauri.conf.json` — App config, window size (1280x800, min 900x600), CSP, plugin permissions
- `src-tauri/capabilities/default.json` — Security permissions for HTTP and Store plugins
- `src-tauri/src/main.rs` — Registers tauri-plugin-http and tauri-plugin-store
- Platform detection: `isTauri()` in `src/core/adapters/platform.ts` checks `window.__TAURI_INTERNALS__`
- HTTP: Desktop uses `@tauri-apps/plugin-http` (bypasses CORS, full header access); web uses browser `fetch`
- Storage: Desktop uses `@tauri-apps/plugin-store` (JSON file `rest-in-peace-data.json`); web uses `localStorage` (prefix `rip:`)

## Conventions

- Path alias: `@/` maps to `src/`
- Tailwind CSS 4 with `@theme` tokens in `src/styles/theme.css`
- Dark mode only, neon purple (#a855f7) and green (#22c55e) accents
- Minimal dependencies — implement small utilities ourselves
- Declarative style, small files
