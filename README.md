# PAPA Volunteer

Volunteer signup and event calendar for **Professional Asian Pilots Association (PAPA)**. Volunteers sign in with Discord, view events, and sign up (or join the waitlist). Admins create events and view signups.

## Stack

- **Next.js** (App Router) + **Supabase** (Postgres, Auth)
- **Discord** OAuth for login
- See [PLAN.md](./PLAN.md) for the full product plan

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migrations in order: `00001_initial_schema.sql`, `00002_profile_onboarding.sql`, `00003_signup_volunteer_details.sql`, `00004_events_image_url.sql`, then `00005_backfill_profiles_from_auth.sql`. (The backfill ensures every auth user has a profile row—e.g. after a DB reset or re-running migrations.)
3. In **Authentication > URL Configuration**, set **Site URL** to your app URL (e.g. `http://localhost:3000` for dev) and add `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. In **Authentication > Providers**, enable **Discord** and add your Discord application Client ID and Client Secret (see below).

### 2. Discord application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Under **OAuth2**, add a redirect: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`.
3. Copy **Client ID** and **Client Secret** into Supabase Auth > Providers > Discord.

### 3. Environment

```bash
cp .env.local.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key
- `NEXT_PUBLIC_SITE_URL` – e.g. `http://localhost:3000` (used for OAuth redirects)

### 4. Make yourself an admin

After signing in with Discord once, set your profile as admin in Supabase **SQL Editor**:

```sql
update public.profiles set is_admin = true where id = '<your-auth-user-id>';
```

Your user ID is in **Authentication > Users** (click your user to see it). If you don’t see yourself in the `profiles` table after a DB reset or re-running migrations, run `00005_backfill_profiles_from_auth.sql` first so every auth user gets a profile row, then run the update above.

### 5. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Discord, mark your user as admin in SQL, then go to **Admin > Events** to create events.

### Discord login not working?

When sign-in fails, you’ll be sent to `/auth/error` with a short message. Use that to narrow it down:

1. **Redirect URL (Discord)**  
   In [Discord Developer Portal](https://discord.com/developers/applications) → your app → **OAuth2** → **Redirects**, you must have **exactly**:
   - `https://<your-supabase-ref>.supabase.co/auth/v1/callback`  
   Replace `<your-supabase-ref>` with your Supabase project ref (from your Supabase URL, e.g. `abcdefgh` in `https://abcdefgh.supabase.co`).  
   Do **not** use your own app URL (e.g. `http://localhost:3000`) here; Discord must redirect to Supabase.

2. **Redirect URLs (Supabase)**  
   In Supabase **Authentication → URL Configuration**, under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback` (dev)
   - Your production URL + `/auth/callback` when you deploy  
   The `redirectTo` we send must match one of these (same origin + path).

3. **Discord provider (Supabase)**  
   In **Authentication → Providers**, open **Discord**, turn it **on**, and save **Client ID** and **Client Secret** from the Discord app (no extra spaces).

4. **Env**  
   `NEXT_PUBLIC_SITE_URL` must be the URL you actually use (e.g. `http://localhost:3000` with no trailing slash). That’s what we use as the callback base.

Try signing in again; if it still fails, the message on `/auth/error` should point to the step above that’s wrong.

## Scripts

- `npm run dev` – development server
- `npm run build` – production build
- `npm run start` – run production build

## User flow

1. **Home** shows an aviation hero and a link to **Events**.
2. **Events** lists events; each links to an **event detail** page.
3. On event detail, the user can **sign up to volunteer**. If not signed in, they see “Sign in to sign up” and are sent to sign-in (then back to the event).
4. After **Discord sign-in**, first-time users are sent to **Onboarding** to optionally set a display name, then redirected to the event (or home) to complete signup.

## Routes

- `/` – home
- `/events` – list of events to sign up for (calendar redirects here)
- `/events/[id]` – event detail, sign up / leave / waitlist
- `/auth/signin` – sign-in page (with optional `?next=` return URL)
- `/onboarding` – post-login profile info (display name)
- `/admin/events` – admin event list (admin only)
- `/admin/events/new` – create event
- `/admin/events/[id]/edit` – edit event
- `/admin/events/[id]/signups` – view signups for an event
