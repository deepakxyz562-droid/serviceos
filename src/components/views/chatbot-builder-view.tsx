'use client';

/**
 * ChatbotBuilderView — Dedicated AI Agent Builder
 *
 * Single-Agent Architecture ("ONE BUSINESS = ONE AI AGENT"):
 * Directly opens the visual AI Agent Builder (FormAgentStudio) for the business's
 * primary 24/7 AI employee. Automatically loads or creates the single business
 * agent without any multi-agent directory or selection screens.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { FormAgentStudio } from '@/features/forms/components/agent-builder/form-agent-studio';
import { FormAgentData, DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';

export interface ChatbotBuilderViewProps {
  embedded?: boolean;
  onBackToDashboard?: () => void;
}

export function ChatbotBuilderView({ embedded = false, onBackToDashboard }: ChatbotBuilderViewProps = {}) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const auth = useAppStore((s) => s.auth);

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
  const [siteOrigin, setSiteOrigin] = useState('');

  const fetchPrimaryAgent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/forms/agents');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          // Open the business's single AI agent directly
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

          // Save default agent to DB so it persists
          try {
            const saveRes = await fetch('/api/forms/agents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(defaultAgent),
            });
            if (saveRes.ok) {
              const saved = await saveRes.json();
              setActiveStudioAgent(saved.agent || defaultAgent);
            } else {
              setActiveStudioAgent(defaultAgent);
            }
          } catch {
            setActiveStudioAgent(defaultAgent);
          }
        }
      } else {
        setActiveStudioAgent(DEFAULT_FORM_AGENT);
      }
    } catch {
      setActiveStudioAgent(DEFAULT_FORM_AGENT);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
    }
    fetchPrimaryAgent();
  }, [fetchPrimaryAgent]);

  if (loading && !activeStudioAgent) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-muted-foreground">Opening AI Agent Builder...</p>
        </div>
      </div>
    );
  }

  // Directly and always render the full-screen visual AI Agent Builder
  return (
    <FormAgentStudio
      initialAgent={activeStudioAgent || DEFAULT_FORM_AGENT}
      onChange={(updated) => {
        setActiveStudioAgent(updated);
      }}
      onSave={async (savedAgent) => {
        setActiveStudioAgent(savedAgent);
        try {
          const res = await fetch('/api/forms/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savedAgent),
          });
          if (res.ok) {
            toast.success('AI Agent settings saved successfully!');
          }
        } catch {
          toast.error('Failed to save AI Agent settings');
        }
      }}
      onBack={() => {
        handleBackToDashboard();
      }}
      siteOrigin={siteOrigin}
    />
  );
}
