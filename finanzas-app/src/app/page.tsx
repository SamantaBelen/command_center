import { getFinanceData } from "@/lib/notion";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic"; // always fresh from Notion

export default async function Home() {
  try {
    const data = await getFinanceData();
    return <Dashboard data={data} />;
  } catch (e: any) {
    return (
      <main className="fin">
        <header className="fin-head">
          <h1>💰 Finanzas</h1>
        </header>
        <p className="fin-error">
          No se pudieron cargar tus finanzas: {e?.message ?? "error"}.
          <br />
          <span className="fin-hint">
            Revisa que la integración de Notion esté conectada a las bases de Finanzas.
          </span>
        </p>
      </main>
    );
  }
}
