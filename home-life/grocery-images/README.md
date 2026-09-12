# Grocery cart screenshot cropper

Recorta una captura de carrito (Instacart/Publix, etc.) en una imagen por
producto (foto + título + precio), lista para pegar en la página de Notion
de ese producto (base `Grocery Shopping`).

## Cómo funciona

OCR (`pytesseract`) detecta cada línea de texto y su posición. Clasifica
cada línea como **ruido** (barra de estado, header de la app, precios,
"Buy 1 get 1 free", "Eligible items", stepper de cantidad, footer de
checkout) o **contenido** (parte de un título de producto). Líneas de
contenido cercanas se fusionan (títulos que ocupan 2 líneas); un salto
vertical grande marca un producto nuevo. Cada recorte va desde un poco
arriba de su título hasta un poco antes del título del siguiente producto.

## Uso

```bash
pip install pillow pytesseract   # + apt-get install tesseract-ocr, si falta
python3 crop_cart_screenshot.py mi_captura.png carpeta_salida
```

Genera `carpeta_salida/01_nombre_del_producto.png`, `02_...png`, etc.

## Campos extraídos (`manifest.json`)

Junto a los PNG, el script escribe un `manifest.json` en la carpeta de
salida con, por producto: `title`, `price` (precio de oferta), `regular_price`
(precio regular, si había BOGO/tachado), `promo` (texto de la promo),
`quantity` (cantidad en el carrito, si se detectó), `store` (tienda,
detectada del header "Personal X Cart") e `image_path`.

Nota: Tesseract a veces lee el "1" tachado de un precio regular como "4"
(ej. $14.58 → $44.58). Cuando hay promo "Buy 1, get 1 free" se corrige
asumiendo que el precio regular es ~2× el de oferta.

## Subida a Notion

Este paso lo hace Claude directamente sobre el `manifest.json` + los PNG
(no es parte del script, porque requiere criterio: decidir el nombre
genérico y la categoría de cada producto). Base destino: `Grocery
Shopping` (`collection://cb443835-5bd5-44ff-a57e-48c5db887c3f`).

**Flujo (probado end-to-end el 2026-09-12 con un carrito real de Publix):**

1. **Nombre genérico, no la marca completa.** El título OCR trae marca +
   variante + tamaño (ej. *"Duke's Mayonnaise, with Olive Oil, Light (11.5
   fl oz)"*); la página en Notion usa el nombre genérico del producto (ej.
   **"Mayonnaise"**). La marca/tamaño exactos quedan en la foto incrustada
   y en `Notes` — así "la foto adentro muestra exactamente cuál".
2. **Buscar antes de crear** (`notion-query-data-sources`, filtro
   `Item CONTAINS <nombre genérico>`) para no duplicar. Si ya existe una
   página con ese nombre (ej. "Pan"), se **actualiza** esa página en vez
   de crear una nueva.
3. **Subir la imagen**: `notion-create-file-upload` (da una `upload_url`
   en `api.notion.com`, ya permitido en este environment) → un `POST`
   multipart con `curl` al archivo PNG → la respuesta trae
   `markdown_source` (`file-upload://<id>`) para usar como imagen en el
   contenido de la página: `![alt](file-upload://<id>)`.
4. **Llenar todos los campos** de la base (`Category`, `Store`, `Status`,
   `Quantity`, `Notes`, `Duración típica`, `Recurring`) — no solo el
   título e imagen:
   - `Store`: se detecta solo del header de la captura ("Personal X
     Cart" → campo `store` del manifest).
   - `Status`: **`"To buy"` por defecto**, aunque la captura sea de un
     "carrito" de Instacart — Instacart se usa solo para explorar
     precios/ofertas, no es una compra real en curso. Solo usar
     `"In cart"`/`"Bought"` si el usuario confirma explícitamente que sí
     compró o dejó algo apartado. No llenar `Fecha de compra` salvo que
     `Status = "Bought"` (convención ya existente en la base).
   - `Quantity`: el `ct` detectado si lo hay (ej. `"2 ct (8.3 oz c/u)"`);
     si no hay `ct` visible, usar el tamaño del título (ej. `"16 oz"`).
   - `Notes`: marca/variante + precio/promo del manifest (ej. `"Tuscanini
     Margherita, Thin Crust — $6.31 (BOGO, reg. $12.62)"`).
   - `Category`/`Duración típica`: criterio propio según el tipo de
     producto (si la página ya existía, no tocar estos dos a menos que
     estén claramente mal).
   - Al **actualizar** una página existente que pasa de `Bought` a
     `In cart` (nueva compra), limpiar su `Fecha de compra` vieja
     (`"date:Fecha de compra:start": null`) para que no quede una fecha
     de compra pasada contradiciendo el status actual.
5. Icono de página: seguir la convención existente de un emoji por
   producto (ej. 🍞 Pan, 🍕 Pizza).

**Limitación conocida:** el matching de nombre genérico y la categoría
son juicio de Claude en cada corrida, no una regla determinista en el
script — dos corridas para el mismo tipo de producto deberían coincidir
en el nombre, pero no hay garantía automática si cambia mucho el
fraseo del título original.
