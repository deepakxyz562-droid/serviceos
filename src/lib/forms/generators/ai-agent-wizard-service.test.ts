import { describe, it, expect } from 'vitest';
import {
  parseBusinessText,
  generateAgentAndFormFromWizard,
} from './ai-agent-wizard-service';

describe('ai-agent-wizard-service', () => {
  it('parses cleaning company business text accurately', () => {
    const text =
      'We are a home cleaning company serving London. We offer regular cleaning, deep cleaning and end-of-tenancy cleaning.';
    const parsed = parseBusinessText(text);

    expect(parsed.businessName).toBe('London Home Cleaning Company');
    expect(parsed.industry).toBe('Home Cleaning & Maid Services');
    expect(parsed.location).toBe('London');
    expect(parsed.services).toContain('Regular Cleaning');
    expect(parsed.services).toContain('Deep Cleaning');
    expect(parsed.services).toContain('End-Of-Tenancy Cleaning');
  });

  it('parses plumbing emergency service accurately', () => {
    const text =
      'We are a 24/7 emergency plumbing service in Manchester. We fix burst pipes and clogged drains.';
    const parsed = parseBusinessText(text);

    expect(parsed.businessName).toBe('Manchester Emergency Plumbing Service');
    expect(parsed.industry).toBe('Plumbing & Drainage');
    expect(parsed.location).toBe('Manchester');
  });

  it('generates unified agent and form configuration', () => {
    const text =
      'We are a home cleaning company serving London. We offer regular cleaning, deep cleaning and end-of-tenancy cleaning.';
    const result = generateAgentAndFormFromWizard({
      businessDescription: text,
      capabilities: ['answer_questions', 'capture_leads', 'generate_quotes', 'book_appointments', 'collect_files'],
      tone: 'friendly',
      knowledgeUrl: 'https://londoncleaners.example.com',
    });

    // Agent validation
    expect(result.agent).toBeDefined();
    expect(result.agent.name).toBe('London Home Cleaning Company Assistant');
    expect(result.agent.voiceTone).toBe('friendly');
    expect(result.agent.welcomeGreeting).toContain('London Home Cleaning Company');
    expect(result.agent.quickActions.length).toBeGreaterThan(0);
    expect(result.agent.knowledge.crawledUrls).toContain('https://londoncleaners.example.com');

    // Form validation
    expect(result.form).toBeDefined();
    expect(result.form.name).toBe('London Home Cleaning Company Customer Intake Form');
    expect(result.form.fields.length).toBeGreaterThan(3);

    // Verify key fields exist in generated form
    const fieldTypes = result.form.fields.map((f) => f.type);
    expect(fieldTypes).toContain('short_answer'); // Name
    expect(fieldTypes).toContain('phone_number'); // Phone
    expect(fieldTypes).toContain('email'); // Email

    // Workflows validation
    expect(result.workflows.length).toBeGreaterThan(0);
    expect(result.workflows[0].trigger).toBe('lead_captured');
  });
});
