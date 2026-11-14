-- =====================================================================
-- AstroSalud · incremental upgrade (NO drop). For a database that already ran setup_final.sql.
-- Adds: missions.name_es / name_en / comm_delay_min_sec / comm_delay_max_sec, messages.alert_id,
-- the Mars demo mission, demo astronauts Four (PIN 4444) and Five (PIN 5555) and their crew rows.
-- Safe to run more than once. Paste in Supabase > SQL Editor and run.
-- Generated from src/data/seed/*.json on 2026-11-14. A fresh install
-- does not need it: setup_final.sql already contains everything.
-- =====================================================================

alter table missions add column if not exists name_es varchar(100);
alter table missions add column if not exists name_en varchar(100);
alter table missions add column if not exists comm_delay_min_sec integer;
alter table missions add column if not exists comm_delay_max_sec integer;
alter table missions drop constraint if exists chk_missions_comm_delay;
alter table missions add constraint chk_missions_comm_delay check (
  comm_delay_min_sec is null or comm_delay_max_sec is null
  or (comm_delay_min_sec >= 0 and comm_delay_max_sec >= comm_delay_min_sec)
);

alter table messages add column if not exists alert_id uuid references alerts(id) on delete set null;
create index if not exists messages_alert_idx on messages (alert_id) where alert_id is not null;

insert into missions (id, name, destination, start_date, end_date, name_es, name_en, comm_delay_min_sec, comm_delay_max_sec) values
  ('b0000000-0000-4000-8000-000000000001', 'Demo Mission (simulated data)', 'ISS (demo)', null, null, 'Expedición ISS (simulada)', 'ISS Expedition (simulated)', 1, 1),
  ('b0000000-0000-4000-8000-000000000002', 'Mars Transit (simulated data)', 'Mars (demo)', null, null, 'Tránsito a Marte (simulada)', 'Mars Transit (simulated)', 180, 1320)
on conflict (id) do update set name = excluded.name, destination = excluded.destination,
  name_es = excluded.name_es, name_en = excluded.name_en,
  comm_delay_min_sec = excluded.comm_delay_min_sec, comm_delay_max_sec = excluded.comm_delay_max_sec;

insert into users (id, first_name, last_name, role_id, pin_salt, pin_hash)
select v.id::uuid, v.first_name, v.last_name, r.id, v.pin_salt, v.pin_hash
from (values
  ('a0000000-0000-4000-8000-000000000001', 'Flight', 'Surgeon (demo)', 'flight_surgeon', '91936b3bdb47b76b', '0c50a14a24d6abdde0c8d65fe9a01e6e1284f64f3e75ed26fae2fae2e58489eb'),
  ('a0000000-0000-4000-8000-000000000002', 'Astronaut', 'One (demo)', 'astronaut', '09a4abba40eef513', 'f4bf96466abd6d390f6a70635ead9139bd68ed64dc7b4ec83886ba1a3c1dab06'),
  ('a0000000-0000-4000-8000-000000000003', 'Astronaut', 'Two (demo)', 'astronaut', 'd1b13074e4b303b3', '34d97676fdc77821a058a217637fac99a4c0842ee30c7f629e89887e284a79a1'),
  ('a0000000-0000-4000-8000-000000000004', 'Astronaut', 'Three (demo)', 'astronaut', '8814fcc1fcfd1467', 'da3e5f0b13f499c19c42985254c4a3cfe2a25490ae2ffbdbb73d64095628291b'),
  ('a0000000-0000-4000-8000-000000000005', 'Astronaut', 'Four (demo)', 'astronaut', '444dd0795d4f504f', '2ae0868709c8f2cc3aad5fdef845c6cdc73f9375deed9d94e1307c6d646337b4'),
  ('a0000000-0000-4000-8000-000000000006', 'Astronaut', 'Five (demo)', 'astronaut', '5703b79779806764', '76f50fea422fc0f9c10c1f1df97c64a1ad6d96747bd45d938a5875899058955a')
) as v(id, first_name, last_name, role_code, pin_salt, pin_hash)
join roles r on r.code = v.role_code
on conflict (id) do nothing;

insert into crew (mission_id, user_id, is_medical_officer) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', false),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', false),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', true),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', false),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', false),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', false),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', true)
on conflict do nothing;

-- Verification. Expected: missions = 2, users = 6, crew = 7
select (select count(*) from missions) as missions, (select count(*) from users) as users, (select count(*) from crew) as crew,
       (select count(*) from information_schema.columns where table_name = 'messages' and column_name = 'alert_id') as messages_alert_id;
