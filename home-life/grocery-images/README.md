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

## Limitación conocida

El **último producto de la lista** puede arrastrar el footer ("Saving $...
Go to checkout") porque no hay un título siguiente que marque el límite.
Recortar ese último manualmente si hace falta.

## Pendiente / próximos pasos

- Subir los recortes automáticamente a la página de Notion del producto
  correspondiente (match por nombre) en vez de arrastrarlos a mano.
- Regla para cortar el footer de checkout en el último producto.
