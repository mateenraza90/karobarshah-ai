import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/services/supabase/server";
import { getCurrentMembership } from "@/database/memberships";
import { listPatientsPaginated } from "@/database/patients";
import { PatientForm } from "@/features/patients/form";
import { createPatientAction } from "@/features/patients/actions";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams; const m = await getCurrentMembership(); if (!m) return null; const s = await createClient();
  const result = await listPatientsPaginated(s, m.organization_id, params.q, Number(params.page ?? 1));
  const canWrite = ["owner","admin","manager","receptionist"].includes(m.role);
  return <div className="flex flex-col gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-semibold text-ink">Patients</h1><p className="mt-1 text-sm text-ink-muted">Manage patient contacts and operational notes.</p></div><Link href="#new-patient"><Button><Plus size={16}/> New patient</Button></Link></div>
    {canWrite && <Card id="new-patient"><CardHeader><CardTitle>New patient</CardTitle></CardHeader><CardContent><PatientForm action={createPatientAction}/></CardContent></Card>}
    <Card><CardHeader><form className="flex gap-2" method="get"><Input name="q" defaultValue={params.q ?? ""} placeholder="Search name, phone or email"/><Button variant="secondary" type="submit"><Search size={16}/> Search</Button></form></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Tags</TableHead></TableRow></TableHeader><TableBody>{result.patients.map(p=><TableRow key={p.id}><TableCell><Link className="font-medium text-ledger hover:underline" href={`/patients/${p.id}`}>{p.full_name}</Link></TableCell><TableCell>{p.phone ?? "—"}</TableCell><TableCell>{p.email ?? "—"}</TableCell><TableCell>{p.tags.length ? p.tags.join(", ") : "—"}</TableCell></TableRow>)}{!result.patients.length && <TableRow><TableCell colSpan={4}>No patients found.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
  </div>;
}
