import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-0">
      {/* Hero: aviation - plain img so external image loads reliably */}
      <section className="relative -mx-4 h-[min(60vh,420px)] min-h-[320px] overflow-hidden md:-mx-6 lg:-mx-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80"
          alt="Aviation"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-papa-navy/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
          <h1 className="text-3xl font-bold tracking-tight drop-shadow-md md:text-4xl">
            PAPA Volunteer
          </h1>
          <p className="mt-2 max-w-md text-lg drop-shadow-md text-white/95">
            Promoting Diversity, Equity &amp; Inclusion in Aviation. Sign up to volunteer at tabling events.
          </p>
          <Link
            href="/events"
            className="mt-6 rounded bg-papa-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-papa-accent-hover"
          >
            View events to sign up
          </Link>
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-foreground">
          How it works
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-papa-muted">
          <li>Browse events you can volunteer at.</li>
          <li>Click an event for details, then sign up to show interest.</li>
          <li>Sign in with Discord when prompted and complete a short profile.</li>
          <li>You’re on the list — we’ll coordinate from there.</li>
        </ol>
        <Link
          href="/events"
          className="mt-2 inline-block rounded bg-papa-navy px-4 py-2 text-sm font-medium text-white hover:bg-papa-navy-dark"
        >
          See events
        </Link>
      </section>
    </div>
  );
}
