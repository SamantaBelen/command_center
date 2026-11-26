// Shared auth helper. Works in both the Node (API route) and Edge (middleware)
// runtimes because it only uses Web Crypto.

export const AUTH_COOKIE = "fin_auth";

export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`finanzas-app::${password}`);
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
