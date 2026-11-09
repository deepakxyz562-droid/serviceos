import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  IMAGE_QUICK_FIX_OPTIONS,
  appendImageCandidate,
  buildRefinedImagePrompt,
  getAspectRatioNumeric,
  type ImageCandidate,
} from '../shared/image-review';

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { FullscreenImageLightbox } from '@/components/bgos/fullscreen-image-lightbox';
import { WebMediaMetadataDialog } from '@/components/bgos/media-metadata-dialog';
import { WebMediaPreviewDialog } from '@/components/bgos/web-media-preview-dialog';
import { MarketingCanvasStudio } from '@/components/bgos/marketing-canvas-studio';
import { FullscreenImageModal } from '../bgosmobile/src/components/gbp/fullscreen-image-modal';

describe('shared/image-review helpers', () => {
  it('builds refined prompts with selected quick-fix chips and strips prior refinement block', () => {
    const first = buildRefinedImagePrompt(
      'Luxury espresso bar interior',
      ['clean_text_faces', 'better_lighting'],
      'warmer wood tones',
    );
    expect(first).toContain('Luxury espresso bar interior');
    expect(first).toContain(IMAGE_QUICK_FIX_OPTIONS[0].instruction);
    expect(first).toContain('warmer wood tones');

    const second = buildRefinedImagePrompt(first, ['simpler_bg'], 'fewer props');
    expect(second.startsWith('Luxury espresso bar interior\n[Quality refinements:')).toBe(true);
    expect(second).not.toContain('warmer wood tones');
    expect(second).toContain('fewer props');
    expect(second).not.toContain(IMAGE_QUICK_FIX_OPTIONS[0].instruction);
  });

  it('appends and deduplicates candidates while respecting cap', () => {
    let list: ImageCandidate[] = [];
    list = appendImageCandidate(list, { url: 'https://cdn.example.com/v1.jpg', prompt: 'p1', provider: 'cloudflare' }, 2);
    list = appendImageCandidate(list, { url: 'https://cdn.example.com/v2.jpg', prompt: 'p2', provider: 'gemini' }, 2);
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.url)).toEqual([
      'https://cdn.example.com/v1.jpg',
      'https://cdn.example.com/v2.jpg',
    ]);

    // Deduplicate same URL & update metadata without duplicating slot
    list = appendImageCandidate(list, { url: 'https://cdn.example.com/v1.jpg', prompt: 'p1-updated', provider: 'openrouter' }, 2);
    expect(list).toHaveLength(2);
    expect(list[0].prompt).toBe('p1-updated');
    expect(list[0].provider).toBe('openrouter');

    // Cap to most recent 2 items
    list = appendImageCandidate(list, { url: 'https://cdn.example.com/v3.jpg', prompt: 'p3' }, 2);
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.url)).toEqual([
      'https://cdn.example.com/v2.jpg',
      'https://cdn.example.com/v3.jpg',
    ]);
  });

  it('computes numeric aspect ratios reliably', () => {
    expect(getAspectRatioNumeric('1:1')).toBe(1);
    expect(getAspectRatioNumeric('4:5')).toBeCloseTo(0.8);
    expect(getAspectRatioNumeric('9:16')).toBeCloseTo(9 / 16);
    expect(getAspectRatioNumeric('16:9')).toBeCloseTo(16 / 9);
    expect(getAspectRatioNumeric(undefined)).toBeCloseTo(0.8);
  });
});

