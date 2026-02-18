# PAPA Volunteer

Volunteer signup and event calendar for **Professional Asian Pilots Association (PAPA)**. Volunteers sign in with Discord, view events, and sign up (or join the waitlist). Admins create events and view signups.

## Stack

- **Next.js** (App Router) + **Supabase** (Postgres, Auth)
- **Discord** OAuth for login
- See [PLAN.md](./PLAN.md) for the full product plan

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migration: [`supabase/migrations/00001_initial_schema.sql`](./supabase/migrations/00001_initial_schema.sql).
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

After signing in with Discord once, set your profile as admin in Supabase:

```sql
update public.profiles set is_admin = true where id = '<your-auth-user-id>';
```

(User ID is in Supabase **Authentication > Users** after you sign in.)

### 5. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Discord, mark your user as admin in SQL, then go to **Admin > Events** to create events.

## Scripts

- `npm run dev` – development server
- `npm run build` – production build
- `npm run start` – run production build

## Routes

- `/` – home
- `/calendar` – list of events
- `/events/[id]` – event detail, sign up / leave / waitlist
- `/admin/events` – admin event list (admin only)
- `/admin/events/new` – create event
- `/admin/events/[id]/edit` – edit event
- `/admin/events/[id]/signups` – view signups for an event
