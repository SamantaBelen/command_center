import { exchangeCode } from "@/lib/gcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function origin(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function page(title: string, body: string): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#efe9e0;color:#2f2a27;
    margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
  .card{background:#f7f2ea;border:1px solid #e4dccf;border-radius:18px;padding:28px;max-width:560px;width:100%;
    box-shadow:0 10px 30px rgba(47,42,39,.08);}
  h1{font-size:20px;margin:0 0 10px;color:#6e2b3a;}
  p{font-size:14px;line-height:1.5;color:#5c534c;}
  code,textarea{font-family:ui-monospace,Menlo,monospace;font-size:13px;}
  textarea{width:100%;box-sizing:border-box;min-height:84px;margin-top:8px;padding:12px;border-radius:12px;
    border:1px solid #e4dccf;background:#fff;color:#2f2a27;resize:vertical;}
  .k{font-weight:700;color:#6e2b3a;}
  .steps{font-size:14px;line-height:1.6;color:#5c534c;padding-left:18px;}
</style></head><body><div class="card">${body}</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err) return page("Google Calendar", `<h1>No se autorizó</h1><p>Google devolvió: ${err}</p>`);
  if (!code) return page("Google Calendar", `<h1>Falta el código</h1><p>Vuelve a iniciar desde <code>/api/google/auth</code>.</p>`);

  const redirectUri = `${origin(req)}/api/google/callback`;
  const tok = await exchangeCode(code, redirectUri);
  if (tok.error || !tok.refresh_token) {
    return page(
      "Google Calendar",
      `<h1>No se obtuvo el refresh token</h1>
       <p>${tok.error ?? "Google no devolvió refresh_token. Asegúrate de usar access_type=offline y prompt=consent, y de quitar el acceso previo en tu cuenta de Google si ya lo habías autorizado."}</p>`
    );
  }

  return page(
    "Google Calendar conectado",
    `<h1>¡Casi listo! 🌿</h1>
     <p>Copia este <span class="k">refresh token</span> y guárdalo en Vercel como la variable
        <span class="k">GOOGLE_REFRESH_TOKEN</span>, luego vuelve a desplegar.</p>
     <textarea readonly onclick="this.select()">${tok.refresh_token}</textarea>
     <ol class="steps">
       <li>Vercel → tu proyecto → <span class="k">Settings → Environment Variables</span></li>
       <li>Agrega <span class="k">GOOGLE_REFRESH_TOKEN</span> con el valor de arriba</li>
       <li>Redeploy. Tus eventos aparecerán en Semana y Día.</li>
     </ol>
     <p>Por seguridad, no compartas este token con nadie.</p>`
  );
}
