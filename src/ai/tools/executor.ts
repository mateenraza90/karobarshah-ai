import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { parseToolCall, type ToolName } from "@/ai/tools";
import { checkAvailability, createAppointment, updateAppointment, cancelAppointment } from "@/database/appointments";
import { sanitizeSearchQuery } from "@/lib/utils";

type Client = SupabaseClient<Database>;

const MUTATING_TOOLS = new Set<ToolName>([
  "book_appointment",
  "reschedule_appointment",
  "cancel_appointment",
]);
const MUTATION_ROLES = ["owner", "admin", "manager", "receptionist"] as const;

async function assertToolPermission(client: Client, organizationId: string, userId: string | undefined, tool: ToolName) {
  if (!userId || !MUTATING_TOOLS.has(tool)) return;
  const { data, error } = await client
    .from("memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !MUTATION_ROLES.includes(data.role as (typeof MUTATION_ROLES)[number])) {
    throw new Error("You do not have permission to use this appointment tool.");
  }
}

async function requireDoctor(client: Client, organizationId: string, doctorId: string) {
  const { data, error } = await client
    .from("doctors")
    .select("id, availability_status, is_active")
    .eq("id", doctorId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.is_active) throw new Error("Doctor is not available in this organization.");
  return data;
}

async function requireBookableResources(client: Client, organizationId: string, args: { clinicId: string; patientId: string; doctorId: string; serviceId: string }) {
  const [clinic, patient, doctor, service] = await Promise.all([
    client.from("clinics").select("id").eq("id", args.clinicId).eq("organization_id", organizationId).maybeSingle(),
    client.from("patients").select("id, is_active").eq("id", args.patientId).eq("organization_id", organizationId).maybeSingle(),
    client.from("doctors").select("id, is_active, availability_status").eq("id", args.doctorId).eq("organization_id", organizationId).maybeSingle(),
    client.from("services").select("id, is_active").eq("id", args.serviceId).eq("organization_id", organizationId).maybeSingle(),
  ]);
  for (const result of [clinic, patient, doctor, service]) if (result.error) throw result.error;
  if (!clinic.data) throw new Error("Clinic is not in this organization.");
  if (!patient.data?.is_active) throw new Error("Patient is not active in this organization.");
  if (!doctor.data?.is_active || doctor.data.availability_status !== "available") throw new Error("Doctor is not available in this organization.");
  if (!service.data?.is_active) throw new Error("Service is not active in this organization.");
}

export async function executeTool(
  client: Client,
  organizationId: string,
  userId: string | undefined,
  name: string,
  rawArgs: unknown,
) {
  const tool = name as ToolName;
  const args = parseToolCall(name, rawArgs) as Record<string, unknown>;
  await assertToolPermission(client, organizationId, userId, tool);

  switch (tool) {
    case "find_doctor": {
      const specialization = args.specialization as string | undefined;
      let q = client.from("doctors").select("id,name,specialization,availability_status").eq("organization_id", organizationId).eq("is_active", true);
      if (specialization) q = q.ilike("specialization", `%${sanitizeSearchQuery(specialization)}%`);
      const { data, error } = await q.limit(10);
      if (error) throw error;
      return data ?? [];
    }
    case "get_services": {
      const activeOnly = args.activeOnly as boolean | undefined;
      let q = client.from("services").select("id,name,description,price,duration_minutes,is_active").eq("organization_id", organizationId);
      if (activeOnly !== false) q = q.eq("is_active", true);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data ?? [];
    }
    case "get_business_hours": {
      const { data, error } = await client.from("clinics").select("working_hours,default_appointment_duration_minutes").eq("organization_id", organizationId).maybeSingle();
      if (error) throw error;
      return data ?? {};
    }
    case "search_faq": {
      const q = sanitizeSearchQuery(args.query as string);
      if (!q) return { memory: [], faqs: [] };
      const [memory, faqs] = await Promise.all([
        client.from("business_memory_items").select("type,title,content").eq("organization_id", organizationId).or(`title.ilike.%${q}%,content.ilike.%${q}%`).limit(10),
        client.from("faqs").select("question,answer").eq("organization_id", organizationId).eq("is_active", true).or(`question.ilike.%${q}%,answer.ilike.%${q}%`).limit(10),
      ]);
      if (memory.error) throw memory.error;
      if (faqs.error) throw faqs.error;
      return { memory: memory.data ?? [], faqs: faqs.data ?? [] };
    }
    case "check_availability": {
      await requireDoctor(client, organizationId, args.doctorId as string);
      const result = await checkAvailability(client, organizationId, args.doctorId as string, args.startAt as string, args.endAt as string, args.excludeAppointmentId as string | undefined);
      if (result.error) throw result.error;
      return { available: result.available };
    }
    case "book_appointment": {
      const booking = {
        clinicId: args.clinicId as string,
        patientId: args.patientId as string,
        doctorId: args.doctorId as string,
        serviceId: args.serviceId as string,
      };
      await requireBookableResources(client, organizationId, booking);
      const av = await checkAvailability(client, organizationId, booking.doctorId, args.startAt as string, args.endAt as string);
      if (av.error) throw av.error;
      if (!av.available) throw new Error("Requested slot is not available.");
      const { data, error } = await createAppointment(client, {
        organization_id: organizationId,
        clinic_id: booking.clinicId,
        patient_id: booking.patientId,
        doctor_id: booking.doctorId,
        service_id: booking.serviceId,
        start_at: args.startAt as string,
        end_at: args.endAt as string,
        notes: (args.notes as string | undefined) ?? null,
        created_by: userId ?? null,
      });
      if (error) throw error;
      return { appointmentId: data.id, status: data.status, startAt: data.start_at, endAt: data.end_at };
    }
    case "reschedule_appointment": {
      const appointmentId = args.appointmentId as string;
      const doctorId = args.doctorId as string;
      const { data: current, error: currentError } = await client
        .from("appointments")
        .select("id")
        .eq("id", appointmentId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!current) throw new Error("Appointment not found.");
      await requireDoctor(client, organizationId, doctorId);
      const av = await checkAvailability(client, organizationId, doctorId, args.startAt as string, args.endAt as string, appointmentId);
      if (av.error) throw av.error;
      if (!av.available) throw new Error("Requested slot is not available.");
      const { data, error } = await updateAppointment(client, organizationId, appointmentId, {
        doctor_id: doctorId,
        start_at: args.startAt as string,
        end_at: args.endAt as string,
      });
      if (error) throw error;
      return { appointmentId: data.id, status: data.status, startAt: data.start_at, endAt: data.end_at };
    }
    case "cancel_appointment": {
      const { data, error } = await cancelAppointment(client, organizationId, args.appointmentId as string);
      if (error) throw error;
      return { appointmentId: data.id, status: data.status };
    }
  }
}
