import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatUI } from "./ChatUI";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/signin?next=/chat");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">FAQ Chat</h1>
      <p className="text-sm text-papa-muted">
        Ask questions about volunteering, events, or PAPA. Answers are based on the FAQ document.
      </p>
      <ChatUI />
    </div>
  );
}
