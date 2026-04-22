-- Where to Work — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push` if using the CLI).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  osm_id text unique not null,              -- e.g. "node/12345678"
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists places_osm_id_idx on places (osm_id);
create index if not exists places_lat_lng_idx on places (lat, lng);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  contributor_id text not null,            -- anonymous UUID from localStorage
  noise numeric(2,1) check (noise between 0 and 5),
  plugs numeric(2,1) check (plugs between 0 and 5),
  wifi numeric(2,1) check (wifi between 0 and 5),
  laptop_friendly numeric(2,1) check (laptop_friendly between 0 and 5),
  price numeric(2,1) check (price between 0 and 5),
  food numeric(2,1) check (food between 0 and 5),
  coffee numeric(2,1) check (coffee between 0 and 5),
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, contributor_id)
);

create index if not exists ratings_place_id_idx on ratings (place_id);
create index if not exists ratings_contributor_id_idx on ratings (contributor_id);

-- Keep updated_at fresh on rating edits.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ratings_set_updated_at on ratings;
create trigger ratings_set_updated_at
  before update on ratings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Aggregate view: one row per place with overall + per-category averages
-- ---------------------------------------------------------------------------

create or replace view place_ratings_summary as
select
  p.id                as place_id,
  p.osm_id,
  p.name,
  p.address,
  p.lat,
  p.lng,
  count(r.id)         as rating_count,
  avg(
    (coalesce(r.noise,0) + coalesce(r.plugs,0) + coalesce(r.wifi,0) +
     coalesce(r.laptop_friendly,0) + coalesce(r.price,0) +
     coalesce(r.food,0) + coalesce(r.coffee,0)) /
    nullif(
      (case when r.noise           is not null then 1 else 0 end) +
      (case when r.plugs           is not null then 1 else 0 end) +
      (case when r.wifi            is not null then 1 else 0 end) +
      (case when r.laptop_friendly is not null then 1 else 0 end) +
      (case when r.price           is not null then 1 else 0 end) +
      (case when r.food            is not null then 1 else 0 end) +
      (case when r.coffee          is not null then 1 else 0 end), 0)
  )                   as overall_rating,
  avg(r.noise)           as avg_noise,
  avg(r.plugs)           as avg_plugs,
  avg(r.wifi)            as avg_wifi,
  avg(r.laptop_friendly) as avg_laptop_friendly,
  avg(r.price)           as avg_price,
  avg(r.food)            as avg_food,
  avg(r.coffee)          as avg_coffee,
  count(r.noise)           as noise_count,
  count(r.plugs)           as plugs_count,
  count(r.wifi)            as wifi_count,
  count(r.laptop_friendly) as laptop_friendly_count,
  count(r.price)           as price_count,
  count(r.food)            as food_count,
  count(r.coffee)          as coffee_count
from places p
left join ratings r on r.place_id = p.id
group by p.id;

-- ---------------------------------------------------------------------------
-- Row-Level Security
--
-- The app is login-less. Anon users identify themselves with a random UUID
-- stored in localStorage and sent as `contributor_id`. We enforce that a
-- client can only UPDATE/DELETE rows whose contributor_id matches what they
-- send — it's a soft guarantee (anyone can spoof another's UUID if they
-- guess it), but it's good enough for v1 and matches the spec.
-- ---------------------------------------------------------------------------

alter table places  enable row level security;
alter table ratings enable row level security;

-- places: anyone can read; anyone can insert (new venues auto-created on first rating).
drop policy if exists places_select_anon on places;
create policy places_select_anon on places
  for select using (true);

drop policy if exists places_insert_anon on places;
create policy places_insert_anon on places
  for insert with check (true);

-- ratings: anyone can read and insert.
drop policy if exists ratings_select_anon on ratings;
create policy ratings_select_anon on ratings
  for select using (true);

drop policy if exists ratings_insert_anon on ratings;
create policy ratings_insert_anon on ratings
  for insert with check (char_length(contributor_id) between 8 and 64);

-- ratings: contributors can update/delete only their own rows.
-- We compare against a request header set by the client, `x-contributor-id`.
drop policy if exists ratings_update_own on ratings;
create policy ratings_update_own on ratings
  for update
  using (contributor_id = current_setting('request.headers', true)::json->>'x-contributor-id')
  with check (contributor_id = current_setting('request.headers', true)::json->>'x-contributor-id');

drop policy if exists ratings_delete_own on ratings;
create policy ratings_delete_own on ratings
  for delete
  using (contributor_id = current_setting('request.headers', true)::json->>'x-contributor-id');

-- Grant the aggregate view to the anon role so the client can read it.
grant select on place_ratings_summary to anon;
grant select on place_ratings_summary to authenticated;
