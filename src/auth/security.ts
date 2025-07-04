export async function hashPassword(
  password: string,
  salt?: string,
): Promise<string> {
  const passwordBuffer = new TextEncoder().encode(`${password}${salt || ""}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", passwordBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return toHex(new Uint8Array(hashArray));
}

export function generateSalt(length: number = 16): string {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return toHex(buffer);
}

function toHex(bytes: Uint8Array): string {
  const byteArray = Array.from(bytes);
  return byteArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
