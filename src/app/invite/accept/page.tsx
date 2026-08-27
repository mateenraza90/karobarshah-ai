import { redirect } from "next/navigation";
import crypto from "node:crypto";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/services/supabase/admin";
import { createClient } from "@/services/supabase/server";
import { acceptInvite } from "@/features/team/actions";
import { InviteAcceptForm } from "@/features/team/invite-accept-form";

function StateCard({ title, description, showLoginLink }: { title: string; description: string; showLoginLink?: boolean }) {
  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">{description}</p>
            {showLoginLink && (
              <Button asChild variant="secondary" className="self-start">
                <a href="/login?next=/invite/accept">Log in with a different account</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function InviteAcceptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/accept${token ? `?token=${token}` : ""}`)}`);
  if (!user.email) {
    return <StateCard title="Verified email required" description="Your account needs a verified email address before you can accept a team invitation." />;
  }

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return <StateCard title="Invalid invitation link" description="This invitation link is missing or malformed. Ask whoever invited you to resend it." />;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("pending_invites")
    .select("id,organization_id,email,role,created_at,expires_at,organizations(name)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  // Accepted invitations are deleted by accept_pending_invite as part of
  // making acceptance one-time-use, so a missing row after a valid-looking
  // token means either it was already used or it never existed — the data
  // genuinely can't distinguish those, so the message doesn't pretend to.
  if (!invite) {
    return <StateCard title="Invitation not found" description="This invitation link is invalid or has already been used. If you were expecting an invite, ask whoever sent it to send a new one." />;
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return (
      <StateCard
        title="Wrong account"
        description={`This invitation was sent to ${invite.email}, but you're logged in as ${user.email}. Log in with the invited email address to accept it.`}
        showLoginLink
      />
    );
  }

  if (new Date(invite.expires_at) <= new Date()) {
    return <StateCard title="Invitation expired" description="This invitation has expired. Ask an owner or admin at the organization to send you a new one." />;
  }

  const orgName = (invite.organizations as { name?: string } | null)?.name ?? "the team";

  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader><CardTitle>Team invitation</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border border-mist p-4">
              <p className="font-medium text-ink">Invitation to join {orgName}</p>
              <p className="mt-1 text-sm text-ink-muted">Role: {invite.role}</p>
              <InviteAcceptForm action={acceptInvite} token={token} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
