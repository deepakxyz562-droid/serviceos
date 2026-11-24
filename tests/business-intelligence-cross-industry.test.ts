import { describe, it, expect } from 'vitest';
import { getBusinessIntelligence } from '../src/lib/business-intelligence/service';
import { conductAiBusinessResearch } from '../src/lib/business-intelligence/research-agent';
import { validatePostRelevance } from '../src/lib/business-intelligence/relevance-validator';
import { generateIndustryAwarePost } from '../src/lib/business-intelligence/post-generator';
import type { BusinessIntelligenceRawEvidence } from '../src/lib/business-intelligence/types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('BGOS Automatic AI Business Intelligence & Cross-Industry Verification', () => {
  // Test 1: Real CineManiaa Tenant Data
  it('identifies CineManiaa Film Studio authentically with zero IT contamination', async () => {
    const intel = await getBusinessIntelligence('ciHRN7-GOKBLwskkQbVA0O4O6');

    expect(intel.businessName.value).toBe('CineManiaa Film Studio and Productions');
    expect(intel.businessCategory.value.toLowerCase()).toMatch(/film|video|production/i);
    expect(intel.negativeBoundaries.join(' ').toLowerCase()).toMatch(/it strategy|software/i);
    expect(intel.verifiedServices.length).toBeGreaterThan(0);

    // Verify negative boundaries reject IT Strategy posts
    const itPost = {
      title: 'How Professional IT Strategy & Consulting Elevates Enterprise Performance in Mumbai',
      content: 'Reliable cloud infrastructure and IT Strategy & Consulting in Mumbai optimize operations.',
    };
    const validation = await validatePostRelevance(itPost, intel);
    expect(validation.is_relevant).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);

    // Verify post generation for CineManiaa
    const post = await generateIndustryAwarePost({
      tenantId: 'ciHRN7-GOKBLwskkQbVA0O4O6',
      topic: 'Behind the Scenes & Process',
    });
    expect(post.relevanceScore).toBeGreaterThanOrEqual(80);
    expect(post.title.toLowerCase()).not.toMatch(/it strategy|software engineering|cloud infrastructure/i);
    expect(post.fullCaption.toLowerCase()).not.toMatch(/it strategy|cloud infrastructure|cybersecurity/i);
    expect(post.fullCaption.toLowerCase()).toMatch(/film|production|story|screen|scene|camera|director|creative/i);
  }, 90000);

  // Test 2: Dental Clinic
  it('correctly understands and isolates a Dental Clinic', async () => {
    await sleep(4000);
    const evidence: BusinessIntelligenceRawEvidence = {
      tenantId: 'test-dental',
      businessName: 'Apex Family Dental Care',
      industryFromDb: 'Dentist',
      addressFromDb: '142 Park Avenue, Chicago, IL',
      gbpPrimaryCategory: 'Dental Clinic',
      gbpAdditionalCategories: ['Cosmetic Dentist', 'Teeth Whitening Service'],
      offeringsFromSettings: ['Teeth Cleaning', 'Root Canal Treatment', 'Invisalign Clear Aligners', 'Dental Implants'],
      recentReviews: [
        { author: 'Sarah M.', rating: 5, text: 'Dr. Johnson was gentle and thorough. My teeth whitening looks amazing!' },
      ],
    };

    const intel = await conductAiBusinessResearch(evidence);
    expect(intel.businessCategory.value.toLowerCase()).toMatch(/dent|oral|clinic/i);
    expect(intel.negativeBoundaries.join(' ').toLowerCase()).toMatch(/it strategy|software|plumbing|film/i);

    // Check relevance validator rejects IT Strategy post
    const fakePost = {
      title: 'How IT Strategy Drives Digital Transformation',
      content: 'We provide software architecture and cloud migration consulting.',
    };
    const val = await validatePostRelevance(fakePost, intel);
    expect(val.is_relevant).toBe(false);
  }, 90000);

  // Test 3: Emergency Plumbing Service
  it('correctly understands and isolates a Plumbing Business', async () => {
    await sleep(4000);
    const evidence: BusinessIntelligenceRawEvidence = {
      tenantId: 'test-plumbing',
      businessName: 'Rapid Flow Emergency Plumbing',
      industryFromDb: 'Plumber',
      addressFromDb: '78 River Road, Austin, TX',
      gbpPrimaryCategory: 'Plumber',
      gbpAdditionalCategories: ['Drainage Service', 'Water Heater Repair'],
      offeringsFromSettings: ['Emergency Pipe Leak Repair', 'Drain Cleaning', 'Water Heater Replacement'],
      recentReviews: [
        { author: 'Mike R.', rating: 5, text: 'Arrived within 30 minutes on a Sunday and fixed the burst pipe quickly.' },
      ],
    };

    const intel = await conductAiBusinessResearch(evidence);
    expect(intel.businessCategory.value.toLowerCase()).toMatch(/plumb/i);
    expect(intel.negativeBoundaries.join(' ').toLowerCase()).toMatch(/it strategy|software|dental|film/i);
  }, 90000);

  // Test 4: Italian Restaurant
  it('correctly understands and isolates an Italian Restaurant', async () => {
    await sleep(4000);
    const evidence: BusinessIntelligenceRawEvidence = {
      tenantId: 'test-restaurant',
      businessName: 'Trattoria Bella Napoli',
      industryFromDb: 'Restaurant',
      addressFromDb: '210 Columbus Ave, Boston, MA',
      gbpPrimaryCategory: 'Italian Restaurant',
      gbpAdditionalCategories: ['Pizza Restaurant', 'Wine Bar'],
      offeringsFromSettings: ['Wood-Fired Neapolitan Pizza', 'Handmade Pasta', 'Tiramisu', 'Fine Italian Wines'],
      recentReviews: [
        { author: 'Marco G.', rating: 5, text: 'The truffle gnocchi and wood-fired pizza transported me back to Naples!' },
      ],
    };

    const intel = await conductAiBusinessResearch(evidence);
    expect(intel.businessCategory.value.toLowerCase()).toMatch(/restaurant|italian|dining|food/i);
    expect(intel.negativeBoundaries.join(' ').toLowerCase()).toMatch(/it strategy|software|dental/i);
  }, 90000);

  // Test 5: Enterprise SaaS / Cloud Software Company
  it('correctly recognizes legitimate Software & IT businesses', async () => {
    await sleep(4000);
    const evidence: BusinessIntelligenceRawEvidence = {
      tenantId: 'test-tech',
      businessName: 'CloudScale Technologies',
      industryFromDb: 'Software Company',
      addressFromDb: 'Silicon Valley, CA',
      gbpPrimaryCategory: 'Software Company',
      gbpAdditionalCategories: ['Computer Support and Services', 'Web Development Service'],
      offeringsFromSettings: ['Custom SaaS Platform Development', 'AWS Cloud Infrastructure Architecture', 'DevOps Automation'],
      recentReviews: [
        { author: 'Tech Director', rating: 5, text: 'CloudScale migrated our entire monolithic backend to microservices without downtime.' },
      ],
    };

    const intel = await conductAiBusinessResearch(evidence);
    expect(intel.businessCategory.value.toLowerCase()).toMatch(/software|tech|cloud|computer/i);
    // For a legitimate tech company, software is allowed, but dentistry/plumbing are forbidden
    expect(intel.negativeBoundaries.join(' ').toLowerCase()).toMatch(/dental|medical|plumbing|food/i);
  }, 90000);

  // Test 6: Fitness & Yoga Studio
  it('correctly understands and isolates a Fitness & Yoga Studio', async () => {
    await sleep(4000);
    const evidence: BusinessIntelligenceRawEvidence = {
      tenantId: 'test-yoga',
      businessName: 'Prana Flow Yoga & Wellness',
      industryFromDb: 'Yoga Studio',
      addressFromDb: '45 Lotus Way, Boulder, CO',
      gbpPrimaryCategory: 'Yoga Studio',
      gbpAdditionalCategories: ['Meditation Center', 'Pilates Studio'],
      offeringsFromSettings: ['Vinyasa Flow Classes', 'Sound Bath Meditation', 'Private Breathwork Coaching'],
      recentReviews: [
        { author: 'Elena T.', rating: 5, text: 'The sound bath meditation helped me reset after a stressful week. Instructors are amazing.' },
      ],
    };

    const intel = await conductAiBusinessResearch(evidence);
    expect(intel.businessCategory.value.toLowerCase()).toMatch(/yoga|wellness|fitness/i);
    expect(intel.negativeBoundaries.join(' ').toLowerCase()).toMatch(/it strategy|software|plumbing|dental/i);
  }, 90000);
});
