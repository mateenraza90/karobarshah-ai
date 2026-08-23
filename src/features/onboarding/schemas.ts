import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format.");

export const BusinessStepSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name."),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  phone: z.string().trim().max(30, "Phone number is too long."),
  address: z.string().trim().max(300, "Address is too long."),
  country: z.string().trim().max(100, "Country is too long."),
  timezone: z.string().trim().min(1, "Choose a timezone."),
  currency: z.string().trim().min(3).max(3, "Use a three-letter currency code."),
});

export const ClinicStepSchema = z.object({
  defaultAppointmentDurationMinutes: z.coerce.number().int().positive().max(480),
});

export const WorkingHoursSchema = z.object({
  monClosed: z.coerce.boolean().default(false), monOpen: time, monClose: time,
  tueClosed: z.coerce.boolean().default(false), tueOpen: time, tueClose: time,
  wedClosed: z.coerce.boolean().default(false), wedOpen: time, wedClose: time,
  thuClosed: z.coerce.boolean().default(false), thuOpen: time, thuClose: time,
  friClosed: z.coerce.boolean().default(false), friOpen: time, friClose: time,
  satClosed: z.coerce.boolean().default(true), satOpen: time, satClose: time,
  sunClosed: z.coerce.boolean().default(true), sunOpen: time, sunClose: time,
}).superRefine((data, ctx) => {
  for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const) {
    if (!data[`${day}Closed`] && data[`${day}Open`] >= data[`${day}Close`]) {
      ctx.addIssue({ code: "custom", path: [`${day}Close`], message: "Closing time must be after opening time." });
    }
  }
});

export const DoctorStepSchema = z.object({
  name: z.string().trim().min(2, "Enter the doctor's name."),
  specialization: z.string().trim().max(120),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  phone: z.string().trim().max(30),
  appointmentDurationMinutes: z.coerce.number().int().positive().max(480),
});

export const ServiceStepSchema = z.object({
  name: z.string().trim().min(2, "Enter the service name."),
  price: z.coerce.number().nonnegative().max(99999999),
  durationMinutes: z.coerce.number().int().positive().max(480),
  description: z.string().trim().max(500),
});
