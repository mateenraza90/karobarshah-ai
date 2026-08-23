-- KarobarShah AI core MVP: patients, appointments, conversations, WhatsApp and AI runtime.
-- Additive migration; prior M0/M1 migrations remain unchanged.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Patient/contact records
-- ---------------------------------------------------------------------
create table patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  phone text,
  email text,
  date_of_birth date,
  admin_notes text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patients_organization_id_idx on patients (organization_id);
create index patients_org_phone_idx on patients (organization_id, phone) where phone is not null;
create index patients_org_name_idx on patients (organization_id, full_name);
create trigger patients_set_updated_at before update on patients for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Appointments / booking integrity
-- ---------------------------------------------------------------------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete restrict,
  doctor_id uuid not null references doctors(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (end_at - start_at <= interval '24 hours')
);
create index appointments_org_start_idx on appointments (organization_id, start_at);
create index appointments_doctor_start_idx on appointments (doctor_id, start_at);
create index appointments_patient_start_idx on appointments (patient_id, start_at);
create index appointments_clinic_start_idx on appointments (clinic_id, start_at);
create trigger appointments_set_updated_at before update on appointments for each row execute function set_updated_at();

alter table appointments
  add constraint appointments_doctor_no_overlap
  exclude using gist (
    doctor_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show'));

alter table appointments
  add constraint appointments_patient_no_overlap
  exclude using gist (
    patient_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show'));

-- ---------------------------------------------------------------------
-- Conversations/messages. external_contact_key is the stable channel
-- identity used for webhook find-or-create and is organization-scoped.
-- ---------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  channel text not null check (channel in ('whatsapp','web_chat','voice')),
  external_contact_key text,
  status text not null default 'open' check (status in ('open','closed','handoff')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel, external_contact_key)
);
create index conversations_org_last_message_idx on conversations (organization_id, last_message_at desc);
create index conversations_patient_idx on conversations (patient_id);
create trigger conversations_set_updated_at before update on conversations for each row execute function set_updated_at();

create table messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  sender_type text not null check (sender_type in ('human','ai','system')),
  direction text not null check (direction in ('inbound','outbound')),
  content text not null check (char_length(content) <= 20000),
  provider_message_id text,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sent','delivered','failed','received')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (organization_id, provider_message_id)
);
create index messages_conversation_created_idx on messages (conversation_id, created_at);
create index messages_org_created_idx on messages (organization_id, created_at desc);

-- ---------------------------------------------------------------------
-- Calendar sync queue; future calendar adapters consume this queue.
-- ---------------------------------------------------------------------
create table calendar_sync_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  operation text not null check (operation in ('upsert','delete')),
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index calendar_sync_queue_pending_idx on calendar_sync_queue (status, created_at) where status in ('pending','failed');

-- ---------------------------------------------------------------------
-- FAQ aliases business memory with explicit FAQ table for the core spec.
-- ---------------------------------------------------------------------
create table faqs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  question text not null check (char_length(trim(question)) >= 2),
  answer text not null check (char_length(trim(answer)) >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_org_idx on faqs (organization_id);
create trigger faqs_set_updated_at before update on faqs for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- AI interaction audit + database-backed rate limiting
-- ---------------------------------------------------------------------
create table ai_interaction_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  provider text not null,
  model text,
  success boolean not null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  tool_calls jsonb not null default '[]',
  error_code text,
  created_at timestamptz not null default now()
);
create index ai_logs_org_created_idx on ai_interaction_logs (organization_id, created_at desc);

create table ai_rate_limits (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (organization_id, user_id, window_started_at)
);
create index ai_rate_limits_org_window_idx on ai_rate_limits (organization_id, window_started_at);

-- ---------------------------------------------------------------------
-- WhatsApp connection. Credentials are ciphertext produced by server-side
-- application encryption; plaintext access tokens never reach clients.
-- ---------------------------------------------------------------------
create table whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  phone_number_id text not null unique,
  display_phone_number text,
  business_account_id text,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  access_token_tag text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index whatsapp_connections_phone_idx on whatsapp_connections (phone_number_id);
create trigger whatsapp_connections_set_updated_at before update on whatsapp_connections for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Tenant integrity: child organization_id must match trusted parent.
-- ---------------------------------------------------------------------
create or replace function enforce_appointment_tenant_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from clinics c where c.id = new.clinic_id and c.organization_id = new.organization_id) then
    raise exception 'clinic does not belong to appointment organization';
  end if;
  if not exists (select 1 from patients p where p.id = new.patient_id and p.organization_id = new.organization_id) then
    raise exception 'patient does not belong to appointment organization';
  end if;
  if not exists (select 1 from doctors d where d.id = new.doctor_id and d.organization_id = new.organization_id) then
    raise exception 'doctor does not belong to appointment organization';
  end if;
  if not exists (select 1 from services s where s.id = new.service_id and s.organization_id = new.organization_id) then
    raise exception 'service does not belong to appointment organization';
  end if;
  return new;
