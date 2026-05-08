type ClassValue = string | boolean | null | undefined;

export function cn(...args: ClassValue[]): string {
  let result = "";
  for (const arg of args) {
    if (arg && typeof arg === "string") {
      result += (result ? " " : "") + arg;
    }
  }
  return result;
}
