"use client";

type ChatLogRow = {
  id: string;
  created_at: string | null;
  user_id: string | null;
  session_id: string | null;
  role: string;
  content: string;
};

export function ChatLogTable({ rows }: { rows: ChatLogRow[] }) {
  const formatDate = (d: string | null) => {
    if (d == null) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    // Format on client side - uses browser's local timezone automatically
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
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
              <td
                className="max-w-[20rem] truncate px-3 py-2 text-foreground"
                title={r.content}
              >
                {r.content}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
