-- Milestone 1: Business Foundation — schema
--
-- Multi-tenant core:
--   organizations  — the tenant root (one row per business)
--   memberships    — join table: which users belong to which organization, with what role
--
-- Clinic vertical (MVP industry — see docs/ARCHITECTURE.md §7):
--   clinics   — one clinic-specific settings profile per organization (1:1)
--   doctors   — clinic staff who see patients
--   services  — bookable service types the clinic offers
--
-- Deliberately NOT included here (out of Milestone 1 scope): appointments,
-- contacts/patients, industry_templates. `organizations.industry_type`
-- exists now purely so tenant rows already carry the field the Milestone
-- 10 multi-industry work will key off — no template engine is built yet.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
create table organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (char_length(trim(name)) > 0),
  logo_url               text,
  email                  text,
  phone                  text,
  address                text,
  country                text,
  timezone               text not null default 'Asia/Karachi',
  currency               text not null default 'PKR',
  industry_type          text not null default 'clinic',
  onboarding_completed_at timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table organizations is 'Tenant root. One row per business. Every other business table hangs off this via organization_id.';
comment on column organizations.industry_type is 'Reserved for the future multi-industry template system (see docs/ARCHITECTURE.md, Milestone 10). Only ''clinic'' is meaningful today.';

-- ---------------------------------------------------------------------
-- memberships — which users belong to which organization, with what role
-- ---------------------------------------------------------------------
create table memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('owner', 'admin', 'manager', 'receptionist')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table memberships is 'Tenant membership + role for a user. A user may belong to more than one organization.';

create index memberships_organization_id_idx on memberships (organization_id);
create index memberships_user_id_idx on memberships (user_id);

-- ---------------------------------------------------------------------
-- clinics — 1:1 clinic-specific settings profile for an organization
-- ---------------------------------------------------------------------
create table clinics (
  id                                  uuid primary key default gen_random_uuid(),
  organization_id                     uuid not null unique references organizations(id) on delete cascade,
  working_hours                       jsonb not null default '{}'::jsonb,
  default_appointment_duration_minutes integer not null default 30 check (default_appointment_duration_minutes > 0),
  notification_preferences            jsonb not null default '{"email_enabled": true, "sms_enabled": false, "whatsapp_enabled": false}'::jsonb,
  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now()
);

comment on table clinics is 'One row per organization whose industry_type is clinic. Holds clinic-specific settings that don''t belong on the generic organizations row.';
comment on column clinics.working_hours is 'Per-weekday schedule, e.g. {"mon": {"open": "09:00", "close": "17:00", "closed": false}, ...}. Shape validated at the application layer (Zod), not the database.';

create index clinics_organization_id_idx on clinics (organization_id);

-- ---------------------------------------------------------------------
-- doctors
-- ---------------------------------------------------------------------
create table doctors (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references organizations(id) on delete cascade,
  name                      text not null check (char_length(trim(name)) > 0),
  specialization            text,
  email                     text,
  phone                     text,
  availability_status       text not null default 'available' check (availability_status in ('available', 'unavailable')),
  working_hours             jsonb not null default '{}'::jsonb,
  appointment_duration_minutes integer not null default 30 check (appointment_duration_minutes > 0),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on column doctors.availability_status is 'Coarse on/off switch (e.g. on leave). working_hours carries the actual schedule.';

create index doctors_organization_id_idx on doctors (organization_id);

-- ---------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------
create table services (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null check (char_length(trim(name)) > 0),
  price           numeric(10, 2) not null default 0 check (price >= 0),
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index services_organization_id_idx on services (organization_id);

-- ---------------------------------------------------------------------
-- updated_at trigger — shared across every table above that has the column
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

create trigger clinics_set_updated_at
  before update on clinics
  for each row execute function set_updated_at();

create trigger doctors_set_updated_at
  before update on doctors
  for each row execute function set_updated_at();

create trigger services_set_updated_at
  before update on services
  for each row execute function set_updated_at();
