/**
 * Hand-written in the same shape the Supabase CLI's codegen produces
 * (`supabase gen types typescript`). Once a real project is linked, run:
 *
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 *
 * to replace this with the live-verified version — nothing else in the
 * codebase needs to change, since call sites only ever import `Database`.
 *
 * Each table's Row/Insert/Update is defined as a standalone type first,
 * deliberately not referenced via `Database["public"]["Tables"][...]`
 * from within the Database type itself — that circular self-reference
 * pattern breaks Supabase's own conditional-type inference (insert/update
 * calls silently resolve to `never`) even though it looks harmless.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type OrganizationsRow = {
  id: string;
  name: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  industry_type: string;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};
type OrganizationsInsert = {
  id?: string;
  name: string;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  timezone?: string;
  currency?: string;
  industry_type?: string;
  onboarding_completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
type OrganizationsUpdate = Partial<OrganizationsInsert>;

type MembershipsRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "receptionist";
  created_at: string;
};
type MembershipsInsert = {
  id?: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "receptionist";
  created_at?: string;
};
type MembershipsUpdate = Partial<MembershipsInsert>;

type ClinicsRow = {
  id: string;
  organization_id: string;
  working_hours: Json;
  default_appointment_duration_minutes: number;
  notification_preferences: Json;
  created_at: string;
  updated_at: string;
};
type ClinicsInsert = {
  id?: string;
  organization_id: string;
  working_hours?: Json;
  default_appointment_duration_minutes?: number;
  notification_preferences?: Json;
  created_at?: string;
  updated_at?: string;
};
type ClinicsUpdate = Partial<ClinicsInsert>;

type DoctorsRow = {
  id: string;
  organization_id: string;
  name: string;
  specialization: string | null;
  email: string | null;
  phone: string | null;
  availability_status: "available" | "unavailable";
  working_hours: Json;
  appointment_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type DoctorsInsert = {
  id?: string;
  organization_id: string;
  name: string;
  specialization?: string | null;
  email?: string | null;
  phone?: string | null;
  availability_status?: "available" | "unavailable";
  working_hours?: Json;
  appointment_duration_minutes?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
type DoctorsUpdate = Partial<DoctorsInsert>;

type ServicesRow = {
  id: string;
  organization_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type ServicesInsert = {
  id?: string;
  organization_id: string;
  name: string;
  price?: number;
  duration_minutes?: number;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
type ServicesUpdate = Partial<ServicesInsert>;


type BusinessMemoryRow = {
  id: string;
  organization_id: string;
  type: "hours" | "service" | "faq" | "policy";
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  embedding: number[] | null;
};
type BusinessMemoryItemInsert = {
  id?: string;
  organization_id: string;
  type: BusinessMemoryRow["type"];
  title?: string | null;
  content: string;
  created_at?: string;
  updated_at?: string;
  embedding?: number[] | null;
};
type BusinessMemoryItemUpdate = Partial<BusinessMemoryItemInsert>;

type PendingInvitesRow = {
  id: string; organization_id: string; email: string; role: "admin" | "manager" | "receptionist"; invited_by: string; created_at: string; token_hash: string | null; expires_at: string;
};
type PendingInvitesInsert = {
  id?: string;
  organization_id: string;
  email: string;
  role: "admin" | "manager" | "receptionist";
  invited_by: string;
  created_at?: string;
  token_hash?: string | null;
  expires_at?: string;
};
type PendingInvitesUpdate = Partial<PendingInvitesInsert>;



type PatientRow = { id: string; organization_id: string; full_name: string; phone: string | null; email: string | null; date_of_birth: string | null; admin_notes: string | null; tags: string[]; is_active: boolean; created_at: string; updated_at: string };
type PatientInsert = { id?: string; organization_id: string; full_name: string; phone?: string | null; email?: string | null; date_of_birth?: string | null; admin_notes?: string | null; tags?: string[]; is_active?: boolean; created_at?: string; updated_at?: string };
type PatientUpdate = Partial<PatientInsert>;
type AppointmentRow = { id: string; organization_id: string; clinic_id: string; patient_id: string; doctor_id: string; service_id: string; start_at: string; end_at: string; status: 'scheduled'|'confirmed'|'completed'|'cancelled'|'no_show'; notes: string | null; created_by: string | null; created_at: string; updated_at: string };
type AppointmentInsert = { id?: string; organization_id: string; clinic_id: string; patient_id: string; doctor_id: string; service_id: string; start_at: string; end_at: string; status?: AppointmentRow['status']; notes?: string | null; created_by?: string | null; created_at?: string; updated_at?: string };
type AppointmentUpdate = Partial<AppointmentInsert>;
type ConversationRow = { id: string; organization_id: string; patient_id: string | null; channel: 'whatsapp'|'web_chat'|'voice'; external_contact_key: string | null; status: 'open'|'closed'|'handoff'; last_message_at: string | null; created_at: string; updated_at: string };
type ConversationInsert = { id?: string; organization_id: string; patient_id?: string | null; channel: ConversationRow['channel']; external_contact_key?: string | null; status?: ConversationRow['status']; last_message_at?: string | null; created_at?: string; updated_at?: string };
type ConversationUpdate = Partial<ConversationInsert>;
type MessageRow = { id: string; organization_id: string; conversation_id: string; patient_id: string | null; sender_type: 'human'|'ai'|'system'; direction: 'inbound'|'outbound'; content: string; provider_message_id: string | null; delivery_status: 'pending'|'sent'|'delivered'|'failed'|'received'; metadata: Json; created_at: string };
type MessageInsert = { id?: string; organization_id: string; conversation_id: string; patient_id?: string | null; sender_type: MessageRow['sender_type']; direction: MessageRow['direction']; content: string; provider_message_id?: string | null; delivery_status?: MessageRow['delivery_status']; metadata?: Json; created_at?: string };
type FAQRow = { id: string; organization_id: string; question: string; answer: string; is_active: boolean; created_at: string; updated_at: string };
type FAQInsert = { id?: string; organization_id: string; question: string; answer: string; is_active?: boolean; created_at?: string; updated_at?: string };
type FAQUpdate = Partial<FAQInsert>;
type AIInteractionLogRow = { id: string; organization_id: string; user_id: string | null; conversation_id: string | null; provider: string; model: string | null; success: boolean; latency_ms: number | null; input_tokens: number | null; output_tokens: number | null; tool_calls: Json; error_code: string | null; created_at: string };
type AIInteractionLogInsert = Omit<AIInteractionLogRow, 'id'|'created_at'> & { id?: string; created_at?: string };
type WhatsAppConnectionRow = { id: string; organization_id: string; phone_number_id: string; display_phone_number: string | null; business_account_id: string | null; access_token_ciphertext: string; access_token_iv: string; access_token_tag: string; is_active: boolean; created_at: string; updated_at: string };
type WhatsAppConnectionInsert = Omit<WhatsAppConnectionRow, 'id'|'created_at'|'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
type WhatsAppConnectionUpdate = Partial<WhatsAppConnectionInsert>;

export type Database = {
  public: {
    Tables: {
      organizations: { Row: OrganizationsRow; Insert: OrganizationsInsert; Update: OrganizationsUpdate; Relationships: [] };
      memberships: {
        Row: MembershipsRow;
        Insert: MembershipsInsert;
        Update: MembershipsUpdate;
        Relationships: [
          {
            foreignKeyName: 'memberships_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      clinics: {
        Row: ClinicsRow;
        Insert: ClinicsInsert;
        Update: ClinicsUpdate;
        Relationships: [
          {
            foreignKeyName: 'clinics_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: true;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      doctors: {
        Row: DoctorsRow;
        Insert: DoctorsInsert;
        Update: DoctorsUpdate;
        Relationships: [
          {
            foreignKeyName: 'doctors_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      services: {
        Row: ServicesRow;
        Insert: ServicesInsert;
        Update: ServicesUpdate;
        Relationships: [
          {
            foreignKeyName: 'services_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      business_memory_items: { Row: BusinessMemoryRow; Insert: BusinessMemoryItemInsert; Update: BusinessMemoryItemUpdate; Relationships: [{ foreignKeyName: 'business_memory_items_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id']; }]; },
      pending_invites: {
        Row: PendingInvitesRow;
        Insert: PendingInvitesInsert;
        Update: PendingInvitesUpdate;
        Relationships: [
          {
            foreignKeyName: 'pending_invites_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      patients: { Row: PatientRow; Insert: PatientInsert; Update: PatientUpdate; Relationships: [{ foreignKeyName: 'patients_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] }] };
      appointments: { Row: AppointmentRow; Insert: AppointmentInsert; Update: AppointmentUpdate; Relationships: [] };
      conversations: { Row: ConversationRow; Insert: ConversationInsert; Update: ConversationUpdate; Relationships: [] };
      messages: { Row: MessageRow; Insert: MessageInsert; Update: Partial<MessageInsert>; Relationships: [] };
      calendar_sync_queue: { Row: { id: string; organization_id: string; appointment_id: string|null; operation: 'upsert'|'delete'; status: 'pending'|'processing'|'completed'|'failed'; attempts: number; last_error: string|null; created_at: string; processed_at: string|null }; Insert: { id?: string; organization_id: string; appointment_id?: string|null; operation: 'upsert'|'delete'; status?: 'pending'|'processing'|'completed'|'failed'; attempts?: number; last_error?: string|null; created_at?: string; processed_at?: string|null }; Update: Partial<{ id: string; organization_id: string; appointment_id: string|null; operation: 'upsert'|'delete'; status: 'pending'|'processing'|'completed'|'failed'; attempts: number; last_error: string|null; created_at: string; processed_at: string|null }>; Relationships: [] };
      faqs: { Row: FAQRow; Insert: FAQInsert; Update: FAQUpdate; Relationships: [] };
      ai_interaction_logs: { Row: AIInteractionLogRow; Insert: AIInteractionLogInsert; Update: Partial<AIInteractionLogInsert>; Relationships: [] };
      ai_employee_instances: { Row: { id:string; organization_id:string; employee_type:"receptionist"; status:"active"|"inactive"; config:Json; created_at:string; updated_at:string }; Insert: { id?:string; organization_id:string; employee_type?:"receptionist"; status?:"active"|"inactive"; config?:Json; created_at?:string; updated_at?:string }; Update: Partial<{ id:string; organization_id:string; employee_type:"receptionist"; status:"active"|"inactive"; config:Json; created_at:string; updated_at:string }>; Relationships: [] };
      ai_org_rate_limits: { Row: { organization_id: string; window_started_at: string; request_count: number }; Insert: { organization_id: string; window_started_at: string; request_count?: number }; Update: Partial<{ organization_id: string; window_started_at: string; request_count: number }>; Relationships: [] };
      ai_rate_limits: { Row: { organization_id: string; user_id: string|null; window_started_at: string; request_count: number }; Insert: { organization_id: string; user_id?: string|null; window_started_at: string; request_count?: number }; Update: Partial<{ organization_id: string; user_id: string|null; window_started_at: string; request_count: number }>; Relationships: [] };
      whatsapp_connections: { Row: WhatsAppConnectionRow; Insert: WhatsAppConnectionInsert; Update: WhatsAppConnectionUpdate; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: { Args: { target_org_id: string }; Returns: boolean };
      has_org_role: { Args: { target_org_id: string; allowed_roles: string[] }; Returns: boolean };
      org_has_any_members: { Args: { target_org_id: string }; Returns: boolean };
      create_organization_for_current_user: { Args: { organization_name: string; organization_email: string; organization_phone: string; organization_address: string; organization_country: string; organization_timezone: string; organization_currency: string }; Returns: string };
      consume_ai_org_rate_limit_service: { Args: { target_org_id: string; window_seconds?: number; max_requests?: number }; Returns: boolean };
      consume_ai_org_rate_limit: { Args: { target_org_id: string; window_seconds?: number; max_requests?: number }; Returns: boolean };
      consume_ai_rate_limit: { Args: { target_org_id: string; target_user_id: string; window_seconds?: number; max_requests?: number }; Returns: boolean };
      accept_pending_invite: { Args: { target_token_hash: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type OrganizationRow = OrganizationsRow;
export type MembershipRow = MembershipsRow;
export type ClinicRow = ClinicsRow;
export type DoctorRow = DoctorsRow;
export type ServiceRow = ServicesRow;
export type BusinessMemoryItemRow = BusinessMemoryRow;
export type OrgRole = MembershipsRow["role"];

export type Patient = PatientRow;
export type Appointment = AppointmentRow;
export type Conversation = ConversationRow;
export type Message = MessageRow;
export type FAQ = FAQRow;
export type AIInteractionLog = AIInteractionLogRow;
export type WhatsAppConnection = WhatsAppConnectionRow;
