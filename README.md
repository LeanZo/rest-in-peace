# REST in Peace

A modern REST API development and testing tool. Fast, minimal, dark-themed alternative to Postman and Insomnia.

Runs in the browser for development and as a native desktop app via Tauri for production use.

## Prerequisites

### Web development

- [Bun](https://bun.sh) 1.3+

### Desktop development (Tauri)

- Everything above, plus:
- [Rust](https://rustup.rs) (install via `rustup`)
- Windows: Microsoft C++ Build Tools (installed automatically with Visual Studio Build Tools or Visual Studio with "Desktop development with C++" workload)
- Windows: WebView2 (pre-installed on Windows 10 1803+ and Windows 11)

## Getting started

```bash
bun install
bun run dev          # Web dev server at http://localhost:5173
```

## Commands

| Command | Description |
|---|---|
| `bun run dev` | Start Vite dev server (web) |
| `bun run build` | Type-check + production build (web) |
| `bun run preview` | Preview production build locally |
| `bun run test` | Run unit tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run tauri dev` | Start desktop app in development mode |
| `bun run tauri build` | Build production desktop installer |

## Desktop app (Tauri)

The desktop build uses Tauri 2 to package the app as a native Windows application.

### Development

```bash
bun run tauri dev
```

This starts the Vite dev server and opens the app in a native window with hot reload. First run compiles the Rust backend (~2-3 minutes), subsequent runs are fast.

### Production build

```bash
bun run tauri build
```

Produces an installer at `src-tauri/target/release/bundle/`. The build creates both an MSI installer and an NSIS setup executable.

### Desktop vs web differences

| Feature | Web (browser) | Desktop (Tauri) |
|---|---|---|
| HTTP requests | Browser `fetch` (subject to CORS) | Tauri HTTP plugin (no CORS restrictions) |
| Data storage | `localStorage` (~5-10 MB) | Filesystem JSON store (unlimited) |
| Response headers | Limited by browser | Full access |

## Tech stack

- TypeScript 6, React 19.2, Vite 8, Tailwind CSS 4.2
- Zustand 5 (state management), CodeMirror 6 (code editors)
- Tauri 2.11 (desktop packaging)
- Bun 1.3 (package manager + runtime)

## Project structure

```
src/
├── core/
│   ├── models/       # TypeScript interfaces
│   ├── services/     # Business logic (pure TS, no React)
│   └── adapters/     # Platform abstraction (web vs Tauri)
├── stores/           # Zustand stores
├── components/       # Feature components
├── primitives/       # Reusable UI atoms
├── layouts/          # Layout shells
├── lib/              # Small utilities
└── styles/           # Theme tokens + base styles

src-tauri/            # Tauri/Rust backend
├── src/main.rs       # Plugin registration
├── tauri.conf.json   # App config, window settings, permissions
├── capabilities/     # Security permissions
└── Cargo.toml        # Rust dependencies

tests/
├── unit/             # Service + utility tests
└── store/            # Zustand store tests
```

## License

All Rights Reserved

Copyright (c) 2026 Lucas Lean
