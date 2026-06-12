---
name: REST-in-peace-CLI
description: This skill defines how to use the CLI of the REST in Peace API client.
license: MIT
metadata:
  author: LeanZo
  version: "1.0"
---

# REST in Peace CLI — rip.exe

Manage REST API collections, requests, environments, history, and cookies from the terminal, and execute HTTP requests. The CLI reads and writes the same data file as the REST in Peace desktop app, so any change you make is immediately visible in the GUI and vice versa.

The binary is `rip` (`rip.exe` on Windows) and is available on PATH after the desktop app is installed.

```bash
rip <command> [options]
```

## Core rules

1. **All output is JSON.** Results go to stdout, errors go to stderr. Exit code `0` = success, `1` = error. Always parse stdout as JSON.
2. **IDs are auto-detected.** `get`, `update`, and `delete` figure out the entity type (collection, folder, request, environment, history) from the ID alone — you never specify a type for those commands.
3. **Secrets are masked by default.** Tokens, passwords, secret variables, cookies, and sensitive headers appear as `*****`. Add `--show-secrets` only when you actually need the real value.
4. **Discover IDs with `list`, then act.** The typical flow is `rip list collections` → `rip list requests --collection <id>` → `rip get/send <request-id>`.
5. **Minimize output.** Use `--fields` on `get` and `--limit` on history listings to keep responses small.

## Output format

Single entity:

```json
{ "data": { "id": "abc-123", "name": "My API", "...": "..." } }
```

List:

```json
{ "data": [ { "id": "abc-123", "name": "My API" } ], "count": 1 }
```

Error (on stderr):

```json
{ "error": "Collection not found", "code": "NOT_FOUND" }
```

Common error codes: `NOT_FOUND`, `MISSING_PARAM`.

## Global flags

