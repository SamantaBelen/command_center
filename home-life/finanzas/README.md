# Finanzas personales

Presupuesto mensual, transacciones reales, deudas, metas de ahorro, cuentas,
balances y control de recurrentes. Diseñado en una sesión de chat larga
(12-16 sep 2026) analizando 12 meses de estados de cuenta de Wells Fargo
(sep 2025 – ago 2026).

**El sistema vive en Notion**, bajo la página **Finanzas** (enlazada desde
Command Center → columna Home/Life). Se intentó migrar a Google Sheets para
compartir/exportar más fácil, pero se revirtió (ver "Intento abandonado:
Google Sheets" al final) — Samanta comparte la página de Notion ella misma
cuando lo necesita (ej. con su mamá), no hace falta que Claude gestione eso.

**Meta principal de Samanta** (dicha explícitamente): cada mes asegurarse de
que (1) todo lo que debe pagarse se pagó, y (2) no le estén cobrando cosas /
suscripciones que no pidió. Por eso existen la base **Recurrentes** y la
página **📊 Resumen mensual** (dashboard) — son el corazón del uso real, más
que el presupuesto en sí.

## Flujo mensual (manual, no hay script todavía)

1. Samanta manda el PDF del estado de cuenta del mes.
2. Claude lo lee (`pypdf`), parsea las líneas de transacción, y **clasifica
   cada cargo** en una de las categorías de abajo — con el mismo criterio
   usado en esta sesión (ver "Gotchas" para los casos que requieren juicio,
   no son mecánicos).
3. Claude crea las filas en **Transactions**. Cada transacción lleva **tres
   relaciones clave**:
   - `Account` → qué cuenta (Contribuciones/Checking o Abundancia/Savings, en
     la base **Accounts**).
   - `Balance Month` → la fila cuenta-mes de **Account Balances** (ej.
     "Checking (Contribuciones) — Sep 2026"). Esto alimenta el rollup que
     calcula el saldo (ver abajo). **Toda** transacción lleva esta relación.
   - `Budget Line` → la categoría-mes de **Monthly Budget** (`{Categoría} —
     {Mes} 2026`) para el rollup `Actual`. Transacciones de tipo Ingreso /
     Transferencia Interna / Reembolso NO llevan `Budget Line` (no cuentan
     contra el presupuesto).
4. Se compara `Actual` vs `Planned` de ese mes (ya lo calcula la fórmula
   `Status`/`% Usado`/`Remaining`) y se reporta el resumen.
5. Se revisa el **cuadre de balances** en Account Balances (Status ✅/⚠️) y el
   **control de recurrentes** (que los activos aparecieron y ningún cancelado
   reapareció).
6. Si faltan filas de Monthly Budget o Account Balances para el mes nuevo,
   crearlas primero. Monthly Budget: copiar los `Planned` del mes anterior.
   Account Balances: una fila por cuenta, con `Balance Start` = `Balance End
   (Real)` del mes anterior, y `Balance End (Real)` = captura del balance real
   que manda Samanta.

Esto es incremental: cada mes solo se agregan páginas nuevas, nunca hay que
regenerar ni tocar nada existente — a diferencia del intento de Sheets, aquí
no hay riesgo de borrar vistas, gráficas o estilos que Samanta agregue por su
cuenta.

### Signos de los montos (importante)

`Amount` en Transactions es **firmado**: gastos/débitos negativos, ingresos/
créditos positivos. Un error común al cargar es meter un gasto en positivo —
si el cuadre de un mes no da, revisar signos primero (pasó en ago 2026: 6
transacciones estaban en positivo). **Siempre verificar sumas con código**
(script Python sobre el CSV), no a mano — pedido explícito de Samanta.

## Notion — bases y IDs

| Base | Página/DB URL | Data source ID |
|---|---|---|
| Finanzas (página contenedora) | `3da2cd38-4e97-819e-92d4-cc1aa6a41e06` | — |
| 📊 Resumen mensual (dashboard) | `3dd2cd38-4e97-8151-b56c-ded38cbeb749` | — (página, no DB) |
| Monthly Budget | `69c7b671-30c3-4969-a1a3-ac0008ac1437` | `bfb1c827-5ab9-4348-8443-78dbcd17ef97` |
| Transactions | `08d36af0-f6bb-4aab-b6ba-da9c4d6f7932` | `9487ca79-2e67-41a2-afdb-8728a00541e3` |
| Accounts | `4693bd56-fbc7-4aec-b95d-cd7e3bcfea2b` | `1b67a941-5d57-4725-8cd8-58057225629e` |
| Account Balances | `2dfcd460-fcf6-45f2-ba46-e41252c9c554` | `77382a75-7019-4489-96bf-d79f2e5d9df4` |
| Recurrentes | `e620040c-92ab-4a64-80c8-4e82bcc0557e` | `8c9f4205-34cc-4daa-8fd6-93f16eccb183` |
| Debts | `f786f33e-24e6-4f52-b534-5970ecf83de3` | `9cb09780-a7e7-4cc8-8f69-a32ce6bbe629` |
| Savings Goals | `88ad297b-1bb9-4844-b162-cf5ff8ec6899` | `c480af21-8cbc-4fd6-a5b4-7c5ed29729d3` |

**Cuentas** (filas en Accounts): Contribuciones (Checking, WF ...5244) =
`3dd2cd38-4e97-8174-8316-dbd55a03bfb0` · Abundancia Capital (Savings, WF
...5634) = `3dd2cd38-4e97-81a7-8a3f-c7837af959d6`. Ambas Owner=Samanta. El
diseño soporta agregar las cuentas de la mamá (Owner=Mamá) creando filas, sin
tocar el schema.

### Schema

**Monthly Budget** (una fila = una categoría en un mes, el "sobre"):
`Name`, `Category` (select), `Month` (date), `Planned` (number), `Transactions`
(relation ← Transactions.Budget Line), `Actual` (rollup: sum), `Remaining`
(formula: Planned − Actual), `% Usado` (formula), `Status` (formula: 🔴/🟢).

**Transactions** (el log real, uno por cargo del banco):
`Description`, `Date`, `Amount` (firmado), `Type` (Ingreso/Gasto/Ahorro/
Transferencia Interna/Reembolso), `Category` (select, mismas opciones que
Monthly Budget), `Account` (relation → Accounts), `Balance Month` (relation →
Account Balances, alimenta el cuadre), `Budget Line` (relation → Monthly
Budget), `Savings Goal` (relation → Savings Goals, solo si Type=Ahorro hacia
una meta), `Debt` (relation → Debts, solo si es un pago hacia una deuda),
`Source` (Wells Fargo/Manual/Efectivo), `Notes`.

**Accounts** (una fila por cuenta bancaria):
`Name`, `Owner` (Samanta/Mamá), `Bank` (Wells Fargo/Banco Pichincha), `Type`
(Checking/Savings), `Últimos 4`, `Moneda` (USD), `Notes`, más relaciones
inversas `Transactions`, `Balances`, `Recurrentes`.

**Account Balances** (una fila = una cuenta en un mes; prueba de cuadre):
`Name`, `Cuenta` (relation → Accounts), `Month` (date), `Balance Start`
(number, tecleado del statement/mes anterior), `Balance End (Real)` (number,
captura del banco), `Movimientos` (relation ← Transactions.Balance Month),
`Suma Movimientos` (rollup: sum de Amount de los Movimientos), `Balance End
(Calculado)` (**formula**: `Balance Start + Suma Movimientos`), `Diferencia`
(formula: Calculado − Real), `Status` (formula: ✅ Cuadra / ⚠️ Revisar).
El Calculado sale **solo** de las transacciones — si agregas/editas/borras una
transacción con su `Balance Month` puesto, el saldo se recalcula automático.

**Recurrentes** (lista maestra de cargos recurrentes, para el control mensual):
`Name`, `Estado` (Activa/Cancelada/Pausada), `Cadencia` (Mensual/Anual),
`Monto esperado` (number), `Cuándo` (texto, ej. "~17-18 de cada mes"),
`Categoría` (select), `Cuenta` (relation → Accounts), `Notes`.
Activas = deben aparecer cada periodo. Canceladas = NO deben reaparecer (si
reaparecen, es un cargo no deseado → avisar). Guardar `Monto esperado`
permite detectar cambios de precio (ej. Apple Music $6.78→$7.91).

**Debts**: `Name`, `Amount Owed`, `Status` (Activa/Pagada), `Priority`
(Sin urgencia/Urgente), `Target Date`, `Notes`, `Pagos` (relation ←
Transactions.Debt), `Total Pagado` (rollup), `Saldo Pendiente` (formula).

**Savings Goals**: `Name`, `Target Amount`, `Target Date`, `Status`
(Activa/Completada/Pausada), `Notes`, `Transactions` (relation ←
Transactions.Savings Goal), `Current Amount` (rollup), `% Completado`
(formula).

### Categorías (select, compartidas por Monthly Budget y Transactions)

Comida, Transporte, Préstamo Auto, Suscripciones, Fitness, P2P/Transferencias,
Comisiones Bancarias, Ahorro, Compras, Salud, Cuidado Personal, Mascotas,
Otros, Remesas, Viajes.

*(`Préstamo Auto` es el pago mensual fijo del carro — no confundir con la
base `Debts`, que es para deudas personales tipo "le debo a X".)*

## Estado a septiembre 2026 (snapshot de cuando se armó esto)

**Recurrentes mensuales fijos** (~$390.39/mes total):
Google One $1.99 (Google Drive) · iCloud+ $2.99 · Claude $19.99→$20.00 ·
Apple Music $6.78→$7.91 (subió, confirmado por recibo de Apple: $6.99 +
impuestos FL) · Car loan (WF Payment) $299.79 fijo · LA Fitness $58.84
(monto final confirmado, antes variaba).

**Recurrentes anuales**: LA Fitness cuota anual ~$73 (cobra ~jun) · Registro
del carro en Miami-Dade, renovación el **6 de mayo**, presupuestado al máximo
del rango ($46.10) aunque el costo real típico es $27.60–$46.10 según peso
del vehículo.

**Cancelados / ya no son gasto de Samanta** (confirmado por ella,
sep 2026): Adobe, Imagine.Art, ChatPDF, Weights & Biases, Wix.com,
psicóloga (Alejandrafreil), Zipcar, Porkbun (pasó a tarjeta de la empresa).
Seguro Progressive lo paga ahora su mamá — ya no es su gasto tampoco.
Ojo: canceló la tarjeta de crédito usada para varios de estos — si llega
un email pidiendo actualizar el método de pago para alguno que sigue activo
(ej. LA Fitness ya está en tarjeta nueva), avisar.

**Pass-through / neutro**: envíos a Cuba vía Tuambia.com — su tía
(Zelle "Gil Yudaris") se los reembolsa con un pequeño margen extra. También
un envío de $538 de Gil Yudaris (07-ago) del cual $500 se retiraron en
efectivo para dárselos de vuelta en cash — ambos casos se registran como
Tipo=Reembolso, sin `Budget Line`/no cuentan contra el presupuesto.

**Deudas activas** (sin urgencia, metas a futuro, no pagos programados):
- Mamá — $1,135.00 (ayuda recibida vía Zelle mientras buscaba trabajo,
  feb–ago 2026; ya se restaron reembolsos de Publix/veterinario y un regalo
  de cumpleaños de $100 del 6 de mayo).
- Salet — $176.00 (préstamo previo, parcialmente devuelto; esto es lo que
  queda pendiente — confirmado explícitamente por Samanta, no asumir que un
  pago posterior lo reduce sin que ella lo confirme).

**Pendientes / a vigilar** (al 16-sep 2026):
- **Provisional Credit de agosto ($844.90, Claim-Ref #2608190033026)** SIGUE
  EN PROCESO con Wells Fargo. Es un batch de reversiones de overdraft fees +
  créditos provisionales del 21-25 ago. Si el banco resuelve en contra de
  Samanta, se revierte y el balance de Checking baja ~$845. Está anotado en
  las Notes de esa transacción y en el dashboard.
- **Tarjeta cancelada**: canceló la tarjeta de crédito de varias suscripciones.
  Si llega email pidiendo actualizar método de pago de algo activo (ej. LA
  Fitness ya migró a tarjeta nueva), avisar.

## Estado de cuentas (reconciliación al 16-sep 2026)

Las 4 filas de Account Balances cuadran exacto (Diferencia $0.00, verificado
con código):

| Cuenta | Mes | Start | Suma movs | Calc/Real |
|---|---|---|---|---|
| Contribuciones (Checking) | Ago | −$141.96 | +$631.46 | $489.50 |
| Contribuciones (Checking) | Sep | $489.50 | +$26.63 | $516.13 |
| Abundancia Capital (Savings) | Ago | $4.00 | +$1.00 | $5.00 |
| Abundancia Capital (Savings) | Sep | $5.00 | +$2.00 | $7.00 |

Nota: el balance inicial de Checking de agosto (−$141.96) y el fin de agosto
($489.50) los confirmó Samanta del statement real. Los de Savings de agosto
son reconstruidos hacia atrás desde el balance actual ($7.00) — alta confianza
pero sin statement independiente. Septiembre de ambas cuentas cuadra contra
capturas de balance actual.

## Dashboard — 📊 Resumen mensual

Página con el checklist mensual + accesos a todas las bases + sección de
pendientes a vigilar. Es el punto de entrada del uso real (control de
suscripciones y cuadre), no el presupuesto. Cada mes Samanta abre esa página
y sigue el checklist.

## Gotchas / notas de parseo (para el próximo mes)

- Los PDF de Wells Fargo son bilingües es/en; usar `pypdf` normal
  (`PdfReader(...).extract_text()` por página) — si `pypdf` falla con
  `ModuleNotFoundError: _cffi_backend`, instalar `cffi` primero
  (`pip install cffi`), es un bug conocido del paquete `cryptography`.
- Cada línea de transacción puede venir partida en 2-3 líneas de texto
  (fecha+desc, resto de desc, monto(s)) — hay que unirlas antes de parsear.
  El monto que sigue es SIEMPRE el monto de la transacción; si hay un
  segundo número en la misma línea es el saldo del día (puede venir con
  signo negativo tras un sobregiro, ej. `299.79    -106.26` → el monto real
  es 299.79), nunca un segundo cargo.
- Filtrar boilerplate antes de parsear: headers de página repetidos
  ("Historial de transacciones (continuación)", "Fecha/Depósitos/
  Retiros/Saldo", "Página X de Y", etc.) — si no, corrompen el parseo
  (desalinean qué línea es la fecha de inicio de cada transacción).
  Cortar todo el texto después de la primera línea `Totales $` (ahí termina
  la tabla real, sigue el resumen de cargos/hoja de cuadre que NO son
  transacciones).
- **Las líneas de "Overdraft Fee for a Transaction Posted on MM/DD $X.XX"
  traen incrustado el monto de la transacción ORIGINAL que causó el
  sobregiro, no el cargo real.** El cargo real ($35 fijo en Wells Fargo)
  viene 1-2 líneas después. Hay que quitar ese `$X.XX` incrustado antes de
  buscar el monto de la línea, si no el parser lo confunde y suma montos
  gigantes en vez de $35 por cargo.
- La dirección (ingreso vs gasto) se infiere por palabras clave en la
  descripción, no por columna (columna se pierde al extraer texto plano):
  `payroll`, `zelle from`, `atm cash deposit`, `instant pmt from` → ingreso;
  todo lo demás (`purchase authorized`, `recurring payment authorized`,
  `zelle to`, `venmo payment`, `wf payment`, `overdraft fee`, `atm
  withdrawal`) → gasto.
- **Detectar reembolsos y pass-through pide criterio, no es mecánico.**
  Un match automático por "monto similar + fecha cercana" da falsos
  positivos (coincidencias con suscripciones, transferencias a terceros no
  relacionadas). Mejor: mostrarle a Samanta los candidatos con contexto y
  que ella confirme, como se hizo con los reembolsos de Publix/veterinario,
  el regalo de cumpleaños, y el envío de $538/$500 a la tía.
- Compras en Costco/Publix con reembolso de mamá el mismo día son gasto real
  de ella (va a Comida/Compras) — el reembolso correspondiente de Sasaya
  Corporation/Yadira NO cuenta hacia la deuda con mamá (ya se restó).
- Al agregar propiedades nuevas a una data source de Notion (rollups/
  fórmulas), usar `notion-update-data-source` **una columna a la vez** —
  varios `ADD COLUMN` con fórmulas en el mismo batch fallan con
  "Type error with formula" aunque cada una funcione bien por separado.

---

## Intento abandonado: Google Sheets (13-14 sep 2026)

Se migró todo a Google Sheets (4 pestañas equivalentes) buscando que fuera
más fácil de compartir/exportar. Se abandonó y se volvió a Notion por dos
razones que salieron en la práctica:

1. **No hay forma de editar celdas en vivo.** Cada actualización mensual
   requeriría regenerar el archivo completo con `openpyxl` y volver a
   subirlo con `create_file` (Google Drive) — no hay API disponible en esta
   sesión para agregar filas a una hoja existente sin recrearla.
2. **Regenerar el archivo completo destruye cualquier gráfica o estilo**
   que Samanta agregue manualmente en Sheets — el mismo problema que la hizo
   dudar y pedir separar la pestaña de Transacciones a un archivo aparte
   (se llegó a implementar esto vía `IMPORTRANGE` antes de revertir todo).
   Además, subir el archivo con las 4 pestañas completas empezó a fallar
   con `"Invalid conversion requested"` de forma intermitente (un archivo
   mínimo de una sola fórmula sí subía bien, así que no se aisló la causa
   exacta — posiblemente tamaño/complejidad del archivo).

Para compartir la página de Notion, Samanta la comparte ella misma
directamente desde Notion (con el correo de quien sea, o con un link
público) cuando lo necesite — no requiere que Claude gestione nada de eso.
