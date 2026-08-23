-- Milestone 1, Phase 5: Team Management — pending invites
--
-- The memberships INSERT policy only allows a user to self-insert as
-- 'owner' into an organization with zero members — correct for
-- self-service signup, and it correctly blocks a user from granting
-- themselves membership anywhere else. Inviting a *second* member needs
-- a different, trusted path: an owner/admin records an invite here
-- (their own RLS-respecting insert, since they have real authority over
-- the org), and a Server Action using the service role — a trusted
-- server context, not a raw client insert — turns that into a real
-- membership row once the invited person signs in.

create table pending_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email           text not null check (email = lower(email)),
  role            text not null check (role in ('admin', 'manager', 'receptionist')),
  invited_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  unique (organization_id, email)
);

comment on table pending_invites is 'An email invited into an organization but not yet a member. Consumed (row deleted) by the auto-join check the first time that email signs in — see lib/accept-pending-invite.ts.';
comment on column pending_invites.role is 'Deliberately excludes ''owner'' — ownership is set only at organization creation, never granted via invite.';

create index pending_invites_organization_id_idx on pending_invites (organization_id);
create index pending_invites_email_idx on pending_invites (email);

alter table pending_invites enable row level security;

create policy "owner or admin can view invites for their organization"
  on pending_invites for select
  to authenticated
  using (has_org_role(organization_id, array['owner', 'admin']));

create policy "owner or admin can create invites for their organization"
  on pending_invites for insert
  to authenticated
  with check (
    has_org_role(organization_id, array['owner', 'admin'])
    and invited_by = auth.uid()
  );

create policy "owner or admin can cancel invites for their organization"
  on pending_invites for delete
  to authenticated
  using (has_org_role(organization_id, array['owner', 'admin']));
