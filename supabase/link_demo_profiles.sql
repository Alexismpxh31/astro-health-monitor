-- Replace NULL with a quoted User UID from Authentication > Users.
-- Leave unneeded profiles NULL. Run after the assigned accounts sign in with Google.
begin;

do $$
declare
  assignment record;
begin
  for assignment in
    select profile_id::uuid, auth_id::uuid
    from (values
      ('a0000000-0000-4000-8000-000000000001', NULL), -- Ground flight surgeon
      ('a0000000-0000-4000-8000-000000000002', NULL), -- Astronaut One
      ('a0000000-0000-4000-8000-000000000003', NULL), -- Astronaut Two
      ('a0000000-0000-4000-8000-000000000004', NULL), -- Astronaut Three
      ('a0000000-0000-4000-8000-000000000005', NULL), -- Astronaut Four
      ('a0000000-0000-4000-8000-000000000006', NULL)  -- Astronaut Five
    ) as profiles(profile_id, auth_id)
    where auth_id is not null
  loop
    if not exists (
      select 1 from auth.identities
      where user_id = assignment.auth_id and provider = 'google'
    ) then
      raise exception 'No Google identity for Auth account %', assignment.auth_id;
    end if;

    update public.users
    set auth_user_id = assignment.auth_id
    where id = assignment.profile_id and active
      and (auth_user_id is null or auth_user_id = assignment.auth_id);

    if not found then
      raise exception 'Profile % is missing, inactive, or linked to another account', assignment.profile_id;
    end if;
  end loop;
end $$;

commit;
