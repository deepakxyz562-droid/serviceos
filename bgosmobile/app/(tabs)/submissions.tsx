import React, { useState } from 'react';
import { Modal, Text } from 'react-native';
import { Screen, Card, Action, Empty, ErrorNotice, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
type Response = { id: string; form: { name: string }; respondentName: string; respondent?: string; createdAt: string; data: Record<string, unknown> };
export default function ResponsesScreen() {
  const resource = useResource<{ responses: Response[] }>('/api/forms/responses?limit=100', 15000); const [selected,setSelected] = useState<Response | null>(null);
  return <Screen title="Form responses" subtitle="Every inquiry, ready for your next step." onRefresh={resource.refresh}><ErrorNotice message={resource.error} retry={resource.refresh} />{resource.loading ? <Loading /> : !resource.data?.responses.length ? !resource.error && <Empty title="Waiting for your first response" detail="Publish a form in BGOS web and share its link with your customers." /> : resource.data.responses.map(r => <Card key={r.id}><Text style={ui.heading}>{r.respondentName}</Text><Text style={ui.body}>{r.form.name} · {new Date(r.createdAt).toLocaleString()}</Text><Action secondary label="View response" onPress={() => setSelected(r)} /></Card>)}<Modal visible={!!selected} onRequestClose={() => setSelected(null)} animationType="slide"><Screen title={selected?.respondentName || 'Response'} subtitle={selected?.form.name || ''}><Action secondary label="Back to responses" onPress={() => setSelected(null)} />{Object.entries(selected?.data || {}).map(([key,value]) => <Card key={key}><Text style={ui.label}>{key}</Text><Text style={ui.body}>{typeof value === 'string' ? value : JSON.stringify(value)}</Text></Card>)}</Screen></Modal></Screen>;
}
