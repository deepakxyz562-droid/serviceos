import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies for ai-generate-post
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ai-client', () => ({
  callAI: vi.fn(),
}));

vi.mock('@/lib/brand-context', () => ({
  getBrandContext: vi.fn(),
}));

vi.mock('@/lib/supabase-storage', () => ({
  uploadFile: vi.fn(),
}));

describe('GBP AI Post Creation & Dual-Edit Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a tailored GBP post accepting a reference photo URL and topic', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');
    const { callAI } = await import('@/lib/ai-client');
    const { getBrandContext } = await import('@/lib/brand-context');
    const { POST } = await import('@/app/api/social/ai-generate-post/route');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      role: 'ADMIN',
    } as any);

    vi.mocked(db.tenant.findUnique).mockResolvedValue({
      name: 'Delhi Farm Pool & Resort',
      phone: '+91 98765 43210',
      city: 'Delhi',
      industry: 'Farmhouse & Pool Retreat',
      website: 'https://delhifarm.com',
      brandProfile: {
        businessName: 'Delhi Farm',
        industry: 'Farmhouse & Pool Retreat',
        location: 'Delhi, India',
        website: 'https://delhifarm.com',
      },
    } as any);

    vi.mocked(getBrandContext).mockResolvedValue('Premier private farmhouse with luxury pool');

    vi.mocked(callAI).mockResolvedValue({
      content: JSON.stringify({
        title: 'Plan the Perfect Family Reunion',
        headline: 'Create Unforgettable Memories at Delhi Farm',
        subtitle: 'Private pool, lush green lawns & personalized hospitality',
        badge: 'SPECIAL OFFER',
        ctaText: 'Book now',
        caption:
          'Looking for the perfect venue for your next family pool party? Enjoy private swimming, scenic greenery, and delicious refreshments.\n\nCall us today!',
        hashtags: ['#DelhiFarm', '#PoolParty', '#DelhiGetaway', '#GoogleBusiness'],
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/social/ai-generate-post', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Perfect venue for your next family pool party',
        referenceImageUrl: 'https://storage.googleapis.com/test-bucket/my-pool-ref.jpg',
        postType: 'standard',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.headline).toContain('Create Unforgettable Memories');
    expect(data.caption).toContain('Looking for the perfect venue');
    // Verifies that the user's authentic reference photo was honored
    expect(data.photoUrl).toBe('https://storage.googleapis.com/test-bucket/my-pool-ref.jpg');
    // Verifies that the user's authentic photo is directly preserved in imageUrl without synthetic graphic replacement
    expect(data.imageUrl).toBe('https://storage.googleapis.com/test-bucket/my-pool-ref.jpg');
    expect(data.gbpPostType).toBe('standard');
    expect(data.gbpCtaAction).toBe('CALL');
  });

  it('preserves attached photo verbatim and generates SEO-friendly content only', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');
    const { callAI } = await import('@/lib/ai-client');
    const { uploadFile } = await import('@/lib/supabase-storage');
    const { POST } = await import('@/app/api/social/ai-generate-post/route');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      role: 'ADMIN',
    } as any);

    vi.mocked(db.tenant.findUnique).mockResolvedValue({
      name: 'Dr. Smile Dental Clinic',
      phone: '+91 91234 56789',
      city: 'Mumbai',
      industry: 'Dental Clinic',
      website: 'https://drsmile.in',
      brandProfile: {
        businessName: 'Dr. Smile Dental Clinic',
        industry: 'Dental Clinic',
        location: 'Bandra, Mumbai',
      },
    } as any);

    vi.mocked(callAI).mockResolvedValue({
      content: JSON.stringify({
        title: 'Teeth Whitening Near Bandra Mumbai',
        headline: 'Brighten Your Smile with Top Dentists in Bandra',
        subtitle: 'Painless teeth whitening and orthodontic care',
        badge: 'LIMITED SLOTS',
        ctaText: 'Call now',
        caption:
          'Looking for top-rated teeth whitening in Bandra Mumbai? Visit Dr. Smile Dental Clinic for advanced care.\n\n✨ Pain-free treatments\n✨ Certified specialist team\n✨ Convenient weekend appointments\n\nCall +91 91234 56789 or visit our clinic today!',
        hashtags: ['#DentalClinicMumbai', '#TeethWhitening', '#BandraDentist', '#GoogleBusiness'],
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/social/ai-generate-post', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Advanced teeth whitening clinic update',
        attachedImageUrl: 'https://images.serviceos.com/tenants/t1/clinic-interior.jpg',
        targetKeyword: 'teeth whitening near me Bandra',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.imageUrl).toBe('https://images.serviceos.com/tenants/t1/clinic-interior.jpg');
    expect(data.photoUrl).toBe('https://images.serviceos.com/tenants/t1/clinic-interior.jpg');
    // Verifies that uploadFile (synthetic card generation) was never called because photo was attached
    expect(uploadFile).not.toHaveBeenCalled();
    expect(data.caption).toContain('teeth whitening in Bandra Mumbai');
    expect(data.hashtags).toContain('#DentalClinicMumbai');
  });

  it('supports special offer post type and returns offer CTA', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');
    const { callAI } = await import('@/lib/ai-client');
    const { POST } = await import('@/app/api/social/ai-generate-post/route');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      role: 'ADMIN',
    } as any);

    vi.mocked(db.tenant.findUnique).mockResolvedValue({
      name: 'Delhi Farm',
      phone: '+91 98765 43210',
      city: 'Delhi',
      industry: 'Hospitality',
      brandProfile: { businessName: 'Delhi Farm' },
    } as any);

    vi.mocked(callAI).mockResolvedValue({
      content: JSON.stringify({
        title: '20% Off Midweek Pool Bookings',
        headline: 'Exclusive Midweek Pool Promotion',
        badge: '20% OFF',
        ctaText: 'Claim offer',
        caption: 'Enjoy 20% off all farmhouse stays from Tuesday through Thursday.',
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/social/ai-generate-post', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Midweek special discount on pool party',
        theme: 'promo',
        postType: 'offer',
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.gbpPostType).toBe('offer');
    expect(data.gbpCtaAction).toBe('GET_OFFER');
    expect(data.badge).toBe('20% OFF');
  });
});
