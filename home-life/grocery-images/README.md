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

Los campos del manifest + la imagen se usan para crear/actualizar la
página del producto correspondiente en la base `Grocery Shopping` (match
por nombre genérico del producto — si ya existe una página con ese nombre,
se actualiza; si no, se crea una nueva con todos los campos llenos e
imagen incrustada). Este paso lo hace Claude directamente (no es parte del
script), ya que requiere juicio para decidir el nombre genérico y la
categoría de cada producto.
