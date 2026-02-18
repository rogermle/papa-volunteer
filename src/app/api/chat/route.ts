import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You answer questions using only the following context from the FAQ document. If the answer is not in the context, say "I don't have that information in the FAQ." Do not make up details. Keep answers concise.`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to use the FAQ chat." }, { status: 401 });
    }

    let body: { message?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Chat is not configured." }, { status: 500 });
    }

    const service = createServiceClient();

    const { data: embedList } = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });
    const embedding = Array.isArray(embedList) ? embedList[0]?.embedding : embedList?.data?.[0]?.embedding;
    if (!embedding) {
      return NextResponse.json({ error: "Failed to process question." }, { status: 500 });
    }

    const { data: chunks, error: rpcError } = await service.rpc("match_faq_chunks", {
      query_embedding: embedding,
      match_count: 10,
    });
    if (rpcError) {
      console.error("RPC error:", rpcError);
      return NextResponse.json({ error: "Failed to search FAQ." }, { status: 500 });
    }

    // Keyword fallback: also include chunks that contain query words (e.g. "dress code" -> "attire")
    const lower = message.toLowerCase();
    const keywords: string[] = lower.split(/\s+/).filter((w) => w.length > 2).slice(0, 5);
    if (lower.includes("dress") || lower.includes("wear") || lower.includes("clothes")) {
      keywords.push("attire");
    }
    let combinedChunks = Array.isArray(chunks) ? [...chunks] : [];
    const seenIds = new Set(combinedChunks.map((c: { id?: string }) => c.id));
    if (keywords.length > 0) {
      const orClause = [...new Set(keywords)]
        .map((k) => `content.ilike.%${k}%`)
        .join(",");
      const { data: textChunks } = await service
        .from("faq_chunks")
        .select("id, content")
        .or(orClause)
        .limit(5);
      for (const c of textChunks ?? []) {
        if (c.id && !seenIds.has(c.id)) {
          seenIds.add(c.id);
          combinedChunks = [...combinedChunks, c];
        }
      }
    }

    const context =
      combinedChunks.length > 0
        ? combinedChunks.map((c: { content?: string }) => c?.content ?? "").join("\n\n")
        : "No relevant FAQ content found.";

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\nContext:\n${context}` },
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_tokens: 500,
    });
    const reply = completion.choices[0]?.message?.content?.trim() ?? "I couldn't generate an answer.";

    const { error: logError } = await service.from("chat_log").insert([
      { user_id: user.id, session_id: null, role: "user", content: message },
      { user_id: user.id, session_id: null, role: "assistant", content: reply },
    ]);
    if (logError) {
      console.error("Chat log insert error:", logError);
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
