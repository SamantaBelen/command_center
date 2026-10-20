// Shared auth helper. Works in both the Node (API route) and Edge (middleware)
// runtimes because it only uses Web Crypto (globalThis.crypto.subtle).

export const AUTH_COOKIE = "cc_auth";

// Derive a stable, opaque token from the password. The cookie stores this
// token, never the password itself. A fixed salt keeps it from being a bare
// hash of the password.
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`command-center::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  return authToken(pw);
}
