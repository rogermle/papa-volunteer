/**
 * One-time ingest: read FAQ PDF, chunk text, embed with OpenAI, insert into faq_chunks.
 * Run: node scripts/ingest-faq.mjs
 * Loads .env.local from project root. Set OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
dotenv.config({ path: join(root, ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!process.env.OPENAI_API_KEY || !url || !serviceKey) {
  console.error("Missing env. In .env.local set: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const pdfPath = process.env.FAQ_PDF_PATH || join(root, "content", "faq.pdf");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(url, serviceKey);

function chunkText(text, chunkSize = 600, overlap = 100) {
  const chunks = [];
  let start = 0;
  const cleaned = text.replace(/\s+/g, " ").trim();
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    start += chunkSize - overlap;
    if (end >= cleaned.length) break;
  }
  return chunks.filter((c) => c.length > 0);
}

async function main() {
  let pdfBuffer;
  try {
    pdfBuffer = readFileSync(resolve(root, pdfPath));
  } catch (e) {
    console.error("Failed to read PDF at", pdfPath, e.message);
    process.exit(1);
  }
  const pdfParse = (await import("pdf-parse")).default;
  const { text } = await pdfParse(pdfBuffer);
  if (!text || !text.trim()) {
    console.error("No text extracted from PDF");
    process.exit(1);
  }
  const chunks = chunkText(text);
  console.log("Extracted", chunks.length, "chunks from PDF");

  const { data: embeddings, error: embedError } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });
  if (embedError) {
    console.error("Embedding error:", embedError);
    process.exit(1);
  }

  const rows = (embeddings ?? [])
    .sort((a, b) => a.index - b.index)
    .map((e) => ({
      content: chunks[e.index],
      embedding: e.embedding,
      metadata: { index: e.index },
    }));

  const { error: deleteError } = await supabase.from("faq_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    console.warn("Clear existing chunks (optional):", deleteError.message);
  }

  const { error: insertError } = await supabase.from("faq_chunks").insert(rows);
  if (insertError) {
    console.error("Insert error:", insertError);
    process.exit(1);
  }
  console.log("Inserted", rows.length, "chunks into faq_chunks");
}

main();
