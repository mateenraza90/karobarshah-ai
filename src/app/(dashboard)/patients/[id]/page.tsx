import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/services/supabase/server";
import { getCurrentMembership } from "@/database/memberships";
import { getPatient } from "@/database/patients";
import { updatePatientAction, archivePatientAction } from "@/features/patients/actions";
import { PatientForm } from "@/features/patients/form";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const m = await getCurrentMembership(); if (!m) notFound(); const s = await createClient(); const { patient } = await getPatient(s, m.organization_id, id); if (!patient) notFound();
  return <div className="flex flex-col gap-6"><div><h1 className="font-display text-2xl font-semibold text-ink">{patient.full_name}</h1><p className="mt-1 text-sm text-ink-muted">Patient profile</p></div><Card><CardHeader><CardTitle>Edit patient</CardTitle></CardHeader><CardContent><PatientForm action={updatePatientAction} initial={patient}/></CardContent></Card>{["owner","admin","manager"].includes(m.role) && <ActionForm action={archivePatientAction}><input type="hidden" name="id" value={patient.id}/><Button variant="destructive" type="submit">Archive patient</Button></ActionForm>}</div>;
}
