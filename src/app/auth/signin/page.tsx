import Link from 'next/link'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const nextVal = next ?? '/'

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-xl font-semibold text-foreground">
        Sign in to continue
      </h1>
      <p className="text-center text-sm text-papa-muted">
        Use your Discord account to sign in and sign up for events.
      </p>
      <form action="/auth/signin/discord" method="post" className="flex flex-col gap-3">
        <input type="hidden" name="next" value={nextVal} />
        <button
          type="submit"
          className="rounded bg-papa-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-papa-accent-hover"
        >
          Sign in with Discord
        </button>
      </form>
      <Link href={nextVal} className="text-sm text-papa-muted hover:text-papa-navy hover:underline">
        Cancel and go back
      </Link>
    </div>
  )
}
