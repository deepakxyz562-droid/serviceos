import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  IconWidget,
  ImageWidget,
  ButtonWidget,
  BadgeWidget,
  AlertWidget,
  ListWidget,
  SpacerWidget,
} from '@/features/forms/components/runtime/widgets/content/content-widgets';
import { CURATED_STOCK_IMAGES, STOCK_CATEGORIES, searchUnsplashPhotos } from '@/features/forms/components/builder/image-picker-modal';

describe('Element Registry 2.0 Content Widgets & Settings Normalization', () => {
  it('IconWidget renders configured Lucide icon dynamically from config prop', () => {
    const { container } = render(
      <IconWidget
        config={{ iconName: 'ShieldCheck', iconColor: '#10b981', size: 32 }}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.getAttribute('width')).toBe('32');
  });

  it('IconWidget falls back gracefully when given legacy or nested field config', () => {
    const { container } = render(
      <IconWidget
        field={{ id: 'icon-1', type: 'icon_widget', widgetConfig: { iconName: 'Sparkles', size: 24 } } as any}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.getAttribute('width')).toBe('24');
  });

  it('ImageWidget renders src, alt text and rounded border classes', () => {
    const testImg = 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=1200';
    render(
      <ImageWidget
        config={{ src: testImg, alt: 'Custom Roofing Job', borderRadius: '12px' }}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe(testImg);
    expect(img.getAttribute('alt')).toBe('Custom Roofing Job');
  });

  it('ButtonWidget renders with custom button label and styling', () => {
    render(
      <ButtonWidget
        config={{ text: 'Request Free Quote Now', variant: 'default', fullWidth: true }}
      />
    );
    expect(screen.getByText('Request Free Quote Now')).toBeDefined();
  });

  it('BadgeWidget, AlertWidget, and ListWidget render their respective configurations', () => {
    render(
      <div>
        <BadgeWidget config={{ text: '⭐ 100% Guaranteed', variant: 'solid' }} />
        <AlertWidget config={{ text: 'Financing available starting at 0% APR', type: 'info' }} />
        <ListWidget config={{ items: ['Zero hidden fees', 'Real-time calculation', 'Free warranty'] }} />
      </div>
    );
    expect(screen.getByText('⭐ 100% Guaranteed')).toBeDefined();
    expect(screen.getByText('Financing available starting at 0% APR')).toBeDefined();
    expect(screen.getByText('Zero hidden fees')).toBeDefined();
    expect(screen.getByText('Free warranty')).toBeDefined();
  });

  it('SpacerWidget applies custom height styling', () => {
    const { container } = render(<SpacerWidget config={{ height: 48 }} />);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer.style.height).toBe('48px');
  });
});

describe('Image Picker & Royalty-Free Unsplash Search', () => {
  it('provides rich curated collections for service businesses (Roofing, HVAC, Solar, Plumbing)', () => {
    expect(CURATED_STOCK_IMAGES.length).toBeGreaterThanOrEqual(10);
    expect(STOCK_CATEGORIES).toContain('Roofing');
    expect(STOCK_CATEGORIES).toContain('HVAC');
    expect(STOCK_CATEGORIES).toContain('Plumbing');
    expect(STOCK_CATEGORIES).toContain('Solar');
  });

  it('filters stock photos by search keyword', () => {
    const results = searchUnsplashPhotos('solar');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.title.toLowerCase().includes('solar') || r.category.toLowerCase().includes('solar'))).toBe(true);
  });
});

describe('Public Form Slug Sanitization & Publishing Link Engine', () => {
  it('strips leading and trailing hyphens from complex form titles', () => {
    const rawTitle = 'Roof Replacement & Renovation Live Estimator (2-Column)';
    const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    expect(slug).toBe('roof-replacement-renovation-live-estimator-2-column');
    expect(slug.endsWith('-')).toBe(false);
  });

  it('handles slug generation with special symbols and whitespace cleanly', () => {
    const rawTitle = '--- ⭐ 100% Guaranteed AC Installation --- ';
    const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    expect(slug).toBe('100-guaranteed-ac-installation');
  });
});
