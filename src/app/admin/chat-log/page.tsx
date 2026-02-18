import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 100;

export default async function AdminChatLogPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("chat_log")
    .select("id, created_at, user_id, session_id, role, content")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const formatDate = (d: string) =>
    new Date(d + "Z").toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

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
        Recent FAQ chat messages for analysis. Export CSV for full history.
      </p>
      {!rows?.length ? (
        <p className="text-papa-muted">No chat log entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-papa-border">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-papa-border bg-papa-offwhite">
              <tr>
                <th className="px-3 py-2 font-medium text-foreground">Time</th>
                <th className="px-3 py-2 font-medium text-foreground">User ID</th>
                <th className="px-3 py-2 font-medium text-foreground">Session</th>
                <th className="px-3 py-2 font-medium text-foreground">Role</th>
                <th className="px-3 py-2 font-medium text-foreground">Content</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-papa-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-papa-muted">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-papa-muted">
                    {r.user_id ?? "—"}
                  </td>
                  <td className="max-w-[6rem] truncate px-3 py-2 font-mono text-papa-muted">
                    {r.session_id ?? "—"}
                  </td>
                  <td className="px-3 py-2">{r.role}</td>
                  <td className="max-w-[20rem] truncate px-3 py-2 text-foreground">
                    {r.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
