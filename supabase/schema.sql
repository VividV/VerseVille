-- =====================================================================
-- VerseVille — Supabase database (spec §8, §15, §16)
--
-- Run this whole file ONCE in Supabase: Dashboard → SQL Editor → New query
-- → paste → Run. It is safe to run again (it drops and recreates the
-- VerseVille functions and policies, and creates tables only if missing).
--
-- Security model
--   * Row Level Security: every player can only read and change their own rows.
--   * Balances (player_resources) can NOT be written by the app. They change
--     only when a reward/spending transaction is accepted by validate_transaction(),
--     which re-checks the amount against server-side rules and catalogues.
--   * The garden is only written through replace_garden(), which checks bounds,
--     overlaps, locked land and that every item was actually bought.
--   * Never put the service_role key in the app. The app uses the publishable key.
--
-- Keep the reference tables at the bottom in step with src/data/*.json and
-- REWARD_CONFIG (src/engine/rewards/rewardCalculator.ts). They are generated
-- by scripts/supabase/generate-seed.py.
-- =====================================================================

-- ---------- Reference data (read-only for players) --------------------
create table if not exists public.scriptures (
  id text primary key,
  book text not null,
  chapter integer not null,
  verse integer not null,
  reference text not null,
  translation text not null,
  text text not null,
  explanation text not null,
  topic_ids text[] not null default '{}',
  related_scripture_ids text[] not null default '{}',
  difficulty integer not null,
  is_active boolean not null default true
);

create table if not exists public.garden_catalog (
  item_id text primary key,
  coin_cost integer not null,
  seed_cost integer not null,
  unlock_level integer not null,
  width integer not null,
  height integer not null,
  is_unique boolean not null,
  not_for_sale boolean not null default false,
  starting_quantity integer not null default 0
);

create table if not exists public.land_expansions (
  id integer primary key,
  rows integer not null,
  required_level integer not null,
  required_mastered integer not null,
  coin_cost integer not null
);

create table if not exists public.quest_catalog (
  quest_id text primary key,
  coin_reward integer not null,
  xp_reward integer not null,
  target integer not null
);

create table if not exists public.reward_rules (
  game_type text primary key,
  base_coins integer not null,
  base_xp integer not null
);

-- ---------- Player data -----------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  preferred_translation text not null default 'KJV',
  daily_goal integer not null default 3 check (daily_goal in (1, 3, 5)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_settings (
  player_id uuid primary key references auth.users on delete cascade,
  sound_enabled boolean not null default true,
  notifications_enabled boolean not null default false,
  daily_goal integer not null default 3 check (daily_goal in (1, 3, 5)),
  preferred_translation text not null default 'KJV',
  text_size text not null default 'normal' check (text_size in ('normal', 'large', 'extra-large')),
  high_contrast boolean not null default false,
  reduced_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.player_resources (
  player_id uuid primary key references auth.users on delete cascade,
  coins integer not null default 100 check (coins >= 0),
  seeds integer not null default 5 check (seeds >= 0),
  gems integer not null default 0 check (gems >= 0),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_scriptures (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null default auth.uid() references auth.users on delete cascade,
  scripture_id text not null references public.scriptures (id),
  status text not null check (status in ('learning', 'growing', 'strong', 'mastered')),
  mastery_score integer not null check (mastery_score between 0 and 100),
  learning_started_at timestamptz not null,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  consecutive_successes integer not null default 0 check (consecutive_successes >= 0),
  total_attempts integer not null default 0 check (total_attempts >= 0),
  successful_attempts integer not null default 0 check (successful_attempts >= 0),
  mastered_at timestamptz,
  -- Extra learning-engine fields (completed activities, recall days, interval step, ...)
  extra jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (player_id, scripture_id)
);

create table if not exists public.game_sessions (
  id uuid primary key,
  player_id uuid not null default auth.uid() references auth.users on delete cascade,
  scripture_id text not null references public.scriptures (id),
  game_type text not null check (game_type in ('missing-words', 'word-order', 'recall')),
  score integer not null check (score between 0 and 100),
  accuracy numeric not null check (accuracy between 0 and 1),
  duration_seconds integer not null check (duration_seconds >= 0),
  completed_at timestamptz not null,
  rewards_granted boolean not null default false,
  details jsonb not null default '{}',
  inserted_at timestamptz not null default now()
);
create index if not exists game_sessions_player_idx on public.game_sessions (player_id, completed_at);

create table if not exists public.garden_items (
  player_id uuid not null references auth.users on delete cascade,
  id text not null,
  item_type text not null,
  item_id text not null references public.garden_catalog (item_id),
  grid_x integer not null,
  grid_y integer not null,
  rotation integer not null default 0,
  placed_at timestamptz not null,
  primary key (player_id, id)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users on delete cascade,
  item_id text not null references public.garden_catalog (item_id),
  quantity integer not null check (quantity >= 0),
  unique (player_id, item_id)
);

create table if not exists public.garden_state (
  player_id uuid primary key references auth.users on delete cascade,
  expansions_unlocked integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_quests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null default auth.uid() references auth.users on delete cascade,
  quest_id text not null references public.quest_catalog (quest_id),
  quest_date date not null,
  progress integer not null check (progress >= 0),
  target integer not null check (target >= 1),
  completed_at timestamptz,
  reward_claimed boolean not null default false,
  unique (player_id, quest_id, quest_date)
);

create table if not exists public.daily_activity (
  player_id uuid not null default auth.uid() references auth.users on delete cascade,
  activity_date date not null,
  studied_scripture_ids text[] not null default '{}',
  goal_completed_at timestamptz,
  primary key (player_id, activity_date)
);

create table if not exists public.reward_transactions (
  player_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null, -- deterministic, e.g. "scripture-mastered:psalm-23-1-kjv"
  source_type text not null check (source_type in
    ('game', 'review', 'scripture-learned', 'scripture-mastered', 'quest', 'daily-goal', 'purchase', 'land-expansion')),
  source_id text not null,
  session_id uuid,
  coins_delta integer not null default 0,
  seeds_delta integer not null default 0,
  gems_delta integer not null default 0,
  xp_delta integer not null default 0,
  label text not null default '',
  created_at timestamptz not null,
  inserted_at timestamptz not null default now(),
  primary key (player_id, id)
);

-- ---------- Row Level Security ----------------------------------------
alter table public.scriptures enable row level security;
alter table public.garden_catalog enable row level security;
alter table public.land_expansions enable row level security;
alter table public.quest_catalog enable row level security;
alter table public.reward_rules enable row level security;
alter table public.profiles enable row level security;
alter table public.player_settings enable row level security;
alter table public.player_resources enable row level security;
alter table public.player_scriptures enable row level security;
alter table public.game_sessions enable row level security;
alter table public.garden_items enable row level security;
alter table public.inventory enable row level security;
alter table public.garden_state enable row level security;
alter table public.daily_quests enable row level security;
alter table public.daily_activity enable row level security;
alter table public.reward_transactions enable row level security;

do $$
declare t text;
begin
  -- Reference tables: anyone may read, nobody may write through the API.
  foreach t in array array['scriptures', 'garden_catalog', 'land_expansions', 'quest_catalog', 'reward_rules'] loop
    execute format('drop policy if exists "read reference" on public.%I', t);
    execute format('create policy "read reference" on public.%I for select to anon, authenticated using (true)', t);
  end loop;

  -- Player tables the app reads and writes directly (own rows only).
  foreach t in array array['player_settings', 'player_scriptures', 'daily_quests', 'daily_activity'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
      using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()))', t);
  end loop;

  -- Read-only for the app: changed only by the validated functions below.
  foreach t in array array['player_resources', 'garden_items', 'inventory', 'garden_state'] loop
    execute format('drop policy if exists "read own" on public.%I', t);
    execute format('create policy "read own" on public.%I for select to authenticated using (player_id = (select auth.uid()))', t);
  end loop;
end $$;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Finished games: add and read, never edit or delete.
drop policy if exists "read own" on public.game_sessions;
drop policy if exists "add own" on public.game_sessions;
create policy "read own" on public.game_sessions for select to authenticated using (player_id = (select auth.uid()));
create policy "add own" on public.game_sessions for insert to authenticated with check (player_id = (select auth.uid()));

-- Ledger: add (validated by trigger) and read, never edit or delete.
drop policy if exists "read own" on public.reward_transactions;
drop policy if exists "add own" on public.reward_transactions;
create policy "read own" on public.reward_transactions for select to authenticated using (player_id = (select auth.uid()));
create policy "add own" on public.reward_transactions for insert to authenticated with check (player_id = (select auth.uid()));

-- ---------- Helpers -----------------------------------------------------
create or replace function public.vv_level_for_xp(total_xp integer)
returns integer language plpgsql immutable set search_path = '' as $$
declare lvl integer := 1; remaining integer := greatest(total_xp, 0);
begin
  -- XP for next level = 100 + level × 50 (spec §12)
  while remaining >= 100 + lvl * 50 loop
    remaining := remaining - (100 + lvl * 50);
    lvl := lvl + 1;
  end loop;
  return lvl;
end $$;

create or replace function public.vv_multiplier(acc numeric)
returns numeric language sql immutable set search_path = '' as $$
  -- spec §11.4: 95%+ ×1.5, 85–94% ×1.2, otherwise ×1.0
  select case when round(acc * 100) >= 95 then 1.5 when round(acc * 100) >= 85 then 1.2 else 1.0 end
$$;

create or replace function public.vv_ensure_player(uid uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.player_resources (player_id) values (uid) on conflict do nothing;
  -- Dated 1970 so an empty new cloud garden never wins over a real garden from the device.
  insert into public.garden_state (player_id, updated_at) values (uid, 'epoch') on conflict do nothing;
$$;

-- ---------- Transaction validation (spec §11.7, §16) -------------------
create or replace function public.vv_validate_transaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s record;            -- game session
  rule record;
  item record;
  exp record;
  q record;
  res record;
  max_coins integer;
  max_xp integer;
  day_key text;
  day_coins integer;
  day_xp integer;
  n integer;
  joined date;
begin
  if new.player_id is distinct from auth.uid() then
    raise exception 'not your account';
  end if;
  perform public.vv_ensure_player(new.player_id);
  if new.created_at > now() + interval '10 minutes' then
    raise exception 'transaction is dated in the future';
  end if;
  new.gems_delta := coalesce(new.gems_delta, 0);
  if new.gems_delta <> 0 then raise exception 'gems are not available'; end if;
  select coalesce((select created_at::date from public.profiles where id = new.player_id), current_date) into joined;

  case new.source_type
  when 'game', 'review' then
    -- Must point at the player's own finished game with enough accuracy.
    select * into s from public.game_sessions where id = new.session_id and player_id = new.player_id;
    if not found then raise exception 'unknown game session'; end if;
    if s.accuracy < 0.6 then raise exception 'accuracy too low for a reward'; end if;
    if new.source_id <> s.scripture_id then raise exception 'scripture does not match the game'; end if;
    day_key := split_part(new.id, ':', -1);
    if day_key !~ '^\d{4}-\d{2}-\d{2}$'
       or day_key::date > current_date + 1
       or day_key::date < joined - 1 then
      raise exception 'invalid reward date';
    end if;
    if new.source_type = 'game' then
      if new.id <> format('game:%s:%s:%s', s.scripture_id, s.game_type, day_key) then raise exception 'invalid game reward id'; end if;
      select * into rule from public.reward_rules where game_type = s.game_type;
      max_coins := round(rule.base_coins * public.vv_multiplier(s.accuracy));
      max_xp := round(rule.base_xp * public.vv_multiplier(s.accuracy));
    else
      if new.id <> format('review:%s:%s', s.scripture_id, day_key) then raise exception 'invalid review reward id'; end if;
      max_coins := round(5 * public.vv_multiplier(s.accuracy));
      max_xp := 0;
    end if;
    if new.coins_delta not between 0 and max_coins or new.xp_delta not between 0 and max_xp or new.seeds_delta <> 0 then
      raise exception 'reward amount not allowed';
    end if;
    -- Daily caps for games and reviews (200 coins, 300 XP per local day).
    select coalesce(sum(coins_delta), 0), coalesce(sum(xp_delta), 0) into day_coins, day_xp
      from public.reward_transactions
      where player_id = new.player_id and source_type in ('game', 'review') and split_part(id, ':', -1) = day_key;
    if day_coins + new.coins_delta > 200 or day_xp + new.xp_delta > 300 then
      raise exception 'daily reward limit reached';
    end if;

  when 'scripture-learned' then
    if new.id <> 'scripture-learned:' || new.source_id
       or (new.coins_delta, new.seeds_delta, new.xp_delta) <> (0, 1, 10) then
      raise exception 'invalid learned reward';
    end if;
    if not exists (select 1 from public.player_scriptures where player_id = new.player_id and scripture_id = new.source_id) then
      raise exception 'scripture not started';
    end if;

  when 'scripture-mastered' then
    if new.id <> 'scripture-mastered:' || new.source_id
       or (new.coins_delta, new.seeds_delta, new.xp_delta) <> (15, 1, 25) then
      raise exception 'invalid mastery reward';
    end if;
    if not exists (select 1 from public.player_scriptures
                   where player_id = new.player_id and scripture_id = new.source_id and mastered_at is not null) then
      raise exception 'scripture not mastered';
    end if;

  when 'quest' then
    select dq.*, qc.coin_reward, qc.xp_reward into q
      from public.daily_quests dq join public.quest_catalog qc using (quest_id)
      where dq.player_id = new.player_id
        and new.id = format('quest:%s:%s', to_char(dq.quest_date, 'YYYY-MM-DD'), dq.quest_id);
    if not found or q.completed_at is null then raise exception 'quest not completed'; end if;
    if (new.coins_delta, new.seeds_delta, new.xp_delta) <> (q.coin_reward, 0, q.xp_reward) then
      raise exception 'invalid quest reward';
    end if;

  when 'daily-goal' then
    day_key := split_part(new.id, ':', 2);
    if new.id !~ '^daily-goal:\d{4}-\d{2}-\d{2}$'
       or (new.coins_delta, new.seeds_delta, new.xp_delta) <> (0, 1, 0)
       or not exists (select 1 from public.daily_activity
                      where player_id = new.player_id and activity_date = day_key::date and goal_completed_at is not null) then
      raise exception 'invalid daily goal reward';
    end if;

  when 'purchase' then
    select * into item from public.garden_catalog where item_id = new.source_id;
    if not found or item.not_for_sale then raise exception 'item cannot be bought'; end if;
    if new.id !~ '^purchase:' or (new.coins_delta, new.seeds_delta, new.xp_delta) <> (-item.coin_cost, -item.seed_cost, 0) then
      raise exception 'wrong price';
    end if;
    select * into res from public.player_resources where player_id = new.player_id;
    if res.level < item.unlock_level then raise exception 'item not unlocked yet'; end if;
    if item.is_unique and (item.starting_quantity > 0 or exists (select 1 from public.reward_transactions
                                  where player_id = new.player_id and source_type = 'purchase' and source_id = item.item_id)) then
      raise exception 'already owned';
    end if;

  when 'land-expansion' then
    select count(*) into n from public.reward_transactions where player_id = new.player_id and source_type = 'land-expansion';
    select * into exp from public.land_expansions where id = n + 1;
    if not found or new.id <> 'land-expansion:' || exp.id or new.source_id <> exp.id::text then
      raise exception 'land must be unlocked in order';
    end if;
    if (new.coins_delta, new.seeds_delta, new.xp_delta) <> (-exp.coin_cost, 0, 0) then raise exception 'wrong price'; end if;
    select * into res from public.player_resources where player_id = new.player_id;
    if res.level < exp.required_level
       or (select count(*) from public.player_scriptures where player_id = new.player_id and mastered_at is not null) < exp.required_mastered then
      raise exception 'requirements not met';
    end if;
  else
    raise exception 'unknown transaction type';
  end case;

  return new;
end $$;

create or replace function public.vv_apply_transaction()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- The CHECK constraints on player_resources make any negative balance fail the whole insert.
  update public.player_resources set
    coins = coins + new.coins_delta,
    seeds = seeds + new.seeds_delta,
    gems = gems + new.gems_delta,
    xp = xp + new.xp_delta,
    level = public.vv_level_for_xp(xp + new.xp_delta),
    updated_at = now()
  where player_id = new.player_id;
  return new;
end $$;

drop trigger if exists vv_validate on public.reward_transactions;
create trigger vv_validate before insert on public.reward_transactions
  for each row execute function public.vv_validate_transaction();
drop trigger if exists vv_apply on public.reward_transactions;
create trigger vv_apply after insert on public.reward_transactions
  for each row execute function public.vv_apply_transaction();

-- Create resource and garden rows when a profile is created.
create or replace function public.vv_on_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.vv_ensure_player(new.id);
  return new;
end $$;
drop trigger if exists vv_profile_created on public.profiles;
create trigger vv_profile_created after insert on public.profiles
  for each row execute function public.vv_on_profile();

-- ---------- API functions the app calls --------------------------------

-- Adds many transactions; each one is validated on its own. Already-saved ids
-- count as accepted (safe to retry). Returns which ids were rejected and why.
create or replace function public.submit_transactions(p_transactions jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare t jsonb; accepted text[] := '{}'; rejected jsonb := '[]';
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform public.vv_ensure_player(auth.uid());
  for t in select * from jsonb_array_elements(p_transactions) order by (value->>'created_at') loop
    begin
      insert into public.reward_transactions
        (player_id, id, source_type, source_id, session_id, coins_delta, seeds_delta, gems_delta, xp_delta, label, created_at)
      values (auth.uid(), t->>'id', t->>'source_type', t->>'source_id', (t->>'session_id')::uuid,
        coalesce((t->>'coins_delta')::int, 0), coalesce((t->>'seeds_delta')::int, 0), coalesce((t->>'gems_delta')::int, 0),
        coalesce((t->>'xp_delta')::int, 0), coalesce(t->>'label', ''), (t->>'created_at')::timestamptz)
      on conflict (player_id, id) do nothing;
      accepted := accepted || (t->>'id');
    exception when others then
      rejected := rejected || jsonb_build_object('id', t->>'id', 'reason', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('accepted', to_jsonb(accepted), 'rejected', rejected);
end $$;

-- Replaces the player's whole garden after checking it (spec §13.4, §16):
-- known items, inside unlocked land, not on the pond, no overlaps, and never
-- more of an item than the player started with plus bought.
create or replace function public.replace_garden(p_items jsonb, p_inventory jsonb, p_updated_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  expansions integer;
  unlocked_rows integer;
  bad text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  perform public.vv_ensure_player(uid);
  select count(*) into expansions from public.reward_transactions where player_id = uid and source_type = 'land-expansion';
  select 8 + coalesce(sum(rows), 0) into unlocked_rows from public.land_expansions where id <= expansions;

  delete from public.garden_items where player_id = uid;
  delete from public.inventory where player_id = uid;

  insert into public.garden_items (player_id, id, item_type, item_id, grid_x, grid_y, rotation, placed_at)
  select uid, i->>'id', coalesce(i->>'item_type', 'item'), i->>'item_id', (i->>'grid_x')::int, (i->>'grid_y')::int,
         coalesce((i->>'rotation')::int, 0), (i->>'placed_at')::timestamptz
  from jsonb_array_elements(p_items) i;

  insert into public.inventory (player_id, item_id, quantity)
  select uid, v->>'item_id', (v->>'quantity')::int from jsonb_array_elements(p_inventory) v
  where (v->>'quantity')::int > 0;

  -- Bounds and locked land.
  select g.id into bad from public.garden_items g join public.garden_catalog c using (item_id)
   where g.player_id = uid and (g.grid_x < 0 or g.grid_y < 0 or g.grid_x + c.width > 8 or g.grid_y + c.height > unlocked_rows)
   limit 1;
  if bad is not null then raise exception 'item % is outside the unlocked garden', bad; end if;

  -- Overlaps and the pond (tiles x 6–7, y 6–7).
  with tiles as (
    select g.id, g.grid_x + dx as x, g.grid_y + dy as y
    from public.garden_items g join public.garden_catalog c using (item_id)
    cross join lateral generate_series(0, c.width - 1) dx
    cross join lateral generate_series(0, c.height - 1) dy
    where g.player_id = uid
  )
  select string_agg(distinct id, ', ') into bad from tiles
   where (x between 6 and 7 and y between 6 and 7)
      or (x, y) in (select x, y from tiles group by x, y having count(*) > 1);
  if bad is not null then raise exception 'items overlap or are on the pond: %', bad; end if;

  -- Ownership: placed + inventory <= starting quantity + purchases.
  select c.item_id into bad from public.garden_catalog c
   where (select count(*) from public.garden_items g where g.player_id = uid and g.item_id = c.item_id)
       + coalesce((select quantity from public.inventory v where v.player_id = uid and v.item_id = c.item_id), 0)
       > c.starting_quantity
       + (select count(*) from public.reward_transactions t where t.player_id = uid and t.source_type = 'purchase' and t.source_id = c.item_id)
   limit 1;
  if bad is not null then raise exception 'more % than owned', bad; end if;

  insert into public.garden_state (player_id, expansions_unlocked, updated_at) values (uid, expansions, p_updated_at)
  on conflict (player_id) do update set expansions_unlocked = excluded.expansions_unlocked, updated_at = excluded.updated_at;
end $$;

-- Deletes ALL of the signed-in player's VerseVille data (Profile → Reset progress).
-- The login itself remains; delete the user in Authentication → Users if needed.
create or replace function public.reset_my_progress()
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.reward_transactions where player_id = uid;
  delete from public.garden_items where player_id = uid;
  delete from public.inventory where player_id = uid;
  delete from public.garden_state where player_id = uid;
  delete from public.daily_quests where player_id = uid;
  delete from public.daily_activity where player_id = uid;
  delete from public.game_sessions where player_id = uid;
  delete from public.player_scriptures where player_id = uid;
  delete from public.player_settings where player_id = uid;
  delete from public.player_resources where player_id = uid;
  delete from public.profiles where id = uid;
end $$;

revoke all on function public.vv_ensure_player(uuid) from public, anon, authenticated;
revoke all on function public.vv_validate_transaction() from public, anon, authenticated;
revoke all on function public.vv_apply_transaction() from public, anon, authenticated;
revoke all on function public.vv_on_profile() from public, anon, authenticated;
revoke all on function public.submit_transactions(jsonb) from public, anon;
revoke all on function public.replace_garden(jsonb, jsonb, timestamptz) from public, anon;
revoke all on function public.reset_my_progress() from public, anon;
grant execute on function public.submit_transactions(jsonb) to authenticated;
grant execute on function public.replace_garden(jsonb, jsonb, timestamptz) to authenticated;
grant execute on function public.reset_my_progress() to authenticated;

-- ---------- Reference data rows (generated) ----------
begin;
insert into public.garden_catalog values ('small_cottage', 100, 0, 1, 2, 2, true, false, 1) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('scripture_tree', 0, 0, 1, 2, 2, true, true, 1) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('well', 120, 0, 2, 1, 1, true, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('barn', 200, 0, 2, 2, 2, true, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('chapel', 300, 2, 3, 2, 2, true, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('bakery', 250, 0, 4, 2, 2, true, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('windmill', 400, 0, 5, 2, 2, true, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('greenhouse', 350, 3, 6, 2, 2, true, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('flower_bed', 20, 1, 1, 1, 1, false, false, 3) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('bench', 30, 0, 1, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('lantern', 25, 0, 1, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('birdbath', 40, 0, 2, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('verse_sign', 35, 0, 2, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('beehive', 60, 1, 3, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('fountain', 150, 0, 3, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('sunflower', 10, 1, 1, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('lavender', 12, 1, 1, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('rose_bush', 15, 1, 1, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('vegetable_patch', 30, 2, 2, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('olive_tree', 40, 2, 2, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('fig_tree', 50, 2, 3, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('stone_path', 5, 0, 1, 1, 1, false, false, 1) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('stepping_stones', 6, 0, 1, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.garden_catalog values ('brick_path', 8, 0, 2, 1, 1, false, false, 0) on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;
insert into public.land_expansions values (1, 2, 3, 10, 100) on conflict (id) do update set rows = excluded.rows, required_level = excluded.required_level, required_mastered = excluded.required_mastered, coin_cost = excluded.coin_cost;
insert into public.land_expansions values (2, 2, 5, 25, 250) on conflict (id) do update set rows = excluded.rows, required_level = excluded.required_level, required_mastered = excluded.required_mastered, coin_cost = excluded.coin_cost;
insert into public.land_expansions values (3, 2, 8, 50, 500) on conflict (id) do update set rows = excluded.rows, required_level = excluded.required_level, required_mastered = excluded.required_mastered, coin_cost = excluded.coin_cost;
insert into public.quest_catalog values ('complete_daily_goal', 10, 20, 1) on conflict (quest_id) do update set coin_reward = excluded.coin_reward, xp_reward = excluded.xp_reward, target = excluded.target;
insert into public.quest_catalog values ('recall_challenge', 10, 15, 1) on conflict (quest_id) do update set coin_reward = excluded.coin_reward, xp_reward = excluded.xp_reward, target = excluded.target;
insert into public.quest_catalog values ('review_two_scriptures', 15, 10, 2) on conflict (quest_id) do update set coin_reward = excluded.coin_reward, xp_reward = excluded.xp_reward, target = excluded.target;
insert into public.quest_catalog values ('review_one_scripture', 10, 10, 1) on conflict (quest_id) do update set coin_reward = excluded.coin_reward, xp_reward = excluded.xp_reward, target = excluded.target;
insert into public.quest_catalog values ('learn_one_scripture', 10, 15, 1) on conflict (quest_id) do update set coin_reward = excluded.coin_reward, xp_reward = excluded.xp_reward, target = excluded.target;
insert into public.reward_rules values ('missing-words', 5, 5) on conflict (game_type) do update set base_coins = excluded.base_coins, base_xp = excluded.base_xp;
insert into public.reward_rules values ('word-order', 5, 5) on conflict (game_type) do update set base_coins = excluded.base_coins, base_xp = excluded.base_xp;
insert into public.reward_rules values ('recall', 10, 15) on conflict (game_type) do update set base_coins = excluded.base_coins, base_xp = excluded.base_xp;
insert into public.scriptures values ('psalm-23-1-kjv', 'Psalms', 23, 1, 'Psalm 23:1', 'KJV', 'The LORD is my shepherd; I shall not want.', 'David pictures God as a shepherd who personally cares for his sheep. Because the Lord leads and provides, those who follow him will not lack what they truly need.', array['trust', 'provision', 'peace']::text[], array['john-10-11-kjv', 'isaiah-26-3-kjv', 'proverbs-3-5-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('john-3-16-kjv', 'John', 3, 16, 'John 3:16', 'KJV', 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', 'Jesus explains the heart of the gospel: God''s love for the world moved him to give his Son, so that everyone who believes in him receives eternal life instead of perishing.', array['love', 'salvation']::text[], array['romans-5-8-kjv', 'john-10-11-kjv', '2-corinthians-5-17-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('proverbs-3-5-kjv', 'Proverbs', 3, 5, 'Proverbs 3:5', 'KJV', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.', 'Trust God wholeheartedly rather than relying only on your own limited understanding. Our view is partial; God sees the whole picture.', array['trust', 'wisdom']::text[], array['proverbs-3-6-kjv', 'psalm-23-1-kjv', 'romans-8-28-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('proverbs-3-6-kjv', 'Proverbs', 3, 6, 'Proverbs 3:6', 'KJV', 'In all thy ways acknowledge him, and he shall direct thy paths.', 'Continuing from verse 5: when we honour God in every part of life, he guides our steps and makes our way straight.', array['trust', 'guidance', 'wisdom']::text[], array['proverbs-3-5-kjv', 'psalm-23-1-kjv', 'romans-8-28-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('philippians-4-13-kjv', 'Philippians', 4, 13, 'Philippians 4:13', 'KJV', 'I can do all things through Christ which strengtheneth me.', 'Paul wrote this while learning to be content in plenty and in need. His strength to face any circumstance came from Christ, not from himself.', array['strength', 'contentment']::text[], array['isaiah-41-10-kjv', 'joshua-1-9-kjv', 'psalm-46-1-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('romans-8-28-kjv', 'Romans', 8, 28, 'Romans 8:28', 'KJV', 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.', 'Paul assures believers that God is at work in every circumstance, weaving all things together for the good of those who love him and are called by him.', array['hope', 'trust']::text[], array['psalm-23-1-kjv', 'proverbs-3-5-kjv', 'proverbs-3-6-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('jeremiah-29-11-kjv', 'Jeremiah', 29, 11, 'Jeremiah 29:11', 'KJV', 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.', 'God spoke these words to Israel in exile in Babylon. Even in a hard season, his intentions toward his people were for peace and a hopeful future.', array['hope', 'guidance']::text[], array['proverbs-3-6-kjv', 'romans-8-28-kjv', 'psalm-119-105-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('isaiah-41-10-kjv', 'Isaiah', 41, 10, 'Isaiah 41:10', 'KJV', 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.', 'God tells his people not to be afraid, because he is with them. He promises to strengthen, help and uphold them.', array['courage', 'strength', 'fear']::text[], array['joshua-1-9-kjv', '2-timothy-1-7-kjv', 'philippians-4-13-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('joshua-1-9-kjv', 'Joshua', 1, 9, 'Joshua 1:9', 'KJV', 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.', 'As Joshua prepared to lead Israel into the promised land, God commanded him to be strong and brave, because God would be with him wherever he went.', array['courage', 'strength']::text[], array['isaiah-41-10-kjv', 'philippians-4-13-kjv', 'psalm-46-1-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('psalm-46-1-kjv', 'Psalms', 46, 1, 'Psalm 46:1', 'KJV', 'God is our refuge and strength, a very present help in trouble.', 'In times of trouble God is a safe shelter and a source of strength, and he is near and ready to help.', array['strength', 'refuge']::text[], array['philippians-4-13-kjv', 'isaiah-41-10-kjv', 'joshua-1-9-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('psalm-119-105-kjv', 'Psalms', 119, 105, 'Psalm 119:105', 'KJV', 'Thy word is a lamp unto my feet, and a light unto my path.', 'God''s word is like a lamp in the dark: it shows the next step and lights up the path ahead.', array['scripture', 'guidance']::text[], array['proverbs-3-6-kjv', 'jeremiah-29-11-kjv', 'john-1-1-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('matthew-11-28-kjv', 'Matthew', 11, 28, 'Matthew 11:28', 'KJV', 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', 'Jesus invites everyone who is weary and weighed down to come to him and receive rest.', array['rest', 'peace']::text[], array['psalm-23-1-kjv', 'philippians-4-7-kjv', 'galatians-5-22-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('matthew-6-33-kjv', 'Matthew', 6, 33, 'Matthew 6:33', 'KJV', 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.', 'Rather than being consumed by worry about daily needs, Jesus teaches us to make God''s kingdom our first priority, trusting him to provide.', array['provision', 'priorities']::text[], array['psalm-23-1-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('philippians-4-6-kjv', 'Philippians', 4, 6, 'Philippians 4:6', 'KJV', 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.', 'In KJV English, "careful" means anxious. Instead of worrying about anything, bring every need to God in prayer, with thanksgiving.', array['prayer', 'anxiety']::text[], array['philippians-4-7-kjv', '1-peter-5-7-kjv', 'james-1-5-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('philippians-4-7-kjv', 'Philippians', 4, 7, 'Philippians 4:7', 'KJV', 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.', 'Following verse 6: those who pray this way receive God''s peace, which is greater than we can understand and guards our hearts and minds in Christ.', array['peace', 'prayer']::text[], array['philippians-4-6-kjv', 'psalm-23-1-kjv', 'matthew-11-28-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('1-peter-5-7-kjv', '1 Peter', 5, 7, '1 Peter 5:7', 'KJV', 'Casting all your care upon him; for he careth for you.', 'We can hand every worry over to God, because he genuinely cares for us.', array['anxiety', 'trust']::text[], array['psalm-23-1-kjv', 'proverbs-3-5-kjv', 'proverbs-3-6-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('romans-12-2-kjv', 'Romans', 12, 2, 'Romans 12:2', 'KJV', 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.', 'Don''t simply copy the patterns of the world. Let God renew the way you think, so you can recognise and follow his good will.', array['transformation', 'wisdom']::text[], array['proverbs-3-5-kjv', 'proverbs-3-6-kjv', '2-corinthians-5-17-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('2-corinthians-5-17-kjv', '2 Corinthians', 5, 17, '2 Corinthians 5:17', 'KJV', 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.', 'Anyone who is in Christ is made new. The old life has passed and a new one has begun.', array['salvation', 'transformation']::text[], array['john-3-16-kjv', 'romans-12-2-kjv', 'galatians-2-20-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('galatians-2-20-kjv', 'Galatians', 2, 20, 'Galatians 2:20', 'KJV', 'I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.', 'Paul describes being united with Christ: his old self was crucified with Christ, and the life he now lives, he lives by the faith of the Son of God, who loved him and gave himself for him.', array['faith', 'salvation']::text[], array['ephesians-2-8-kjv', 'john-14-6-kjv', 'romans-10-9-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('ephesians-2-8-kjv', 'Ephesians', 2, 8, 'Ephesians 2:8', 'KJV', 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:', 'Salvation is God''s gift. We are saved by his grace through faith, not by anything we produce ourselves.', array['grace', 'salvation', 'faith']::text[], array['ephesians-2-9-kjv', 'galatians-2-20-kjv', 'john-14-6-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('ephesians-2-9-kjv', 'Ephesians', 2, 9, 'Ephesians 2:9', 'KJV', 'Not of works, lest any man should boast.', 'Continuing from verse 8: salvation does not come from our works, so no one can boast about earning it.', array['grace', 'salvation']::text[], array['ephesians-2-8-kjv', 'john-3-16-kjv', '2-corinthians-5-17-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('romans-3-23-kjv', 'Romans', 3, 23, 'Romans 3:23', 'KJV', 'For all have sinned, and come short of the glory of God;', 'Everyone has sinned and fallen short of God''s glory. No one is righteous enough on their own.', array['sin', 'salvation']::text[], array['romans-6-23-kjv', 'john-3-16-kjv', '2-corinthians-5-17-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('romans-6-23-kjv', 'Romans', 6, 23, 'Romans 6:23', 'KJV', 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.', 'Sin leads to death, but God offers eternal life as a free gift through Jesus Christ.', array['sin', 'salvation']::text[], array['romans-3-23-kjv', 'john-3-16-kjv', '2-corinthians-5-17-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('romans-5-8-kjv', 'Romans', 5, 8, 'Romans 5:8', 'KJV', 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.', 'God showed his love by Christ dying for us while we were still sinners, before we had done anything to deserve it.', array['love', 'salvation']::text[], array['john-3-16-kjv', 'john-10-11-kjv', '2-corinthians-5-17-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('1-john-1-9-kjv', '1 John', 1, 9, '1 John 1:9', 'KJV', 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.', 'When we honestly confess our sins, God is faithful and just to forgive us and to cleanse us from all unrighteousness.', array['forgiveness']::text[], array['psalm-51-10-kjv', 'ephesians-4-32-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('john-14-6-kjv', 'John', 14, 6, 'John 14:6', 'KJV', 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.', 'Jesus declares that he is the way, the truth and the life, and that he is the way to the Father.', array['salvation', 'faith']::text[], array['galatians-2-20-kjv', 'ephesians-2-8-kjv', 'romans-10-9-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('john-1-1-kjv', 'John', 1, 1, 'John 1:1', 'KJV', 'In the beginning was the Word, and the Word was with God, and the Word was God.', 'John opens his gospel by describing Jesus as the eternal Word, who was with God and was God from the beginning.', array['scripture', 'faith']::text[], array['psalm-119-105-kjv', 'galatians-2-20-kjv', 'ephesians-2-8-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('hebrews-11-1-kjv', 'Hebrews', 11, 1, 'Hebrews 11:1', 'KJV', 'Now faith is the substance of things hoped for, the evidence of things not seen.', 'Faith is confident trust in what God has promised, even before we can see it fulfilled.', array['faith', 'hope']::text[], array['romans-8-28-kjv', 'jeremiah-29-11-kjv', 'galatians-2-20-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('hebrews-4-12-kjv', 'Hebrews', 4, 12, 'Hebrews 4:12', 'KJV', 'For the word of God is quick, and powerful, and sharper than any twoedged sword, piercing even to the dividing asunder of soul and spirit, and of the joints and marrow, and is a discerner of the thoughts and intents of the heart.', 'In KJV English, "quick" means living. God''s word is alive and powerful; it reaches deep inside us and reveals our true thoughts and intentions.', array['scripture']::text[], array['psalm-119-105-kjv', 'john-1-1-kjv', '2-timothy-3-16-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('2-timothy-3-16-kjv', '2 Timothy', 3, 16, '2 Timothy 3:16', 'KJV', 'All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:', 'All scripture comes from God and is useful for teaching, correcting and training us in right living.', array['scripture', 'wisdom']::text[], array['proverbs-3-5-kjv', 'proverbs-3-6-kjv', 'psalm-119-105-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('isaiah-40-31-kjv', 'Isaiah', 40, 31, 'Isaiah 40:31', 'KJV', 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', 'Those who wait on the Lord and put their hope in him will have their strength renewed, like eagles rising on the wind.', array['strength', 'hope']::text[], array['philippians-4-13-kjv', 'romans-8-28-kjv', 'jeremiah-29-11-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('psalm-37-4-kjv', 'Psalms', 37, 4, 'Psalm 37:4', 'KJV', 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.', 'Find your delight in the Lord. As our hearts are shaped by delighting in him, he gives us the desires of our heart.', array['joy', 'trust']::text[], array['psalm-23-1-kjv', 'proverbs-3-5-kjv', 'proverbs-3-6-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('psalm-118-24-kjv', 'Psalms', 118, 24, 'Psalm 118:24', 'KJV', 'This is the day which the LORD hath made; we will rejoice and be glad in it.', 'Each day is a gift from God, and a reason to rejoice and be glad.', array['joy', 'gratitude']::text[], array['psalm-37-4-kjv', 'nehemiah-8-10-kjv', 'galatians-5-22-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('nehemiah-8-10-kjv', 'Nehemiah', 8, 10, 'Nehemiah 8:10', 'KJV', 'Then he said unto them, Go your way, eat the fat, and drink the sweet, and send portions unto them for whom nothing is prepared: for this day is holy unto our Lord: neither be ye sorry; for the joy of the LORD is your strength.', 'As the people heard God''s law read and grieved, Nehemiah encouraged them to celebrate and share, because the joy of the Lord was their strength.', array['joy', 'strength']::text[], array['philippians-4-13-kjv', 'isaiah-41-10-kjv', 'joshua-1-9-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('lamentations-3-22-kjv', 'Lamentations', 3, 22, 'Lamentations 3:22', 'KJV', 'It is of the LORD’s mercies that we are not consumed, because his compassions fail not.', 'Written after Jerusalem''s destruction, this verse holds onto hope: it is because of the Lord''s mercies that his people are not consumed, for his compassion does not fail.', array['faithfulness', 'hope']::text[], array['lamentations-3-23-kjv', 'romans-8-28-kjv', 'jeremiah-29-11-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('lamentations-3-23-kjv', 'Lamentations', 3, 23, 'Lamentations 3:23', 'KJV', 'They are new every morning: great is thy faithfulness.', 'Continuing from verse 22: God''s compassion is new every morning, and his faithfulness is great.', array['faithfulness', 'hope']::text[], array['lamentations-3-22-kjv', 'romans-8-28-kjv', 'jeremiah-29-11-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('micah-6-8-kjv', 'Micah', 6, 8, 'Micah 6:8', 'KJV', 'He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?', 'God has made clear what he asks: to do justly, to love mercy, and to walk humbly with him.', array['obedience', 'kindness']::text[], array['matthew-22-37-kjv', 'matthew-28-19-kjv', 'colossians-3-23-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('matthew-22-37-kjv', 'Matthew', 22, 37, 'Matthew 22:37', 'KJV', 'Jesus said unto him, Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind.', 'Asked for the greatest commandment, Jesus answered: love the Lord your God with all your heart, soul and mind.', array['love', 'obedience']::text[], array['john-3-16-kjv', 'romans-5-8-kjv', 'micah-6-8-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('matthew-5-16-kjv', 'Matthew', 5, 16, 'Matthew 5:16', 'KJV', 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.', 'Let the good you do shine like a light before others, so that they give glory to God.', array['witness']::text[], array['matthew-28-19-kjv', 'acts-1-8-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('matthew-28-19-kjv', 'Matthew', 28, 19, 'Matthew 28:19', 'KJV', 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost:', 'Jesus sends his followers to make disciples of all nations, baptising them in the name of the Father, the Son and the Holy Spirit.', array['witness', 'obedience']::text[], array['micah-6-8-kjv', 'matthew-22-37-kjv', 'matthew-5-16-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('acts-1-8-kjv', 'Acts', 1, 8, 'Acts 1:8', 'KJV', 'But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judæa, and in Samaria, and unto the uttermost part of the earth.', 'Before ascending, Jesus promised that the Holy Spirit would give his followers power to be his witnesses, from Jerusalem to the ends of the earth.', array['witness', 'strength']::text[], array['philippians-4-13-kjv', 'isaiah-41-10-kjv', 'joshua-1-9-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('galatians-5-22-kjv', 'Galatians', 5, 22, 'Galatians 5:22', 'KJV', 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,', 'Paul lists the fruit the Holy Spirit grows in a believer''s life, beginning with love, joy, peace, longsuffering (patience), gentleness, goodness and faith.', array['character', 'joy', 'peace']::text[], array['galatians-5-23-kjv', 'romans-15-13-kjv', 'psalm-23-1-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('galatians-5-23-kjv', 'Galatians', 5, 23, 'Galatians 5:23', 'KJV', 'Meekness, temperance: against such there is no law.', 'The list continues with meekness and temperance (self-control). There is no law against qualities like these.', array['character']::text[], array['galatians-5-22-kjv', '1-corinthians-13-4-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('1-corinthians-13-4-kjv', '1 Corinthians', 13, 4, '1 Corinthians 13:4', 'KJV', 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,', 'Paul describes what real love looks like: patient, kind, not envious, not boastful and not proud. (The KJV uses the word charity for love.)', array['love', 'character']::text[], array['john-3-16-kjv', 'romans-5-8-kjv', 'matthew-22-37-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('1-corinthians-10-13-kjv', '1 Corinthians', 10, 13, '1 Corinthians 10:13', 'KJV', 'There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it.', 'Every temptation we face is common to people. God is faithful: he will not let us be tempted beyond what we can bear, and he provides a way of escape.', array['temptation', 'faithfulness']::text[], array['lamentations-3-22-kjv', 'lamentations-3-23-kjv', 'deuteronomy-31-6-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('james-1-5-kjv', 'James', 1, 5, 'James 1:5', 'KJV', 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.', 'If you need wisdom, ask God. He gives generously to all who ask, without scolding them for asking.', array['wisdom', 'prayer']::text[], array['proverbs-3-5-kjv', 'proverbs-3-6-kjv', 'philippians-4-6-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('proverbs-18-10-kjv', 'Proverbs', 18, 10, 'Proverbs 18:10', 'KJV', 'The name of the LORD is a strong tower: the righteous runneth into it, and is safe.', 'The name of the Lord is like a strong tower. Those who live rightly can run to him and be safe.', array['refuge', 'trust']::text[], array['psalm-23-1-kjv', 'proverbs-3-5-kjv', 'proverbs-3-6-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('psalm-56-3-kjv', 'Psalms', 56, 3, 'Psalm 56:3', 'KJV', 'What time I am afraid, I will trust in thee.', 'A simple prayer for frightening moments: whenever I am afraid, I will trust in God.', array['fear', 'trust']::text[], array['psalm-23-1-kjv', 'proverbs-3-5-kjv', 'proverbs-3-6-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('deuteronomy-31-6-kjv', 'Deuteronomy', 31, 6, 'Deuteronomy 31:6', 'KJV', 'Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.', 'Moses encouraged Israel before they entered the promised land: be strong and courageous, because God goes with you and will not fail or forsake you.', array['courage', 'faithfulness']::text[], array['isaiah-41-10-kjv', 'joshua-1-9-kjv', 'lamentations-3-22-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('2-timothy-1-7-kjv', '2 Timothy', 1, 7, '2 Timothy 1:7', 'KJV', 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.', 'God has not given us a spirit of fear, but of power, love and a sound mind.', array['fear', 'strength']::text[], array['isaiah-41-10-kjv', 'philippians-4-13-kjv', 'joshua-1-9-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('john-16-33-kjv', 'John', 16, 33, 'John 16:33', 'KJV', 'These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world.', 'Jesus warns that this world will bring trouble, but tells his followers to take heart, because he has overcome the world.', array['peace', 'courage']::text[], array['psalm-23-1-kjv', 'isaiah-41-10-kjv', 'joshua-1-9-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('john-14-27-kjv', 'John', 14, 27, 'John 14:27', 'KJV', 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.', 'Jesus gives his followers his own peace, which is different from what the world offers, so their hearts need not be troubled or afraid.', array['peace', 'fear']::text[], array['psalm-23-1-kjv', 'isaiah-41-10-kjv', 'matthew-11-28-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('romans-10-9-kjv', 'Romans', 10, 9, 'Romans 10:9', 'KJV', 'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.', 'Paul explains that confessing Jesus as Lord and believing in your heart that God raised him from the dead leads to salvation.', array['salvation', 'faith']::text[], array['galatians-2-20-kjv', 'ephesians-2-8-kjv', 'john-14-6-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('romans-15-13-kjv', 'Romans', 15, 13, 'Romans 15:13', 'KJV', 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.', 'Paul prays that the God of hope will fill believers with joy and peace as they trust him, so that they overflow with hope by the power of the Holy Spirit.', array['hope', 'joy', 'peace']::text[], array['galatians-5-22-kjv', 'psalm-23-1-kjv', 'romans-8-28-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('hebrews-13-5-kjv', 'Hebrews', 13, 5, 'Hebrews 13:5', 'KJV', 'Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.', 'In KJV English, "conversation" means your way of life. Live free from greed and be content with what you have, because God has promised never to leave or forsake you.', array['contentment', 'faithfulness']::text[], array['philippians-4-13-kjv', 'lamentations-3-22-kjv', 'lamentations-3-23-kjv']::text[], 3, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('colossians-3-23-kjv', 'Colossians', 3, 23, 'Colossians 3:23', 'KJV', 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;', 'Whatever work you do, do it wholeheartedly, as if you were working for the Lord rather than only for people.', array['work', 'obedience']::text[], array['micah-6-8-kjv', 'matthew-22-37-kjv', 'matthew-28-19-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('1-thessalonians-5-16-kjv', '1 Thessalonians', 5, 16, '1 Thessalonians 5:16', 'KJV', 'Rejoice evermore.', 'A short command: rejoice always.', array['joy']::text[], array['1-thessalonians-5-17-kjv', 'psalm-37-4-kjv', 'psalm-118-24-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('1-thessalonians-5-17-kjv', '1 Thessalonians', 5, 17, '1 Thessalonians 5:17', 'KJV', 'Pray without ceasing.', 'Keep praying without ceasing: stay in continual conversation with God.', array['prayer']::text[], array['1-thessalonians-5-16-kjv', '1-thessalonians-5-18-kjv', 'philippians-4-6-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('1-thessalonians-5-18-kjv', '1 Thessalonians', 5, 18, '1 Thessalonians 5:18', 'KJV', 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.', 'Give thanks in every circumstance, because this is God''s will for those who are in Christ Jesus.', array['gratitude', 'prayer']::text[], array['1-thessalonians-5-17-kjv', 'philippians-4-6-kjv', 'philippians-4-7-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('psalm-139-14-kjv', 'Psalms', 139, 14, 'Psalm 139:14', 'KJV', 'I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.', 'David praises God for making him so wonderfully. Every person is fearfully and wonderfully made by God.', array['identity', 'gratitude']::text[], array['psalm-118-24-kjv', '1-thessalonians-5-18-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('john-10-11-kjv', 'John', 10, 11, 'John 10:11', 'KJV', 'I am the good shepherd: the good shepherd giveth his life for the sheep.', 'Jesus calls himself the good shepherd, who willingly gives his life for the sheep.', array['love', 'salvation']::text[], array['psalm-23-1-kjv', 'john-3-16-kjv', 'romans-5-8-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('genesis-1-1-kjv', 'Genesis', 1, 1, 'Genesis 1:1', 'KJV', 'In the beginning God created the heaven and the earth.', 'The Bible''s first words: God is the Creator of everything that exists.', array['creation']::text[], '{}'::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('isaiah-26-3-kjv', 'Isaiah', 26, 3, 'Isaiah 26:3', 'KJV', 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.', 'God keeps in perfect peace the person whose mind is fixed on him, because they trust in him.', array['peace', 'trust']::text[], array['psalm-23-1-kjv', 'proverbs-3-5-kjv', 'proverbs-3-6-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('psalm-51-10-kjv', 'Psalms', 51, 10, 'Psalm 51:10', 'KJV', 'Create in me a clean heart, O God; and renew a right spirit within me.', 'After his sin, David asks God to create a clean heart in him and renew a right spirit within him.', array['forgiveness', 'transformation']::text[], array['romans-12-2-kjv', '2-corinthians-5-17-kjv', '1-john-1-9-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('1-john-4-19-kjv', '1 John', 4, 19, '1 John 4:19', 'KJV', 'We love him, because he first loved us.', 'Our love for God is a response: we love him because he first loved us.', array['love']::text[], array['john-3-16-kjv', 'romans-5-8-kjv', 'matthew-22-37-kjv']::text[], 1, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
insert into public.scriptures values ('ephesians-4-32-kjv', 'Ephesians', 4, 32, 'Ephesians 4:32', 'KJV', 'And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ’s sake hath forgiven you.', 'Be kind and tender-hearted toward one another, forgiving each other just as God has forgiven you for Christ''s sake.', array['kindness', 'forgiveness']::text[], array['1-john-1-9-kjv', 'micah-6-8-kjv', 'psalm-51-10-kjv']::text[], 2, true) on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;
commit;
