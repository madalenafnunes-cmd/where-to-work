-- Where to Work — custom places (user-added venues not in OSM).
-- Run this AFTER 0001_schema.sql.

alter table places
  add column if not exists created_by text;

create index if not exists places_created_by_idx on places (created_by);

-- Creator-only update/delete on places. OSM-sourced rows keep created_by NULL
-- and are untouchable via the anon key. Custom rows are editable only by the
-- original contributor (matched on the x-contributor-id request header).
drop policy if exists places_update_creator on places;
create policy places_update_creator on places
  for update
  using (
    created_by is not null
    and created_by = current_setting('request.headers', true)::json->>'x-contributor-id'
  )
  with check (
    created_by is not null
    and created_by = current_setting('request.headers', true)::json->>'x-contributor-id'
  );

drop policy if exists places_delete_own_custom on places;
drop policy if exists places_delete_creator on places;
create policy places_delete_creator on places
  for delete
  using (
    created_by is not null
    and created_by = current_setting('request.headers', true)::json->>'x-contributor-id'
  );
