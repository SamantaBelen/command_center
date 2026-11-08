# Closet Yadira — setup (iPhone Shortcut → Claude → Notion)

Pipeline: an iPhone Shortcut takes a photo of a garment and POSTs it to a Vercel
function (`/api/closet`). The function asks Claude (vision) to describe the item,
uploads the photo to Notion, and creates a row in the **Closet Yadira** database.

- **Function code:** `command-center-app/src/app/api/closet/route.ts`
- **Notion database ID (`NOTION_DATABASE_ID`):** `5162cb22925d45189fc0ea0d67d46bf9`
- **Endpoint (once deployed):** `https://<your-vercel-domain>/api/closet`

---

## 1. Connect the Notion integration to the new database (required)

The function writes with `NOTION_TOKEN` (the **Habits Generator** internal
integration). Internal integrations only see pages explicitly shared with them,
so the new database must be connected or page-create returns `404 object_not_found`.

1. Open the **Closet Yadira** database in Notion.
2. Top-right **•••** → **Connections** → **Connect to** → **Habits Generator**.

That's the only Notion-side step; the schema is already built.

## 2. Set the Vercel environment variables

Project **Settings → Environment Variables** (Production):

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic API key (console.anthropic.com → API Keys) |
| `NOTION_TOKEN`      | already set (Habits Generator token) — leave as is |
| `NOTION_DATABASE_ID`| `5162cb22925d45189fc0ea0d67d46bf9` |
| `SHORTCUT_SECRET`   | a random passphrase you invent — must match the Shortcut header |

**Redeploy after saving** (env changes only take effect on a new deploy).

> Model/cost: the function defaults to `claude-opus-5-5`. For ~40× cheaper and
> faster tagging, change `MODEL` in `route.ts` to `claude-haiku-5-5` (plenty good
> for clothing). Each add is one small vision call.

## 3. Build the iPhone Shortcut

Shortcuts app → **+** → add these actions in order:

1. **Take Photo** (or *Select Photos* if you'd rather pick from the library).
2. **Remove Background** (iOS 17+). Input = the photo.
3. **Convert Image** → **JPEG**. (This flattens the cut-out onto a white
   background. *If it comes out black instead of white, switch this action to
   **PNG** — you'll get a clean transparent cut-out and the function accepts it.*)
4. **Resize Image** → Width **1200**, Height **Auto**. (Keeps the upload well
   under Vercel's 4.5 MB limit.)
5. **Get Contents of URL**:
   - URL: `https://<your-vercel-domain>/api/closet`
   - Method: **POST**
   - **Headers:**
     - `X-Shortcut-Secret` = *(the same value as `SHORTCUT_SECRET`)*
     - `Content-Type` = `image/jpeg` *(use `image/png` if you chose PNG in step 3)*
   - **Request Body: File** → select the resized image variable.
6. **Get Dictionary Value** → `message` → from the *Contents of URL*.
7. **Show Notification** → the `message` value (shows "Added: <name>").
   - Optional: add **Get Dictionary Value** `url`, then **Open URLs** to jump to
     the new Notion row.

Name it e.g. "Add to Closet" and add it to the Home Screen or Action Button.

## 4. Test

With env vars set, the integration connected, and the app redeployed, run the
Shortcut once on a garment. Expect a "Added: …" notification and a new row in
Closet Yadira with the photo, category, colors, material, etc.

Command-line smoke test (optional):

```bash
curl -X POST "https://<your-vercel-domain>/api/closet" \
  -H "X-Shortcut-Secret: <your secret>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @some-photo.jpg
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `401 unauthorized` | `X-Shortcut-Secret` header ≠ `SHORTCUT_SECRET`, or env not set / not redeployed. |
| `500 Server not configured` | A missing env var (`ANTHROPIC_API_KEY` / `NOTION_TOKEN` / `NOTION_DATABASE_ID`). |
| `Notion page 404 object_not_found` | Integration not connected to the DB — do step 1. |
| `Claude error 401` | Bad/missing `ANTHROPIC_API_KEY`. |
| Photo background is black | JPEG filled transparency with black — switch step 3 to PNG + `Content-Type: image/png`. |
| `413 Image too large` | Lower the resize width (1200 → 1000) so the body stays under ~4.4 MB. |

Database schema (reference): Name (title, Claude-generated), Photo (files),
Category (select: Top/Bottom/Dress/Outerwear/Shoes/Activewear/Sleepwear/
Swimwear/Accessory/Underwear), Color · Material · Season · Occasion
(multi-select), Brand (text), Care/storage notes (text), Status (Keep/Donate),
Added (created time).
