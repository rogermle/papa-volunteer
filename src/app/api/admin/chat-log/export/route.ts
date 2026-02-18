import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function escapeCsvCell(value: string | null): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: rows } = await supabase
    .from("chat_log")
    .select("id, created_at, user_id, session_id, role, content")
    .order("created_at", { ascending: false })
    .limit(10000);

  const header = "created_at,user_id,session_id,role,content\n";
  const body = (rows ?? [])
    .map(
      (r) =>
        [
          escapeCsvCell(r.created_at),
          escapeCsvCell(r.user_id ?? ""),
          escapeCsvCell(r.session_id ?? ""),
          escapeCsvCell(r.role),
          escapeCsvCell(r.content),
        ].join(",")
    )
    .join("\n");
  const csv = header + body;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chat-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
