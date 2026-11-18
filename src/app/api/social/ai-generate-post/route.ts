import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { ImageResponse } from 'next/og';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { getBrandContext } from '@/lib/brand-context';
import { uploadFile } from '@/lib/supabase-storage';
import { getCategoryStorageFolder } from '@/lib/designs/category-image-engine';

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
1. Title / Headline: Catchy local-search headline (under 70 chars). Include local benefit and business or service name.
2. Caption Structure (MANDATORY FORMAT):
   - Intro Paragraph: Engaging 2-3 sentence opener incorporating location/city, customer needs, and local keywords.
   - Bullet Points: Exactly 4 to 5 structured bullet points, each starting with the checkmark symbol '✓', followed by a bold benefit title and explanation (e.g. "✓ A welcoming first impression: Clean facilities help guests feel at ease from the moment they arrive.").
   - Concluding Paragraph: 2 sentences reinforcing dependability, trust, and why local visitors choose this business.
   - CTA sentence: Clear prompt e.g. "Call ${businessName} in ${location} to inquire about availability and book your slot."
   - CTA button tag: "CTA: CALL" (or "CTA: BOOK" or "CTA: LEARN_MORE").
3. Hashtags: 4 to 6 relevant local SEO tags (e.g., #${businessName.replace(/[^a-zA-Z0-9]/g, '')}, local city tags).

Return a STRICT JSON object with these EXACT keys (no markdown code blocks, just raw JSON):
{
  "title": "Short catchy title (under 60 chars) suitable for Google Business update",
  "headline": "Punchy headline (3 to 6 words)",
  "alternativeHeadlines": ["Alternative headline 1", "Alternative headline 2", "Alternative headline 3"],
  "subtitle": "Clear supporting sentence (under 100 chars)",
  "badge": "Short badge tag (e.g. 'Standard Post', 'Special Offer', 'Popular Choice', 'Verified')",
  "ctaText": "CALL",
  "caption": "Full formatted caption strictly with Intro Paragraph, 4-5 bullet points starting with '✓', Concluding Paragraph, and CTA sentence",
  "hashtags": ["list", "of", "4-6", "local", "SEO", "hashtags", "with", "hash"]
}
`;

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

      const cleanContent = aiRes.content
        .replace(/```json/gi, '')
        .replace(/```/gi, '')
        .trim();
      generated = JSON.parse(cleanContent);
    } catch (aiErr) {
      console.warn('[ai-generate-post] callAI failed or returned non-JSON, using high-quality local fallback:', aiErr);
      const safeTag = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
      generated = {
        title: `${businessName} Announcement`,
        headline: topic.length > 50 ? topic.slice(0, 48) + '...' : topic || 'Quality Service You Can Trust',
        subtitle: `Experience top-rated care, verified quality, and trusted service at ${businessName}.`,
        badge: 'SPECIAL OFFER',
        caption: `Is your business ready to level up? At ${businessName}, our dedicated team is committed to delivering high-performance results.\n\n✓ Verified local expertise in ${location}\n✓ Prompt, dependable service designed for rapid growth\n✓ Transparent pricing with dedicated customer support\n✓ Custom solutions tailored for your business needs\n\nCall us today at ${phone} or visit our page to get started!`,
        hashtags: [safeTag ? `#${safeTag}` : '#business', '#localservice', '#quality', '#toprated', '#growth'],
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
      const folder = getCategoryStorageFolder(tText + ' ' + ind);
      return `https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/${folder}/${folder}-001.webp`;
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
