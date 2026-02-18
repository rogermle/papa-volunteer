# PAPA Volunteer & Events App – Plan

**Context:** Professional Asian Pilots Association (PAPA) – volunteer management, event signups, calendar, and standards (checklist + AI chat). All users are on Discord.

---

## 1. Vision (in one sentence)

A Discord-centric app where volunteers sign up for events from a shared calendar, complete required checklists before participating, and get answers via an AI chat (with optional FAQ fallback) so standards are clear and consistent.

---

## 2. Core Features (prioritized)

| Priority | Feature | Why |
|----------|--------|-----|
| **P0** | **Event calendar** | Single source of truth for what’s happening and when. |
| **P0** | **Volunteer signup** | Link volunteers to events (who’s doing what, capacity, waitlist). |
| **P0** | **Discord integration** | Login/linking via Discord; optional reminders/announcements in-server. |
| **P1** | **Checklist (per event or role)** | Enforce standards (e.g. “Read guidelines”, “Confirm availability”) before signup or before event. |
| **P1** | **AI chat (replace/supplement FAQ)** | Answer policy/process questions in one place; reduce repeated “where’s the FAQ?”. |
| **P2** | **Admin: create/edit events, view signups** | You need to manage calendar and see who signed up. |
| **P2** | **Reminders / notifications** | E.g. “Event in 24h”, “Checklist due”, via Discord. |

---

## 2b. Decisions (from your answers)

- **Events:** Multi-day supported. No recurring events for now.
- **Event type:** PAPA volunteers sign up to staff **tabling** at external events (e.g. [FAPA-style job fairs](https://www.fapa.aero/event-details/fapas-2026-free-pilot-job-fair-dallas-ft-worth-tx)); you coordinate who's at the table.
- **Time zones:** US only – Eastern, Central, Mountain, Pacific. Store timezone per event.
- **Signups:** Capacity per event + **waitlist** when full.
- **Admins:** 3–4 admins who can create/edit events and view signups. Team leads not in scope for now.
- **Discord:** No existing app – we'll create a Discord Application for **"Login with Discord"** on the website (bot optional later).

---

## 2c. Event model (FAPA-style)

Each event record will support fields similar to a typical job-fair / tabling event:

| Field | Purpose |
|-------|--------|
| **Title** | e.g. "FAPA's 2026 FREE Pilot Job Fair, Dallas/Ft Worth, TX" |
| **Start date / End date** | Multi-day; single-day = same start/end date. |
| **Start time / End time** | Per day (or "all-day"). |
| **Time zone** | Eastern, Central, Mountain, or Pacific. |
| **Location** | Venue name + address, or "TBD", or "Virtual". |
| **Description** | About the event (rich text or markdown); can include requirements (e.g. "Bring résumés", "Dress to impress"). |
| **External link** | Optional "Register" or event details URL (e.g. FAPA page). |
| **Capacity** | Max number of PAPA volunteers (tabling slots). |
| **Waitlist** | When at capacity, new signups go on waitlist (ordered by signup time). |

Admin UI: create/edit/delete events with these fields. Volunteers see calendar + event detail and sign up (or join waitlist).

---

## 3. Thoughts on Your Ideas

### Checklist

- **Good fit.** A checklist is the right tool to enforce standards: “Must complete X before signing up” or “Before event day, confirm Y.”
- **Design choices:**
  - **Global vs per-event:** e.g. one “PAPA volunteer standards” checklist once per year vs “Event-specific briefing” per event.
  - **Blocking:** Checklist completion can be required before signup is confirmed (or before event date). That’s the main “enforcement” lever.
- **Recommendation:** Start with one global “volunteer standards” checklist (e.g. read guidelines, confirm code of conduct). Add per-event checklists later if needed.

### AI chat instead of FAQ

- **Pros:** One place to ask in natural language; answers can cite your actual policies; you can update knowledge without rewriting FAQ bullets.
- **Cons:** Needs good source material (policies, docs) and a bit of tuning so it doesn’t hallucinate; some users still prefer a static FAQ.
- **Recommendation:** **AI chat as primary, FAQ as fallback.** Use the AI with a “knowledge base” (your docs, FAQ content, event/checklist rules). Keep a short “Quick links / FAQ” page for people who want a list. This gives you both consistency (AI) and reliability (FAQ + links).

---

## 4. How Discord Fits

- **Auth:** “Login with Discord” so you don’t manage passwords; you get Discord username/ID and optionally roles.
- **Identity:** One volunteer = one Discord account; no duplicate signups by identity.
- **Notifications (later):** DMs or channel messages for reminders, checklist due, event soon, etc.
- **Optional:** Use Discord roles to mark “volunteer”, “event lead”, “admin” and mirror or sync with app roles if useful.

---

## 5. Tech Stack (Supabase for data)

**Backend & data: Supabase**

- **Database:** Postgres in Supabase – events, signups, users/profiles, checklist definitions and completions. All app data lives here.
- **Auth:** Supabase Auth with **Discord as provider** (OAuth2). One “Sign in with Discord”; Supabase stores the user and we keep a `profiles` (or similar) table linked to Discord id.
- **Realtime (optional):** Supabase Realtime for live updates (e.g. signup list, calendar) if we want it later.
- **Storage (optional):** Supabase Storage for any uploads (e.g. event assets, FAQ/knowledge-base files for AI).

**Frontend**

- A web app (e.g. Next.js) that talks to Supabase via the JS client (`@supabase/supabase-js`): auth, CRUD for events/signups/checklists.

**Rest**

- **Discord:** Discord OAuth for login (through Supabase); optional Discord bot later for reminders.
- **Calendar:** Stored in Supabase; UI = calendar view + list.
- **Checklist:** Tables in Supabase; “completed” per user (and optionally per event); UI gated by completion.
- **AI chat:** Backend (e.g. Next.js API route or Supabase Edge Function) with RAG over your docs; optional FAQ page.

---

## 6. Phased Build (so we can build together)

1. **Phase 1 – Foundation**  
   - Discord login.  
   - Event model + simple calendar (list + month view).  
   - Volunteer signup (sign up / leave event).  
   - Basic admin: create/edit events, see signups.

2. **Phase 2 – Standards**  
   - Checklist model + “complete before signup” (or before event).  
   - Enforce in UI: e.g. “Complete checklist to sign up.”

3. **Phase 3 – AI + polish**  
   - Ingest FAQ/policy text into a knowledge base.  
   - AI chat endpoint + simple chat UI.  
   - Optional: short FAQ page and Discord notifications.

---

## 7. Open Decisions (we can fix as we build)

- **Hosting:** Where to deploy the frontend (Vercel pairs well with Supabase + Next.js).
- **Discord bot:** Only Discord OAuth at first, or add a bot from day one for reminders.
- **Checklist content:** Exact items and whether they’re global vs per-event (we can start global and add per-event later).

---

## Next step

When you’re ready to build, we can start with **Phase 1**: set up the project (Next.js + Supabase), configure Discord OAuth in Supabase, define events/signups in the DB, then calendar UI and signup flow. We’ll use Supabase to hold all the data and auth.
