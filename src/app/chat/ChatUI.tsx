"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const raw = await res.text();
      let data: { error?: string; reply?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setError(res.ok ? "Invalid response from server." : "Something went wrong. Please try again.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "" }]);
    } catch {
      setError("Network or server error. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-papa-border bg-papa-card overflow-hidden shadow-sm">
      <div
        ref={scrollRef}
        className="flex min-h-[320px] max-h-[60vh] flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <p className="text-sm text-papa-muted">Ask a question below to get started.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-papa-navy px-3 py-2 text-sm text-white"
                : "mr-auto max-w-[85%] rounded-lg border border-papa-border bg-background px-3 py-2 text-sm text-foreground"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto max-w-[85%] rounded-lg border border-papa-border bg-background px-3 py-2 text-sm text-papa-muted">
            Thinking…
          </div>
        )}
      </div>
      {error && (
        <p className="px-4 pb-2 text-sm text-papa-accent" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="border-t border-papa-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            className="papa-form-input flex-1 rounded-lg px-3 py-2 text-foreground"
            disabled={loading}
            aria-label="Your question"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-papa-accent px-4 py-2 text-sm font-medium text-white hover:bg-papa-accent-hover disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
