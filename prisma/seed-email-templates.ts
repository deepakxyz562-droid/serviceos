/**
 * Seed Pabbly-Style Email Templates
 *
 * Creates rich HTML email templates with professional designs matching
 * the Pabbly Email Template Store patterns. Run after seed-users.ts.
 *
 * Usage: bun run prisma/seed-email-templates.ts
 */

import { PrismaClient } from '@prisma/client'

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || ''
const db = new PrismaClient({ datasourceUrl: directUrl, log: ['error', 'warn'] })

// Base URL for template images (local filesystem fallback)
const IMG_BASE = '/uploads/template-assets/default/email'

// ═══════════════════════════════════════════════════════════════
// Template Definitions
// ═══════════════════════════════════════════════════════════════

interface TemplateDef {
  name: string
  slug: string
  category: string // transactional | marketing | system
  description: string
  subject: string
  tags: string[]
  isFavorite: boolean
  htmlBody: string
}

const templates: TemplateDef[] = [
  // ── 1. Red Velvet Cake Sale (Food / Marketing) ──────────────
  {
    name: 'Red Velvet Cake Sale',
    slug: 'red-velvet-cake-sale',
    category: 'marketing',
    description: 'Delicious bakery sale promotion for red velvet cake with festive design',
    subject: '🍰 Fresh Red Velvet Cake Sale — {{discount}} Off!',
    tags: ['food', 'bakery', 'sale', 'promotion'],
    isFavorite: true,
    htmlBody: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f0ec;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <!-- Hero -->
  <tr><td style="background:linear-gradient(135deg,#8B0000,#C41E3A);padding:40px 30px;text-align:center;">
    <h1 style="color:#ffffff;font-size:32px;margin:0;letter-spacing:1px;">🍰 Fresh Red Velvet Cake Sale!</h1>
    <p style="color:#FFE4E1;font-size:16px;margin:12px 0 0;">Irresistibly delicious — Limited time only</p>
  </td></tr>
  <!-- Image -->
  <tr><td style="padding:0;">
    <img src="${IMG_BASE}/red-velvet-cake.png" alt="Red Velvet Cake" style="width:100%;display:block;" />
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:30px;">
    <h2 style="color:#8B0000;font-size:24px;margin:0 0 12px;">Hey {{name}},</h2>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Our signature Red Velvet Cake is back and better than ever! Crafted with premium cocoa, 
      smooth cream cheese frosting, and a whole lot of love. Whether it's a birthday, anniversary, 
      or just a Tuesday — this cake makes every moment special.
    </p>
    <!-- Offer Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0F0;border:2px dashed #C41E3A;border-radius:8px;margin:20px 0;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="color:#C41E3A;font-size:14px;margin:0 0 6px;font-weight:bold;">USE CODE</p>
        <p style="color:#8B0000;font-size:28px;margin:0;font-weight:bold;letter-spacing:2px;">VELVET{{discount}}</p>
        <p style="color:#666;font-size:13px;margin:6px 0 0;">for {{discount}}% off your order</p>
      </td></tr>
    </table>
    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0;">
      <a href="{{order_url}}" style="display:inline-block;padding:14px 36px;background:#C41E3A;color:#ffffff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;">Order Now 🎂</a>
    </td></tr></table>
    <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0;">Offer valid until {{expiry_date}}. While stocks last.</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#8B0000;padding:20px 30px;text-align:center;">
    <p style="color:#FFE4E1;font-size:12px;margin:0;">{{company.name}} · {{company.address}}</p>
    <p style="color:#FFE4E1;font-size:11px;margin:6px 0 0;">
      <a href="{{unsubscribe_url}}" style="color:#FFE4E1;">Unsubscribe</a> · 
      <a href="{{preferences_url}}" style="color:#FFE4E1;">Preferences</a>
    </p>
  </td></tr>
</table>
</body></html>`,
  },

  // ── 2. Celebrate Birthday Party (Special Occasions / Marketing) ──
  {
    name: 'Celebrate Birthday Party',
    slug: 'celebrate-birthday-party',
    category: 'marketing',
    description: 'Festive birthday celebration invitation with colorful party design',
    subject: '🎉 You\'re Invited! {{name}}\'s Birthday Bash',
    tags: ['birthday', 'party', 'celebration', 'invitation'],
    isFavorite: false,
    htmlBody: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF8E7;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <!-- Hero -->
  <tr><td style="background:linear-gradient(135deg,#FF6B6B,#FFE66D,#4ECDC4,#A78BFA);padding:40px 30px;text-align:center;">
    <p style="color:#ffffff;font-size:14px;margin:0 0 8px;letter-spacing:3px;text-transform:uppercase;">🎉 You're Invited 🎉</p>
    <h1 style="color:#ffffff;font-size:36px;margin:0;text-shadow:2px 2px 4px rgba(0,0,0,0.2);">Happy Birthday!</h1>
    <p style="color:#ffffff;font-size:18px;margin:10px 0 0;">Let's celebrate {{name}}'s special day</p>
  </td></tr>
  <!-- Image -->
  <tr><td style="padding:0;">
    <img src="${IMG_BASE}/birthday-party.png" alt="Birthday Party" style="width:100%;display:block;" />
  </td></tr>
  <!-- Details -->
  <tr><td style="padding:30px;">
    <p style="color:#4a4a4a;font-size:15px;line-height:1.7;margin:0 0 24px;">
      It's time to party! Join us for an unforgettable birthday celebration filled with laughter, 
      cake, and wonderful company. We'd love to have you there!
    </p>
    <!-- Event Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F9FF;border-radius:8px;border:1px solid #BAE6FD;">
      <tr><td style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;color:#0369A1;font-size:13px;font-weight:bold;">📅 DATE</td><td style="padding:6px 0;color:#4a4a4a;font-size:15px;text-align:right;">{{event_date}}</td></tr>
          <tr><td style="padding:6px 0;color:#0369A1;font-size:13px;font-weight:bold;">🕐 TIME</td><td style="padding:6px 0;color:#4a4a4a;font-size:15px;text-align:right;">{{event_time}}</td></tr>
          <tr><td style="padding:6px 0;color:#0369A1;font-size:13px;font-weight:bold;">📍 VENUE</td><td style="padding:6px 0;color:#4a4a4a;font-size:15px;text-align:right;">{{venue}}</td></tr>
        </table>
      </td></tr>
    </table>
    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0;">
      <a href="{{rsvp_url}}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#FF6B6B,#A78BFA);color:#ffffff;text-decoration:none;border-radius:50px;font-size:16px;font-weight:bold;">RSVP Now 🎈</a>
    </td></tr></table>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">Please RSVP by {{rsvp_deadline}}</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#1e1e2e;padding:20px 30px;text-align:center;">
    <p style="color:#a0a0b0;font-size:12px;margin:0;">{{company.name}} · {{company.address}}</p>
  </td></tr>
</table>
</body></html>`,
  },

  // ── 3. Bright Smiles for Little Stars (Healthcare / Marketing) ──
  {
    name: 'Bright Smiles for Little Stars',
    slug: 'bright-smiles-little-stars',
    category: 'marketing',
    description: 'Children dental care promotion with friendly healthcare design',
    subject: '😊 Give Kids a Smile Day — Free Checkup for {{name}}!',
    tags: ['healthcare', 'dental', 'children', 'wellness'],
    isFavorite: false,
    htmlBody: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#EBF5FF;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <!-- Hero -->
  <tr><td style="background:linear-gradient(135deg,#0EA5E9,#38BDF8);padding:40px 30px;text-align:center;">
    <p style="color:#E0F2FE;font-size:13px;margin:0 0 6px;letter-spacing:2px;text-transform:uppercase;">Children's Dental Health</p>
    <h1 style="color:#ffffff;font-size:30px;margin:0;">😊 Bright Smiles for Little Stars</h1>
    <p style="color:#E0F2FE;font-size:15px;margin:10px 0 0;">Give Kids a Smile Day — Free dental checkups!</p>
  </td></tr>
  <!-- Image -->
  <tr><td style="padding:0;">
    <img src="${IMG_BASE}/bright-smiles.png" alt="Bright Smiles" style="width:100%;display:block;" />
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:30px;">
    <h2 style="color:#0369A1;font-size:22px;margin:0 0 12px;">Hi {{parent_name}},</h2>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Your child's smile is precious! This <strong>Give Kids a Smile Day</strong>, we're offering 
      <strong>free dental checkups</strong> for children ages 2-12. Our friendly pediatric dentists 
      make every visit fun and comfortable.
    </p>
    <!-- Benefits -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="padding:8px 0;color:#0EA5E9;font-size:15px;">✅ Free comprehensive dental exam</td></tr>
      <tr><td style="padding:8px 0;color:#0EA5E9;font-size:15px;">✅ Fun, kid-friendly environment</td></tr>
      <tr><td style="padding:8px 0;color:#0EA5E9;font-size:15px;">✅ Expert pediatric dentists</td></tr>
      <tr><td style="padding:8px 0;color:#0EA5E9;font-size:15px;">✅ Free dental hygiene kit to take home</td></tr>
    </table>
    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0;">
      <a href="{{booking_url}}" style="display:inline-block;padding:14px 36px;background:#0EA5E9;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold;">Book Free Checkup 🦷</a>
    </td></tr></table>
    <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0;">Available on {{event_date}} · {{clinic_name}}</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#0369A1;padding:20px 30px;text-align:center;">
    <p style="color:#BAE6FD;font-size:12px;margin:0;">{{company.name}} · {{company.phone}}</p>
    <p style="color:#BAE6FD;font-size:11px;margin:6px 0 0;">
      <a href="{{unsubscribe_url}}" style="color:#BAE6FD;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</body></html>`,
  },

  // ── 4. Growth & Marketing Insights (Marketing / Marketing) ──
  {
    name: 'Growth & Marketing Insights',
    slug: 'growth-marketing-insights',
    category: 'marketing',
    description: 'Data-driven marketing analytics newsletter with growth metrics',
    subject: '📈 Your Weekly Marketing Report — {{report_period}}',
    tags: ['marketing', 'analytics', 'newsletter', 'report'],
    isFavorite: true,
    htmlBody: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#1E293B;border-radius:12px;overflow:hidden;">
  <!-- Hero -->
  <tr><td style="background:linear-gradient(135deg,#1E293B,#334155);padding:36px 30px;text-align:center;border-bottom:3px solid #22D3EE;">
    <p style="color:#94A3B8;font-size:12px;margin:0 0 6px;letter-spacing:2px;text-transform:uppercase;">Weekly Digest</p>
    <h1 style="color:#F8FAFC;font-size:28px;margin:0;">📈 Growth & Marketing Insights</h1>
    <p style="color:#94A3B8;font-size:14px;margin:8px 0 0;">{{report_period}} Performance Report</p>
  </td></tr>
  <!-- Image -->
  <tr><td style="padding:0;">
    <img src="${IMG_BASE}/marketing-insights.png" alt="Marketing Insights" style="width:100%;display:block;" />
  </td></tr>
  <!-- Metrics Grid -->
  <tr><td style="padding:24px 30px;">
    <h2 style="color:#22D3EE;font-size:16px;margin:0 0 16px;letter-spacing:1px;">KEY METRICS</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="background:#0F172A;padding:16px;border-radius:8px;text-align:center;width:33%;">
          <p style="color:#22D3EE;font-size:24px;margin:0;font-weight:bold;">{{visitors}}</p>
          <p style="color:#94A3B8;font-size:11px;margin:4px 0 0;">Visitors</p>
          <p style="color:#4ADE80;font-size:11px;margin:2px 0 0;">↑ {{visitors_change}}%</p>
        </td>
        <td style="width:4%;"></td>
        <td style="background:#0F172A;padding:16px;border-radius:8px;text-align:center;width:33%;">
          <p style="color:#A78BFA;font-size:24px;margin:0;font-weight:bold;">{{conversions}}</p>
          <p style="color:#94A3B8;font-size:11px;margin:4px 0 0;">Conversions</p>
          <p style="color:#4ADE80;font-size:11px;margin:2px 0 0;">↑ {{conversions_change}}%</p>
        </td>
        <td style="width:4%;"></td>
        <td style="background:#0F172A;padding:16px;border-radius:8px;text-align:center;width:33%;">
          <p style="color:#FB923C;font-size:24px;margin:0;font-weight:bold;">{{revenue}}</p>
          <p style="color:#94A3B8;font-size:11px;margin:4px 0 0;">Revenue</p>
          <p style="color:#4ADE80;font-size:11px;margin:2px 0 0;">↑ {{revenue_change}}%</p>
        </td>
      </tr>
    </table>
    <!-- Highlights -->
    <h2 style="color:#22D3EE;font-size:16px;margin:0 0 12px;letter-spacing:1px;">HIGHLIGHTS</h2>
    <p style="color:#CBD5E1;font-size:14px;line-height:1.7;margin:0 0 10px;">📊 Top performing channel: <strong style="color:#F8FAFC;">{{top_channel}}</strong></p>
    <p style="color:#CBD5E1;font-size:14px;line-height:1.7;margin:0 0 10px;">🎯 Best campaign: <strong style="color:#F8FAFC;">{{best_campaign}}</strong></p>
    <p style="color:#CBD5E1;font-size:14px;line-height:1.7;margin:0 0 20px;">💡 Recommendation: <strong style="color:#F8FAFC;">{{recommendation}}</strong></p>
    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0;">
      <a href="{{dashboard_url}}" style="display:inline-block;padding:12px 32px;background:#22D3EE;color:#0F172A;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">View Full Report →</a>
    </td></tr></table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#0F172A;padding:20px 30px;text-align:center;border-top:1px solid #334155;">
    <p style="color:#64748B;font-size:12px;margin:0;">{{company.name}} · Analytics Team</p>
    <p style="color:#64748B;font-size:11px;margin:6px 0 0;">
      <a href="{{unsubscribe_url}}" style="color:#64748B;">Unsubscribe</a> · 
      <a href="{{preferences_url}}" style="color:#64748B;">Preferences</a>
    </p>
  </td></tr>
</table>
</body></html>`,
  },

  // ── 5. Find Your Signature Watch (Ecommerce / Marketing) ──
  {
    name: 'Find Your Signature Watch',
    slug: 'find-your-signature-watch',
    category: 'marketing',
    description: 'Luxury watch ecommerce promotion with premium brand design',
    subject: '⌚ Defined by Legacy — Find Your Signature Watch, {{name}}',
    tags: ['ecommerce', 'luxury', 'watches', 'premium'],
    isFavorite: true,
    htmlBody: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111111;border-radius:0;overflow:hidden;">
  <!-- Hero -->
  <tr><td style="background:#0a0a0a;padding:50px 30px;text-align:center;border-bottom:1px solid #D4AF37;">
    <p style="color:#D4AF37;font-size:12px;margin:0 0 10px;letter-spacing:4px;text-transform:uppercase;">[ Your Logo ]</p>
    <h1 style="color:#ffffff;font-size:34px;margin:0;letter-spacing:2px;">DEFINED BY LEGACY</h1>
    <p style="color:#888888;font-size:14px;margin:12px 0 0;letter-spacing:1px;">Timeless Craftsmanship Since {{year_founded}}</p>
  </td></tr>
  <!-- Image -->
  <tr><td style="padding:0;">
    <img src="${IMG_BASE}/signature-watch.png" alt="Signature Watch" style="width:100%;display:block;" />
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:36px 30px;">
    <p style="color:#D4AF37;font-size:13px;margin:0 0 8px;letter-spacing:2px;text-transform:uppercase;">Exclusive Collection</p>
    <h2 style="color:#ffffff;font-size:24px;margin:0 0 16px;">Find Your Signature Watch, {{name}}</h2>
    <p style="color:#aaaaaa;font-size:15px;line-height:1.8;margin:0 0 24px;">
      Every watch tells a story. Ours tell stories of precision, heritage, and uncompromising quality. 
      Discover the timepiece that speaks to your journey.
    </p>
    <!-- Collection Highlights -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#1a1a1a;padding:20px;text-align:center;border:1px solid #333;border-radius:4px;width:50%;">
          <p style="color:#D4AF37;font-size:18px;margin:0;font-weight:bold;">Heritage</p>
          <p style="color:#888;font-size:12px;margin:6px 0 0;">Classic Collection</p>
          <p style="color:#ffffff;font-size:16px;margin:8px 0 0;">From \${{heritage_price}}</p>
        </td>
        <td style="width:3%;"></td>
        <td style="background:#1a1a1a;padding:20px;text-align:center;border:1px solid #333;border-radius:4px;width:50%;">
          <p style="color:#D4AF37;font-size:18px;margin:0;font-weight:bold;">Apex</p>
          <p style="color:#888;font-size:12px;margin:6px 0 0;">Sport Collection</p>
          <p style="color:#ffffff;font-size:16px;margin:8px 0 0;">From \${{apex_price}}</p>
        </td>
      </tr>
    </table>
    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
      <a href="{{shop_url}}" style="display:inline-block;padding:14px 40px;background:#D4AF37;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Shop Now</a>
    </td></tr></table>
    <p style="color:#666;font-size:12px;text-align:center;margin:16px 0 0;">Free shipping on orders over \${{free_shipping_threshold}}</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#0a0a0a;padding:20px 30px;text-align:center;border-top:1px solid #222;">
    <p style="color:#555;font-size:11px;margin:0;">{{company.name}} · {{company.address}}</p>
    <p style="color:#444;font-size:10px;margin:6px 0 0;">
      <a href="{{unsubscribe_url}}" style="color:#555;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</body></html>`,
  },

  // ── 6. KoolSkool Education Webinar (Education / Marketing) ──
  {
    name: 'KoolSkool - Learn Smart',
    slug: 'koolskool-learn-smart',
    category: 'marketing',
    description: 'Back-to-school webinar series invitation with education theme',
    subject: '📚 Back-to-School Webinar Series — Register Now, {{name}}!',
    tags: ['education', 'webinar', 'back-to-school', 'learning'],
    isFavorite: false,
    htmlBody: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <!-- Hero -->
  <tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:40px 30px;text-align:center;">
    <p style="color:#C7D2FE;font-size:13px;margin:0 0 6px;letter-spacing:2px;text-transform:uppercase;">KoolSkool Presents</p>
    <h1 style="color:#ffffff;font-size:30px;margin:0;">📚 Back-to-School Webinar Series</h1>
    <p style="color:#C7D2FE;font-size:15px;margin:10px 0 0;">Learn Smart. Grow Fast. Start Right.</p>
  </td></tr>
  <!-- Image -->
  <tr><td style="padding:0;">
    <img src="${IMG_BASE}/education-webinar.png" alt="Education Webinar" style="width:100%;display:block;" />
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:30px;">
    <h2 style="color:#4F46E5;font-size:22px;margin:0 0 12px;">Hi {{name}},</h2>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Get ahead this school year! Join our free webinar series featuring top educators and industry 
      experts sharing strategies for academic excellence and personal growth.
    </p>
    <!-- Webinar Schedule -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3FF;border-radius:8px;border:1px solid #DDD6FE;margin:0 0 20px;">
      <tr><td style="padding:16px;">
        <p style="color:#4F46E5;font-size:14px;font-weight:bold;margin:0 0 12px;">🗓️ UPCOMING SESSIONS</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;color:#5B21B6;font-size:13px;font-weight:bold;">Session 1</td><td style="padding:6px 0;color:#4a4a4a;font-size:13px;text-align:right;">{{session1_date}}</td></tr>
          <tr><td style="padding:6px 0;color:#5B21B6;font-size:13px;font-weight:bold;">Session 2</td><td style="padding:6px 0;color:#4a4a4a;font-size:13px;text-align:right;">{{session2_date}}</td></tr>
          <tr><td style="padding:6px 0;color:#5B21B6;font-size:13px;font-weight:bold;">Session 3</td><td style="padding:6px 0;color:#4a4a4a;font-size:13px;text-align:right;">{{session3_date}}</td></tr>
        </table>
      </td></tr>
    </table>
    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
      <a href="{{register_url}}" style="display:inline-block;padding:14px 36px;background:#4F46E5;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold;">Register Free 🎓</a>
    </td></tr></table>
    <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0;">Can't attend live? Register to get the recording.</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#312E81;padding:20px 30px;text-align:center;">
    <p style="color:#A5B4FC;font-size:12px;margin:0;">KoolSkool · {{company.name}}</p>
    <p style="color:#818CF8;font-size:11px;margin:6px 0 0;">
      <a href="{{unsubscribe_url}}" style="color:#818CF8;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</body></html>`,
  },

  // ── 7. Savor Every Bite (Food / Marketing) ──
  {
    name: 'Savor Every Bite',
    slug: 'savor-every-bite',
    category: 'marketing',
    description: 'Gourmet dining experience promotion with elegant food photography',
    subject: '🍽️ Celebrate Together in Style — Reserve Your Table, {{name}}',
    tags: ['food', 'dining', 'restaurant', 'gourmet'],
    isFavorite: false,
    htmlBody: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#2C1810;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#1a0f0a;border-radius:0;overflow:hidden;">
  <!-- Hero -->
  <tr><td style="background:linear-gradient(to bottom,rgba(26,15,10,0.3),rgba(26,15,10,0.9));padding:40px 30px;text-align:center;position:relative;">
    <p style="color:#C9A96E;font-size:12px;margin:0 0 8px;letter-spacing:4px;text-transform:uppercase;">Fine Dining Experience</p>
    <h1 style="color:#F5E6CC;font-size:32px;margin:0;letter-spacing:1px;">Savor Every Bite</h1>
    <p style="color:#C9A96E;font-size:16px;margin:10px 0 0;">Celebrate Together in Style</p>
  </td></tr>
  <!-- Image -->
  <tr><td style="padding:0;">
    <img src="${IMG_BASE}/savor-every-bite.png" alt="Gourmet Food" style="width:100%;display:block;" />
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:30px;">
    <h2 style="color:#F5E6CC;font-size:22px;margin:0 0 12px;">Dear {{name}},</h2>
    <p style="color:#C9A96E;font-size:15px;line-height:1.8;margin:0 0 20px;">
      Experience culinary artistry at its finest. Our chef has crafted a special seasonal menu 
      that celebrates the finest ingredients, bold flavors, and the joy of shared moments around the table.
    </p>
    <!-- Menu Highlights -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #3d2a1e;border-radius:8px;margin:0 0 20px;">
      <tr><td style="padding:20px;background:#2C1810;">
        <p style="color:#C9A96E;font-size:14px;font-weight:bold;margin:0 0 12px;letter-spacing:1px;">CHEF'S SPECIALS</p>
        <p style="color:#F5E6CC;font-size:14px;margin:0 0 6px;">🥩 {{special_1}} — <em style="color:#C9A96E;">\${{price_1}}</em></p>
        <p style="color:#F5E6CC;font-size:14px;margin:0 0 6px;">🐟 {{special_2}} — <em style="color:#C9A96E;">\${{price_2}}</em></p>
        <p style="color:#F5E6CC;font-size:14px;margin:0;">🍫 {{special_3}} — <em style="color:#C9A96E;">\${{price_3}}</em></p>
      </td></tr>
    </table>
    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
      <a href="{{reservation_url}}" style="display:inline-block;padding:14px 36px;background:#C9A96E;color:#1a0f0a;text-decoration:none;border-radius:4px;font-size:14px;font-weight:bold;letter-spacing:1px;">Reserve Your Table</a>
    </td></tr></table>
    <p style="color:#6B5440;font-size:12px;text-align:center;margin:16px 0 0;">Available {{available_dates}} · Dress code: Smart casual</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#0d0806;padding:20px 30px;text-align:center;border-top:1px solid #3d2a1e;">
    <p style="color:#6B5440;font-size:12px;margin:0;">{{company.name}} · {{company.address}} · {{company.phone}}</p>
    <p style="color:#4a3a2e;font-size:11px;margin:6px 0 0;">
      <a href="{{unsubscribe_url}}" style="color:#6B5440;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</body></html>`,
  },

  // ── 8. Dream Vacation (Travel / Marketing) ──
  {
    name: 'Your Dream Vacation Awaits',
    slug: 'dream-vacation-awaits',
    category: 'marketing',
    description: 'Tropical travel destination promotion with paradise scenery',
    subject: '✈️ Your Dream Vacation Awaits — {{discount}}% Off, {{name}}!',
    tags: ['travel', 'vacation', 'tropical', 'booking'],
    isFavorite: false,
    htmlBody: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E0F7FA;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <!-- Hero -->
  <tr><td style="background:linear-gradient(135deg,#00838F,#00ACC1);padding:40px 30px;text-align:center;">
    <p style="color:#B2EBF2;font-size:13px;margin:0 0 6px;letter-spacing:2px;text-transform:uppercase;">Escape to Paradise</p>
    <h1 style="color:#ffffff;font-size:32px;margin:0;">✈️ Your Dream Vacation Awaits</h1>
    <p style="color:#B2EBF2;font-size:16px;margin:10px 0 0;">Pack your bags — adventure is calling!</p>
  </td></tr>
  <!-- Image -->
  <tr><td style="padding:0;">
    <img src="${IMG_BASE}/travel-vacation.png" alt="Dream Vacation" style="width:100%;display:block;" />
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:30px;">
    <h2 style="color:#00838F;font-size:22px;margin:0 0 12px;">Hey {{name}},</h2>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.7;margin:0 0 20px;">
      It's time to treat yourself! Whether you dream of turquoise waters, white sandy beaches, 
      or exotic adventures — we've got the perfect getaway for you.
    </p>
    <!-- Deal Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#E0F7FA;border:2px solid #00ACC1;border-radius:8px;margin:0 0 20px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="color:#00838F;font-size:14px;margin:0 0 4px;font-weight:bold;">LIMITED TIME OFFER</p>
        <p style="color:#006064;font-size:36px;margin:0;font-weight:bold;">{{discount}}% OFF</p>
        <p style="color:#00838F;font-size:14px;margin:4px 0 0;">Use code <strong>ESCAPE{{discount}}</strong></p>
      </td></tr>
    </table>
    <!-- Destinations -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="padding:6px 0;color:#00838F;font-size:14px;">🏝️ {{destination_1}} — from \${{price_1}}/person</td></tr>
      <tr><td style="padding:6px 0;color:#00838F;font-size:14px;">🌴 {{destination_2}} — from \${{price_2}}/person</td></tr>
      <tr><td style="padding:6px 0;color:#00838F;font-size:14px;">🌊 {{destination_3}} — from \${{price_3}}/person</td></tr>
    </table>
    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
      <a href="{{booking_url}}" style="display:inline-block;padding:14px 36px;background:#00ACC1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold;">Book Now 🌴</a>
    </td></tr></table>
    <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0;">Offer valid until {{expiry_date}}. Terms apply.</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#006064;padding:20px 30px;text-align:center;">
    <p style="color:#B2EBF2;font-size:12px;margin:0;">{{company.name}} · {{company.address}}</p>
    <p style="color:#80DEEA;font-size:11px;margin:6px 0 0;">
      <a href="{{unsubscribe_url}}" style="color:#80DEEA;">Unsubscribe</a> · 
      <a href="{{preferences_url}}" style="color:#80DEEA;">Preferences</a>
    </p>
  </td></tr>
</table>
</body></html>`,
  },
]

// ═══════════════════════════════════════════════════════════════
// Seed Logic
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('📧 Seeding Pabbly-Style Email Templates...\n')

  // Get the first tenant (owner's company)
  const owner = await db.user.findFirst({ where: { role: 'owner' } })
  const tenantId = owner?.tenantId || 'default'

  console.log(`🏢 Using tenant: ${tenantId}`)

  let created = 0
  let skipped = 0

  for (const tpl of templates) {
    try {
      const existing = await db.emailTemplate.findFirst({
        where: { slug: tpl.slug, tenantId },
      })

      if (existing) {
        console.log(`  ⏭️  Skipped (exists): ${tpl.name}`)
        skipped++
        continue
      }

      await db.emailTemplate.create({
        data: {
          name: tpl.name,
          slug: tpl.slug,
          category: tpl.category,
          description: tpl.description,
          subject: tpl.subject,
          htmlBody: tpl.htmlBody,
          textBody: '',
          variablesJson: '[]',
          isBuiltIn: true,
          isDefault: false,
          tenantId,
          language: 'en',
          status: 'published',
          isFavorite: tpl.isFavorite,
          tagsJson: JSON.stringify(tpl.tags),
          attachmentsJson: '[]',
        },
      })

      console.log(`  ✅ Created: ${tpl.name} [${tpl.category}]`)
      created++
    } catch (err) {
      console.error(`  ❌ Failed: ${tpl.name}`, err)
    }
  }

  // Also register images in the ImageLibrary
  console.log('\n🖼️  Registering template images in Image Library...')
  const imageFiles = [
    { name: 'red-velvet-cake.png', url: `${IMG_BASE}/red-velvet-cake.png`, folder: 'email' },
    { name: 'birthday-party.png', url: `${IMG_BASE}/birthday-party.png`, folder: 'email' },
    { name: 'bright-smiles.png', url: `${IMG_BASE}/bright-smiles.png`, folder: 'email' },
    { name: 'marketing-insights.png', url: `${IMG_BASE}/marketing-insights.png`, folder: 'email' },
    { name: 'signature-watch.png', url: `${IMG_BASE}/signature-watch.png`, folder: 'email' },
    { name: 'education-webinar.png', url: `${IMG_BASE}/education-webinar.png`, folder: 'email' },
    { name: 'savor-every-bite.png', url: `${IMG_BASE}/savor-every-bite.png`, folder: 'email' },
    { name: 'travel-vacation.png', url: `${IMG_BASE}/travel-vacation.png`, folder: 'email' },
  ]

  let imgCreated = 0
  for (const img of imageFiles) {
    try {
      const existing = await db.imageLibrary.findFirst({
        where: { url: img.url, tenantId },
      })
      if (existing) {
        console.log(`  ⏭️  Skipped (exists): ${img.name}`)
        continue
      }

      await db.imageLibrary.create({
        data: {
          name: img.name,
          url: img.url,
          folder: img.folder,
          mediaType: 'image/png',
          size: 0,
          tenantId,
          uploadedBy: owner?.id || 'system',
        },
      })
      console.log(`  ✅ Registered: ${img.name}`)
      imgCreated++
    } catch (err) {
      console.error(`  ❌ Failed: ${img.name}`, err)
    }
  }

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`🎉 SEED COMPLETE — Pabbly-Style Email Templates`)
  console.log(`${'═'.repeat(50)}`)
  console.log(`  Templates: ${created} created, ${skipped} skipped`)
  console.log(`  Images:    ${imgCreated} registered in vault`)
  console.log(`${'═'.repeat(50)}`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => {
    void db.$disconnect()
  })
