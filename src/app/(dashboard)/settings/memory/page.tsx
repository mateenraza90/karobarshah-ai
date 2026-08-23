import { requireMembership, canManageResources } from "@/lib/auth/tenant";
import { createClient } from "@/services/supabase/server";
import { listMemoryItems } from "@/database/memory";
import { saveMemoryItem, deleteMemoryItemAction, saveFAQ, deleteFAQAction } from "@/features/memory/actions";
import { MemoryForm } from "@/features/memory/form";
import { FAQForm } from "@/features/memory/faq-form";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MemoryPage() {
  const m = await requireMembership();
  const s = await createClient();
  const [items, faqResult] = await Promise.all([
    listMemoryItems(s, m.organization_id),
    s.from("faqs").select("id,question,answer,is_active").eq("organization_id", m.organization_id).order("created_at", { ascending: false }),
  ]);
  const can = canManageResources(m.role);
  const faqs = faqResult.data ?? [];

  return <div className="flex flex-col gap-6">
    <div><h1 className="font-display text-2xl font-semibold text-ink">Business Memory</h1><p className="mt-1 text-sm text-ink-muted">Maintain tenant-scoped business knowledge, FAQs, policies, service information and hours.</p></div>
    {can && <Card><CardHeader><CardTitle>Add knowledge</CardTitle></CardHeader><CardContent><MemoryForm action={saveMemoryItem}/></CardContent></Card>}
    <Card><CardHeader><CardTitle>Business knowledge ({items.length})</CardTitle></CardHeader><CardContent className="space-y-5">{items.length ? items.map(item => <div key={item.id}><MemoryForm action={saveMemoryItem} item={item}/>{can && <ActionForm action={deleteMemoryItemAction} className="mt-2"><input type="hidden" name="id" value={item.id}/><Button type="submit" size="sm" variant="destructive">Delete</Button></ActionForm>}</div>) : <p className="text-sm text-ink-muted">No business knowledge has been added yet.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>FAQs ({faqs.length})</CardTitle></CardHeader><CardContent className="space-y-5">{can && <FAQForm action={saveFAQ}/>} {faqs.length ? faqs.map(faq => <div key={faq.id}><FAQForm action={saveFAQ} faq={faq}/>{can && <ActionForm action={deleteFAQAction} className="mt-2"><input type="hidden" name="id" value={faq.id}/><Button type="submit" size="sm" variant="destructive">Delete</Button></ActionForm>}</div>) : !can && <p className="text-sm text-ink-muted">No FAQs have been added.</p>}</CardContent></Card>
  </div>;
}
