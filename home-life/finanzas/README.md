# Finanzas personales

Presupuesto mensual, transacciones reales, deudas y metas de ahorro. Diseñado
en una sesión de chat larga (12-14 sep 2026) analizando 12 meses de estados de
cuenta de Wells Fargo (sep 2025 – ago 2026).

**El sistema vive en Notion**, bajo la página **Finanzas** (enlazada desde
Command Center → columna Home/Life). Se intentó migrar a Google Sheets para
compartir/exportar más fácil, pero se revirtió (ver "Intento abandonado:
Google Sheets" al final) — Samanta comparte la página de Notion ella misma
cuando lo necesita (ej. con su mamá), no hace falta que Claude gestione eso.

## Flujo mensual (manual, no hay script todavía)

1. Samanta manda el PDF del estado de cuenta del mes.
2. Claude lo lee (`pypdf`), parsea las líneas de transacción, y **clasifica
   cada cargo** en una de las categorías de abajo — con el mismo criterio
   usado en esta sesión (ver "Gotchas" para los casos que requieren juicio,
   no son mecánicos).
3. Claude crea las filas en **Transactions**, cada una enlazada a su
   **Budget Line** correspondiente (`{Categoría} — {Mes} 2026` en
   **Monthly Budget**) para que el rollup `Actual` se actualice solo.
   Transacciones de tipo Ingreso/Transferencia Interna/Reembolso NO llevan
   `Budget Line` (no cuentan contra el presupuesto).
4. Se compara `Actual` vs `Planned` de ese mes (ya lo calcula la fórmula
   `Status`/`% Usado`/`Remaining`) y se reporta el resumen.
5. Si faltan filas de Monthly Budget para el mes nuevo, crearlas primero
   (copiar los `Planned` del mes anterior, ajustar si algo cambió) — son las
   mismas 15 categorías de siempre, una fila por categoría por mes.

Esto es incremental: cada mes solo se agregan páginas nuevas a Transactions
(y a Monthly Budget si falta el mes), nunca hay que regenerar ni tocar nada
existente — a diferencia del intento de Sheets, aquí no hay riesgo de borrar
vistas, gráficas o estilos que Samanta agregue por su cuenta.

## Notion — bases y IDs

| Base | Página/DB URL | Data source ID |
|---|---|---|
| Finanzas (página contenedora) | `3da2cd38-4e97-819e-92d4-cc1aa6a41e06` | — |
| Monthly Budget | `69c7b671-30c3-4969-a1a3-ac0008ac1437` | `bfb1c827-5ab9-4348-8443-78dbcd17ef97` |
| Transactions | `08d36af0-f6bb-4aab-b6ba-da9c4d6f7932` | `9487ca79-2e67-41a2-afdb-8728a00541e3` |
| Debts | `f786f33e-24e6-4f52-b534-5970ecf83de3` | `9cb09780-a7e7-4cc8-8f69-a32ce6bbe629` |
| Savings Goals | `88ad297b-1bb9-4844-b162-cf5ff8ec6899` | `c480af21-8cbc-4fd6-a5b4-7c5ed29729d3` |

### Schema

**Monthly Budget** (una fila = una categoría en un mes, el "sobre"):
`Name`, `Category` (select), `Month` (date), `Planned` (number), `Transactions`
(relation ← Transactions.Budget Line), `Actual` (rollup: sum), `Remaining`
(formula: Planned − Actual), `% Usado` (formula), `Status` (formula: 🔴/🟢).

**Transactions** (el log real, uno por cargo del banco):
`Description`, `Date`, `Amount`, `Type` (Ingreso/Gasto/Ahorro/Transferencia
Interna/Reembolso), `Category` (select, mismas opciones que Monthly Budget),
`Budget Line` (relation → Monthly Budget), `Savings Goal` (relation →
Savings Goals, solo si Type=Ahorro hacia una meta), `Debt` (relation → Debts,
solo si es un pago hacia una deuda), `Source` (Wells Fargo/Manual/Efectivo),
`Notes`.

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
Apple Music $6.78 · Car loan (WF Payment) $299.79 fijo · LA Fitness $58.84
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
