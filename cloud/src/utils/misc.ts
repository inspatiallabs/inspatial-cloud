export function generateId(length?: number): string {
  length = length || 16;
  const value = crypto.getRandomValues(new Uint8Array(length / 2));
  return Array.from(value, (v) => v.toString(16).padStart(2, "0")).join("");
}

export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === "";
}
