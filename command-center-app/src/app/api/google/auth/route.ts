import { NextResponse } from "next/server";
import { authUrl, hasOAuthClient } from "@/lib/gcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function origin(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  if (!hasOAuthClient()) {
    return new NextResponse(
      "Falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las variables de entorno.",
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
  const redirectUri = `${origin(req)}/api/google/callback`;
  return NextResponse.redirect(authUrl(redirectUri));
}
