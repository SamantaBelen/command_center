# Command Center

Automatizaciones personales, organizadas espejando mi workspace de Notion
("Command Center"). Cada área de Notion es una carpeta; cada sistema vive en su
subcarpeta con su propio README que documenta lo no-obvio (IDs de bases, lógica,
cómo corre).

## Áreas (espejo de Notion)

| Carpeta          | Área en Notion                    | Qué contiene                                          |
|------------------|-----------------------------------|-------------------------------------------------------|
| `logistics/`     | Logistics 🟡                      | Tasks, Projects, Habits/Check-ins, Meetings           |
| `professional/`  | Professional 🔵 + Job Hunting 🟢  | Shortcuts, Links, Guidelines, Job Hunt Tracker        |
| `home-life/`     | Home/Life 🟣                      | Workout Tracker, Grocery Shopping                     |

> Job Hunting es un área aparte en Notion, pero en el repo se agrupa bajo
> `professional/` por ser actividad profesional.

## Sistemas activos

- **`logistics/habits/`** — generador de check-ins de hábitos (Notion, modelo de
  cuota, idempotente). Corre en una Claude Code Routine, diario a las 4 AM ET.

## Convenciones

- **Secretos:** nunca en el repo. Local → `.env` (ignorado por Git). En la
  Routine → variable de entorno. El token de Notion vive fuera del código.
- **Privado:** repo privado por defecto. Aunque no haya secretos, los IDs de las
  bases y la estructura personal no tienen por qué ser públicos.
- **Un README por sistema:** IDs y lógica documentados donde viven, para el "yo
  del futuro".

## Cómo lo usan las Routines

Cada Routine clona este repo completo desde la rama principal en cada corrida y
ejecuta el script de la subcarpeta correspondiente. Por eso los prompts apuntan
con ruta completa, p.ej. `python logistics/habits/generate_habits.py`.

## Nota de aislamiento

El pipeline de notas de RBT (ABA) **no va aquí**: maneja PHI y tiene requisitos
de BAA/compliance, así que merece su propio repo aislado y con control de acceso,
separado de las automatizaciones personales.
