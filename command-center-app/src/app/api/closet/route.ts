import { NextResponse } from "next/server";

// Closet pipeline: an iPhone Shortcut POSTs a JPEG (raw body) with a secret
// header. We ask Claude (vision) to describe the garment, upload the image to
// Notion, and create a page in the "Closet Yadira" database.
//
// Env vars (set in Vercel): ANTHROPIC_API_KEY, NOTION_TOKEN, NOTION_DATABASE_ID,
// SHORTCUT_SECRET.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // the vision call can take a few seconds

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const SHORTCUT_SECRET = process.env.SHORTCUT_SECRET;

const NOTION_VERSION = "2022-06-28";
// Default per Anthropic guidance. To make it faster + ~40x cheaper, switch to
// "claude-haiku-5-5" (plenty capable for clothing tagging).
const MODEL = "claude-opus-5-5";

const CATEGORIES = [
  "Top", "Bottom", "Dress", "Outerwear", "Shoes",
  "Activewear", "Sleepwear", "Swimwear", "Accessory", "Underwear",
];

const PROMPT = `You are cataloguing a single clothing item for a personal closet database. Look at the photo and return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:

{
  "name": "concise descriptive name, e.g. Black linen wide-leg pants",
  "category": "EXACTLY one of: Top, Bottom, Dress, Outerwear, Shoes, Activewear, Sleepwear, Swimwear, Accessory, Underwear",
  "color": ["main colors in Title Case, e.g. Black or Navy, White"],
  "material": ["likely fabrics in Title Case, e.g. Linen or Cotton, Elastane"],
  "season": ["any of: Spring, Summer, Fall, Winter, All-season"],
  "occasion": ["any of: Casual, Work, Formal, Athletic, Loungewear, Going out, Travel, Special occasion"],
  "brand": "ONLY if a brand/label is clearly visible, else empty string",
  "care_notes": "short storage/care guidance based on the material (fold vs hang, delicate wash, avoid sunlight, etc.)",
  "status": "Keep"
}

Rules:
- "category" must be exactly one value from the allowed list.
- Title Case for color, material, season, occasion values; no commas inside a single value.
- Give your best single guess when unsure; never leave arrays empty except brand.
- Output the JSON object and nothing else.`;

type Props = {
  name: string;
  category: string;
  color: string[];
  material: string[];
  season: string[];
  occasion: string[];
  brand: string;
  care_notes: string;
  status: "Keep" | "Donate";
};

export async function POST(req: Request) {
  // 1) Authenticate the Shortcut.
  if (!SHORTCUT_SECRET || req.headers.get("x-shortcut-secret") !== SHORTCUT_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!ANTHROPIC_API_KEY || !NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return NextResponse.json({ error: "Server not configured (missing env vars)" }, { status: 500 });
  }

  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length === 0) {
      return NextResponse.json({ error: "Empty image" }, { status: 400 });
    }
    if (buf.length > 4.4 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (keep under ~4.4 MB)" }, { status: 413 });
    }
    const ct = (req.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    const mediaType = ct === "image/png" || ct === "image/webp" ? ct : "image/jpeg";

    const props = await classify(buf.toString("base64"), mediaType);
    const fileUploadId = await notionUpload(buf, mediaType);
    const page = await createPage(props, fileUploadId);

    return NextResponse.json({
      message: `Added: ${props.name}`,
      name: props.name,
      url: page.url,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}

// ---- Claude vision ----------------------------------------------------------

async function classify(b64: string, mediaType: string): Promise<Props> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude error ${res.status}: ${(await res.text()).slice(0, 180)}`);
  }
  const data = await res.json();
  const text = (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("")
    .trim();
  return normalize(parseJson(text));
}

function parseJson(text: string): any {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

function normalize(o: any): Props {
  const arr = (v: any): string[] =>
    Array.isArray(v)
      ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())
      : typeof v === "string" && v.trim()
      ? [v.trim()]
      : [];
  let category = typeof o?.category === "string" ? o.category.trim() : "";
  if (!CATEGORIES.includes(category)) {
    category = CATEGORIES.find((c) => c.toLowerCase() === category.toLowerCase()) || "Accessory";
  }
  return {
    name: typeof o?.name === "string" && o.name.trim() ? o.name.trim().slice(0, 200) : "Clothing item",
    category,
    color: arr(o?.color),
    material: arr(o?.material),
    season: arr(o?.season),
    occasion: arr(o?.occasion),
    brand: typeof o?.brand === "string" ? o.brand.trim().slice(0, 300) : "",
    care_notes: typeof o?.care_notes === "string" ? o.care_notes.trim().slice(0, 1800) : "",
    status: o?.status === "Donate" ? "Donate" : "Keep",
  };
}

// ---- Notion -----------------------------------------------------------------

// Notion multi-select/select option names can't contain commas and max ~100 chars.
const opt = (name: string) => ({ name: name.replace(/,/g, " ").trim().slice(0, 100) });

async function notionUpload(buf: Buffer, mediaType: string): Promise<string> {
  const ext = mediaType === "image/png" ? "png" : mediaType === "image/webp" ? "webp" : "jpg";
  const filename = `closet-${Date.now()}.${ext}`;

  // Step 1: create a file-upload object.
  const createRes = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({ filename, content_type: mediaType }),
  });
  if (!createRes.ok) {
    throw new Error(`Notion file_uploads ${createRes.status}: ${(await createRes.text()).slice(0, 180)}`);
  }
  const fu = await createRes.json();

  // Step 2: send the bytes to the upload URL (multipart/form-data, field "file").
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: mediaType }), filename);
  const sendRes = await fetch(fu.upload_url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
    },
    body: fd,
  });
  if (!sendRes.ok) {
    throw new Error(`Notion upload ${sendRes.status}: ${(await sendRes.text()).slice(0, 180)}`);
  }
  return fu.id as string;
}

async function createPage(p: Props, fileUploadId: string): Promise<{ url: string }> {
  const properties: any = {
    Name: { title: [{ text: { content: p.name } }] },
    Photo: {
      files: [{ name: `${p.name}`.slice(0, 90) || "photo", type: "file_upload", file_upload: { id: fileUploadId } }],
    },
    Category: { select: { name: p.category } },
    Status: { select: { name: p.status } },
  };
  if (p.color.length) properties.Color = { multi_select: p.color.map(opt) };
  if (p.material.length) properties.Material = { multi_select: p.material.map(opt) };
  if (p.season.length) properties.Season = { multi_select: p.season.map(opt) };
  if (p.occasion.length) properties.Occasion = { multi_select: p.occasion.map(opt) };
  if (p.brand) properties.Brand = { rich_text: [{ text: { content: p.brand } }] };
  if (p.care_notes) properties["Care/storage notes"] = { rich_text: [{ text: { content: p.care_notes } }] };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({ parent: { database_id: NOTION_DATABASE_ID }, properties }),
  });
  if (!res.ok) {
    throw new Error(`Notion page ${res.status}: ${(await res.text()).slice(0, 180)}`);
  }
  return res.json();
}
