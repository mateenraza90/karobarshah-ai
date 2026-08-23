-- Milestone 1 completion: business memory, resource archive flags, and invite lifecycle.
-- This migration is additive; the original M0/M1 migrations remain unchanged.

create table business_memory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('hours', 'service', 'faq', 'policy')),
  title text,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_memory_items_organization_id_idx on business_memory_items (organization_id);
create index business_memory_items_organization_type_idx on business_memory_items (organization_id, type);

alter table business_memory_items enable row level security;

create policy "members can view business memory"
  on business_memory_items for select to authenticated
  using (is_org_member(organization_id));

create policy "owner admin or manager can create business memory"
  on business_memory_items for insert to authenticated
  with check (has_org_role(organization_id, array['owner', 'admin', 'manager']));

create policy "owner admin or manager can update business memory"
  on business_memory_items for update to authenticated
  using (has_org_role(organization_id, array['owner', 'admin', 'manager']))
  with check (has_org_role(organization_id, array['owner', 'admin', 'manager']));

create policy "owner admin or manager can delete business memory"
  on business_memory_items for delete to authenticated
  using (has_org_role(organization_id, array['owner', 'admin', 'manager']));

create trigger business_memory_items_set_updated_at
  before update on business_memory_items
  for each row execute function set_updated_at();

alter table doctors add column is_active boolean not null default true;
alter table services add column is_active boolean not null default true;

create or replace function create_organization_for_current_user(
  organization_name text,
  organization_email text,
  organization_phone text,
  organization_address text,
  organization_country text,
  organization_timezone text,
  organization_currency text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from memberships where user_id = auth.uid()) then raise exception 'User already belongs to an organization'; end if;
  if char_length(trim(organization_name)) < 2 then raise exception 'Invalid organization name'; end if;

  insert into organizations(name, email, phone, address, country, timezone, currency, industry_type)
  values (trim(organization_name), nullif(trim(organization_email), ''), nullif(trim(organization_phone), ''), nullif(trim(organization_address), ''), nullif(trim(organization_country), ''), trim(organization_timezone), upper(trim(organization_currency)), 'clinic')
  returning id into new_org_id;

  insert into memberships(organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

revoke execute on function create_organization_for_current_user(text,text,text,text,text,text,text) from public;
grant execute on function create_organization_for_current_user(text,text,text,text,text,text,text) to authenticated;

-- Existing pending_invites rows are intentionally still the invitation source of truth.
-- Supabase Auth invite links authenticate the recipient; acceptance verifies that
-- authenticated email against the pending invite before creating membership.
