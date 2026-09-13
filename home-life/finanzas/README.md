# Finanzas personales

Presupuesto mensual, transacciones reales, deudas y metas de ahorro. Diseñado
en una sesión de chat larga (12-13 sep 2026) analizando 12 meses de estados de
cuenta de Wells Fargo (sep 2025 – ago 2026).

**El sistema vive en Google Sheets** (no en Notion — se probó ahí primero,
pero se migró para poder compartir/exportar más fácil, ej. con la mamá de
Samanta). Ver "Historia: versión en Notion" al final de este README para lo
que quedó abandonado ahí.

**Hoja:** https://docs.google.com/spreadsheets/d/1JBdFxssfwlhTvg0KgHVR8zy0PrYlfATTMfjPF3fNpEg/edit

## Flujo mensual (manual, no hay script todavía)

1. Samanta manda el PDF del estado de cuenta del mes.
2. Claude lo lee (`pypdf`), parsea las líneas de transacción, y **clasifica
   cada cargo** en una de las categorías de abajo — con el mismo criterio
   usado en esta sesión (ver "Gotchas" para los casos que requieren juicio,
   no son mecánicos).
3. Claude agrega las filas nuevas a la pestaña **Transacciones**, con la
   columna `Mes` en el formato exacto `"{Mes abreviado} {Año}"` (ej.
   `"Sep 2026"`) — tiene que calzar carácter por carácter con la columna
   `Mes` de **Presupuesto Mensual**, porque de eso depende el SUMIFS.
4. Si faltan filas de **Presupuesto Mensual** para el mes nuevo, crearlas
   primero (copiar los `Planned` del mes anterior, ajustar si algo cambió) —
   son las mismas 15 categorías de siempre, una fila por categoría por mes.
5. Las columnas `Actual`/`Remaining`/`% Usado`/`Status` de Presupuesto
   Mensual son fórmulas que se recalculan solas al agregar filas a
   Transacciones — no hay que tocarlas.

## Google Sheets — estructura

**Pestaña "Transacciones"** (una fila por cargo real del banco):
`Fecha`, `Descripcion`, `Monto`, `Tipo` (Ingreso/Gasto/Ahorro/Transferencia
Interna/Reembolso), `Categoria`, `Mes` (texto, ej. `"Ago 2026"` — debe
coincidir exacto con Presupuesto Mensual), `Fuente` (Wells Fargo/Manual/
Efectivo), `Notas`.

**Pestaña "Presupuesto Mensual"** (una fila = una categoría en un mes):
`Mes`, `Categoria`, `Planned`, `Actual` (fórmula `SUMIFS` sobre Transacciones,
sumando solo filas `Tipo = "Gasto"` o `Tipo = "Ahorro"` — Ingreso/
Transferencia Interna/Reembolso NO cuentan contra el presupuesto),
`Remaining` (`Planned - Actual`), `% Usado`, `Status` (🔴 Sobre presupuesto /
🟡 Cerca del límite / 🟢 OK).

**Pestaña "Deudas"**: `Nombre`, `Monto Adeudado`, `Estado` (Activa/Pagada),
`Prioridad` (Sin urgencia/Urgente), `Notas`.

**Pestaña "Metas de Ahorro"**: `Nombre`, `Monto Objetivo`, `Monto Actual`,
`Fecha Objetivo`, `Estado`, `Notas`. Trae una fila de ejemplo marcada
"EJEMPLO - borra esta fila" con formato amarillo — bórrala al agregar la
primera meta real.

### Categorías (usadas en Transacciones.Categoria y Presupuesto.Categoria)

Comida, Transporte, Prestamo Auto, Suscripciones, Fitness,
P2P/Transferencias, Comisiones Bancarias, Ahorro, Compras, Salud, Cuidado
Personal, Mascotas, Otros, Remesas, Viajes.

*(`Prestamo Auto` es el pago mensual fijo del carro — no confundir con la
pestaña `Deudas`, que es para deudas personales tipo "le debo a X".)*

### Regenerar/editar el archivo

El .xlsx se construyó con `openpyxl` (script no guardado en el repo, ver
sección "Gotchas" abajo si hay que rehacerlo) y se subió a Drive vía
`create_file` con `contentMimeType` de xlsx, dejando que Drive lo convierta
a Google Sheet nativo — así las fórmulas `SUMIFS`/`IFERROR`/`IF` quedan como
fórmulas reales de Sheets, no como texto.

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
- Antes de escribir en la hoja, revisar que `pip install openpyxl` esté
  disponible en el entorno (no viene preinstalado aquí pese a lo que dice
  la skill de xlsx) y que `recalc.py` (LibreOffice) puede no funcionar en
  este sandbox — no es bloqueante: Google Sheets recalcula las fórmulas por
  su cuenta al convertir el archivo subido vía `create_file`, así que basta
  con verificar leyendo el archivo de vuelta con `read_file_content` después
  de subirlo.

---

## Historia: versión en Notion (abandonada, sep 2026)

Antes de migrar a Sheets, este sistema se construyó primero en Notion
(4 bases: Monthly Budget, Transactions, Debts, Savings Goals, bajo una
página "Finanzas" enlazada desde Command Center → Home/Life) con rollups y
fórmulas nativas de Notion, y se llegó a poblar con el presupuesto de
agosto/septiembre y las 41 transacciones de agosto. Se abandonó porque
Samanta prefirió Sheets por facilidad de compartir/exportar. Las bases de
Notion pueden seguir existiendo sin usarse, o haberse archivado — confirmar
con Samanta el estado actual antes de asumir que siguen ahí intactas.

IDs de referencia (por si hace falta recuperar algo de ahí):

| Base | Página/DB URL | Data source ID |
|---|---|---|
| Finanzas (página contenedora) | `3da2cd38-4e97-819e-92d4-cc1aa6a41e06` | — |
| Monthly Budget | `69c7b671-30c3-4969-a1a3-ac0008ac1437` | `bfb1c827-5ab9-4348-8443-78dbcd17ef97` |
| Transactions | `08d36af0-f6bb-4aab-b6ba-da9c4d6f7932` | `9487ca79-2e67-41a2-afdb-8728a00541e3` |
| Debts | `f786f33e-24e6-4f52-b534-5970ecf83de3` | `9cb09780-a7e7-4cc8-8f69-a32ce6bbe629` |
| Savings Goals | `88ad297b-1bb9-4844-b162-cf5ff8ec6899` | `c480af21-8cbc-4fd6-a5b4-7c5ed29729d3` |
