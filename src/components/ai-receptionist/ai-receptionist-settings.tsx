'use client';

/**
 * AI Receptionist Settings Wrapper
 * ================================
 *
 * The single entry point for Settings → AI Receptionist and CRM navigation.
 * Renders the unified AI Receptionist Workspace with integrated setup guide,
 * real-time voice controls, call logs, phone routing, and diagnostics.
 */

import { AiReceptionistWorkspace } from './workspace/ai-receptionist-workspace';

export function AiReceptionistSettings() {
  return <AiReceptionistWorkspace />;
}

