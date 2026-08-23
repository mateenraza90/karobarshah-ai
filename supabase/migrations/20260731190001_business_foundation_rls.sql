-- Milestone 1: Business Foundation — Row Level Security
--
-- Permission model:
--   owner, admin, manager  -> full read/write on clinics/doctors/services
--   receptionist           -> read-only on clinics/doctors/services
--   only owner             -> can change another member's role
--   only owner, admin      -> can update the organization profile
--
-- Every policy is scoped through `memberships`, so a user who isn't a
-- member of an organization gets zero rows back for anything under it —
-- this is the tenant-isolation guarantee, enforced at the database layer.

alter table organizations enable row level security;
alter table memberships   enable row level security;
alter table clinics       enable row level security;
alter table doctors       enable row level security;
alter table services      enable row level security;

-- ---------------------------------------------------------------------
-- Helper functions
--
-- SECURITY DEFINER + a fixed search_path so these run with the function
-- owner's privileges and read `memberships` directly, bypassing RLS on
-- that read. Without this, a policy on `memberships` that queries
-- `memberships` again to check membership would recurse into itself.
-- ---------------------------------------------------------------------
create or replace function is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where organization_id = target_org_id
      and user_id = auth.uid()
  );
$$;

create or replace function has_org_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where organization_id = target_org_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

-- Used only by the membership INSERT policy below. Deliberately a
-- SECURITY DEFINER function rather than an inline subquery: an inline
-- subquery would itself be filtered by the memberships SELECT policy,
-- which hides every row in an organization from a user who isn't a
-- member of it yet — the exact moment this check runs. That blind spot
-- would make "no members exist yet" look true for an org that already
-- has an owner, which is what it exists to prevent. (Found and fixed
-- during original testing: an inline `not exists` subquery let a second
-- user insert themselves as a co-owner of an already-owned org.)
create or replace function org_has_any_members(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where organization_id = target_org_id
  );
$$;

revoke execute on function is_org_member(uuid) from public;
revoke execute on function has_org_role(uuid, text[]) from public;
revoke execute on function org_has_any_members(uuid) from public;
grant execute on function is_org_member(uuid) to authenticated;
grant execute on function has_org_role(uuid, text[]) to authenticated;
grant execute on function org_has_any_members(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
create policy "members can view their organization"
  on organizations for select
  to authenticated
  using (is_org_member(id));

create policy "authenticated users can create an organization"
  on organizations for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "owner or admin can update their organization"
  on organizations for update
  to authenticated
  using (has_org_role(id, array['owner', 'admin']))
  with check (has_org_role(id, array['owner', 'admin']));

create policy "owner can delete their organization"
  on organizations for delete
  to authenticated
  using (has_org_role(id, array['owner']));

-- ---------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------
create policy "members can view memberships in their organization"
  on memberships for select
  to authenticated
  using (is_org_member(organization_id));

-- Deliberately narrow: a user may only ever insert a membership row for
-- *themselves*, as 'owner', and only into an organization that has no
-- members yet. That's exactly (and only) the moment right after they
-- create a new organization. Team invites (adding a *second* member) are
-- out of Milestone 1's scope and get their own policy in a later
-- migration.
create policy "first membership on an organization must be a self-owner claim"
  on memberships for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and not org_has_any_members(organization_id)
  );

create policy "owner can change member roles"
  on memberships for update
  to authenticated
  using (has_org_role(organization_id, array['owner']))
  with check (has_org_role(organization_id, array['owner']));

create policy "owner or admin can remove a member"
  on memberships for delete
  to authenticated
  using (has_org_role(organization_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------
-- clinics
-- ---------------------------------------------------------------------
create policy "members can view their clinic profile"
  on clinics for select
  to authenticated
  using (is_org_member(organization_id));

create policy "owner or admin can create the clinic profile"
  on clinics for insert
  to authenticated
  with check (has_org_role(organization_id, array['owner', 'admin']));

create policy "owner or admin can update the clinic profile"
  on clinics for update
  to authenticated
  using (has_org_role(organization_id, array['owner', 'admin']))
  with check (has_org_role(organization_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------
-- doctors — owner/admin/manager manage; receptionist reads only
-- ---------------------------------------------------------------------
create policy "members can view doctors"
  on doctors for select
  to authenticated
  using (is_org_member(organization_id));

create policy "owner, admin or manager can add doctors"
  on doctors for insert
  to authenticated
  with check (has_org_role(organization_id, array['owner', 'admin', 'manager']));

create policy "owner, admin or manager can update doctors"
  on doctors for update
  to authenticated
  using (has_org_role(organization_id, array['owner', 'admin', 'manager']))
  with check (has_org_role(organization_id, array['owner', 'admin', 'manager']));

create policy "owner, admin or manager can remove doctors"
  on doctors for delete
  to authenticated
  using (has_org_role(organization_id, array['owner', 'admin', 'manager']));

-- ---------------------------------------------------------------------
-- services — same matrix as doctors
-- ---------------------------------------------------------------------
create policy "members can view services"
  on services for select
  to authenticated
  using (is_org_member(organization_id));

create policy "owner, admin or manager can add services"
  on services for insert
  to authenticated
  with check (has_org_role(organization_id, array['owner', 'admin', 'manager']));

create policy "owner, admin or manager can update services"
  on services for update
  to authenticated
  using (has_org_role(organization_id, array['owner', 'admin', 'manager']))
  with check (has_org_role(organization_id, array['owner', 'admin', 'manager']));

create policy "owner, admin or manager can remove services"
  on services for delete
  to authenticated
  using (has_org_role(organization_id, array['owner', 'admin', 'manager']));
