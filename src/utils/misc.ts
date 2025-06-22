export function generateId(length?: number): string {
  length = length || 16;
  const value = crypto.getRandomValues(new Uint8Array(length / 2));
  return Array.from(value, (v) => v.toString(16).padStart(2, "0")).join("");
}

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function asyncPause(duration = 100) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
