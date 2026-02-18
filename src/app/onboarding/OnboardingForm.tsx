'use client'

import { completeOnboarding } from '@/app/actions/onboarding'

type Props = {
  defaultDisplayName: string
  next: string
}

export function OnboardingForm({ defaultDisplayName, next }: Props) {
  return (
    <form action={completeOnboarding} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="display_name" className="mb-1 block text-sm font-medium text-foreground">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          placeholder="How we should refer to you"
          defaultValue={defaultDisplayName}
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
        />
        <p className="mt-1 text-xs text-papa-muted">
          Optional. We’ll use your Discord username if blank.
        </p>
      </div>
      <button
        type="submit"
        className="rounded bg-papa-navy px-4 py-2 text-sm font-medium text-white hover:bg-papa-navy-dark"
      >
        Continue
      </button>
    </form>
  )
}
