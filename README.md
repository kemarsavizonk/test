# Kemtech Inc. Fitness Tracker

A responsive, private strength-training tracker for logging individual sets, reviewing workout history, measuring progress, and identifying personal records. It is built with Next.js, TypeScript, Tailwind CSS, Supabase, Recharts, Zod, Vitest, and Playwright.

## Features

- Email/password authentication, account confirmation, password reset, and sign-out
- Individual set tracking for weight, repetitions, set type, completion, and RPE
- Multi-exercise sessions, automatic timestamps, notes, duration, drafts, and completed workouts
- Searchable history and reusable starter/custom exercise names
- Dashboard metrics derived from actual completed workout data
- Daily, weekly, monthly, quarterly, six-month, yearly, and custom reports
- Volume and muscle-group charts, period comparisons, and plain-language summaries
- Epley estimated one-rep max, maximum weight, reps, and session-volume records
- CSV and PDF report export
- Pounds/kilograms preferences with canonical kilogram database storage
- PostgreSQL row-level security for all private user data
- Explicit local browser preview when Supabase credentials are not configured

## Local setup

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Then open `http://localhost:3000`.

Without Supabase environment variables, the **Explore preview** flow stores workouts only in browser local storage. Preview data is clearly local and never presented as an authenticated account.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run [`supabase/migrations/202610120001_initial_schema.sql`](supabase/migrations/202610120001_initial_schema.sql).
3. In Authentication → URL Configuration, set the site URL and add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-VERCEL-DOMAIN/auth/callback`
4. Copy the project URL and anon/publishable key into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The migration creates profiles, muscle groups, exercises, sessions, session exercises, sets, templates, and personal-record event tables. Row-level security policies ensure that users can only read and modify their own private data. Global starter exercises and muscle groups are read-only.

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Unit tests cover weight conversion, working-volume rules, estimated 1RM, aggregation, comparison percentages, and performance summaries. Playwright provides a public-flow smoke test.

## Deploying to Vercel

1. Import this GitHub repository into Vercel.
2. Add the three environment variables from `.env.example` to Preview and Production.
3. Deploy.
4. Add the production callback URL to Supabase Authentication as described above.

Every push to the configured production branch triggers a new Vercel deployment. No service-role key is used by the browser or required by this application.

## Installing Kemtech on a phone

Kemtech includes a standalone web-app manifest and Home Screen icons. On iPhone,
open the site in Safari, tap Share → Add to Home Screen, enable Open as Web App
if shown, and tap Add. Launch the Home Screen icon to use Kemtech without browser
toolbars. Normal links still open in the browser. Android users can choose Install
app or Add to Home Screen from the browser menu.

In the installed app, pulling down at the top refreshes saved workout and achievement
data without clearing a workout being edited. This web app requires an internet
connection for account access and synced data.

## Exercise history and custom exercises

History lists each exercise once. Tap an exercise to see its dated logs, newest
first, including the top working weight compared with the previous completed
log, set details, repetitions, volume, estimated one-rep max, and notes. Exercises
logged in the same session have separate entries. Deleting an exercise log keeps
the other exercises from that session.

Use **Add custom exercise** in the logger or exercise catalog to save an exercise
to your profile. Return to the logger and search its name to record sets. Custom
exercises use the existing user-owned `exercises` table and its row-level security
policies; preview exercises are stored on the current device. No additional SQL
migration is needed.

## Calculation rules

- Weight is stored in kilograms in PostgreSQL and converted for display.
- Training volume is `weight × repetitions` for completed working, drop, and failure sets.
- Warm-up and incomplete sets are excluded from working volume and record calculations.
- Estimated 1RM uses the Epley formula: `weight × (1 + reps ÷ 30)` for 1–30 repetitions.
- A percentage change is omitted when the comparison value is zero, avoiding misleading infinity values.

## Project structure

- `src/app` — App Router pages, layouts, auth callback, and dashboard routes
- `src/components` — reusable interface and workout editor components
- `src/lib` — fitness calculations, Supabase clients, repository, and shared types
- `src/hooks` — client data-loading hooks
- `supabase/migrations` — complete schema, triggers, seed catalog, and RLS policies
- `src/test` — unit tests and test setup
- `e2e` — Playwright smoke tests

## Privacy

Authenticated data is protected by Supabase row-level security, not merely filtered in the interface. The frontend uses only the public anon/publishable key. Never expose a Supabase service-role key in a `NEXT_PUBLIC_` variable.
