/**
 * Template Audiences — the fourth classification axis.
 *
 * Describes who is filling out the form. Useful for filtering the gallery
 * ("show me B2B forms") and for the variation engine (B2B forms tend to
 * ask for company name, title, budget; B2C forms ask for personal info).
 */

export interface AudienceDefinition {
  id: string;
  label: string;
  description: string;
}

export const TEMPLATE_AUDIENCES: AudienceDefinition[] = [
  { id: 'b2b', label: 'Business to Business (B2B)', description: 'Form is filled out by a business representative on behalf of their company.' },
  { id: 'b2c', label: 'Business to Consumer (B2C)', description: 'Form is filled out by an individual consumer.' },
  { id: 'internal', label: 'Internal', description: 'Form is filled out by employees within the same organization.' },
  { id: 'nonprofit', label: 'Nonprofit', description: 'Form targets donors, volunteers, or beneficiaries of a nonprofit.' },
  { id: 'government', label: 'Government', description: 'Form targets citizens interacting with a government agency.' },
  { id: 'education', label: 'Education', description: 'Form targets students, parents, or educators.' },
  { id: 'consumer', label: 'General Consumer', description: 'Form targets the general public with no specific business context.' },
];

export const AUDIENCE_MAP = new Map(TEMPLATE_AUDIENCES.map((a) => [a.id, a]));

export function getAudienceLabel(id: string): string {
  return AUDIENCE_MAP.get(id)?.label ?? id;
}
