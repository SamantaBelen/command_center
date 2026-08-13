# Habits — generador de check-ins

Cada corrida asegura que el periodo actual tenga exactamente `Target` filas de
check-in por hábito activo. Crea `Target − existentes`, así que **repetir la
corrida es seguro**: un crash, reintento o día saltado se auto-corrige en la
siguiente.

## Bases de Notion

| Base                | Database ID                        | Rol                        |
|---------------------|------------------------------------|----------------------------|
| Habits (definición) | `1265804c0ee44dfeb9532b677cba03da` | Un renglón por hábito      |
| Habits Check-ins    | `25c3317dc9c7430a885c0aa6b009f1f1` | El log; una fila por marca |

**Habits** — props usadas: `Name`, `Active` (checkbox), `Cadence`
(Daily/Weekly/Monthly/Yearly), `Target` (número, cuántas veces por periodo),
`Order` (secuencia del día).

**Check-ins** — props escritas: `Log` (título), `Item` (relación → Habits),
`Period` (texto, clave del periodo), `Period start` / `Period end` (fechas),
`Cadence`, `Order`, `Done` (checkbox). `Date` se deja vacío a propósito.

## Modelo de periodo

La clave `Period` identifica el periodo y sirve para el dedup:

| Cadence | Clave        | Ejemplo      | start / end             |
|---------|--------------|--------------|-------------------------|
| Daily   | `YYYY-MM-DD` | `2026-08-13` | hoy / hoy               |
| Weekly  | `YYYY-Www`   | `2026-W33`   | lunes / domingo (ISO)   |
| Monthly | `YYYY-MM`    | `2026-08`    | día 1 / último del mes  |
| Yearly  | `YYYY`       | `2026`       | 1 ene / 31 dic          |

Corre las 4 cadencias todos los días; el dedup por `Period` hace que
Weekly/Monthly/Yearly sean no-ops salvo la primera corrida de cada periodo.

## Idempotencia

Regla: `crear = max(0, Target − (check-ins existentes con mismo Item y Period))`.
Esto la hace segura de repetir y auto-sanable (si el lunes se salta, el martes
rellena la semana; la clave semanal sigue siendo la misma).

## Zona horaria

"Hoy" se calcula en `America/New_York` (Eastern), no en el reloj UTC del
sandbox. Maneja EST/EDT solo. Por eso `tzdata` está en requirements.

## Correr local

```bash
pip install -r ../../requirements.txt
export NOTION_TOKEN=ntn_...      # o usa un .env
python generate_habits.py
```

## Correr en Routine (producción)

- **Repo:** este. **Prompt:** `Ejecuta python logistics/habits/generate_habits.py
  y reporta la línea de resumen. No modifiques nada más.`
- **Entorno:** allowlist `api.notion.com`; env var `NOTION_TOKEN`; setup script
  `pip install requests tzdata`. **Sin conector de Notion** (el script usa REST).
- **Trigger:** diario ~4:00 AM ET.

## Notion (configuración que vive fuera del script)

- **Vista "vigente":** filtro `Period start` en/antes de hoy **Y** `Period end`
  en/después de hoy; ordena por `Order` asc. Se auto-actualiza.
- **Automatización `Done → Date`:** regla nativa de Notion — al marcar `Done`,
  poner `Date` = hoy. Mantiene fiel el rollup `Last done`.

## Requisito de acceso

La conexión "Habits Generator" debe tener acceso a **ambas** bases. Si el script
tira `404 object_not_found`, casi siempre es eso (no el token).
