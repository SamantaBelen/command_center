#!/usr/bin/env python3
"""
Crop a grocery-cart screenshot (Instacart/Publix style) into one image per
product: thumbnail + title, ready to drop into that product's Notion page.

How it works (no manual measuring needed):
1. OCR the screenshot to find every line of text and its vertical position.
2. Classify each line as NOISE (status bar, header, price, "Buy 1 get 1
   free", "Eligible items", "Replace with best match", quantity stepper,
   checkout footer, stray icon glyphs...) or CONTENT (part of a product
   title).
3. Consecutive CONTENT lines close together (small vertical gap -- product
   names that wrap to 2 lines) are merged into one title. A big vertical
   gap before a CONTENT line means a new product started.
4. Each product's crop spans full-width, from a bit above its title to a
   bit above the next product's title (or the bottom of the image for the
   last one) -- so the product photo and its name/price stay together.
5. Crops are saved as PNG, named after the (merged) detected title.

Usage:
    python3 crop_cart_screenshot.py <screenshot.png> [output_dir]

Notes:
- If OCR garbles a title badly, the filename falls back to
  product_01.png, product_02.png, ... so nothing is silently dropped --
  crop boundaries don't depend on getting the text right, only on finding
  *where* a title is.
- Tune the constants below if a screenshot's crops look off (phone
  screenshots vary in DPI/scale/app layout).
"""

import re
import sys
from pathlib import Path

from PIL import Image
import pytesseract

# --- Tunables ---------------------------------------------------------------
MIN_GAP_PX = 45        # vertical gap between CONTENT lines that signals a new product
TOP_PAD_PX = 14        # a little breathing room above a title in the crop
BOTTOM_PAD_PX = 6      # a little breathing room before the next title starts
MIN_CONFIDENCE = 40    # ignore low-confidence OCR noise
MAX_TITLE_LINES = 3    # safety cap on how many wrapped lines merge into one title

# Lines matching any of these (searched, case-insensitive, anywhere in the
# line) are never part of a product title -- they're UI chrome, prices, or
# promo/quantity/footer text sitting between or around the actual titles.
NOISE_PATTERNS = [
    r"\$",                          # any price ("$7.29", "$7.29 $14.58", "Saving $105.37")
    r"^\d{1,2}:\d{2}",              # phone clock ("11:52")
    r"powered by instacart",
    r"^personal .* cart$",
    r"^shopping\b",
    r"buy \d+.*free",
    r"eligible items",
    r"replace with best match",
    r"go to checkout",
    r"^savings\.?$",
    r"\d+\s*ct\b",                  # quantity stepper ("2ct +", "— 2ct +")
]
NOISE_RE = [re.compile(p, re.IGNORECASE) for p in NOISE_PATTERNS]


def is_noise(text: str) -> bool:
    t = text.strip()
    if len(t) <= 2:               # stray icon glyphs OCR'd as "x", "=", "ga"...
        return True
    return any(p.search(t) for p in NOISE_RE)


def slugify(text: str) -> str:
    t = re.sub(r"[^\w\s-]", "", text.lower())
    t = re.sub(r"[\s_-]+", "_", t).strip("_")
    return t[:60] or "product"


def get_lines(image: Image.Image):
    """OCR the image; return every text line as (top, bottom, text),
    ordered top to bottom, using Tesseract's own line grouping."""
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    n = len(data["text"])

    lines = {}
    for i in range(n):
        text = data["text"][i].strip()
        conf = int(data["conf"][i]) if data["conf"][i] != "-1" else -1
        if not text or conf < MIN_CONFIDENCE:
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        if key not in lines:
            lines[key] = {"words": [], "top": y, "bottom": y + h}
        lines[key]["words"].append(text)
        lines[key]["top"] = min(lines[key]["top"], y)
        lines[key]["bottom"] = max(lines[key]["bottom"], y + h)

    ordered = sorted(lines.values(), key=lambda l: l["top"])
    return [(l["top"], l["bottom"], " ".join(l["words"])) for l in ordered]


def find_titles(lines):
    """Walk the OCR'd lines and group CONTENT lines into per-product
    titles, merging wrapped lines and skipping NOISE entirely (both for
    the title text and for gap tracking -- a stepper/price line sitting
    between two title lines must not break the merge or fake a gap)."""
    titles = []          # list of dicts: {top, bottom, text, n_lines}
    prev_content_bottom = None

    for top, bottom, text in lines:
        if is_noise(text):
            continue

        gap = (top - prev_content_bottom) if prev_content_bottom is not None else None
        starts_new = gap is None or gap >= MIN_GAP_PX

        if starts_new:
            titles.append({"top": top, "bottom": bottom, "text": text, "n_lines": 1})
        elif titles and titles[-1]["n_lines"] < MAX_TITLE_LINES:
            titles[-1]["text"] += " " + text
            titles[-1]["bottom"] = bottom
            titles[-1]["n_lines"] += 1
        # else: silently drop extra wrapped lines past MAX_TITLE_LINES

        prev_content_bottom = bottom

    return titles


def crop_products(image_path: str, out_dir: str):
    image = Image.open(image_path).convert("RGB")
    width, height = image.size

    lines = get_lines(image)
    if not lines:
        print("No text detected -- is the image legible / high enough resolution?")
        return []

    titles = find_titles(lines)
    if not titles:
        print("No product titles detected. Try lowering MIN_GAP_PX or MIN_CONFIDENCE.")
        return []

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    results = []
    for idx, t in enumerate(titles):
        crop_top = max(0, t["top"] - TOP_PAD_PX)
        crop_bottom = titles[idx + 1]["top"] - BOTTOM_PAD_PX if idx + 1 < len(titles) else height
        crop_bottom = max(crop_bottom, crop_top + 20)  # never a zero/negative-height crop

        crop = image.crop((0, crop_top, width, crop_bottom))
        slug = slugify(t["text"])
        filename = f"{idx+1:02d}_{slug}.png"
        path = out / filename
        crop.save(path)
        results.append((t["text"], str(path)))
        print(f"[{idx+1}] '{t['text']}' -> {path}  (y={crop_top}-{crop_bottom})")

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    screenshot = sys.argv[1]
    out_directory = sys.argv[2] if len(sys.argv) > 2 else "cropped"
    crop_products(screenshot, out_directory)
