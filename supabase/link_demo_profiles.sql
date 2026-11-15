-- Replace both placeholders with the User UIDs from Authentication > Users.
-- Run in the SQL Editor after creating and confirming both Auth accounts.
begin;

do $$
declare
  surgeon_auth_id uuid := '<flight-surgeon-auth-uuid>';
  astronaut_auth_id uuid := '<astronaut-one-auth-uuid>';
  linked_count integer;
begin
  update public.users
  set auth_user_id = case
    when id = 'a0000000-0000-4000-8000-000000000001' then surgeon_auth_id
    else astronaut_auth_id
  end
  where active and id in (
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000002'
  );

  get diagnostics linked_count = row_count;
  if linked_count <> 2 then
    raise exception 'Both demo profiles must exist and be active';
  end if;
end $$;

commit;
