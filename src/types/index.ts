import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Milestone this section ships in. Shown as a "coming soon" badge until then. */
  status: "active" | "planned";
};

export type ActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
} | null;
