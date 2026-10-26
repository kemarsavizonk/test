# KemTech Inc. Fitness Tracker

A responsive, private strength-training tracker for logging individual sets, reviewing workout history, measuring progress, and identifying personal records. It is built with Next.js, TypeScript, Tailwind CSS, Supabase, Recharts, Zod, Vitest, and Playwright.

## Features

- Email/password authentication, account confirmation, password reset, and sign-out
- Individual set tracking for weight, repetitions, set type, completion, and RPE
- Multi-exercise sessions, automatic timestamps, notes, duration, drafts, and completed workouts
- Searchable history and reusable starter/custom exercise names
- Dashboard metrics derived from actual completed workout data
- Dated body-weight tracking, dual-unit displays, trend chart, and editable measurement history
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
2. Open the SQL editor and run [`supabase/migrations/202610120001_initial_schema.sql`](supabase/migrations/202610120001_initial_schema.sql), then [`supabase/migrations/202610260001_body_weight_entries.sql`](supabase/migrations/202610260001_body_weight_entries.sql). For an existing installation, run only migrations not already applied.
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

## Installing KemTech on a phone

KemTech includes a standalone web-app manifest and Home Screen icons. On iPhone,
open the site in Safari, tap Share → Add to Home Screen, enable Open as Web App
if shown, and tap Add. Launch the Home Screen icon to use KemTech without browser
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

## Preferred name

In **Me → Profile**, save an optional **Nickname** to personalize the dashboard
and achievements. If it is blank, the app uses your first name. Nicknames are
stored in the user's Supabase account metadata and work across devices; no SQL
migration is needed. Preview names stay on the current device.

## Reusing previous entries and suggested plans

Selecting a previously logged exercise opens its latest completed entry. Use
**Reuse entry as is** to copy every original set unchanged, or edit individual
weights, reps, set types, and RPE, then choose **Use checked sets**. **Start fresh**
skips copying. The mobile preview keeps weight, reps, set type, and RPE together
on one row per set, with shared column labels and compact copy actions. Long logs
remain scrollable. **Review previous entry** reopens the preview. Copies receive new
exercise and set IDs; saved history is never modified by reusing it.

Both the reuse and suggested-plan previews include a **KG / LB** selector.
Switching converts all weights, including edited or unchecked sets, while showing
the other unit below each weight. Applying checked sets or an unchanged entry
carries the chosen unit into the logger and converts any other unsaved exercises
to match. Canceling the preview leaves the logger's unit and saved history alone.

From an exercise's history, **Log workout** prefills the exercise information only,
with a blank set for new weights and reps.
**Reuse as new workout** on an individual dated entry copies that specific log.

The dashboard's suggested workout follows the selected training date (today by
default), with the matching weekday and date shown in the card and preview.
It uses completed training from the eight weeks preceding that date on the same
weekday, never logs from the selected day or later. It includes exercises seen on at
least half of those training dates, with their latest completed sets. A single
past training day is labeled an initial suggestion. There is no invented plan
when that weekday has no history. Preview the plan, choose exercises and sets,
edit details, or cancel; copied plan sets start incomplete. Nothing is saved until
Save draft or Finish is selected. This repeats observed logs rather than
prescribing new exercises or increased loads.

## Calculation rules

- Weight is stored in kilograms in PostgreSQL and converted for display.
- Training volume is `weight × repetitions` for completed working, drop, and failure sets.
- Warm-up and incomplete sets are excluded from working volume and record calculations.
- Estimated 1RM uses the Epley formula: `weight × (1 + reps ÷ 30)` for 1–30 repetitions.
- A percentage change is omitted when the comparison value is zero, avoiding misleading infinity values.

## Body-weight tracker

The dashboard's **Body weight** card sits between the training summary and suggested
workout. It shows the latest measurement by measurement date, independent of the
training date filter. Tap it, or choose **Body weight** in the menu, to log a weight
in kg or lb with its measurement date. Both units are displayed, using the profile
preference initially. Switching entry units converts the current value without
changing the underlying measurement.

The tracker includes a dated line chart and newest-first history. Changes compare
with the preceding measurement date, including after backdating, editing, or
deleting an entry. Increases and decreases use neutral labels, not fitness
achievement colors. There is one entry per date; edit an existing date to correct
it. Future dates are rejected. Deleting requires confirmation.

Authenticated measurements sync through the private `body_weight_entries` table
with owner-only row-level security. Run the body-weight migration above before
deploying this feature. No service-role key is needed. Without Supabase config,
preview measurements remain on the current browser only. Authentication or cloud
storage failures are reported, never silently saved as local preview data.

## Achievements and history filters

Achievements recognize an all-time heavier top weight, increased total completed
reps, increased completed sets, and increased total exercise volume (the sum of
weight × reps for all completed working sets). Rep, set, and volume increases are compared with the
previous completed log for that exercise; warm-ups, incomplete sets, and drafts
are excluded. Bodyweight exercises can earn rep and set achievements. Each type
has its own unread notification, which clears when Achievements is opened.
Volume can improve without a heavier maximum set or more sets/reps—for example,
three sets of 80 lb × 10 plus 65 lb × 10 is 3,050 lb of volume; four sets of
80 lb × 10 is 3,200 lb, earning a +150 lb volume achievement. Notifications stay
read when display units change, and historical logs are not modified.

History supports muscle-group, inclusive From/To date, status, and name filters
in combination. Cards show the most recent matching log; opening an exercise
still shows its full history. Use Clear filters to restore all exercises.

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
