-- Kemtech Inc. canonical schema. Weight is stored as NUMERIC kilograms.
create extension if not exists pgcrypto;

create type public.weight_unit as enum ('lb', 'kg');
create type public.workout_status as enum ('draft', 'completed');
create type public.set_type as enum ('warmup', 'working', 'drop', 'failure');
create type public.exercise_type as enum ('weighted', 'bodyweight', 'assisted', 'cardio');
create type public.weight_convention as enum ('total', 'per_implement', 'added_resistance', 'none');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text,
  avatar_url text,
  preferred_weight_unit public.weight_unit not null default 'lb',
  timezone text not null default 'America/Jamaica',
  fitness_goal text,
  starting_body_weight_kg numeric(8,3) check (starting_body_weight_kg is null or starting_body_weight_kg >= 0),
  target_body_weight_kg numeric(8,3) check (target_body_weight_kg is null or target_body_weight_kg >= 0),
  weekly_workout_goal smallint check (weekly_workout_goal between 1 and 14),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  is_system_default boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index muscle_groups_global_name_unique
  on public.muscle_groups (lower(name)) where user_id is null;
create unique index muscle_groups_user_name_unique
  on public.muscle_groups (user_id, lower(name)) where user_id is not null;

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  normalized_name text not null check (length(trim(normalized_name)) > 0),
  primary_muscle_group_id uuid references public.muscle_groups(id) on delete set null,
  equipment_type text,
  exercise_type public.exercise_type not null default 'weighted',
  weight_convention public.weight_convention not null default 'total',
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index exercises_global_normalized_unique
  on public.exercises (normalized_name) where user_id is null;
create unique index exercises_user_normalized_unique
  on public.exercises (user_id, normalized_name) where user_id is not null;
create index exercises_user_muscle_group_idx on public.exercises(user_id, primary_muscle_group_id);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Workout',
  performed_at timestamptz not null default now(),
  completed_at timestamptz,
  status public.workout_status not null default 'draft',
  notes text,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null) or status = 'draft')
);

create index workout_sessions_user_performed_idx
  on public.workout_sessions(user_id, performed_at desc);
create index workout_sessions_user_status_idx
  on public.workout_sessions(user_id, status, performed_at desc);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_exercises_session_idx on public.workout_exercises(workout_session_id, sort_order);
create index workout_exercises_exercise_idx on public.workout_exercises(exercise_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  weight_kg numeric(10,4) not null default 0 check (weight_kg >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  is_completed boolean not null default true,
  set_type public.set_type not null default 'working',
  perceived_exertion numeric(3,1) check (perceived_exertion is null or perceived_exertion between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workout_exercise_id, set_number)
);

create index workout_sets_exercise_idx on public.workout_sets(workout_exercise_id, set_number);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  definition jsonb not null default '{"exercises": []}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.personal_record_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  record_type text not null check (record_type in ('max_weight', 'estimated_1rm', 'max_reps_at_weight', 'session_volume')),
  value numeric(14,4) not null,
  achieved_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index personal_record_user_date_idx on public.personal_record_events(user_id, achieved_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger exercises_updated_at before update on public.exercises
for each row execute function public.set_updated_at();
create trigger workout_sessions_updated_at before update on public.workout_sessions
for each row execute function public.set_updated_at();
create trigger workout_exercises_updated_at before update on public.workout_exercises
for each row execute function public.set_updated_at();
create trigger workout_sets_updated_at before update on public.workout_sets
for each row execute function public.set_updated_at();
create trigger workout_templates_updated_at before update on public.workout_templates
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_templates enable row level security;
alter table public.personal_record_events enable row level security;

create policy "Profiles are private" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "Users can read global and owned muscle groups" on public.muscle_groups
  for select using (user_id is null or user_id = auth.uid());
create policy "Users manage owned muscle groups" on public.muscle_groups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can read global and owned exercises" on public.exercises
  for select using (user_id is null or user_id = auth.uid());
create policy "Users manage owned exercises" on public.exercises
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage owned sessions" on public.workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage exercises in owned sessions" on public.workout_exercises
  for all using (
    exists (select 1 from public.workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid())
  );

create policy "Users manage sets in owned sessions" on public.workout_sets
  for all using (
    exists (
      select 1 from public.workout_exercises we
      join public.workout_sessions s on s.id = we.workout_session_id
      where we.id = workout_exercise_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workout_sessions s on s.id = we.workout_session_id
      where we.id = workout_exercise_id and s.user_id = auth.uid()
    )
  );

create policy "Users manage owned templates" on public.workout_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage owned record events" on public.personal_record_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.muscle_groups (name, is_system_default) values
  ('Chest', true), ('Back', true), ('Shoulders', true), ('Biceps', true),
  ('Triceps', true), ('Legs', true), ('Quadriceps', true), ('Hamstrings', true),
  ('Glutes', true), ('Calves', true), ('Core / Abs', true), ('Full Body', true),
  ('Cardio', true), ('Other', true);

insert into public.exercises (name, normalized_name, primary_muscle_group_id, equipment_type) values
  ('Bench Press', 'bench press', (select id from public.muscle_groups where name = 'Chest' and user_id is null), 'Barbell'),
  ('Incline Dumbbell Press', 'incline dumbbell press', (select id from public.muscle_groups where name = 'Chest' and user_id is null), 'Dumbbell'),
  ('Squat', 'squat', (select id from public.muscle_groups where name = 'Quadriceps' and user_id is null), 'Barbell'),
  ('Deadlift', 'deadlift', (select id from public.muscle_groups where name = 'Back' and user_id is null), 'Barbell'),
  ('Lat Pulldown', 'lat pulldown', (select id from public.muscle_groups where name = 'Back' and user_id is null), 'Cable'),
  ('Shoulder Press', 'shoulder press', (select id from public.muscle_groups where name = 'Shoulders' and user_id is null), 'Dumbbell'),
  ('Bicep Curl', 'bicep curl', (select id from public.muscle_groups where name = 'Biceps' and user_id is null), 'Dumbbell'),
  ('Tricep Pushdown', 'tricep pushdown', (select id from public.muscle_groups where name = 'Triceps' and user_id is null), 'Cable'),
  ('Leg Press', 'leg press', (select id from public.muscle_groups where name = 'Legs' and user_id is null), 'Machine'),
  ('Lateral Raise', 'lateral raise', (select id from public.muscle_groups where name = 'Shoulders' and user_id is null), 'Dumbbell');
