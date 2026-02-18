import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        PAPA Volunteer
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Sign up to volunteer at PAPA tabling events. View the calendar, pick an event, and join the team.
      </p>
      <div className="flex gap-4">
        <Link
          href="/calendar"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          View calendar
        </Link>
      </div>
    </div>
  );
}
