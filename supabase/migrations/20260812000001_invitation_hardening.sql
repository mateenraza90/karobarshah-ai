-- Invitation hardening: consume an invitation atomically inside PostgreSQL.
-- The token hash and authenticated email are checked in one transaction so an
-- invitation cannot be replayed if two acceptance requests race.
create or replace function accept_pending_invite(target_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row pending_invites%rowtype;
  current_email text;
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into current_email from auth.users where id = auth.uid();
  if current_email is null then
    raise exception 'Authenticated email is required';
  end if;

  if exists (select 1 from memberships where user_id = auth.uid()) then
    raise exception 'User already belongs to an organization';
  end if;

  select * into invite_row
  from pending_invites
  where token_hash = target_token_hash
  for update;

  if not found or invite_row.expires_at <= now() then
    raise exception 'Invitation not found or expired';
  end if;

  if lower(invite_row.email) <> lower(current_email) then
    raise exception 'Invitation email does not match authenticated user';
  end if;

  insert into memberships (organization_id, user_id, role)
  values (invite_row.organization_id, auth.uid(), invite_row.role);

  delete from pending_invites where id = invite_row.id;
  new_org_id := invite_row.organization_id;
  return new_org_id;
end;
$$;

revoke execute on function accept_pending_invite(text) from public;
grant execute on function accept_pending_invite(text) to authenticated;
