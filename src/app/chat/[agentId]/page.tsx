'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

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
        } else {
          setAgent({
            ...DEFAULT_FORM_AGENT,
            id: agentId || 'agent_clara',
            name: agentId.includes('dental') || agentId.includes('clara') ? 'Clara' : 'AI Assistant',
            roleTitle: agentId.includes('dental') || agentId.includes('clara') ? 'Dental Appointment Assistant' : 'AI Intake Assistant',
          });
        }
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
