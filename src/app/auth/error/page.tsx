import Link from 'next/link'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const resolved = await searchParams
  const raw = resolved.message ?? 'An error occurred'
  const message = typeof raw === 'string' && /%[0-9A-Fa-f]{2}/.test(raw) ? decodeURIComponent(raw) : raw
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4">
      <div className="max-w-lg rounded-xl border border-papa-border bg-papa-card p-4 shadow-sm">
        <h2 className="font-semibold text-papa-accent">Sign-in error</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
          {message}
        </p>
      </div>
      <Link href="/" className="text-papa-muted underline hover:text-papa-navy">
        Return home
      </Link>
    </div>
  )
}
