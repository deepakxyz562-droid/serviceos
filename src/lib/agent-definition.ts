/**
 * Agent Definition Schema — Enterprise Agent Architecture Phase 1
 * =================================================================
 *
 * Formalizes the 9-section Agent Definition from the architecture document:
 *   Identity, Mission, Behavior, Knowledge, Actions, Qualification,
 *   Safety, Memory, Analytics
 *
 * This is the versioned configuration contract for an AI agent. It's stored
 * as JSON in FormAgent.configJson and versioned via AiAgentVersion (voice)
 * or a future FormAgentVersion model (chat).
 *
 * The schema is designed to be:
 *   - Machine-readable (JSON, validated by TypeScript)
 *   - Human-editable (in the Agent Studio UI)
 *   - Versionable (immutable snapshot on publish)
 *   - Evaluatable (feed into Phase 7 test datasets)
 */

// ─── 9-Section Agent Definition ────────────────────────────────────────────

export interface AgentDefinition {
  // 1. Identity
  identity: {
    name: string;
    description: string;
    avatar: string;
    language: string;
  };

  // 2. Mission
  mission: {
    primaryGoal: string;
    successCondition: string;
    allowedTasks: string[];
  };

  // 3. Behavior
  behavior: {
    personality: string;
    tone: 'friendly' | 'professional' | 'casual' | 'empathetic' | 'authoritative';
    responseStyle: 'concise' | 'detailed' | 'conversational';
    conversationRules: string[];
  };

  // 4. Knowledge
  knowledge: {
    websites: string[];
    documents: string[]; // PDF/DOCX URLs or IDs
    faqs: { question: string; answer: string }[];
    structuredData: Record<string, unknown>; // services, pricing, hours, service area
    systemPrompt: string;
  };

  // 5. Actions (tools)
  actions: {
    enabledTools: string[];
    booking: { enabled: boolean; requireDeposit: boolean; depositAmount?: number };
    forms: { connectedFormIds: string[] };
    payments: { enabled: boolean; gateways: string[] };
    notifications: { email: boolean; sms: boolean; webhook: boolean };
    escalation: { enabled: boolean; keywords: string[] };
  };

  // 6. Qualification
  qualification: {
    requiredFields: string[]; // e.g. ['name', 'phone', 'address', 'service_type']
    optionalFields: string[];
    qualificationRules: string[]; // e.g. "must be in service area"
  };

  // 7. Safety
  safety: {
    prohibitedTopics: string[];
    escalationRules: string[];
    approvalRules: string[];
    guardrails: {
      piiRedaction: boolean;
      strictKnowledgeOnly: boolean;
      blockedTopics: string[];
      zeroDataRetention: boolean;
    };
  };

  // 8. Memory
  memory: {
    conversationMemory: boolean;
    customerMemory: boolean;
    retentionDays: number;
    sessionSummaryAfterTurns: number; // generate summary after N turns
  };

  // 9. Analytics
  analytics: {
    trackConversion: boolean;
    trackAbandonment: boolean;
    trackToolSuccess: boolean;
    trackKnowledgeAccuracy: boolean;
  };

  // Versioning
  version: number;
  status: 'draft' | 'published' | 'superseded';
  createdAt: string;
  updatedAt: string;
  changes?: string; // changelog for this version
}

// ─── Default Agent Definition ───────────────────────────────────────────────

