import React, { useState } from 'react';
import { Linking, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Action, Empty, ErrorNotice, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { WEB_URL } from '../../src/lib/constants';
type Agent = { id: string; name: string; roleTitle?: string; welcomeGreeting?: string; voiceTone?: string };
export default function AgentsScreen() {
  const resource = useResource<{ agents: Agent[] }>('/api/forms/agents');
  const [error, setError] = useState<string | null>(null); const router = useRouter();
  return <Screen title="AI assistant" subtitle="Your saved assistants and customer conversations." onRefresh={resource.refresh}><ErrorNotice message={error || resource.error} retry={resource.refresh} />{resource.loading ? <Loading /> : resource.data?.agents.length ? resource.data.agents.map(agent => <Card key={agent.id}><Text style={ui.heading}>{agent.name}</Text><Text style={ui.body}>{agent.roleTitle || 'Business assistant'}</Text>{agent.welcomeGreeting && <Text style={ui.body}>{agent.welcomeGreeting}</Text>}{agent.voiceTone && <Text style={ui.caption}>Tone · {agent.voiceTone}</Text>}</Card>) : !resource.error && <Empty title="Set up your assistant" detail="Create and train your business assistant in the web studio. Saved assistants will appear here." />}<Card><Text style={ui.heading}>Stay in control</Text><Text style={ui.body}>Pause AI or take over individual conversations from your inbox. Configure knowledge, skills and publishing in the web studio.</Text><Action label="Monitor conversations" onPress={() => router.push('/(tabs)/inbox')} /><Action secondary label="Open AI studio · Web" onPress={() => Linking.openURL(`${WEB_URL}/app?view=agentStudio`).catch(() => setError('Could not open the browser.'))} /></Card></Screen>;
}
