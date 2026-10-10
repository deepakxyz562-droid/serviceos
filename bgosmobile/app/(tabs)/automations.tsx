import React, { useState } from 'react';
import { Text, Switch } from 'react-native';
import { Screen, Card, ErrorNotice, Empty, Loading, ui } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
import { useResource } from '../../src/hooks/use-resource';
type Workflow = { id: string; name: string; description?: string; active: boolean };
export default function AutomationsScreen() {
  const resource = useResource<{ workflows: Workflow[] }>('/api/workflows?limit=100'); const [busy,setBusy] = useState(false); const [error,setError] = useState<string | null>(null);
  async function toggle(item: Workflow, active: boolean) { setBusy(true); setError(null); try { await apiRequest(`/api/workflows/${item.id}/activate`, { method: active ? 'POST' : 'DELETE' }); await resource.refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <Screen title="Automations" subtitle="Build in the web studio. Manage your workflows here." onRefresh={resource.refresh}><ErrorNotice message={error || resource.error} retry={resource.refresh} />{resource.loading ? <Loading /> : !resource.data?.workflows.length ? !resource.error && <Empty title="No workflows yet" detail="Create and test a workflow in the BGOS web automation studio." /> : resource.data.workflows.map(item => <Card key={item.id}><Text style={ui.heading}>{item.name}</Text><Text style={ui.body}>{item.description || 'Workflow automation'}</Text><Switch accessibilityLabel={`Enable ${item.name}`} value={item.active} disabled={busy} onValueChange={active => toggle(item, active)} /></Card>)}</Screen>;
}
