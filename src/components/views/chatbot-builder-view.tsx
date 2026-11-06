'use client';

/**
 * ChatbotBuilderView — Dedicated AI Agent Builder
 *
 * Single-Agent Architecture ("ONE BUSINESS = ONE AI AGENT"):
 * Directly opens the visual AI Agent Builder (FormAgentStudio) for the business's
 * primary 24/7 AI employee. Automatically loads or creates the single business
 * agent without any multi-agent directory or selection screens.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { FormAgentStudio } from '@/features/forms/components/agent-builder/form-agent-studio';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';

export interface ChatbotBuilderViewProps {
  embedded?: boolean;
  onBackToDashboard?: () => void;
}

// Agent configuration is scoped to this mounted, authenticated workspace.

export function ChatbotBuilderView({ embedded = false, onBackToDashboard }: ChatbotBuilderViewProps = {}) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const auth = useAppStore((s) => s.auth);
  const scope = `${auth?.user?.id || ''}:${auth?.tenant?.id || ''}:${auth?.workspace?.id || ''}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const requestEpoch = useRef(0);
  const [loadedScope,setLoadedScope] = useState(scope);

  const handleBackToDashboard = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      const isStandalone =
        (auth?.tenant as any)?.signupMode === 'standalone' ||
        (auth?.tenant as any)?.productType === 'forms' ||
        (auth?.workspace as any)?.productType === 'forms';
      setCurrentView(isStandalone ? 'formsDashboard' : 'dashboard');
    }
  };

  const [activeStudioAgent, setActiveStudioAgent] = useState<FormAgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteOrigin, setSiteOrigin] = useState('');

  const fetchPrimaryAgent = useCallback(async () => {
    const epoch = ++requestEpoch.current;
    setLoading(true);
    setActiveStudioAgent(null);
    setLoadedScope(scope);
    setError(null);
    try {
      const res = await fetch('/api/forms/agents');
      if (res.ok) {
        const data = await res.json();
        if (scopeRef.current !== scope || epoch !== requestEpoch.current) return;
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          setActiveStudioAgent(data.agents[0]);
        } else {
          // Auto-initialize the single agent for this business
          const bizName = (auth?.tenant as any)?.name || 'My Business';
          const defaultAgent: FormAgentData = {
            ...DEFAULT_FORM_AGENT,
            name: `${bizName} AI Assistant`,
            roleTitle: 'Customer Concierge & Booking Specialist',
            welcomeGreeting: `Hi! Welcome to ${bizName}. How can I assist you today?`,
          };

          // First-time setup is an unsaved draft until the user explicitly saves it.
          setActiveStudioAgent({...defaultAgent, id: '', slug: ''});
          toast.info('New assistant draft. Add your details and save to create it.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `Server responded with ${res.status}`;
        setError(msg);
        toast.error(`Failed to load AI Assistant: ${msg}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error loading AI Assistant';
      setError(msg);
      toast.error(msg);
    } finally {
      if (scopeRef.current === scope && epoch === requestEpoch.current) setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
    }
    fetchPrimaryAgent();
  }, [fetchPrimaryAgent]);

  if (loadedScope !== scope || (loading && !activeStudioAgent)) {
    return (
      <div className="flex flex-1 h-full min-h-[400px] w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold text-muted-foreground">Opening AI Agent Builder...</p>
        </div>
      </div>
    );
  }

  if (error && !activeStudioAgent) {
    return (
      <div className="flex flex-1 h-full min-h-[400px] w-full flex-col items-center justify-center bg-background p-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <Loader2 className="size-6 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Unable to Load AI Assistant</h2>
          <p className="text-xs text-muted-foreground">{error}</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={fetchPrimaryAgent}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#009F50] hover:bg-[#008A45] text-white transition-colors"
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setActiveStudioAgent(DEFAULT_FORM_AGENT);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Open Offline Draft
            </button>
            <button
              type="button"
              onClick={handleBackToDashboard}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Directly and always render the full-screen visual AI Agent Builder
  return (
    <FormAgentStudio
      key={scope}
      initialAgent={activeStudioAgent || DEFAULT_FORM_AGENT}
      onChange={(updated) => {
        setActiveStudioAgent(updated);
      }}
      onSave={(savedAgent) => setActiveStudioAgent(savedAgent)}
      onBack={() => {
        handleBackToDashboard();
      }}
      siteOrigin={siteOrigin}
    />
  );
}
