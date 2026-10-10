/** Shared API stage values; older records are normalized for display/filtering. */
export const leadStages = ['new_lead', 'contacted', 'qualified', 'quote_sent', 'negotiation', 'won', 'lost'] as const;
export const leadLabels: Record<string, string> = { new_lead: 'New', contacted: 'Contacted', qualified: 'Qualified', quote_sent: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost' };
export function leadStage(status: string) { return ({ new: 'new_lead', proposal: 'quote_sent' } as Record<string, string>)[status] || status; }