end;
$$;
create trigger appointments_tenant_integrity before insert or update on appointments for each row execute function enforce_appointment_tenant_integrity();

create or replace function enforce_conversation_tenant_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.patient_id is not null and not exists (select 1 from patients p where p.id = new.patient_id and p.organization_id = new.organization_id) then
    raise exception 'patient does not belong to conversation organization';
  end if;
  return new;
end;
$$;
create trigger conversations_tenant_integrity before insert or update on conversations for each row execute function enforce_conversation_tenant_integrity();

create or replace function enforce_message_tenant_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
declare conversation_org uuid;
begin
  select organization_id into conversation_org from conversations where id = new.conversation_id;
  if conversation_org is null or conversation_org <> new.organization_id then raise exception 'conversation does not belong to message organization'; end if;
  if new.patient_id is not null and not exists (select 1 from patients p where p.id = new.patient_id and p.organization_id = new.organization_id) then raise exception 'patient does not belong to message organization'; end if;
  return new;
end;
$$;
create trigger messages_tenant_integrity before insert or update on messages for each row execute function enforce_message_tenant_integrity();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table patients enable row level security;
alter table appointments enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table calendar_sync_queue enable row level security;
alter table faqs enable row level security;
alter table ai_interaction_logs enable row level security;
alter table ai_rate_limits enable row level security;
alter table whatsapp_connections enable row level security;

create policy "members can view patients" on patients for select to authenticated using (is_org_member(organization_id));
create policy "managers can create patients" on patients for insert to authenticated with check (has_org_role(organization_id, array['owner','admin','manager','receptionist']));
create policy "managers can update patients" on patients for update to authenticated using (has_org_role(organization_id, array['owner','admin','manager','receptionist'])) with check (has_org_role(organization_id, array['owner','admin','manager','receptionist']));
create policy "managers can delete patients" on patients for delete to authenticated using (has_org_role(organization_id, array['owner','admin','manager']));

create policy "members can view appointments" on appointments for select to authenticated using (is_org_member(organization_id));
create policy "authorized members can create appointments" on appointments for insert to authenticated with check (has_org_role(organization_id, array['owner','admin','manager','receptionist']));
create policy "authorized members can update appointments" on appointments for update to authenticated using (has_org_role(organization_id, array['owner','admin','manager','receptionist'])) with check (has_org_role(organization_id, array['owner','admin','manager','receptionist']));
create policy "managers can delete appointments" on appointments for delete to authenticated using (has_org_role(organization_id, array['owner','admin','manager']));

create policy "members can view conversations" on conversations for select to authenticated using (is_org_member(organization_id));
create policy "members can create conversations" on conversations for insert to authenticated with check (has_org_role(organization_id, array['owner','admin','manager','receptionist']));
create policy "members can update conversations" on conversations for update to authenticated using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "members can view messages" on messages for select to authenticated using (is_org_member(organization_id));
create policy "members can create messages" on messages for insert to authenticated with check (has_org_role(organization_id, array['owner','admin','manager','receptionist']));

create policy "members can view calendar queue" on calendar_sync_queue for select to authenticated using (is_org_member(organization_id));
create policy "authorized members can enqueue calendar work" on calendar_sync_queue for insert to authenticated with check (has_org_role(organization_id, array['owner','admin','manager']));

create policy "members can view faqs" on faqs for select to authenticated using (is_org_member(organization_id));
create policy "managers can create faqs" on faqs for insert to authenticated with check (has_org_role(organization_id, array['owner','admin','manager']));
create policy "managers can update faqs" on faqs for update to authenticated using (has_org_role(organization_id, array['owner','admin','manager'])) with check (has_org_role(organization_id, array['owner','admin','manager']));
create policy "managers can delete faqs" on faqs for delete to authenticated using (has_org_role(organization_id, array['owner','admin','manager']));

create policy "members can view ai logs" on ai_interaction_logs for select to authenticated using (has_org_role(organization_id, array['owner','admin','manager']));
create policy "server can insert ai logs" on ai_interaction_logs for insert to authenticated with check (is_org_member(organization_id));
create policy "members can view rate limits" on ai_rate_limits for select to authenticated using (has_org_role(organization_id, array['owner','admin','manager']));

create policy "managers can view whatsapp connection metadata" on whatsapp_connections for select to authenticated using (has_org_role(organization_id, array['owner','admin','manager']));
create policy "owners can manage whatsapp connections" on whatsapp_connections for insert to authenticated with check (has_org_role(organization_id, array['owner','admin']));
create policy "owners can update whatsapp connections" on whatsapp_connections for update to authenticated using (has_org_role(organization_id, array['owner','admin'])) with check (has_org_role(organization_id, array['owner','admin']));
create policy "owners can delete whatsapp connections" on whatsapp_connections for delete to authenticated using (has_org_role(organization_id, array['owner','admin']));

