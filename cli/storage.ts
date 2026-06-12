import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir, platform } from "node:os";

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class FileStorageAdapter implements StorageAdapter {
  private filePath: string;
  private data: Record<string, unknown> | null = null;

  constructor(filePath?: string) {
    this.filePath = filePath ?? getDefaultDataPath();
  }

  getFilePath(): string {
    return this.filePath;
  }

  private load(): Record<string, unknown> {
    if (this.data) return this.data;
    if (!existsSync(this.filePath)) {
      this.data = {};
      return this.data;
    }
    const raw = readFileSync(this.filePath, "utf-8");
    this.data = JSON.parse(raw);
    return this.data!;
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async get<T>(key: string): Promise<T | null> {
    const data = this.load();
    return (data[key] as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const data = this.load();
    data[key] = value;
    this.persist();
  }

  async delete(key: string): Promise<void> {
    const data = this.load();
    delete data[key];
    this.persist();
  }

  async keys(): Promise<string[]> {
    return Object.keys(this.load());
  }
}

export function getDefaultDataPath(): string {
  const p = platform();
  if (p === "win32") {
    // Tauri's store plugin resolves against app_data_dir() (dirs::data_dir()),
    // which is the Roaming AppData folder on Windows — not Local.
    const base = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    return join(base, "br.dev.karma.restinpeace", "rest-in-peace-data.json");
  }
  if (p === "darwin") {
    return join(homedir(), "Library", "Application Support", "br.dev.karma.restinpeace", "rest-in-peace-data.json");
  }
  const base = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return join(base, "br.dev.karma.restinpeace", "rest-in-peace-data.json");
}