| Flag | Description |
|---|---|
| `--show-secrets` | Reveal masked sensitive data (auth tokens, secret variables, cookies, sensitive headers) |
| `--data-file <path>` | Use a different data file (isolated workspace; default is the desktop app's data file) |
| `--version` | Show CLI version |
| `--help` | Show help |

## Commands

### `rip list <type>` — discover entities

Returns summary fields only (id, name, and a few key fields like method/url) to keep output small.

| Type | Required flags | Lists |
|---|---|---|
| `collections` | — | All collections |
| `folders` | `--collection <id>` | Folders in a collection |
| `requests` | `--collection <id>` | Requests in a collection |
| `environments` | `--collection <id>` | Environments for a collection |
| `history` | — (filters optional) | Request execution history |
| `cookies` | `--collection <id>` | Cookies for a collection |
| `variables` | `--environment <id>` | Variables in an environment |

History filters (combinable):

```bash
rip list history --collection <id>    # by collection
rip list history --request <id>       # by request
rip list history --method POST        # by HTTP method
rip list history --status 4xx         # by status range: 2xx, 3xx, 4xx, 5xx
rip list history --limit 10           # cap result count
```

### `rip get <id>` — inspect an entity

```bash
rip get <id>                          # Full entity (type auto-detected)
rip get <id> --fields url,method      # Only these fields (id is always included)
rip get <id> --fields docs            # Read an entity's markdown documentation
rip get <id> --show-secrets           # Reveal masked values
```

Prefer `--fields` whenever you don't need the whole entity.

### `rip create <type>` — create an entity

```bash
rip create collection --name "My API" [--description "REST API for my service"]
rip create folder --collection <id> --name "Users" [--parent <folder-id>]
rip create request --collection <id> [--parent <folder-id>] [--name "Get Users"] [--method GET] [--url "https://api.example.com/users"]
rip create environment --collection <id> --name "Production"
```

The created entity (including its new `id`) is returned as JSON — capture the `id` for follow-up commands.

### `rip update <id>` — modify an entity

Type is auto-detected; available flags depend on the entity type. Flags marked *(repeatable)* can be passed multiple times in one command.

Common (any entity):

```bash
rip update <id> --name "New Name"
rip update <id> --docs "# API Docs\nMarkdown content"   # inline markdown docs
rip update <id> --docs-file ./docs.md                    # docs from a file
```

Requests — method/URL:

```bash
rip update <id> --method POST --url "https://api.example.com/users"
```

Requests — headers and query params *(repeatable)*:

```bash
rip update <id> --set-header "Content-Type: application/json" --set-header "X-Custom: value"
rip update <id> --remove-header "X-Old-Header"
rip update <id> --set-param "page=1" --set-param "limit=50"
rip update <id> --remove-param "old-param"
```

Requests — body:

```bash
rip update <id> --body-json '{"name":"John","email":"john@example.com"}'
rip update <id> --body-raw "<xml>data</xml>" --body-content-type "application/xml"
rip update <id> --body-none                              # remove body
```

Requests — authentication:

```bash
rip update <id> --auth-bearer "my-token"
rip update <id> --auth-basic "user:password"
rip update <id> --auth-apikey "X-API-Key=secret123"                 # header by default
rip update <id> --auth-apikey "key=value" --auth-apikey-in query    # or query param
rip update <id> --auth-none                                          # remove auth
```

Environments — variables *(repeatable)*:

```bash
rip update <env-id> --set-var "API_URL=https://api.example.com"
rip update <env-id> --set-var "API_KEY=secret123" --secret    # --secret marks set vars as secret (masked)
rip update <env-id> --delete-var "OLD_VAR"
```

### `rip delete <id>` — delete entities

Deleting a collection or folder **cascades to all children** (folders, requests, etc.). Be sure before deleting containers.

```bash
rip delete <id>                        # Any entity, type auto-detected
rip delete --history-all               # Clear all history
rip delete --history-request <id>      # Clear history for one request
rip delete --cookies <collection-id>   # Clear cookies for a collection
```

### `rip send <request-id>` — execute a request

Sends the saved request over HTTP and returns the response. It resolves environment variables (`{{var}}` placeholders in URL/headers/body), builds auth headers, serializes the body, and saves the result to history by default.

```bash
rip send <request-id>                              # Uses the active environment
rip send <request-id> --environment <env-id>       # Use a specific environment
rip send <request-id> --no-history                 # Don't save to history
rip send <request-id> --show-secrets               # Show sensitive headers in response
```

The response JSON includes: `statusCode`, `statusText`, `headers`, `body`, `contentType`, `bodySize`, and `timing`.

### `rip skill` — install this skill into the current project

Installs the REST in Peace CLI agent skill into the directory the command is run from, so an agent working in that project can discover and use the `rip` CLI.

```bash
rip skill           # Installs into the current working directory
```

Under the hood it runs, in the called location:

```bash
npx skills add https://github.com/LeanZo/agent-skills --skill REST-in-peace-CLI
```

- Run it from the project root where you want the skill available.
- Requires Node.js / `npx` on PATH.
- `npx` progress is written to stderr; stdout gets a JSON summary `{ "data": { "installed": true, "skill": "REST-in-peace-CLI", ... } }`.
- Error codes: `SPAWN_ERROR` (npx missing / failed to launch), `INSTALL_FAILED` (npx exited non-zero).

### `rip help [command]`

```bash
rip help            # General help
rip help send       # Help for a specific command (list, get, create, update, delete, send, skill)
```

## Sensitive data masking

Masked as `*****` unless `--show-secrets` is passed:

| Field | When |
|---|---|
| Basic auth password, Bearer token, API key value | Always |
| Environment variable values | When the variable is marked secret |
| Cookie values | Always |
| Header values | When the key is `authorization`, `proxy-authorization`, `x-api-key`, `cookie`, or `set-cookie` |

Masking only affects output — sending a request always uses the real stored values.

## Recipes

Set up and call an API end to end:

```bash
# 1. Create the collection and capture its id from the JSON output
rip create collection --name "Petstore"

# 2. Create an environment with a base URL and a secret key
rip create environment --collection <coll-id> --name "Prod"
rip update <env-id> --set-var "BASE_URL=https://api.petstore.com" --set-var "API_KEY=sk-123" --secret

# 3. Create a request that uses the variables
rip create request --collection <coll-id> --name "List Pets" --method GET --url "{{BASE_URL}}/pets"
rip update <req-id> --auth-bearer "{{API_KEY}}" --set-param "limit=20"

# 4. Send it and inspect the response
rip send <req-id> --environment <env-id>
```

Debug a failing request:

```bash
rip list history --request <req-id> --status 5xx --limit 5   # recent failures
rip get <history-id>                                          # full request/response of one run
rip get <req-id> --fields url,method,headers,auth --show-secrets
```

Work in an isolated workspace (won't touch the user's desktop app data):

```bash
rip --data-file ./scratch.json create collection --name "Sandbox"
rip --data-file ./scratch.json list collections
```

## Notes

- Default data file (shared with the desktop app): `%APPDATA%\br.dev.karma.restinpeace\rest-in-peace-data.json` on Windows, `~/Library/Application Support/br.dev.karma.restinpeace/rest-in-peace-data.json` on macOS, `$XDG_DATA_HOME/br.dev.karma.restinpeace/rest-in-peace-data.json` on Linux.
- `update` requires at least one update flag, otherwise it errors with `MISSING_PARAM`.
- Quote values containing spaces, colons, or `{{...}}` placeholders so the shell passes them through intact. For JSON bodies, single-quote on POSIX shells; on PowerShell use single quotes too (`--body-json '{"name":"John"}'`).
