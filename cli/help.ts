const HELP_MAIN = `REST in Peace CLI — Manage REST API collections from the terminal.

Usage: rip <command> [options]

Commands:
  list <type>          List entities (collections, folders, requests, environments, history, cookies, variables)
  get <id>             Get entity details (auto-detects type)
  create <type>        Create a new entity (collection, folder, request, environment)
  update <id>          Update an entity (auto-detects type)
  delete <id>          Delete an entity (auto-detects type, cascades for collections/folders)
  send <request-id>    Execute a saved request
  skill                Install the REST in Peace CLI agent skill into the current directory
  help [command]       Show help for a command

Global Flags:
  --show-secrets       Reveal masked sensitive data (auth tokens, secrets, cookies)
  --data-file <path>   Override the data file path
  --version            Show CLI version
  --help               Show help

Examples:
  rip list collections
  rip get <id> --fields url,method
  rip create collection --name "My API"
  rip send <request-id>

Run "rip help <command>" for details on a specific command.`;

const HELP_LIST = `Usage: rip list <type> [filters]

Types:
  collections                          List all collections
  folders    --collection <id>         List folders in a collection
  requests   --collection <id>         List requests in a collection
  environments --collection <id>       List environments for a collection
  history    [filters]                 List request history
  cookies    --collection <id>         List cookies for a collection
  variables  --environment <id>        List variables in an environment

History Filters:
  --collection <id>    Filter by collection
  --request <id>       Filter by request
  --method <METHOD>    Filter by HTTP method (GET, POST, etc.)
  --status <range>     Filter by status range (2xx, 3xx, 4xx, 5xx)
  --limit <n>          Limit number of results

Examples:
  rip list collections
  rip list requests --collection abc-123
  rip list history --request abc-123 --status 2xx --limit 10
  rip list variables --environment env-123`;

const HELP_GET = `Usage: rip get <id> [options]

Auto-detects entity type (collection, folder, request, environment, history).

Options:
  --fields <f1,f2,...>   Return only specified fields (always includes id)
  --show-secrets         Reveal masked sensitive data

Examples:
  rip get abc-123
  rip get abc-123 --fields url,method,headers
  rip get abc-123 --fields docs
  rip get abc-123 --show-secrets`;

const HELP_CREATE = `Usage: rip create <type> [options]

Types & Required Options:
  collection  --name <name> [--description <desc>]
  folder      --collection <id> --name <name> [--parent <folder-id>]
  request     --collection <id> [--parent <id>] [--name <n>] [--method <m>] [--url <u>]
  environment --collection <id> --name <name>

Examples:
  rip create collection --name "My API" --description "REST API for my service"
  rip create folder --collection abc-123 --name "Users"
  rip create request --collection abc-123 --name "Get Users" --method GET --url "https://api.example.com/users"
  rip create environment --collection abc-123 --name "Production"`;

const HELP_UPDATE = `Usage: rip update <id> [options]

Auto-detects entity type. Available flags depend on entity type.

Common Options:
  --name <name>              Update name
  --docs <markdown>          Set documentation (inline)
  --docs-file <path>         Set documentation from a file

Request Options:
  --method <METHOD>          Set HTTP method
  --url <url>                Set URL
  --set-header "Key: Value"  Add/update a header (repeatable)
  --remove-header "Key"      Remove a header (repeatable)
  --set-param "key=value"    Add/update a query param (repeatable)
  --remove-param "key"       Remove a query param (repeatable)
  --body-json '{"key":"v"}'  Set JSON body
  --body-raw <content>       Set raw body (use with --body-content-type)
  --body-content-type <type> Content type for raw body
  --body-none                Remove body
  --auth-bearer <token>      Set Bearer auth
  --auth-basic <user:pass>   Set Basic auth
  --auth-apikey <key=value>  Set API Key auth (use with --auth-apikey-in)
  --auth-apikey-in <loc>     API Key location: header (default) or query
  --auth-none                Remove auth

Environment Options:
  --set-var "NAME=value"     Add/update a variable (repeatable)
  --delete-var "NAME"        Delete a variable (repeatable)
  --secret                   Mark variables set with --set-var as secret

Examples:
  rip update abc-123 --name "Updated Name"
  rip update abc-123 --method POST --url "https://api.example.com/users"
  rip update abc-123 --set-header "Authorization: Bearer token123"
  rip update abc-123 --body-json '{"name":"John"}'
  rip update abc-123 --auth-bearer my-token
  rip update env-123 --set-var "API_KEY=secret123" --secret`;

const HELP_DELETE = `Usage: rip delete <id>
       rip delete --history-all
       rip delete --history-request <id>
       rip delete --cookies <collection-id>

Deletes an entity. For collections and folders, cascades to all children.

Bulk Operations:
  --history-all              Clear all history entries
  --history-request <id>     Clear history for a specific request
  --cookies <collection-id>  Clear cookies for a collection

Examples:
  rip delete abc-123
  rip delete --history-all
  rip delete --history-request req-123
  rip delete --cookies coll-123`;

const HELP_SEND = `Usage: rip send <request-id> [options]

Executes a saved request and returns the response.
Resolves environment variables, builds auth headers, serializes body.
Saves to history by default.

Options:
  --environment <id>   Override active environment
  --no-history         Skip saving to history
  --show-secrets       Show sensitive headers in response

Response includes:
  statusCode, statusText, headers, body, contentType, bodySize, timing

Examples:
  rip send abc-123
  rip send abc-123 --environment env-456
  rip send abc-123 --no-history --show-secrets`;

const HELP_SKILL = `Usage: rip skill [installer flags]

Installs the REST in Peace CLI agent skill into the current directory so an
agent working in that project can discover and use the rip CLI.

Runs in the current working directory:
  npx skills add https://github.com/LeanZo/agent-skills --skill REST-in-peace-CLI

The installer is interactive and will prompt you to pick which agents to
install to (Claude Code is selected by default). Use the arrow keys / space to
choose, then Enter to confirm.

Any extra flags are passed straight through to the installer, so you can skip
the prompts:
  --yes, -y        Accept defaults, install without prompts
  --global, -g     Install globally instead of into the current directory

Notes:
  - The skill is installed wherever you run the command (the called location).
  - Requires Node.js / npx to be available on PATH.
  - rip exits with the installer's exit code.

Examples:
  rip skill
  rip skill --yes
  rip skill -y -g`;

const HELP_MAP: Record<string, string> = {
  list: HELP_LIST,
  get: HELP_GET,
  create: HELP_CREATE,
  update: HELP_UPDATE,
  delete: HELP_DELETE,
  send: HELP_SEND,
  skill: HELP_SKILL,
};

export function printHelp(): void {
  console.log(HELP_MAIN);
}

export function printCommandHelp(command?: string): void {
  if (!command || !HELP_MAP[command]) {
    printHelp();
    return;
  }
  console.log(HELP_MAP[command]);
}
