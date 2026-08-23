import { redirect } from "next/navigation";

import { getCurrentMembership } from "@/database/memberships";
import type { OrgRole } from "@/types/database";

export async function requireMembership() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");
  return membership;
}

export async function requireRole(roles: readonly OrgRole[]) {
  const membership = await requireMembership();
  if (!roles.includes(membership.role)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return membership;
}

export function canManageBusiness(role: OrgRole) {
  return role === "owner" || role === "admin";
}

export function canManageResources(role: OrgRole) {
  return role === "owner" || role === "admin" || role === "manager";
}
