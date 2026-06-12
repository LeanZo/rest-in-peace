# REST in Peace CLI

Agent-friendly command-line interface for managing REST API collections. The CLI reads and writes the same data file as the desktop app, enabling seamless round-trip between GUI and terminal workflows.

## Installation

The CLI is bundled with the desktop installer and automatically added to your system PATH. After installation, the `rip` command is available in any terminal.

### Development

```bash
bun run cli:dev -- <command> [options]
```

Use `--data-file` to work with a separate file instead of the desktop app's data:

```bash
bun run cli:dev -- --data-file ./test-data.json list collections
```

### Testing

```bash
bun run test                                          # All tests (app + CLI)
bun run test -- tests/unit/cli/                       # CLI tests only
bun run test -- tests/unit/cli/send-command.test.ts   # Single test file
bun run test:watch -- tests/unit/cli/                 # Watch mode
```

CLI test files are in `tests/unit/cli/` and cover: arg parsing, storage adapter, secret masking, data layer, and all command handlers (collection, folder, request, environment, history, cookie, send).

### Building

```bash
bun run cli:build          # Standalone binary → dist-cli/rip
bun run cli:build:win      # Windows binary → dist-cli/rip.exe
```

### Production Build (App + CLI)

To build the full desktop installer with the CLI bundled:

```bash
# 1. Build the CLI binary
bun run cli:build:win

# 2. Build the desktop installer with CLI included
bun run tauri build -- --config '{"bundle":{"resources":["../dist-cli/rip.exe"]}}'
```

The installer is output to `src-tauri/target/release/bundle/nsis/`. It includes `rip.exe` alongside the main app and adds the installation directory to the user's PATH automatically.

Note: `bun run tauri dev` does not require the CLI binary — resources are only bundled during production builds.

### CI/CD

The GitHub Actions workflow (`.github/workflows/main.yml`) runs on tag pushes matching `v*`:

1. Installs dependencies (`bun install`)
2. Builds the CLI binary (`bun build cli/main.ts --compile`)
3. Builds the Tauri desktop installer with `TAURI_CONFIG` injecting the CLI as a bundled resource
4. Creates a draft GitHub release with the installer attached

## Quick Start

```bash
# List all collections
rip list collections

# Create a collection and request
rip create collection --name "My API"
rip create request --collection <id> --name "Get Users" --method GET --url "https://api.example.com/users"

# Inspect a request
rip get <id>
rip get <id> --fields url,method,headers

# Execute a request
rip send <request-id>
rip send <request-id> --environment <env-id>
```

## Commands

### `rip list <type>`

List entities with summary fields.

| Type | Required Flags | Description |
|---|---|---|
| `collections` | — | All collections |
| `folders` | `--collection <id>` | Folders in a collection |
| `requests` | `--collection <id>` | Requests in a collection |
| `environments` | `--collection <id>` | Environments for a collection |
| `history` | — | Request execution history |
| `cookies` | `--collection <id>` | Cookies for a collection |
| `variables` | `--environment <id>` | Variables in an environment |

**History filters:**

```bash
rip list history --collection <id>    # Filter by collection
rip list history --request <id>       # Filter by request
rip list history --method POST        # Filter by HTTP method
rip list history --status 4xx         # Filter by status range (2xx, 3xx, 4xx, 5xx)
rip list history --limit 10           # Limit results
```

### `rip get <id>`

Get full entity details. Auto-detects entity type from ID.

```bash
rip get <id>                          # Full entity
rip get <id> --fields url,method      # Specific fields only (always includes id)
rip get <id> --show-secrets           # Reveal masked sensitive data
```

### `rip create <type>`

Create a new entity.

```bash
rip create collection --name "API" --description "My REST API"
rip create folder --collection <id> --name "Users" [--parent <folder-id>]
rip create request --collection <id> [--parent <id>] [--name "Get Users"] [--method GET] [--url "https://..."]
rip create environment --collection <id> --name "Production"
```

### `rip update <id>`

Update an entity. Auto-detects entity type from ID.

**Common options:**

```bash
rip update <id> --name "New Name"
rip update <id> --docs "# API Docs\nMarkdown content"
rip update <id> --docs-file ./docs.md
```

**Request options:**

