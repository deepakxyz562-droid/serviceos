'use client';

/**
 * AgentPreviewBridge
 * ------------------
 * Bridges the studio's "AI Agent" edit-mode widget (AgentDeviceSimulator)
 * into the runtime preview path so the preview pane shows the EXACT same
 * widget the user configured in edit mode.
 *
 * Previously, the runtime used ConversationalAgentRuntime — a generic
 * Q&A widget that walked through form fields one-by-one and completely
 * ignored the agent config (avatar, brandColor, quickActions, greeting,
 * nav tabs, etc.). This caused the visible EDIT vs PREVIEW discrepancy.
 *
 * This bridge:
 * 1. Reads `schema.agentConfig` if present (configured agent).
 * 2. Falls back to a synthesized FormAgentData derived from the schema
 *    (brand color from theme, form name as agent name, first few fields
 *    as quick actions) so unconfigured forms still preview gracefully.
 * 3. Renders AgentDeviceSimulator with `isTestMode={true}` so the
 *    chat handler returns a simulated response instead of hitting the
 *    real `/api/forms/agents/[id]/chat` endpoint (which requires a
 *    saved agent row).
 * 4. Wires `onOpenFormInModal` to call `onSwitchToPaper` so users can
 *    actually fill out the connected form in the preview viewport.
 */

import React, { useMemo, useCallback } from 'react';
import { FormSchema } from '@/lib/forms/form-schema-types';
import {
  FormAgentData,
  DEFAULT_FORM_AGENT,
  ConnectedFormRef,
} from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';

interface AgentPreviewBridgeProps {
  schema: FormSchema;
  formName: string;
  formDescription?: string | null;
  /** When true, simulated test replies are returned without calling the live AI chat API. */
  isTestMode?: boolean;
  /** Called when the user clicks "Fill Form" — should switch preview to paper mode. */
  onSwitchToPaper?: () => void;
}

/**
 * Build a sensible default FormAgentData from a form schema when the user
 * hasn't explicitly configured an agent. This keeps the preview useful for
 * forms that were created before the AI Agent tab existed.
 */
function synthesizeAgentFromSchema(
  schema: FormSchema,
  formName: string,
  formDescription?: string | null,
): FormAgentData {
  const primaryColor = schema.theme?.primaryColor || '#059669';
  const buttonColor = schema.theme?.buttonColor || primaryColor;

  // Build quick actions from the first 2-3 non-decorative fields so the
  // user sees something meaningful rather than the loan-application
  // defaults from DEFAULT_FORM_AGENT.
  const actionableFields = (schema.fields || []).filter(
    (f) => !['heading', 'paragraph', 'divider'].includes(f.type),
  );
  const quickActions = actionableFields.slice(0, 3).map((f, idx) => ({
    id: `qa_syn_${idx + 1}`,
    label: f.label?.length && f.label.length > 32 ? f.label.slice(0, 30) + '…' : (f.label || `Question ${idx + 1}`),
    actionType: 'open_form' as const,
    payload: f.id,
  }));

  const connectedForm: ConnectedFormRef = {
    id: 'preview_form',
    name: formName,
    description: formDescription || undefined,
    submissionCount: 0,
  };

  return {
    ...DEFAULT_FORM_AGENT,
    id: `agent_preview_${formName.toLowerCase().replace(/\s+/g, '_').slice(0, 24)}`,
    slug: `preview-agent`,
    name: formName ? `${formName.slice(0, 24)} Assistant` : 'AI Assistant',
    roleTitle: formName ? `${formName.slice(0, 32)} AI Assistant` : 'AI Assistant',
    brandColor: buttonColor,
    welcomeGreeting: `Hi! I'm **${formName ? `${formName.slice(0, 24)} Assistant` : 'your AI Agent'}**, your AI Agent and ${formName || 'Service'} Assistant. How can I help you?`,
    greetingSubtitle: formDescription || 'Ask me anything, or tap a quick action below.',
    quickActions: quickActions.length > 0 ? quickActions : DEFAULT_FORM_AGENT.quickActions,
    connectedForms: [connectedForm],
    channels: {
      ...DEFAULT_FORM_AGENT.channels,
      chatbot: {
        ...DEFAULT_FORM_AGENT.channels.chatbot,
        primaryColor: buttonColor,
        placeholderMessage: 'Ask AI',
        greetingBubble: `👋 Need help? Chat with ${formName || 'our assistant'}!`,
      },
    },
    navigation: {
      chatEnabled: true,
      voiceEnabled: true,
      formsEnabled: true,
      historyEnabled: true,
      presentationEnabled: false,
      whatsappEnabled: false,
    },
  };
}

export function AgentPreviewBridge({
  schema,
  formName,
  formDescription,
  isTestMode = false,
  onSwitchToPaper,
}: AgentPreviewBridgeProps) {
  // Resolve the agent config: prefer the user-configured one, else synthesize.
  const agent = useMemo<FormAgentData>(() => {
    if (schema.agentConfig && typeof schema.agentConfig === 'object' && schema.agentConfig.name) {
      return schema.agentConfig as FormAgentData;
    }
    return synthesizeAgentFromSchema(schema, formName, formDescription);
  }, [schema, formName, formDescription]);

  const handleOpenFormInModal = useCallback(
    (_form: ConnectedFormRef) => {
      // Switch the runtime to paper mode so the user can actually fill the form.
      onSwitchToPaper?.();
    },
    [onSwitchToPaper],
  );

  return (
    <div className="w-full h-full flex justify-center items-center p-2 sm:p-4">
      {/* AgentDeviceSimulator fills its container — give it standard,
          proportional dimensions (w-[360px] to max-w-[380px], h-[580px])
          matching the editor simulator so there is no awkward vertical void. */}
      <div className="w-full max-w-[380px] h-[580px] max-h-[85vh] flex flex-col shadow-2xl rounded-[28px] overflow-hidden">
        <AgentDeviceSimulator
          agent={agent}
          isTestMode={isTestMode}
          previewPage="conversation"
          onOpenFormInModal={handleOpenFormInModal}
        />
      </div>
    </div>
  );
}
