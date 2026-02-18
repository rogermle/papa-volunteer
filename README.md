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

## Deployment

### Recommendation: **Vercel**

For this stack (Next.js + Supabase), **Vercel** is the simplest and most reliable:

- **Next.js** is built by the same team; zero config, automatic serverless/edge, preview deployments for every branch.
- **Free tier** is enough for a volunteer app (hobby usage).
- **Supabase + Vercel** is a common combo; env vars and serverless work out of the box.

**Alternatives:** **Railway** and **Netlify** both run Next.js well. Railway is handy if you later add background workers or want a single dashboard for app + DB; Netlify is similar to Vercel. For "deploy and forget," Vercel is the best fit.

---

### Deploy to Vercel (step-by-step)

1. **Push your code to GitHub** (if you haven't already).  
   Vercel deploys from a Git repo.

2. **Sign in at [vercel.com](https://vercel.com)** with GitHub.

3. **Import the project**
   - Click **Add New… → Project**.
   - Select the `papa-volunteer` repo (or the repo you use).
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** leave as `.` unless the app lives in a subfolder.
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** leave default (Next.js handles it).

4. **Set environment variables** (before first deploy)
   - In the import screen, expand **Environment Variables**.
   - Add:

   | Name | Value | Notes |
   |------|--------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` | From Supabase Dashboard → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon (public) key | Same place |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | **Use your real Vercel URL** (see step 6 if you use a custom domain later) |

   - Apply to **Production** (and optionally Preview if you want branch previews to work with auth).

5. **Deploy**
   - Click **Deploy**. Vercel will run `npm run build` and then host the app.
   - After the first deploy, note the URL (e.g. `https://papa-volunteer-xxx.vercel.app`).

6. **Point production to that URL**
   - If you used a **placeholder** for `NEXT_PUBLIC_SITE_URL`, go to **Project → Settings → Environment Variables**, set `NEXT_PUBLIC_SITE_URL` to your actual Vercel URL (no trailing slash), and **redeploy** (Deployments → … → Redeploy).
   - Optional: add a **custom domain** under **Settings → Domains**; then set `NEXT_PUBLIC_SITE_URL` to that domain and redeploy.

7. **Supabase: production URL**
   - In Supabase **Authentication → URL Configuration**:
     - **Site URL:** set to your production URL (e.g. `https://papa-volunteer-xxx.vercel.app`).
     - **Redirect URLs:** add `https://your-production-url.vercel.app/auth/callback` (or your custom domain + `/auth/callback`).
   - Save. Discord OAuth already points at Supabase, so no Discord change is needed unless you add a new Supabase redirect.

8. **Test**
   - Open the production URL, go to **Events**, then **Sign in with Discord**. You should be redirected back to the app after login.

Future pushes to your main branch will trigger automatic production deploys. Preview branches get their own URLs; use them with a separate Supabase redirect URL if you want to test auth on previews.

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
