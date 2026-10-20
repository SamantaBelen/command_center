# Command Center — app

App web personal (PWA) para tu Command Center. Pantalla **Hoy**: tus tareas del
día + los hábitos para marcar, todo en una sola vista. Estilo japandi con
acentos burgundy. Datos en Notion (leídos/escritos **solo del lado del
servidor**). Hosting: Vercel.

## Qué hace la v1

- **Tareas**: muestra las tareas con `Date` ≤ hoy (Eastern) que no estén en
  `Done` ni `Cancel`. Tocar una la marca como `Done`.
- **Hábitos**: muestra los check-ins cuyo periodo contiene hoy
  (`Period start` ≤ hoy ≤ `Period end`). Tocar uno alterna `Done`.
- **Candado**: una contraseña simple (la URL de Vercel es pública). Se pide una
  vez y se recuerda ~1 año en una cookie `httpOnly`.

El token de Notion vive **solo** como variable de entorno en el servidor
(Vercel). Nunca llega al teléfono/cliente, nunca se sube al repo.

## Stack

Next.js 14 (App Router) · TypeScript · `@notionhq/client` · desplegado en Vercel.

## Variables de entorno

Copia `.env.example` a `.env.local` para desarrollo local; en Vercel se ponen en
el panel del proyecto (Settings → Environment Variables).

| Variable             | Qué es                                                        |
|----------------------|---------------------------------------------------------------|
| `NOTION_TOKEN`       | Token de integración interna de Notion (ej. "Habits Generator"), con acceso a las bases Tasks y Check-ins. |
| `APP_PASSWORD`       | La contraseña para abrir la app. Elige la que quieras.        |
| `NOTION_TASKS_DB`    | (opcional) ID de la base Tasks. Por defecto ya apunta a la tuya. |
| `NOTION_CHECKINS_DB` | (opcional) ID de la base Check-ins. Por defecto ya apunta a la tuya. |

IDs por defecto: Tasks `3872cd384e9780dea0d0e780b94cfb40`,
Check-ins `25c3317dc9c7430a885c0aa6b009f1f1`.

## Desplegar en Vercel (una vez)

1. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repo
   `command_center`.
2. **Root Directory**: selecciona `command-center-app` (muy importante — el
   código de la app vive en esa subcarpeta).
3. Framework: Next.js (se detecta solo).
4. **Environment Variables**: agrega `NOTION_TOKEN` y `APP_PASSWORD`
   (y, si quieres, los dos opcionales).
5. **Deploy**. Al terminar te da una URL `https://...vercel.app`.

### Instalar en el iPhone

Abre la URL en **Safari** → botón compartir → **Añadir a pantalla de inicio**.
Queda como una app (icono burgundy, pantalla completa, sin barra del navegador).

## Desarrollo local

```bash
cd command-center-app
npm install
cp .env.example .env.local   # y rellena NOTION_TOKEN y APP_PASSWORD
npm run dev                  # http://localhost:3000
```

## Estructura

Layout estándar de Next.js con todo el código fuente en `src/` y las pruebas en
`tests/`.

```
src/
  app/
    layout.tsx          fuentes (serif + sans), meta PWA
    globals.css         paleta japandi/burgundy
    page.tsx            pantallas Hoy · Pendientes · Planear (cliente)
    login/page.tsx      candado de contraseña
    api/
      auth/route.ts     verifica contraseña, setea cookie
      today/route.ts    tareas + hábitos de un día
      week/route.ts     tareas sin agendar (Pendientes)
      plan/route.ts     tablero semanal + montón por repartir
      task/route.ts     crear / estado / planeación / puntuar / borrar tarea
      checkin/route.ts  alternar hábito Done
  lib/
    notion.ts           cliente Notion + consultas (server-only)
    planning.ts         lógica pura: prioridad sugerida + cálculo de semana
    auth.ts             token de cookie (Web Crypto)
  middleware.ts         protege todo menos /login y /api/auth
tests/
  unit/
    planning.test.ts    pruebas de suggestPriority y weekBounds
public/
  manifest.json         PWA
  icons/                iconos generados
```

## Pruebas

```bash
npm test     # pruebas unitarias (node:test + tsx) de la lógica en src/lib
```

## Próximas versiones (ideas)

- Más módulos del Command Center (finanzas, recurrentes, work sessions).
- Reordenar/posponer tareas desde la app.
- Elegir la fecha planeada de un hábito.