-- Server-side helper for atomic rate limiting. The caller must already be
-- authenticated and membership is checked by the function.
create or replace function consume_ai_rate_limit(
  target_org_id uuid,
  target_user_id uuid,
  window_seconds integer default 60,
  max_requests integer default 20
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  bucket timestamptz;
  current_count integer;
begin
  if auth.uid() is null or auth.uid() <> target_user_id or not is_org_member(target_org_id) then
    raise exception 'Unauthorized rate limit context';
  end if;
  bucket := to_timestamp(floor(extract(epoch from now()) / greatest(window_seconds,1)) * greatest(window_seconds,1));
  insert into ai_rate_limits(organization_id,user_id,window_started_at,request_count)
  values(target_org_id,target_user_id,bucket,1)
  on conflict (organization_id,user_id,window_started_at)
  do update set request_count = ai_rate_limits.request_count + 1
  returning request_count into current_count;
  return current_count <= greatest(max_requests,1);
end;
$$;
revoke execute on function consume_ai_rate_limit(uuid,uuid,integer,integer) from public;
grant execute on function consume_ai_rate_limit(uuid,uuid,integer,integer) to authenticated;

create table ai_org_rate_limits (
  organization_id uuid not null references organizations(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (organization_id, window_started_at)
);
create index ai_org_rate_limits_window_idx on ai_org_rate_limits (organization_id, window_started_at);
alter table ai_org_rate_limits enable row level security;
create policy "managers can view org rate limits" on ai_org_rate_limits for select to authenticated using (has_org_role(organization_id, array['owner','admin','manager']));
create or replace function consume_ai_org_rate_limit(target_org_id uuid, window_seconds integer default 60, max_requests integer default 20) returns boolean language plpgsql security definer set search_path=public as $$
declare bucket timestamptz; current_count integer;
begin
  if auth.uid() is null or not is_org_member(target_org_id) then raise exception 'Unauthorized rate limit context'; end if;
  bucket := to_timestamp(floor(extract(epoch from now()) / greatest(window_seconds,1)) * greatest(window_seconds,1));
  insert into ai_org_rate_limits(organization_id,window_started_at,request_count) values(target_org_id,bucket,1)
  on conflict (organization_id,window_started_at) do update set request_count=ai_org_rate_limits.request_count+1
  returning request_count into current_count;
  return current_count <= greatest(max_requests,1);
end; $$;
revoke execute on function consume_ai_org_rate_limit(uuid,integer,integer) from public;
grant execute on function consume_ai_org_rate_limit(uuid,integer,integer) to authenticated;
create or replace function consume_ai_org_rate_limit_service(target_org_id uuid, window_seconds integer default 60, max_requests integer default 20) returns boolean language plpgsql security definer set search_path=public as $$
declare bucket timestamptz; current_count integer;
begin
  bucket := to_timestamp(floor(extract(epoch from now()) / greatest(window_seconds,1)) * greatest(window_seconds,1));
  insert into ai_org_rate_limits(organization_id,window_started_at,request_count) values(target_org_id,bucket,1)
  on conflict (organization_id,window_started_at) do update set request_count=ai_org_rate_limits.request_count+1
  returning request_count into current_count;
  return current_count <= greatest(max_requests,1);
end; $$;
revoke execute on function consume_ai_org_rate_limit_service(uuid,integer,integer) from public;
grant execute on function consume_ai_org_rate_limit_service(uuid,integer,integer) to service_role;

alter table pending_invites add column token_hash text;
alter table pending_invites add column expires_at timestamptz not null default (now() + interval '7 days');
create unique index pending_invites_token_hash_idx on pending_invites(token_hash) where token_hash is not null;
create index pending_invites_expires_at_idx on pending_invites(expires_at);

-- Optional semantic retrieval support for Supabase deployments. Core management
-- remains usable without an embedding provider; lexical retrieval is the fallback.
create extension if not exists vector;
alter table business_memory_items add column if not exists embedding vector(1536);
create index if not exists business_memory_items_embedding_idx on business_memory_items using hnsw (embedding vector_cosine_ops) where embedding is not null;

create table ai_employee_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_type text not null check (employee_type in ('receptionist')),
  status text not null default 'inactive' check (status in ('active','inactive')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_type)
);
create index ai_employee_instances_org_idx on ai_employee_instances(organization_id);
create trigger ai_employee_instances_set_updated_at before update on ai_employee_instances for each row execute function set_updated_at();
alter table ai_employee_instances enable row level security;
create policy "members can view ai employee instances" on ai_employee_instances for select to authenticated using (is_org_member(organization_id));
create policy "managers can create ai employee instances" on ai_employee_instances for insert to authenticated with check (has_org_role(organization_id, array['owner','admin','manager']));
create policy "managers can update ai employee instances" on ai_employee_instances for update to authenticated using (has_org_role(organization_id, array['owner','admin','manager'])) with check (has_org_role(organization_id, array['owner','admin','manager']));
create unique index patients_org_phone_unique_idx on patients (organization_id, phone) where phone is not null;
