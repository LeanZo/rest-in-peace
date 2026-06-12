let _capture: string[] | null = null;

export function startCapture(): void {
  _capture = [];
}

export function endCapture(): string {
  const result = _capture?.join("") ?? "";
  _capture = null;
  return result;
}

export function printResult(data: unknown): void {
  const json = JSON.stringify({ data }, null, 2) + "\n";
  if (_capture) _capture.push(json);
  else process.stdout.write(json);
}

export function printList(data: unknown[]): void {
  const json = JSON.stringify({ data, count: data.length }, null, 2) + "\n";
  if (_capture) _capture.push(json);
  else process.stdout.write(json);
}

export class CliError extends Error {
  constructor(
    public readonly cliMessage: string,
    public readonly code: string,
  ) {
    super(cliMessage);
  }
}

export function printError(message: string, code: string): never {
  process.stderr.write(JSON.stringify({ error: message, code }, null, 2) + "\n");
  throw new CliError(message, code);
}