```bash
# Method and URL
rip update <id> --method POST --url "https://api.example.com/users"

# Headers
rip update <id> --set-header "Content-Type: application/json"
rip update <id> --set-header "Accept: text/html" --set-header "X-Custom: value"
rip update <id> --remove-header "X-Old-Header"

# Query parameters
rip update <id> --set-param "page=1" --set-param "limit=50"
rip update <id> --remove-param "old-param"

# Body
rip update <id> --body-json '{"name":"John","email":"john@example.com"}'
rip update <id> --body-raw "<xml>data</xml>" --body-content-type "application/xml"
rip update <id> --body-none

# Authentication
rip update <id> --auth-bearer "my-token"
rip update <id> --auth-basic "user:password"
rip update <id> --auth-apikey "X-API-Key=secret123"
rip update <id> --auth-apikey "key=value" --auth-apikey-in query
rip update <id> --auth-none
```

**Environment variable options:**

```bash
rip update <env-id> --set-var "API_URL=https://api.example.com"
rip update <env-id> --set-var "API_KEY=secret" --secret
rip update <env-id> --delete-var "OLD_VAR"
```

### `rip delete <id>`

Delete an entity. Collections and folders cascade-delete all children.

```bash
rip delete <id>                        # Delete any entity (auto-detects type)
rip delete --history-all               # Clear all history
rip delete --history-request <id>      # Clear history for a specific request
rip delete --cookies <collection-id>   # Clear cookies for a collection
```

### `rip send <request-id>`

Execute a saved request and return the response.

```bash
rip send <request-id>                              # Use active environment
rip send <request-id> --environment <env-id>       # Override environment
rip send <request-id> --no-history                 # Skip saving to history
rip send <request-id> --show-secrets               # Show sensitive headers in response
```

Resolves environment variables (`{{var}}`), builds auth headers, serializes body, and saves the result to history by default.

### `rip help [command]`

```bash
rip help              # General help
rip help list         # Help for list command
rip help send         # Help for send command
```

## Global Flags

| Flag | Description |
|---|---|
| `--show-secrets` | Reveal masked sensitive data (auth tokens, secrets, cookies) |
| `--data-file <path>` | Override the data file path |
| `--version` | Show CLI version |
| `--help` | Show help |

## Output Format

All output is JSON to stdout. Errors go to stderr.

**Single entity:**

```json
{
  "data": {
    "id": "abc-123",
    "name": "My API",
    ...
  }
}
```

**List:**

```json
{
  "data": [
    { "id": "abc-123", "name": "My API" },
    ...
  ],
  "count": 1
}
```

**Error (stderr):**

```json
{
  "error": "Collection not found",
  "code": "NOT_FOUND"
}
```

Exit codes: `0` = success, `1` = error.

## Sensitive Data Masking

By default, sensitive data is replaced with `*****`. Use `--show-secrets` to reveal.

| Field | Condition |
|---|---|
| `BasicAuth.password` | Always |
| `BearerAuth.token` | Always |
| `ApiKeyAuth.value` | Always |
| `EnvironmentVariable.initialValue`, `.currentValue` | When `isSecret === true` |
| `CookieData.value` | Always |
| Header values | When key matches: `authorization`, `proxy-authorization`, `x-api-key`, `cookie`, `set-cookie` |

## Data File Location

The CLI reads/writes the same data file as the desktop app:

| Platform | Path |
|---|---|
| Windows | `%LOCALAPPDATA%\br.dev.karma.restinpeace\rest-in-peace-data.json` |
| macOS | `~/Library/Application Support/br.dev.karma.restinpeace/rest-in-peace-data.json` |
| Linux | `$XDG_DATA_HOME/br.dev.karma.restinpeace/rest-in-peace-data.json` |

Override with `--data-file <path>` for testing or multiple workspaces.

## Agent Integration

The CLI is designed for use by coding agents (Claude Code, Cursor, etc.). Tips:

- Use `--fields` to minimize context: `rip get <id> --fields url,method`
- `rip list` returns summary fields only (id, name, method, url)
- All output is machine-parseable JSON
- IDs are auto-detected across entity types — no need to specify type for `get`, `update`, `delete`
- Use `--data-file` for isolated test workspaces
