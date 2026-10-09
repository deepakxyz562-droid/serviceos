import React, { useState } from 'react';
import { Text } from 'react-native';
import { Screen, Card, Action, ErrorNotice, Empty, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
type Batch = { id: string; name: string; description: string; messageContent: string; totalRecipients: number; status: string };
export default function OutreachScreen() {
  const resource = useResource<{ batches: Batch[] }>('/api/bgos/outreach', 15000); const [busy,setBusy] = useState(false); const [error,setError] = useState<string | null>(null);
  async function review(id: string, decision: string) { setBusy(true); setError(null); try { await apiRequest('/api/bgos/outreach', { method: 'PATCH', body: { id, decision } }); await resource.refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <Screen title="Outreach approvals" subtitle="Review the audience and message. Approval does not send email." onRefresh={resource.refresh}><ErrorNotice message={error || resource.error} retry={resource.refresh} />{resource.loading ? <Loading /> : !resource.data?.batches.length ? <Empty title="Nothing waiting for review" detail="Prepare a batch in the web lead intelligence workspace. Saved drafts will appear here." /> : resource.data.batches.map(b => <Card key={b.id}><Text style={ui.heading}>{b.name}</Text><Text style={ui.label}>{b.totalRecipients} recipients · {b.status.replaceAll('_',' ')}</Text><Text style={ui.heading}>{b.description}</Text><Text style={ui.body}>{b.messageContent}</Text>{b.status === 'pending_approval' && <><Action disabled={busy} label="Approve batch" onPress={() => review(b.id,'approved')} /><Action disabled={busy} secondary label="Reject batch" onPress={() => review(b.id,'rejected')} /></>}</Card>)}</Screen>;
}
