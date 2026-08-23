import { z } from "zod";

const appointmentWindow = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
}).strict().superRefine((value, ctx) => {
  if (new Date(value.endAt) <= new Date(value.startAt)) {
    ctx.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time." });
  }
});

export const toolSchemas = {
  find_doctor: z.object({ specialization: z.string().trim().max(120).optional() }).strict(),
  get_services: z.object({ activeOnly: z.boolean().optional() }).strict(),
  get_business_hours: z.object({}).strict(),
  search_faq: z.object({ query: z.string().trim().min(1).max(300) }).strict(),
  check_availability: z.object({
    doctorId: z.uuid(),
    ...appointmentWindow.shape,
    excludeAppointmentId: z.uuid().optional(),
  }).strict().superRefine((value, ctx) => {
    if (new Date(value.endAt) <= new Date(value.startAt)) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time." });
    }
  }),
  book_appointment: z.object({
    clinicId: z.uuid(),
    patientId: z.uuid(),
    doctorId: z.uuid(),
    serviceId: z.uuid(),
    ...appointmentWindow.shape,
    notes: z.string().max(2000).optional(),
  }).strict().superRefine((value, ctx) => {
    if (new Date(value.endAt) <= new Date(value.startAt)) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time." });
    }
  }),
  reschedule_appointment: z.object({
    appointmentId: z.uuid(),
    doctorId: z.uuid(),
    ...appointmentWindow.shape,
  }).strict().superRefine((value, ctx) => {
    if (new Date(value.endAt) <= new Date(value.startAt)) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time." });
    }
  }),
  cancel_appointment: z.object({ appointmentId: z.uuid() }).strict(),
} as const;

export type ToolName = keyof typeof toolSchemas;

export const toolDefinitions = Object.entries(toolSchemas).map(([name]) => ({
  type: "function",
  function: {
    name,
    description: `KarobarShah AI fixed tool: ${name}`,
    parameters: schemaToJson(name as ToolName),
  },
}));

function schemaToJson(name: ToolName) {
  const descriptions: Record<ToolName, unknown> = {
    find_doctor: { type: "object", properties: { specialization: { type: "string" } }, additionalProperties: false },
    get_services: { type: "object", properties: { activeOnly: { type: "boolean" } }, additionalProperties: false },
    get_business_hours: { type: "object", properties: {}, additionalProperties: false },
    search_faq: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
    check_availability: { type: "object", properties: { doctorId: { type: "string" }, startAt: { type: "string", format: "date-time" }, endAt: { type: "string", format: "date-time" }, excludeAppointmentId: { type: "string" } }, required: ["doctorId", "startAt", "endAt"], additionalProperties: false },
    book_appointment: { type: "object", properties: { clinicId: { type: "string" }, patientId: { type: "string" }, doctorId: { type: "string" }, serviceId: { type: "string" }, startAt: { type: "string", format: "date-time" }, endAt: { type: "string", format: "date-time" }, notes: { type: "string" } }, required: ["clinicId", "patientId", "doctorId", "serviceId", "startAt", "endAt"], additionalProperties: false },
    reschedule_appointment: { type: "object", properties: { appointmentId: { type: "string" }, doctorId: { type: "string" }, startAt: { type: "string", format: "date-time" }, endAt: { type: "string", format: "date-time" } }, required: ["appointmentId", "doctorId", "startAt", "endAt"], additionalProperties: false },
    cancel_appointment: { type: "object", properties: { appointmentId: { type: "string" } }, required: ["appointmentId"], additionalProperties: false },
  };
  return descriptions[name];
}

export function parseToolCall(name: string, args: unknown) {
  if (!(name in toolSchemas)) throw new Error("Unknown AI tool");
  return toolSchemas[name as ToolName].parse(args);
}
