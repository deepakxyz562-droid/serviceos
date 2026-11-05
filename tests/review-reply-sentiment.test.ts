import { describe, it, expect } from 'vitest';
import {
  classifyReviewSentiment,
  formatSalutation,
  buildReviewReplyPrompt,
} from '@/lib/reviews/reply-prompt';

describe('Review Reply Sentiment & Prompt Generator', () => {
  it('classifies review ratings into correct sentiment bands', () => {
    expect(classifyReviewSentiment(1)).toBe('critical');
    expect(classifyReviewSentiment(2)).toBe('critical');
    expect(classifyReviewSentiment(3)).toBe('neutral');
    expect(classifyReviewSentiment(4)).toBe('positive');
    expect(classifyReviewSentiment(5)).toBe('positive');
  });

  it('formats custom salutations correctly', () => {
    expect(formatSalutation('Namaste', 'Rahul')).toBe('Namaste Rahul');
    expect(formatSalutation('Dear {author},', 'Priya')).toBe('Dear Priya,');
    expect(formatSalutation(undefined, 'Amit')).toBe('Dear Amit');
  });

  it('generates an apologetic, de-escalating prompt & fallback for 1-star reviews (NEVER says thank you for a great review)', () => {
    const res = buildReviewReplyPrompt({
      author: 'Vikram',
      rating: 1,
      comment: 'Terrible service and rude receptionist',
      businessName: 'Patna Dental Care',
      phone: '+91 98765 43210',
    });

    expect(res.sentiment).toBe('critical');
    // Prompt must instruct AI never to thank for a great review
    expect(res.userPrompt).toContain('NEVER thank them for a "great review"');
    expect(res.userPrompt).toContain('apologize');
    expect(res.userPrompt).toContain('+91 98765 43210');

    // Fallback must be an apology and private contact route
    expect(res.fallbackText).toContain('we are sincerely sorry to hear that your experience with Patna Dental Care did not meet expectations');
    expect(res.fallbackText).toContain('+91 98765 43210');
    expect(res.fallbackText).not.toContain('wonderful feedback');
    expect(res.fallbackText).not.toContain('We truly appreciate your 1-star review');
  });

  it('generates balanced constructive prompt for 3-star reviews', () => {
    const res = buildReviewReplyPrompt({
      author: 'Ananya',
      rating: 3,
      comment: 'Food was decent but delivery was 45 minutes late',
      businessName: 'Patna Spice Hub',
    });

    expect(res.sentiment).toBe('neutral');
    expect(res.userPrompt).toContain('balanced 3-star review');
    expect(res.fallbackText).toContain('continuously working to refine our service');
    expect(res.fallbackText).toContain('deliver a true 5-star experience');
  });

  it('generates enthusiastic praise prompt for 5-star reviews with local SEO cues', () => {
    const res = buildReviewReplyPrompt({
      author: 'Suman',
      rating: 5,
      comment: 'Best haircut in Patna! Very polite staff.',
      businessName: 'Glow Unisex Salon',
      category: 'Salon',
      address: 'Patna, Bihar',
    });

    expect(res.sentiment).toBe('positive');
    expect(res.userPrompt).toContain('glowing 5-star review');
    expect(res.userPrompt).toContain('Salon in Patna');
    expect(res.fallbackText).toContain('wonderful 5-star review');
  });

  it('generates culturally respectful Hindi prompts for Hindi language reviews', () => {
    const res = buildReviewReplyPrompt({
      author: 'राजेश',
      rating: 1,
      comment: 'बहुत खराब सर्विस थी।',
      businessName: 'रॉयल क्लीनिक',
      language: 'Hindi',
      phone: '08505945123',
    });

    expect(res.sentiment).toBe('critical');
    expect(res.fallbackText).toContain('हमें बहुत खेद है');
    expect(res.fallbackText).toContain('08505945123');
    expect(res.userPrompt).toContain('क्षमा मांगें');
  });
});
