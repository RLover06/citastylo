# Turno · Barbershop & salon booking

*[Leer en español](README.es.md)*

A mobile-first web app where clients book an appointment in seconds, with no account and no password, and each barber manages their day from a live calendar. Built for small barbershops and beauty salons in Montería, Colombia, where most bookings still happen through phone calls, WhatsApp messages and paper notebooks.

The interface is fully bilingual: it opens in Spanish for Spanish-language browsers and in English otherwise, and the **ES | EN** toggle switches languages instantly and remembers the choice.

## Features

**Clients**
- Book a service by picking a barber (or "anyone available"), day and time. No sign-up, just a name and a WhatsApp number.
- Only real open slots are shown, based on each barber's hours, days off and existing bookings.
- "My appointments" lists upcoming and past visits and lets clients reschedule or cancel from the same phone, within the shop's cancellation window.
- One tap to message the shop on WhatsApp with the booking details prefilled.

**Barbers**
- Sign in with Google or a magic link by email.
- Weekly calendar that updates in real time as clients book, cancel or reschedule.
- Mark appointments as completed or no-show. Past appointments that were never marked are flagged.
- Reschedule, cancel, add walk-in or phone bookings, and send WhatsApp reminders with one tap.
- **Book the next visit:** after marking a cut as completed, the app suggests a return date based on the service (e.g. 15 days) to turn one-off clients into regulars.

**Shop owners**
- Manage services (duration, price, suggested return interval), barbers, who offers which service, opening hours with lunch breaks, days off, slot interval, cancellation window and booking limits per client.
- Invite barbers by email; they are linked automatically on first sign-in.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, plain CSS (no UI library) |
| Backend | Supabase: PostgreSQL, Auth (Google + email magic link), Realtime |
| Hosting | Cloudflare Pages (free tier allows commercial use) |
| Backups | Daily `pg_dump` via GitHub Actions |

## Engineering highlights

- **Double booking is impossible at the database level.** A PostgreSQL `EXCLUDE` constraint over `tstzrange` (with `btree_gist`) rejects overlapping active appointments for the same barber, even when two clients book the same slot in the same second.
- **The public never touches tables.** Anonymous clients can only call a small set of `SECURITY DEFINER` functions (`reservar_cita`, `mis_citas`, `cancelar_cita`, …). Staff read data through Row Level Security scoped to their own shop.
- **Account-free client identity.** Each booking returns a private token stored on the client's device; with it they can view, cancel or reschedule their own appointments, and nobody can look up someone else's bookings by phone number.
- **Nothing is deleted.** Cancelling or rescheduling changes an appointment's status, preserving a full history for stats and no-show tracking.
- **Timezone-safe.** All scheduling runs in `America/Bogota`, regardless of the device's timezone.
- **Privacy compliance.** Built around Colombia's data protection law (Ley 1581 of 2012): explicit consent is required and timestamped before any booking, with a bilingual privacy policy.
- **Lightweight i18n.** A tiny `t('español', 'English')` helper with browser language detection covers the UI, error messages, dates, currency formatting and WhatsApp templates, with no i18n library.

## Getting started

### 1. Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the whole `supabase/esquema.sql` file and click **Run**.
3. In **Authentication → Sign In / Providers**, keep **Email** enabled. To use Google sign-in, add a Client ID and Secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
4. In **Authentication → URL Configuration**, set **Site URL** to `http://localhost:5173` and add `http://localhost:5173/panel` to **Redirect URLs**.
5. In **Project Settings → API Keys**, copy the **Project URL** and the **publishable** (anon) key.

> Supabase's built-in email service sends only a few emails per hour. For production, configure your own SMTP provider (Authentication → Emails → SMTP).

### 2. Run locally

Requires [Node.js](https://nodejs.org) 20 or later.

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env with your Supabase URL and publishable key
npm run dev
```

Open `http://localhost:5173/panel`, sign in with your email and create your shop. Its booking page will be at `http://localhost:5173/your-shop-link`.

### 3. Deploy (Cloudflare Pages)

1. Push the project to a GitHub repository.
2. In [Cloudflare](https://dash.cloudflare.com), go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
3. Build command `npm run build`, output directory `dist`.
4. Add the environment variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_CONTACTO_EMAIL`.
5. Add the final URL (e.g. `https://turno.pages.dev/panel`) to Supabase's Site URL and Redirect URLs.

`public/_redirects` is already set up so shop links like `/el-sinu` resolve to the app.

**Vercel (demo):** import the repository, set **Root Directory** to `turno` (framework: Vite), and add the same three environment variables. `vercel.json` already routes shop links to the app. Vercel's free Hobby plan is for non-commercial use, so move to Cloudflare Pages or a paid plan before charging shops.

### 4. Daily backups

`.github/workflows/respaldo.yml` exports the database every day and keeps each copy for 30 days. To enable it, add a `SUPABASE_DB_URL` repository secret (instructions inside the file).

## Project structure

```
supabase/esquema.sql            Tables, RLS policies and booking functions
src/pages/Reserva.jsx           Public shop page: booking and "My appointments"
src/pages/panel/Panel.jsx       Sign-in, shop setup and dashboard shell
src/pages/panel/Calendario.jsx  Barber calendar and appointment actions
src/pages/panel/Ajustes.jsx     Hours, days off, shop settings, services and barbers
src/pages/Privacidad.jsx        Bilingual privacy policy
src/components/                 Time slot picker and bottom sheet
src/lib/idioma.js               Language detection and the t() helper
src/lib/fechas.js               Colombia-timezone dates, times and currency
src/lib/supabase.js             Supabase client and error translation
```

The code is written in Spanish (variables, comments and database names), since the product and its first users are in Colombia.

## Free tier limits

Supabase's free plan includes a 500 MB database (hundreds of thousands of appointments) and 50,000 monthly active users. Free projects pause after 7 days without activity, which does not happen while shops are taking bookings daily. The Pro plan removes pausing and adds daily backups.

## Author

Built by Over Regino, math and physics teacher and developer, Montería, Colombia.
