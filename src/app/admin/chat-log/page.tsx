import { createClient } from "@/lib/supabase/server";
import { ChatLogTable } from "./ChatLogTable";

const PAGE_SIZE = 100;

export default async function AdminChatLogPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("chat_log")
    .select("id, created_at, user_id, session_id, role, content")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Chat log
        </h1>
        <a
          href="/api/admin/chat-log/export"
          className="rounded-md border border-papa-border bg-papa-navy px-3 py-2 text-sm font-medium text-white hover:bg-papa-navy/90"
        >
          Export CSV
        </a>
      </div>
      <p className="text-sm text-papa-muted">
        Recent FAQ chat messages for analysis (newest first). Times are in your local timezone. Export CSV for full history.
      </p>
      {!rows?.length ? (
        <p className="text-papa-muted">No chat log entries yet.</p>
      ) : (
        <ChatLogTable rows={rows} />
      )}
    </div>
  );
}
