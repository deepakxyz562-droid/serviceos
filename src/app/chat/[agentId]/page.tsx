'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getTemplateSync } from '@/lib/forms/templates';

export default function PublicChatPage() {
  const params = useParams();
  const agentId = (params?.agentId as string) || '';

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<FormAgentData | null>(null);

  useEffect(() => {
    async function loadAgent() {
      try {
        const res = await fetch(`/api/forms/agents?id=${encodeURIComponent(agentId)}`);
        const data = await res.json().catch(() => ({}));
        if (data.agent) {
          setAgent(data.agent);
          return;
        }

        // Check canonical template registry
        const template = getTemplateSync(agentId);
        if (template && template.agentConfig) {
          setAgent({
            ...DEFAULT_FORM_AGENT,
            id: template.id,
            name: template.agentConfig.personaTitle || template.name,
            roleTitle: template.agentConfig.personaTitle || `${template.name} AI Agent`,
            voiceTone: template.agentConfig.voiceTone || 'professional',
            welcomeGreeting: template.agentConfig.greetingMessage || `Hello! I'm your AI assistant for ${template.name}. How can I assist you?`,
            systemPrompt: template.agentConfig.systemPrompt || DEFAULT_FORM_AGENT.systemPrompt,
            suggestedPrompts: template.agentConfig.suggestedPrompts || [
              'Ask a question',
              'Get a quote',
              'Schedule service',
            ],
            connectedForms: template.schema.fields ? [
              {
                id: template.id,
                name: template.name,
                description: template.shortDescription,
                submissionCount: 1,
              },
            ] : [],
          });
          return;
        }

        // Domain-aware fallback
        const isDental = agentId.includes('dental') || agentId.includes('clara');
        const isHvac = agentId.includes('hvac') || agentId.includes('apex') || agentId.includes('air');
        const isAuto = agentId.includes('auto') || agentId.includes('mechanic') || agentId.includes('car');
        const isLegal = agentId.includes('legal') || agentId.includes('law');

        const name = isDental ? 'Clara Dental' : isHvac ? 'Apex HVAC AI' : isAuto ? 'Auto Care AI' : isLegal ? 'Legal Intake AI' : 'Service Assistant';
        const role = isDental ? 'Dental Patient Concierge' : isHvac ? 'Emergency HVAC Specialist' : isAuto ? 'Service Advisor' : isLegal ? 'Intake Specialist' : 'Customer Concierge';

        setAgent({
          ...DEFAULT_FORM_AGENT,
          id: agentId || 'agent_assistant',
          name,
          roleTitle: role,
          welcomeGreeting: `Hello! I am your 24/7 **${name}** assistant. How can I help you today?`,
          suggestedPrompts: isHvac
            ? ['My AC is blowing warm air', 'Furnace is making loud noise', 'Book same-day repair']
            : isDental
            ? ['Book dental cleaning', 'Tooth pain emergency', 'Check accepted insurance']
            : ['Get instant price quote', 'Schedule an appointment', 'Talk with customer support'],
        });
      } catch {
        setAgent(DEFAULT_FORM_AGENT);
      } finally {
        setLoading(false);
      }
    }
    loadAgent();
  }, [agentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-muted-foreground">Connecting with AI Agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 rounded-2xl shadow-sm">
          <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Agent Offline</h2>
          <p className="text-xs text-muted-foreground mt-1">This agent is currently unavailable.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200/90 dark:bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6">
      <div className="w-full max-w-md h-[92vh] sm:h-[720px]">
        <AgentDeviceSimulator agent={agent} isTestMode={false} />
      </div>
    </div>
  );
}
