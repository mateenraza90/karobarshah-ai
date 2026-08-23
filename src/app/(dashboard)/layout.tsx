import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { createClient } from "@/services/supabase/server";
import { getCurrentMembership } from "@/database/memberships";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Re-checked here even though proxy.ts already redirected unauthenticated
  // requests: proxy only reads the cookie optimistically, so anything that
  // renders real data still verifies the session itself (Next's Data
  // Access Layer pattern).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");
  if (!membership.organization.onboarding_completed_at) redirect("/onboarding");

  const name = membership.organization.name || user.email || "Account";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header name={name} email={user.email ?? ""} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
