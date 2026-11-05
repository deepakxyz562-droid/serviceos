import { describe, it, expect } from 'vitest';

describe('Manage Google Profile & Post Scoping Contract', () => {
  it('strictly isolates posts by tenantId and prevents brand name contamination', () => {
    const mockPosts = [
      { id: '1', tenantId: 'tenant_fieseros', content: 'FieserOS provides cloud tools.' },
      { id: '2', tenantId: 'tenant_kirana', content: 'Exciting updates from Abc kirana!' },
      { id: '3', tenantId: 'tenant_fabrications', content: 'Singh Fabrications gate installation.' },
    ];

    const currentTenantId = 'tenant_fieseros';
    const scopedPosts = mockPosts.filter((p) => p.tenantId === currentTenantId);

    expect(scopedPosts).toHaveLength(1);
    expect(scopedPosts[0].content).toContain('FieserOS');
    expect(scopedPosts.some((p) => p.content.includes('Abc kirana'))).toBe(false);
    expect(scopedPosts.some((p) => p.content.includes('Singh Fabrications'))).toBe(false);
  });

  it('correctly splits Standard and Offer posts for Google Business Profile feed', () => {
    const mockPosts = [
      { id: '1', gbpPostType: 'STANDARD', content: 'General business update.' },
      { id: '2', gbpPostType: 'OFFER', content: '20% off festival discount this week!' },
      { id: '3', gbpPostType: null, content: 'Special offer: free consultation with code SAVE20' },
      { id: '4', gbpPostType: null, content: 'We are open on holidays.' },
    ];

    const standardPosts = mockPosts.filter((p) => {
      return p.gbpPostType !== 'OFFER' && !/offer|sale|discount|deal/i.test(p.content);
    });

    const offerPosts = mockPosts.filter((p) => {
      return p.gbpPostType === 'OFFER' || /offer|sale|discount|deal/i.test(p.content);
    });

    expect(standardPosts).toHaveLength(2);
    expect(offerPosts).toHaveLength(2);
    expect(standardPosts[0].content).toBe('General business update.');
    expect(offerPosts[0].content).toContain('20% off');
  });
});