export const DEFAULT_AGENT_DEFINITION: AgentDefinition = {
  identity: {
    name: 'AI Assistant',
    description: 'A helpful AI assistant for customer inquiries',
    avatar: '',
    language: 'en',
  },
  mission: {
    primaryGoal: 'Help customers with their inquiries and collect necessary information',
    successCondition: 'Customer inquiry resolved or qualified lead captured',
    allowedTasks: ['answer_questions', 'collect_information', 'book_appointment', 'escalate_to_human'],
  },
  behavior: {
    personality: 'professional and friendly',
    tone: 'friendly',
    responseStyle: 'concise',
    conversationRules: [
      'Ask one question at a time',
      'Never make up information not in the knowledge base',
      'Always confirm before taking actions',
    ],
  },
  knowledge: {
    websites: [],
    documents: [],
    faqs: [],
    structuredData: {},
    systemPrompt: '',
  },
  actions: {
    enabledTools: ['get_knowledge', 'get_services', 'check_availability', 'create_booking', 'transfer_to_human', 'request_photo'],
    booking: { enabled: true, requireDeposit: false },
    forms: { connectedFormIds: [] },
    payments: { enabled: false, gateways: [] },
    notifications: { email: true, sms: false, webhook: false },
    escalation: { enabled: true, keywords: ['human', 'manager', 'supervisor', 'angry', 'frustrated'] },
  },
  qualification: {
    requiredFields: ['name', 'phone', 'service_type'],
    optionalFields: ['email', 'address', 'preferred_date', 'budget'],
    qualificationRules: [],
  },
  safety: {
    prohibitedTopics: ['politics', 'religion', 'competitor pricing'],
    escalationRules: ['If customer is angry, escalate immediately'],
    approvalRules: ['Payments require human approval'],
    guardrails: {
      piiRedaction: false,
      strictKnowledgeOnly: false,
      blockedTopics: [],
      zeroDataRetention: false,
    },
  },
  memory: {
    conversationMemory: true,
    customerMemory: false,
    retentionDays: 30,
    sessionSummaryAfterTurns: 6,
  },
  analytics: {
    trackConversion: true,
    trackAbandonment: true,
    trackToolSuccess: true,
    trackKnowledgeAccuracy: true,
  },
  version: 1,
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Versioning Helper ─────────────────────────────────────────────────────

/**
 * Create a new version of an Agent Definition.
 * The previous version is marked as 'superseded'; the new one starts as 'draft'.
 */
export function createNewVersion(
  current: AgentDefinition,
  changes: string
): AgentDefinition {
  return {
    ...current,
    version: current.version + 1,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    changes,
  };
}

/**
 * Publish a draft Agent Definition. Marks it as 'published' and any
 * previously published version as 'superseded'.
 */
export function publishVersion(def: AgentDefinition): AgentDefinition {
  return {
    ...def,
    status: 'published',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Build the system prompt from an Agent Definition.
 * This generates the full instructions the LLM receives, incorporating
 * identity, mission, behavior, knowledge, qualification rules, and safety.
 */
export function buildSystemPrompt(def: AgentDefinition, businessContext: string): string {
  const parts: string[] = [];

  // Identity + Mission
  parts.push(`You are ${def.identity.name}. ${def.identity.description}`);
  parts.push(`Primary goal: ${def.mission.primaryGoal}`);
  parts.push(`Success condition: ${def.mission.successCondition}`);

  // Behavior
  parts.push(`Personality: ${def.behavior.personality}`);
  parts.push(`Tone: ${def.behavior.tone}`);
  parts.push(`Response style: ${def.behavior.responseStyle}`);
  if (def.behavior.conversationRules.length > 0) {
    parts.push(`Conversation rules:\n${def.behavior.conversationRules.map(r => `- ${r}`).join('\n')}`);
  }

  // Business context
  if (businessContext) {
    parts.push(`BUSINESS CONTEXT:\n${businessContext}`);
  }

  // Knowledge
  if (def.knowledge.systemPrompt) {
    parts.push(`ADDITIONAL INSTRUCTIONS:\n${def.knowledge.systemPrompt}`);
  }
  if (def.knowledge.faqs.length > 0) {
    parts.push(`KNOWN FAQs:\n${def.knowledge.faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`);
  }

  // Qualification
  if (def.qualification.requiredFields.length > 0) {
    parts.push(`REQUIRED INFORMATION TO COLLECT: ${def.qualification.requiredFields.join(', ')}`);
  }

  // Safety
  if (def.safety.prohibitedTopics.length > 0) {
    parts.push(`NEVER discuss: ${def.safety.prohibitedTopics.join(', ')}`);
  }
  if (def.safety.guardrails.strictKnowledgeOnly) {
    parts.push('STRICT MODE: Only answer from the knowledge base. If you don\'t know, say so and offer to connect with a human.');
  }

  return parts.join('\n\n');
}
