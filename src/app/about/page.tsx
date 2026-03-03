import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | PAPA Volunteer",
  description:
    "About PAPA Volunteer — built by Roger Le. Tech stack and volunteer signup for the Professional Asian Pilots Association.",
};

const TECH_STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS 4",
  "Supabase (auth + Postgres)",
  "OpenAI (FAQ chat)",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <h1 className="text-2xl font-bold text-foreground">About</h1>

      <section className="rounded-xl border border-papa-border bg-papa-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          About this app
        </h2>
        <p className="mt-2 text-sm text-papa-muted">
          PAPA Volunteer helps volunteers sign up for tabling events run by{" "}
          <a
            href="https://www.fapa.aero"
            target="_blank"
            rel="noopener noreferrer"
            className="text-papa-navy underline hover:text-papa-accent"
          >
            (Future & Active Airline Pilots Alliance)
          </a>
          . Sign in with Discord, browse events, and we’ll coordinate from
          there.
        </p>
      </section>

      <section className="rounded-xl border border-papa-border bg-papa-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Tech stack</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-papa-muted">
          {TECH_STACK.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
      </section>

      {/* Add your photo at public/images/roger-le.jpg (any name; update src below) */}
      <section className="rounded-xl border border-papa-border bg-papa-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Built by</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-papa-border bg-papa-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/roger-airplane.jpg"
              alt="Roger Le"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground">Roger Le</p>
            <p className="mt-1 text-sm text-papa-muted">
              <a
                href="mailto:roger@asianpilots.org"
                className="text-papa-navy underline hover:text-papa-accent"
              >
                roger@asianpilots.org
              </a>
              <p className="mt-1 text-sm text-papa-muted">
                @rogerle on <a href="https://discord.com/users/1234567890123456789" className="text-papa-navy underline hover:text-papa-accent">Discord</a>
              </p>
            </p>
            <p className="mt-1 text-sm text-papa-muted">
              Volunteer for PAPA and Software Developer
            </p>
            <a
              href="https://www.linkedin.com/in/rogermle"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-papa-navy underline hover:text-papa-accent"
            >
              LinkedIn
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
