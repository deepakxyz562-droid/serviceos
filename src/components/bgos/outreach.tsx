'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/client-auth';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Batch = { id: string; name: string; description: string | null; messageContent: string; status: string; totalRecipients: number; sentCount: number; failedCount: number };
async function request(url: string, method = 'GET', body?: unknown) {
  const response = await authFetch(url, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed. Please retry.');
  return data;
}

export function BgosOutreach() {
  const cache = useQueryClient();
  const navigate = useAppStore(s => s.setCurrentView);
  const batches = useQuery<{ batches: Batch[] }>({ queryKey: ['bgos', 'outreach'], queryFn: () => request('/api/bgos/outreach'), refetchInterval: 15000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState<Batch | null>(null);
  async function act(batch: Batch, decision: 'approved' | 'rejected' | 'send') {
    setBusy(batch.id); setNotice(''); setError('');
    try {
      const result = decision === 'send'
        ? await request('/api/campaigns/send', 'POST', { campaignId: batch.id })
        : await request('/api/bgos/outreach', 'PATCH', { id: batch.id, decision });
      setNotice(decision === 'send' ? `Dispatch finished: ${result.sent ?? 0} sent, ${result.failed ?? 0} failed. Contacts without marketing consent are skipped.` : `Batch ${decision}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update batch.'); }
    finally { await cache.invalidateQueries({ queryKey: ['bgos', 'outreach'] }); setBusy(null); }
  }
  return <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Outreach</h1><p className="mt-2 text-sm text-muted-foreground">Review the saved message and audience before approving each batch.</p></div><Button onClick={() => navigate('leadDiscovery')}>Discover leads</Button></header>
    <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Approval saves your decision. Sending is a separate action and requires a connected email provider and recipient marketing consent.</p>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-xl border p-4 text-sm">{notice}</p>}
    {batches.isPending ? <p role="status">Loading outreach…</p> : batches.isError ? <div role="alert" className="rounded-xl border p-6"><p>Outreach could not be loaded.</p><Button variant="outline" className="mt-4" onClick={() => batches.refetch()}>Retry</Button></div> : !batches.data?.batches.length ? <div className="rounded-2xl border bg-card p-10 text-center"><h2 className="font-semibold">No outreach batches yet</h2><p className="mt-2 text-sm text-muted-foreground">Create a draft from Lead discovery to start your review.</p></div> : <section aria-label="Outreach batches" className="grid gap-4 lg:grid-cols-2">{batches.data.batches.map(batch => <article key={batch.id} className="flex flex-col rounded-2xl border bg-card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{batch.name}</h2><span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{batch.status.replaceAll('_', ' ')}</span></div><p className="mt-2 text-xs text-muted-foreground">{batch.totalRecipients} selected contacts · {batch.sentCount} sent · {batch.failedCount} failed</p><h3 className="mt-5 text-sm font-medium">{batch.description || 'No subject'}</h3><p className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{batch.messageContent}</p><div className="mt-auto flex flex-wrap gap-3 pt-6">{batch.status === 'pending_approval' && <><Button disabled={busy !== null} onClick={() => act(batch, 'approved')}>Approve batch</Button><Button variant="outline" disabled={busy !== null} onClick={() => act(batch, 'rejected')}>Reject</Button></>}{batch.status === 'approved' && <Button disabled={busy !== null} onClick={() => setSending(batch)}>Review and send</Button>}{busy === batch.id && <span role="status" className="self-center text-sm text-muted-foreground">Saving…</span>}</div></article>)}</section>}
    <AlertDialog open={!!sending} onOpenChange={open => { if (!open) setSending(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Send this approved batch?</AlertDialogTitle><AlertDialogDescription>This sends “{sending?.description}” to eligible contacts in the saved audience of {sending?.totalRecipients}. Sent emails cannot be recalled.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (sending) void act(sending, 'send'); setSending(null); }}>Send approved batch</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
