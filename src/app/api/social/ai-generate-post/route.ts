import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { ImageResponse } from 'next/og';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { getBrandContext } from '@/lib/brand-context';
import { uploadFile } from '@/lib/supabase-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GeneratePostRequest {
  topic?: string;
  targetKeyword?: string;
  theme?: 'promo' | 'tip' | 'review' | 'announcement' | 'greeting';
  tone?: string;
  platforms?: string[];
  badge?: string;
  photoUrl?: string;
  referenceImageUrl?: string;
  attachedImageUrl?: string;
  postType?: 'standard' | 'offer' | 'event';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as GeneratePostRequest;
    const targetKeyword = (body.targetKeyword || '').trim();
    const topic = (body.topic || '').trim() || (targetKeyword ? `${targetKeyword} in local area` : 'Weekend exclusive offer & client appreciation');
    const theme = body.theme || 'promo';
    const tone = body.tone || 'engaging, professional, persuasive';
    const platforms = body.platforms && body.platforms.length > 0 ? body.platforms : ['instagram', 'facebook', 'googlebusiness'];

    // 1. Fetch Tenant & Brand Profile
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        phone: true,
        city: true,
        industry: true,
        website: true,
        slug: true,
        settingsJson: true,
        brandProfile: {
          select: {
            businessName: true,
            industry: true,
            location: true,
            website: true,
          },
        },
      },
    });

    const brandContext = await getBrandContext(tenantId);
    const businessName = tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';
    const industry = tenant?.brandProfile?.industry || tenant?.industry || 'Services';
    const phone = tenant?.phone || '+91 61279 67087';
    const location = tenant?.brandProfile?.location || (tenant?.city ? `${tenant.city}, India` : 'Local Store & Online');

    // 2. Generate SEO-Friendly Copy with AI (Google Business Profile & Local Search Focused)
    const prompt = `
You are an expert Google Business Profile (GBP) and local SEO copywriter.
The user wants you to generate high-converting, local SEO-friendly Google Business Profile post text.
Do NOT generate images or describe images. Generate TEXT CONTENT ONLY.

Business Name: ${businessName}
Industry / Category: ${industry}
Phone / Contact: ${phone}
Location / Service Area: ${location}
Brand Context: ${brandContext}
Topic / Goal: ${topic}${targetKeyword ? `\nPriority Search Term to rank for: "${targetKeyword}"` : ''}
Theme: ${theme}
Target Platforms: ${platforms.join(', ')}
Tone: ${tone}

Local SEO Guidelines:
1. Title: Catchy, local-search friendly (under 60 chars). Include business or service benefit.
2. Headline: Punchy 3 to 6 words highlighting the key proposition.
3. Caption:
   - High-impact hook incorporating local search keywords ("near me", city, service).
   - 2-3 structured bullet points with emojis highlighting features, reliability, or exclusive perks.
   - Clear Google Place action call-to-action (e.g. "Call us at ${phone}", "Book online", or "Visit us today in ${location}").
4. Hashtags: 6 to 8 relevant local SEO tags (e.g., #${businessName.replace(/[^a-zA-Z0-9]/g, '')}, city tags, industry tags).

Return a STRICT JSON object with these EXACT keys (no markdown code blocks, just raw JSON):
{
  "title": "Short catchy title (under 60 chars) suitable for Google Business update",
  "headline": "Punchy headline (3 to 6 words)",
  "alternativeHeadlines": ["Alternative headline 1", "Alternative headline 2", "Alternative headline 3"],
  "subtitle": "Clear supporting sentence (under 100 chars)",
  "badge": "Short badge tag (e.g. '20% OFF', 'SPECIAL OFFER', 'POPULAR CHOICE', 'LIMITED TIME')",
  "ctaText": "Short action button label (2 to 3 words, e.g. 'Call now', 'Book now', 'Claim offer', 'Get quote')",
  "caption": "Full rich social media caption (100 to 200 words) formatted with natural spacing, 3 bullet points, and a strong local call-to-action",
  "hashtags": ["list", "of", "6-8", "local", "SEO", "hashtags", "with", "hash"]
}
`;

    const aiRes = await callAI({
      messages: [
        {
          role: 'system',
          content: 'You generate high-converting social media marketing content. Always output pure valid JSON without markdown fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    let generated: {
      ctaText?: string;
      title?: string;
      headline?: string;
      alternativeHeadlines?: string[];
      subtitle?: string;
      badge?: string;
      caption?: string;
      hashtags?: string[];
    } = {};

    try {
      const cleanContent = aiRes.content
        .replace(/```json/gi, '')
        .replace(/```/gi, '')
        .trim();
      generated = JSON.parse(cleanContent);
    } catch {
      // Fallback if model output wasn't pure JSON
      generated = {
        title: `${businessName} Special Update`,
        headline: 'Quality Service You Can Trust',
        subtitle: `Experience top-rated care and service at ${businessName}.`,
        badge: 'SPECIAL OFFER',
        caption: `${topic}\n\n✨ Top-rated professional service\n✨ Personalized care & rapid booking\n📍 ${location}\n\nCall us today at ${phone} or book online!`,
        hashtags: ['#business', '#localservice', '#quality', '#toprated', '#offer'],
      };
    }

    const finalHeadline = (body.badge ? generated.headline : generated.headline) || 'A Little Self-Care Goes a Long Way';
    const finalSubtitle = generated.subtitle || `Refresh your look with personalized care at ${businessName}.`;
    const finalBadge = (body.badge || generated.badge || 'SPECIAL OFFER').toUpperCase();
    const finalTitle = generated.title || `${businessName} Announcement`;
    const safeTag = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hashtagsArray = Array.isArray(generated.hashtags) && generated.hashtags.length > 0
      ? generated.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`))
      : ['#localbusiness', '#service', '#toprated', safeTag ? `#${safeTag}` : '#community'];
    const hashtagsText = hashtagsArray.join(' ');

    const finalCaption = generated.caption
      ? `${generated.caption}\n\n${hashtagsText}`
      : `${topic}\n\nContact us at ${phone} to learn more.\n\n${hashtagsText}`;

    // 3. Handle Media: When an authentic user/business photo is supplied (uploaded or selected from media library),
    // use it directly without creating a synthetic graphic. The AI's role is purely SEO copywriting.
    // If no photo was supplied, generate an optional branded card fallback.
    const inputPhoto = body.attachedImageUrl || body.photoUrl || body.referenceImageUrl || null;
    let imageUrl = inputPhoto;

    if (!inputPhoto) {
      try {
        const graphicElement = React.createElement(
          'div',
          {
            style: {
              width: '1080px',
              height: '1080px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '70px',
              background: 'linear-gradient(135deg, #070B2D 0%, #043B26 100%)',
              color: '#FFFFFF',
              fontFamily: 'sans-serif',
            },
          },
          // Top Header
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#009F50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '24px',
                    color: '#FFFFFF',
                  },
                },
                businessName.charAt(0).toUpperCase()
              ),
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: '26px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: '#34D399',
                    textTransform: 'uppercase',
                  },
                },
                businessName
              )
            ),
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '18px',
                  fontWeight: 700,
                  backgroundColor: '#009F50',
                  color: '#FFFFFF',
                  padding: '8px 24px',
                  borderRadius: '999px',
                  letterSpacing: '0.5px',
                },
              },
              finalBadge
            )
          ),
          // Middle Body
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                maxWidth: '920px',
              },
            },
            React.createElement(
              'h1',
              {
                style: {
                  fontSize: '62px',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  color: '#FFFFFF',
                  margin: 0,
                },
              },
              finalHeadline
            ),
            React.createElement(
              'p',
              {
                style: {
                  fontSize: '28px',
                  color: '#E2E8F0',
                  lineHeight: 1.4,
                  margin: 0,
                },
              },
              finalSubtitle
            )
          ),
          // Bottom Footer
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                borderTop: '2px solid rgba(255, 255, 255, 0.15)',
                paddingTop: '32px',
              },
            },
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              React.createElement('span', { style: { fontSize: '24px' } }, '📍'),
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: '22px',
                    color: '#94A3B8',
                    fontWeight: 500,
                  },
                },
                location
              )
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              React.createElement('span', { style: { fontSize: '24px' } }, '📞'),
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: '24px',
                    color: '#34D399',
                    fontWeight: 800,
                  },
                },
                phone
              )
            )
          )
        );

        const imageResponse = new ImageResponse(graphicElement, {
          width: 1080,
          height: 1080,
        });

        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload directly to S3 / Supabase storage
        const uploaded = await uploadFile({
          bucket: 'company-assets',
          file: buffer,
          companyId: tenantId,
          folder: 'social-posts',
          fileName: `${Date.now()}_ai_post.png`,
          contentType: 'image/png',
        });

        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      } catch (renderErr) {
        console.warn('[ai-generate-post] ImageResponse render/upload warning:', renderErr);
      }
    }

    const finalCta = generated.ctaText || 'Book now';

    const getContextPhoto = (tText: string, ind: string) => {
      const q = (tText + ' ' + ind).toLowerCase();
      if (q.includes('salon') || q.includes('hair') || q.includes('spa') || q.includes('massage') || q.includes('beauty')) {
        return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80';
      }
      if (q.includes('food') || q.includes('restaurant') || q.includes('cafe') || q.includes('pizza') || q.includes('coffee') || q.includes('dine') || q.includes('menu')) {
        return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80';
      }
      if (q.includes('auto') || q.includes('car') || q.includes('mechanic') || q.includes('detailing') || q.includes('wash')) {
        return 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80';
      }
      if (q.includes('plumb') || q.includes('ac') || q.includes('repair') || q.includes('electric') || q.includes('home service') || q.includes('clean')) {
        return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80';
      }
      if (q.includes('fitness') || q.includes('gym') || q.includes('yoga') || q.includes('workout')) {
        return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80';
      }
      if (q.includes('dental') || q.includes('clinic') || q.includes('doctor') || q.includes('health') || q.includes('care')) {
        return 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80';
      }
      return 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80';
    };

    const chosenPhoto = inputPhoto || getContextPhoto(topic, tenant?.industry || '');

    const gbpPostType = body.postType || (body.theme === 'promo' ? 'offer' : 'standard');
    const gbpCtaAction = gbpPostType === 'offer' ? 'GET_OFFER' : 'CALL';

    const layouts = [
      {
        id: 'editorial',
        name: 'Editorial',
        headline: finalHeadline,
        subtitle: finalSubtitle,
        badge: finalBadge,
        ctaText: finalCta,
        theme: 'sand_olive',
        photoUrl: chosenPhoto,
      },
      {
        id: 'photo_led',
        name: 'Photo-led',
        headline: finalBadge || 'SPECIAL OFFER',
        subtitle: finalSubtitle || 'Selected services',
        badge: 'LIMITED TIME',
        ctaText: finalCta,
        theme: 'beige',
        photoUrl: chosenPhoto,
      },
      {
        id: 'bold',
        name: 'Bold',
        headline: finalHeadline.toUpperCase(),
        subtitle: finalSubtitle || 'Selected services',
        badge: finalBadge,
        ctaText: finalCta,
        theme: 'emerald_gold',
        photoUrl: chosenPhoto,
      },
    ];

    return NextResponse.json({
      success: true,
      title: finalTitle,
      headline: finalHeadline,
      gbpPostType,
      gbpCtaAction,
      alternativeHeadlines: Array.isArray(generated.alternativeHeadlines) && generated.alternativeHeadlines.length > 0
        ? generated.alternativeHeadlines.slice(0, 3)
        : [
            'From one instruction to a connected workflow.',
            'Run your field service business in plain English.',
            'Stop juggling apps. Just tell your assistant.',
          ],
      subtitle: finalSubtitle,
      badge: finalBadge,
      ctaText: finalCta,
      caption: finalCaption,
      hashtags: hashtagsArray,
      hashtagsText,
      imageUrl: inputPhoto || imageUrl || chosenPhoto,
      photoUrl: inputPhoto || chosenPhoto,
      layouts,
      bookingUrl:
        tenant?.brandProfile?.website ||
        (tenant?.website && !tenant.website.includes('fieseros.com') ? tenant.website : '') ||
        (tenant?.slug ? `https://bgos.site/${tenant.slug}` : '') ||
        '',
      offerDetails: {
        discountText: finalBadge,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    });
  } catch (err: unknown) {
    console.error('[api/social/ai-generate-post] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate AI post' },
      { status: 500 }
    );
  }
}