describe('Web FullscreenImageLightbox', () => {
  afterEach(cleanup);

  it('supports zoom controls, clean view toggle, candidate comparison, refine & retry, and approval', async () => {
    const candidates: ImageCandidate[] = [
      { id: 'c1', url: 'https://cdn.example.com/v1.png', prompt: 'Cafe latte art', provider: 'cloudflare' },
      { id: 'c2', url: 'https://cdn.example.com/v2.png', prompt: 'Cafe latte art refined', provider: 'gemini' },
    ];
    const onSelectCandidate = vi.fn();
    const onApprove = vi.fn();
    const onRegenerate = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <FullscreenImageLightbox
        open={true}
        onOpenChange={onOpenChange}
        imageUrl="https://cdn.example.com/v2.png"
        title="AI Photo Inspection"
        candidates={candidates}
        selectedUrl="https://cdn.example.com/v2.png"
        onSelectCandidate={onSelectCandidate}
        reviewMode
        isApproved={false}
        onApprove={onApprove}
        basePrompt="Cafe latte art"
        activeProvider="cloudflare"
        allowProviderSwitch
        onRegenerate={onRegenerate}
      />,
    );

    const dialog = screen.getByTestId('fullscreen-image-lightbox');
    expect(within(dialog).getByText('Version 2 of 2')).toBeInTheDocument();

    // Zoom in and reset
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zoom in image' }));
    expect(within(dialog).getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('1.5×');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fit to screen' }));
    expect(within(dialog).getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('1×');

    // Clean view hides HUD controls and restores on Show Controls
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hide controls for clean view' }));
    expect(within(dialog).queryByText('Not Good · Fix & Retry')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /Show Controls/i }));
    expect(within(dialog).getByText('Not Good · Fix & Retry')).toBeInTheDocument();

    // Switch candidate to v1
    fireEvent.click(within(dialog).getByRole('button', { name: 'Select version 1' }));
    expect(onSelectCandidate).toHaveBeenCalledWith(candidates[0]);

    // Open Fix & Retry drawer, choose chip + note + provider switch, and trigger regenerate
    fireEvent.click(within(dialog).getByRole('button', { name: /Not Good · Fix & Retry/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Clean up faces & text/i }));
    fireEvent.change(within(dialog).getByPlaceholderText(/Optional note/i), {
      target: { value: 'remove text on cup' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Flux Pro' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Regenerate Variation/i }));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
    const regenCall = onRegenerate.mock.calls[0][0];
    expect(regenCall.prompt).toContain('Cafe latte art refined');
    expect(regenCall.prompt).toContain('remove text on cup');
    expect(regenCall.fixIds).toEqual(['clean_text_faces']);
    expect(regenCall.customNote).toBe('remove text on cup');
    expect(regenCall.provider).toBe('openrouter');

    // Approve current image
    fireEvent.click(within(dialog).getByRole('button', { name: /Looks Good · Use Image/i }));
    expect(onApprove).toHaveBeenCalledWith('https://cdn.example.com/v2.png');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Web WebMediaMetadataDialog AI fullscreen review loop', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-opens FullscreenImageLightbox after generating an AI image and preserves v1 alongside v2 on retry', async () => {
    const postPayloads: Array<Record<string, any>> = [];
    let jobSeq = 0;

    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/bgos/workspace')) {
        return new Response(
          JSON.stringify({ name: 'Roast & Bloom', category: 'Coffee Shop', location: 'Austin, TX' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/social/ai-image-ideas')) {
        return new Response(JSON.stringify({ ideas: [], previousPhotos: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/social/ai-seo-metadata')) {
        return new Response(
          JSON.stringify({
            title: 'Artisan Espresso Showcase',
            description: 'Freshly brewed single-origin coffee.',
            tags: ['espresso', 'cafe'],
            category: 'PRODUCT',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/social/designs/image') && init?.method === 'POST') {
        jobSeq += 1;
        postPayloads.push(JSON.parse(String(init.body || '{}')));
        return new Response(JSON.stringify({ jobId: `job-${jobSeq}`, status: 'queued' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/social/designs/image?id=')) {
        const match = url.match(/job-(\d+)/);
        const idx = match ? match[1] : '1';
        return new Response(
          JSON.stringify({
            status: 'completed',
            result: { url: `https://cdn.example.com/ai-v${idx}.jpg` },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    render(
      <WebMediaMetadataDialog
        open={true}
        onOpenChange={() => {}}
        businessName="Roast & Bloom"
        initialMode="ai_generate"
        onSaved={() => {}}
      />,
    );

    const promptBox = await screen.findByPlaceholderText(/Showcase Roast & Bloom/i);
    fireEvent.change(promptBox, { target: { value: 'Pour-over coffee bar' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Image/i }));

    // Poll interval is 2000ms, wait for completion & auto-open of fullscreen lightbox
    const lightbox = await waitFor(
      () => screen.getByTestId('fullscreen-image-lightbox'),
      { timeout: 6000 },
    );

    const imgEl = within(lightbox).getByRole('img') as HTMLImageElement;
    expect(imgEl.src).toBe('https://cdn.example.com/ai-v1.jpg');

    // Judge as Not Good -> pick quick fix -> Regenerate Variation
    fireEvent.click(within(lightbox).getByRole('button', { name: /Not Good · Fix & Retry/i }));
    fireEvent.click(within(lightbox).getByRole('button', { name: /Brighter & warmer light/i }));
    fireEvent.click(within(lightbox).getByRole('button', { name: /Regenerate Variation/i }));

    await waitFor(
      () => {
        expect(within(lightbox).getByText('Version 2 of 2')).toBeInTheDocument();
      },
      { timeout: 6000 },
    );

    expect(postPayloads.length).toBe(2);
    expect(postPayloads[1].prompt).toContain('Pour-over coffee bar');
    expect(postPayloads[1].prompt).toContain('golden-hour commercial lighting');

    // Both v1 and v2 remain available in variation strip; selecting v1 switches main stage cleanly
    fireEvent.click(within(lightbox).getByRole('button', { name: 'Select version 1' }));
    expect(within(lightbox).getByText('Version 1 of 2')).toBeInTheDocument();
    expect(
      (within(lightbox).getByAltText('Full screen image inspection') as HTMLImageElement).src,
    ).toBe('https://cdn.example.com/ai-v1.jpg');

    // Approve v1 -> closes lightbox & marks approved status in dialog
    fireEvent.click(within(lightbox).getByRole('button', { name: /Looks Good · Use Image/i }));
    await waitFor(() => {
      expect(screen.queryByTestId('fullscreen-image-lightbox')).toBeNull();
    });
    expect(screen.getByText(/✓ Approved — Ready to schedule or publish/i)).toBeInTheDocument();
  }, 15000);
});

describe('Mobile FullscreenImageModal (bgosmobile)', () => {
  afterEach(cleanup);

  it('returns null when hidden', () => {
    const { container } = render(
      <FullscreenImageModal
        visible={false}
        onClose={() => {}}
        imageUrl="https://cdn.example.com/mob-v1.jpg"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('supports asOverlay rendering, zoom controls, clean view toggle, candidate comparison, refine retry, and approval', () => {
    const candidates: ImageCandidate[] = [
      { id: 'm1', url: 'https://cdn.example.com/mob-v1.jpg', prompt: 'Fresh sourdough loaves', provider: 'cloudflare' },
      { id: 'm2', url: 'https://cdn.example.com/mob-v2.jpg', prompt: 'Fresh sourdough refined', provider: 'gemini' },
    ];
    const onSelectCandidate = vi.fn();
    const onApprove = vi.fn();
    const onRegenerate = vi.fn();
    const onClose = vi.fn();

    render(
      <FullscreenImageModal
        visible={true}
        asOverlay
        onClose={onClose}
        imageUrl="https://cdn.example.com/mob-v2.jpg"
        title="AI Photo Inspection"
        candidates={candidates}
        selectedUrl="https://cdn.example.com/mob-v2.jpg"
        onSelectCandidate={onSelectCandidate}
        reviewMode
        isApproved={false}
        onApprove={onApprove}
        basePrompt="Fresh sourdough loaves"
        activeProvider="cloudflare"
        allowProviderSwitch
        onRegenerate={onRegenerate}
      />,
    );

    expect(screen.getByText('Version 2 of 2')).toBeInTheDocument();

    // Zoom in and reset
    fireEvent.click(screen.getByLabelText('Zoom in image'));
    expect(screen.getByText('1.5×')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Reset zoom'));
    expect(screen.getByText('1×')).toBeInTheDocument();

    // Clean view toggle
    fireEvent.click(screen.getByLabelText('Hide controls'));
    expect(screen.queryByText(/Not Good · Fix/i)).toBeNull();
    fireEvent.click(screen.getByLabelText('Show controls'));
    expect(screen.getByText(/Not Good · Fix/i)).toBeInTheDocument();

    // Switch variation to v1
    fireEvent.click(screen.getByLabelText('Select version 1'));
    expect(onSelectCandidate).toHaveBeenCalledWith(candidates[0]);

    // Fix & Retry
    fireEvent.click(screen.getByLabelText('Not good, fix and regenerate image'));
    fireEvent.click(screen.getByText('More realistic photo'));
    fireEvent.change(screen.getByPlaceholderText(/optional.*note/i), {
      target: { value: 'natural crust texture' },
    });
    fireEvent.click(screen.getByText('Gemini Vision'));
    fireEvent.click(screen.getByText('Regenerate Variation'));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
    expect(onRegenerate.mock.calls[0][0]).toMatchObject({
      fixIds: ['more_realistic'],
      customNote: 'natural crust texture',
      provider: 'gemini',
    });
    expect(onRegenerate.mock.calls[0][0].prompt).toContain('Fresh sourdough refined');
    expect(onRegenerate.mock.calls[0][0].prompt).toContain('DSLR commercial photograph');

    // Approve & close
    fireEvent.click(screen.getByLabelText('Looks good, use this image'));
    expect(onApprove).toHaveBeenCalledWith('https://cdn.example.com/mob-v2.jpg');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Web WebMediaPreviewDialog & MarketingCanvasStudio fullscreen triggers', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens read-only FullscreenImageLightbox when Inspect Full Screen is clicked on a photo item', () => {
    render(
      <WebMediaPreviewDialog
        open={true}
        onOpenChange={() => {}}
        businessName="Roast & Bloom"
        item={{
          id: 'item-1',
          url: 'https://cdn.example.com/storefront.jpg',
          title: 'Morning Pour',
          mediaFormat: 'PHOTO',
          gbpCategory: 'EXTERIOR',
          status: 'published',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Inspect Full Screen/i }));
    const lightbox = screen.getByTestId('fullscreen-image-lightbox');
    expect(within(lightbox).getByText('Morning Pour')).toBeInTheDocument();
    expect((within(lightbox).getByAltText('Morning Pour') as HTMLImageElement).src).toBe(
      'https://cdn.example.com/storefront.jpg',
    );
    expect(within(lightbox).queryByText(/Not Good · Fix & Retry/i)).toBeNull();
  });

  it('supports Inspect Full Screen composite poster & AI Photo quality review inside MarketingCanvasStudio', async () => {
    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/bgos/workspace')) {
        return new Response(
          JSON.stringify({ name: 'Roast & Bloom', businessName: 'Roast & Bloom', slug: 'roast' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/social/designs/image') && init?.method === 'POST') {
        return new Response(JSON.stringify({ jobId: 'studio-job-1', status: 'queued' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/social/designs/image?id=')) {
        return new Response(
          JSON.stringify({
            status: 'completed',
            result: { url: 'https://cdn.example.com/studio-ai-v1.jpg' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    render(<MarketingCanvasStudio businessName="Roast & Bloom" category="Coffee Shop" />);

    // Enter studio from template gallery
    fireEvent.click(screen.getByText('Describe your own idea'));

    // Inspect Full Screen opens full composite poster
    fireEvent.click(screen.getByRole('button', { name: /Inspect Full Screen$/i }));
    let lightbox = screen.getByTestId('fullscreen-image-lightbox');
    expect(within(lightbox).getByText('Full Screen Poster Inspection')).toBeInTheDocument();
    fireEvent.click(within(lightbox).getByRole('button', { name: 'Close full screen preview' }));

    await waitFor(() => {
      expect(screen.queryByTestId('fullscreen-image-lightbox')).toBeNull();
    });

    // Generate New AI photo -> opens AI Photo Quality Review lightbox automatically
    fireEvent.click(screen.getByRole('button', { name: /New AI photo/i }));
    lightbox = await waitFor(
      () => screen.getByTestId('fullscreen-image-lightbox'),
      { timeout: 5000 },
    );
    expect(within(lightbox).getByText('AI Photo Quality Review')).toBeInTheDocument();
    expect(
      (within(lightbox).getByAltText('Full screen campaign visual') as HTMLImageElement).src,
    ).toBe('https://cdn.example.com/studio-ai-v1.jpg');

    // Approve AI image and verify button badge updates in studio
    fireEvent.click(within(lightbox).getByRole('button', { name: /Looks Good · Use Image/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /AI Photo Approved/i })).toBeInTheDocument();
    });
  }, 15000);
});
