import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PosterTemplateGallery } from '@/components/bgos/poster-template-gallery';
import { POSTER_TEMPLATES, getTemplateById } from '../shared/poster-templates';

const business = {
  businessName: 'Sharma Jewellers',
  category: 'Jewellery Store',
  phone: '+91 98765 43210',
  website: 'sharmajewellers.in',
  tagline: 'Since 1995',
};

const onSelect = vi.fn();
const onStartFromPrompt = vi.fn();

function renderGallery(overrides: Record<string, unknown> = {}) {
  return render(
    <PosterTemplateGallery
      business={business}
      onSelect={onSelect}
      onStartFromPrompt={onStartFromPrompt}
      {...overrides}
    />
  );
}

beforeEach(() => {
  onSelect.mockClear();
  onStartFromPrompt.mockClear();
});

afterEach(cleanup);

describe('PosterTemplateGallery (Flyer-Maker-style entry)', () => {
  it('renders hero actions, category chips and one card per template', () => {
    renderGallery();
    expect(screen.getByText(/Surprise me — AI poster in 1 tap/i)).toBeTruthy();
    expect(screen.getByText(/Describe your own idea/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /For you/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /All templates/ }));
    const cards = screen.getAllByRole('button', { name: /^Use .+ template$/ });
    expect(cards.length).toBe(POSTER_TEMPLATES.length);
  });

  it('surfaces active festival templates first in All view (Diwali in November)', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: /All templates/ }));
    const cards = screen.getAllByRole('button', { name: /^Use .+ template$/ });
    const labels = cards.map((c) => c.getAttribute('aria-label') || '');
    expect(labels[0]).toBe(`Use ${getTemplateById('diwali-glow')!.name} template`);
  });

  it('shows the live-now occasion ribbon when a festival window is active', () => {
    renderGallery();
    // Diwali window is Sep–Nov; check by current month to stay date-independent
    const month = new Date().getMonth() + 1;
    const diwaliActive = month >= 9 && month <= 11;
    expect(screen.queryAllByText(/Diwali & Festive Season/).length > 0).toBe(diwaliActive);
  });

  it('selects a template on card click with the full template payload', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: 'Use Mega Sale template' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0][0];
    expect(arg.id).toBe('mega-sale-bold');
    expect(arg.layout).toBe(getTemplateById('mega-sale-bold')!.layout);
    expect(arg.headline).not.toMatch(/50%/);
    expect(arg.bgPrompt).toMatch(/NO TEXT/i);
  });

  it('filters by category chips', () => {
    renderGallery();
    // chips render before cards; the chip is the first button matching the name
    const chip = screen.getAllByRole('button', { name: /We're Hiring/ })[0];
    fireEvent.click(chip);
    const cards = screen.getAllByRole('button', { name: /^Use .+ template$/ });
    expect(cards.length).toBe(POSTER_TEMPLATES.filter((t) => t.category === 'hiring').length);
  });

  it('filters by search keyword across name and headline', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: /All templates/ }));
    const input = screen.getByPlaceholderText('Search designs…') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'diwali' } });
    const cards = screen.getAllByRole('button', { name: /^Use .+ template$/i });
    const labels = cards.map((c) => c.getAttribute('aria-label') || '').join(' ');
    expect(labels.toLowerCase()).toContain('diwali');
    expect(screen.queryByRole('button', { name: 'Use Mega Sale template' })).toBeNull();
  });

  it('ranks industry-matched templates into For You (jewellery business)', () => {
    renderGallery();
    const cards = screen.getAllByRole('button', { name: /^Use .+ template$/ });
    const labels = cards.map((c) => c.getAttribute('aria-label') || '');
    expect(labels).toContain('Use Gold Offer template');
  });

  it('falls back to generic templates in For You when no industry matches', () => {
    renderGallery({ business: { ...business, category: 'Aerospace Component Manufacturer' } });
    // 'any'-industry templates always apply → For You shows those (never empty, capped at top 8)
    const cards = screen.getAllByRole('button', { name: /^Use .+ template$/ });
    expect(cards.length).toBe(
      Math.min(8, POSTER_TEMPLATES.filter((t) => t.industries?.includes('any')).length)
    );
  });

  it('navigates to the AI prompt studio from the describe-idea card', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: /Describe your own idea/i }));
    expect(onStartFromPrompt).toHaveBeenCalledTimes(1);
  });

  it('surprise-me always picks a valid template', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: /Surprise me — AI poster in 1 tap/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(POSTER_TEMPLATES.some((t) => t.id === onSelect.mock.calls[0][0].id)).toBe(true);
  });

  it('renders personalised brand text inside preview thumbs', () => {
    renderGallery();
    // business name is fed into composed preview docs via footer layers
    const html = document.body.innerHTML;
    expect(html).toContain('Sharma Jewellers');
  });
});

 it('filters the Creative collection without mixing standard cards',()=>{
  renderGallery(); fireEvent.click(screen.getByRole('button',{name:'Creative'}));
  expect(screen.getAllByRole('button',{name:/^Use .+ template$/})).toHaveLength(POSTER_TEMPLATES.filter(t=>t.collection==='creative').length);
 });

it('offers the professional collection and applies a layered industry template',()=>{
 renderGallery();fireEvent.click(screen.getByRole('button',{name:'Professional collection'}));
 expect(screen.getAllByRole('button',{name:/^Use .+ template$/})).toHaveLength(12);
 fireEvent.click(screen.getByRole('button',{name:'Use Plumbing • Ready to help template'}));
 expect(onSelect.mock.calls.at(-1)?.[0].id).toBe('professional-plumbing');
});
