"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type HeaderProps = { initialAdmin?: boolean };

export function Header({ initialAdmin = false }: HeaderProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<{
    discord_username: string | null;
    display_name: string | null;
    is_admin: boolean;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isAdmin = profile?.is_admin ?? initialAdmin;
  const displayName =
    profile?.display_name ??
    profile?.discord_username ??
    user?.email ??
    "Account";

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      if (u) {
        client
          .from("profiles")
          .select("discord_username, display_name, is_admin")
          .eq("id", u.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error)
              console.error("Header profile fetch:", error.message, error.code);
            setProfile(data ?? null);
          });
      } else {
        setProfile(null);
      }
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => router.refresh());
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-papa-border bg-papa-navy px-4 py-3 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="font-semibold text-white hover:text-white/90">
          PAPA Volunteer
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/events"
            className="text-sm text-white/90 hover:text-white"
          >
            Events
          </Link>
          {isAdmin && (
            <Link
              href="/admin/events"
              className="text-sm text-white/90 hover:text-white"
            >
              Admin
            </Link>
          )}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1 rounded px-2 py-1.5 text-sm text-white/90 hover:bg-white/10 hover:text-white"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <span>{displayName}</span>
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-papa-border bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <div className="border-b border-papa-border px-3 py-2 text-xs text-papa-muted">
                    Welcome, {displayName}
                  </div>
                  <Link
                    href="/my-signups"
                    className="block px-3 py-2 text-sm text-foreground hover:bg-papa-card"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Events
                  </Link>
                  <Link
                    href="/my-schedule"
                    className="block px-3 py-2 text-sm text-foreground hover:bg-papa-card"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    My schedule
                  </Link>
                  <form action="/auth/signout" method="post" className="block">
                    <button
                      type="submit"
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-papa-card"
                      role="menuitem"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <form action="/auth/signin/discord" method="post">
              <button
                type="submit"
                className="rounded bg-white px-3 py-1.5 text-sm font-medium text-papa-navy hover:bg-white/90"
              >
                Sign in with Discord
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
