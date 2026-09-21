/**
 * Form-to-Chat-Context Converter
 *
 * Converts a Form's schema into a system prompt snippet that gives the
 * AI auto-reply agent context about what the form is for, what fields
 * it collects, and what the visitor is likely asking about.
 *
 * This enables AI auto-replies that are form-aware — e.g., when a visitor
 * chats on a "Roofing Estimate" form, the AI knows to ask about roof size,
 * material preferences, and booking a slot.
 */

import { db } from '@/lib/db';

export interface FormChatContext {
  formId: string;
  formName: string;
  formType: string;
  description: string | null;
  fieldsSummary: string;
  systemPromptSnippet: string;
}

/**
 * Load a form and convert its schema into an AI context snippet.
 *
 * Returns null if the form doesn't exist or doesn't belong to the tenant.
 * The snippet is designed to be appended to the existing AI system prompt.
 */
export async function getFormChatContext(
  formId: string,
  tenantId: string,
): Promise<FormChatContext | null> {
  try {
    const form = await db.form.findFirst({
      where: { id: formId, tenantId },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        schemaJson: true,
      },
    });

    if (!form) return null;

    const fieldsSummary = extractFieldsSummary(form.schemaJson);
    const systemPromptSnippet = buildSystemPromptSnippet(
      form.name,
      form.type,
      form.description,
      fieldsSummary,
    );

    return {
      formId: form.id,
      formName: form.name,
      formType: form.type,
      description: form.description,
      fieldsSummary,
      systemPromptSnippet,
    };
  } catch (err) {
    console.warn('[form-to-chat-context] Error loading form:', err);
    return null;
  }
}

/**
 * Parse the form's schemaJson and extract a human-readable summary of
 * the fields it collects. Handles both the full FormSchema format
 * (with steps + fields) and the legacy fieldsJson format.
 */
function extractFieldsSummary(schemaJson: string): string {
  try {
    const schema = JSON.parse(schemaJson);
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    if (fields.length === 0) return 'No specific fields defined.';

    const fieldLabels = fields
      .slice(0, 15) // Cap at 15 to keep the prompt concise
      .map((f: { label?: string; type?: string; required?: boolean }) => {
        const label = f.label || f.type || 'unnamed';
        const req = f.required ? ' (required)' : '';
        return `- ${label}${req}`;
      })
      .join('\n');

    const more = fields.length > 15 ? `\n...and ${fields.length - 15} more fields` : '';
    return fieldLabels + more;
  } catch {
    return 'Form fields unavailable.';
  }
}

/**
 * Build a system prompt snippet that gives the AI context about the form.
 * This is appended to the existing auto-reply system prompt.
 */
function buildSystemPromptSnippet(
  formName: string,
  formType: string,
  description: string | null,
  fieldsSummary: string,
): string {
  const purpose = description ? ` Purpose: ${description}` : '';
  return `\n\n--- FORM CONTEXT ---
The visitor is chatting about a form titled "${formName}" (type: ${formType}).${purpose}
This form collects the following information:
${fieldsSummary}

When relevant, guide the visitor toward providing this information naturally.
Don't ask for all fields at once — prioritize the most important ones based on
their message. If they ask about pricing, timing, or requirements, answer
helpfully and steer toward completing the form or booking a slot.`;
}
