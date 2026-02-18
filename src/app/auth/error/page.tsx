import Link from 'next/link'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
      <p className="text-center text-red-600">{message ?? 'An error occurred'}</p>
      <Link href="/" className="text-primary underline">
        Return home
      </Link>
    </div>
  )
}
