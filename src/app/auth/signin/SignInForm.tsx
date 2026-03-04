"use client";

import Link from "next/link";
import posthog from "posthog-js";

type Props = { next: string };

export function SignInForm({ next }: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-xl font-semibold text-foreground">
        Sign in to continue
      </h1>
      <p className="text-center text-sm text-papa-muted">
        Use your Discord account to sign in and sign up for events.
      </p>
      <form
        action="/auth/signin/discord"
        method="post"
        className="flex flex-col gap-3"
        onSubmit={() => posthog.capture("sign_in_clicked")}
      >
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="rounded bg-papa-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-papa-accent-hover"
        >
          Sign in with Discord
        </button>
      </form>
      <Link
        href={next}
        className="text-sm text-papa-muted hover:text-papa-navy hover:underline"
      >
        Cancel and go back
      </Link>
    </div>
  );
}
