'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  Sparkles,
  MapPin,
  Bot,
  Globe,
  QrCode,
  Star,
  MessageCircle,
  Calendar,
  ShieldCheck,
  TrendingUp,
  X,
  Plus,
  Stethoscope,
  Scissors,
  Palmtree,
  Wrench,
  Utensils,
  Dumbbell,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import QRCode from 'qrcode';
import s from './landing.module.css';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fieseros.bgos';

function GooglePlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#4285F4" />
      <path d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.4l256.7-256L47 0z" fill="#34A853" />
      <path d="M405.4 186.2L325.3 234.3l60.1 60.1 20-11.6c23.6-13.6 23.6-35.8 0-49.4l-20-11.6z" fill="#FBBC04" />
      <path d="M325.3 277.7l-220.7 221.3 280.8-161.2-60.1-60.1z" fill="#EA4335" />
    </svg>
  );
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img src="/bgos/primary-logo.png" alt="BGOS — Business Growth Operating System" width={138} height={42} />
    </div>
  );
}

export default function Landing() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(PLAY_STORE_URL, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, []);

  // ── 1. Hero Live Short URL Checker State ────────────────────────────────
  const [handleInput, setHandleInput] = useState('kanvi');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    available: boolean;
    slug: string;
    url: string;
    reason?: string;
    error?: string;
    suggestions: string[];
  } | null>({
    available: true,
    slug: 'kanvi-farm',
    url: 'https://bgos.site/kanvi-farm',
    suggestions: ['kanvi-farm', 'kanvi-hub', 'the-kanvi', 'visit-kanvi'],
  });

  const checkSlugLive = async (slugToTest: string) => {
    const clean = slugToTest.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (!clean) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/bgos/slug/check?slug=${encodeURIComponent(clean)}`);
      const data = await res.json();
      setCheckResult({
        available: Boolean(data?.available),
        slug: data?.slug || clean,
        url: data?.url || `https://bgos.site/${clean}`,
        reason: data?.reason,
        error: data?.error,
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
      });
    } catch {
      setCheckResult({
        available: true,
        slug: clean,
        url: `https://bgos.site/${clean}`,
        suggestions: [],
      });
    } finally {
      setChecking(false);
    }
  };

  // ── 2. Interactive 4-Pillar Tabs State ──────────────────────────────────
  const [activePillar, setActivePillar] = useState<'gbp' | 'ai' | 'website' | 'standee'>('gbp');

  return (
    <div className={s.site}>
      {/* ── Sticky / Header ────────────────────────────────────────────── */}
      <header className={s.header}>
        <a href="/" aria-label="BGOS Home">
          <Logo />
        </a>
        <nav aria-label="Main Navigation">
          <a href="#features">Features</a>
          <a href="#solutions">Industries</a>
          <a href="#comparison">Why BGOS</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className={s.headerActions}>
          <a
            className={s.playStoreHeaderBtn}
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GooglePlayIcon size={16} />
            <span>Install on Google Play</span>
          </a>
        </div>
        <details className={s.mobileMenu}>
          <summary>Menu ☰</summary>
          <nav aria-label="Mobile Navigation">
            <a href="#features">Features</a>
            <a href="#solutions">Industries</a>
            <a href="#comparison">Why BGOS</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#009f50',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <GooglePlayIcon size={16} />
              Install on Google Play →
            </a>
          </nav>
        </details>
      </header>

      <main>
        {/* ── HERO SECTION ──────────────────────────────────────────────── */}
        <section className={s.hero}>
          <div className={s.container}>
            <div className={s.heroInner}>
              <div className={s.heroCopy}>
                <div className={s.badge}>
                  <Sparkles size={14} /> AUTONOMOUS AI MARKETING &amp; LOCAL GROWTH
                </div>
                <h1>
                  Rank #1 on Google Maps.<br />
                  Convert Inquiries 24/7.<br />
                  <em>Autopilot Your Business.</em>
                </h1>
                <p>
                  BGOS replies to Google reviews in 30 seconds, auto-posts daily photos &amp; updates to Google Maps,
                  and deploys a 24/7 AI Sales Receptionist on your instant hosted website at <b>bgos.site/your-business</b>.
                </p>

                <div className={s.heroActions}>
                  <a
                    className={s.playStoreHeroBtn}
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GooglePlayIcon size={22} />
                    <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                      <span style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.85, display: 'block' }}>GET IT ON</span>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>Google Play</span>
                    </div>
                  </a>
                  <a className={s.secondary} href="#features">
                    Explore Features
                  </a>

                  {qrDataUrl ? (
                    <div className={s.desktopQrBadge}>
                      <img
                        src={qrDataUrl}
                        alt="Scan QR to install BGOS"
                        width={58}
                        height={58}
                        className={s.desktopQrImg}
                      />
                      <div className={s.desktopQrText}>
                        <span className={s.desktopQrTitle}>Install on Phone</span>
                        <span className={s.desktopQrSub}>Scan with phone camera to download</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={s.heroGuarantees}>
                  <span>
                    <Check size={14} /> 100% Free to Install
                  </span>
                  <span>
                    <Check size={14} /> Official Google API Partner
                  </span>
                  <span>
                    <Check size={14} /> 7-Day Full Trial
                  </span>
                </div>

                {/* Live Interactive Short URL Checker */}
                <div className={s.heroChecker}>
                  <div className={s.heroCheckerLabel}>
                    <Globe size={14} color="#009f50" />
                    <span>Claim Your Free Business Short URL:</span>
                  </div>
                  <div className={s.checkerRow}>
                    <span className={s.checkerPrefix}>https://bgos.site/</span>
                    <input
                      type="text"
                      className={s.checkerInput}
                      value={handleInput}
                      onChange={(e) => setHandleInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && checkSlugLive(handleInput)}
                      placeholder="your-business-name"
                    />
                    <button
                      type="button"
                      className={s.checkerButton}
                      onClick={() => checkSlugLive(handleInput)}
                      disabled={checking}
                    >
                      {checking ? 'Checking...' : 'Check Handle'}
                    </button>
                  </div>

                  {checkResult && (
                    <div className={s.checkerFeedback}>
                      {checkResult.available ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span className={s.availableText}>
                            ✓ <b>bgos.site/{checkResult.slug}</b> is available!
                          </span>
                          <a
                            href={PLAY_STORE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: '#008040',
                              textDecoration: 'underline',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            Claim in BGOS App →
                          </a>
                        </div>
                      ) : (
                        <div style={{ width: '100%' }}>
                          <span className={s.takenText}>
                            ✗ {checkResult.reason || 'Handle already taken.'}
                          </span>
                          {checkResult.suggestions.length > 0 && (
                            <div className={s.suggestionsRow}>
                              <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>Available:</span>
                              {checkResult.suggestions.map((sug) => (
                                <button
                                  key={sug}
                                  type="button"
                                  className={s.suggestionChip}
                                  onClick={() => {
                                    setHandleInput(sug);
                                    checkSlugLive(sug);
                                  }}
                                >
                                  + {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Hero Visual Mockup */}
              <div className={s.heroVisual}>
                <div className={s.liveMockCard}>
                  <div className={s.mockTopBar}>
                    <div className={s.mockTopDots}>
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className={s.mockUrlBadge}>
                      <ShieldCheck size={13} color="#009f50" />
                      https://bgos.site/kanvi
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#009f50' }}>LIVE</div>
                  </div>

                  <div className={s.mockContent}>
                    {/* Google Maps Ranking Snippet */}
                    <div className={s.googlePreviewBox}>
                      <div className={s.gRankBadge}>
                        #1 Rank
                        <small style={{ display: 'block', fontSize: 9, fontWeight: 600 }}>Google Maps</small>
                      </div>
                      <div className={s.gInfo}>
                        <div className={s.gTitle}>Delhi Farm Kanvi &amp; Holiday Stays</div>
                        <div className={s.gStars}>
                          ★★★★★ <span>5.0 (148 Google Reviews)</span>
                        </div>
                        <div className={s.gActionRow}>
                          <span className={s.gBtn}>📞 Call</span>
                          <span className={s.gBtn}>📍 Directions</span>
                          <span className={s.gBtn} style={{ background: '#e6f7ee', color: '#008040' }}>
                            ✓ 30s AI Auto-Reply Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI Sales Chatbot Snippet */}
                    <div className={s.aiChatSnippet}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#0f766e' }}>
                        <Bot size={14} /> 24/7 AI Receptionist Assistant
                      </div>
                      <div className={s.chatUserBubble}>
                        Hi! What are the charges for booking full farmhouse stay this weekend?
                      </div>
                      <div className={s.chatAiBubble}>
                        Namaste! Full farmhouse stay is ₹15,000/day with private swimming pool access. Would you like me to reserve Saturday for you?
                      </div>
                    </div>
                  </div>
                </div>

                <div className={s.floatingTag}>
                  <TrendingUp size={18} />
                  <div>
                    <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>Average Merchant Result</span>
                    +42% More Calls &amp; Bookings
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── METRICS & TRUST BAR ────────────────────────────────────────── */}
        <section className={s.metricsBar}>
          <div className={s.container}>
            <div className={s.metricsGrid}>
              <div>
                <div className={s.metricValue}>10,000+</div>
                <div className={s.metricLabel}>Local Businesses Growing on BGOS</div>
              </div>
              <div>
                <div className={s.metricValue}>4.8 / 5.0 ★</div>
                <div className={s.metricLabel}>Average Google Review Rating</div>
              </div>
              <div>
                <div className={s.metricValue}>&lt; 30 sec</div>
                <div className={s.metricLabel}>AI Response Time to Reviews &amp; Leads</div>
              </div>
              <div>
                <div className={s.metricValue}>3.4x</div>
                <div className={s.metricLabel}>More Calls &amp; Direction Requests</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4 CORE PILLARS (Interactive Tabs) ─────────────────────────── */}
        <section className={s.section} id="features">
          <div className={s.container}>
            <div className={s.sectionHeader}>
              <div className={s.badge}>ALL-IN-ONE ENGINE</div>
              <h2>Everything Your Business Needs to Dominate Locally</h2>
              <p>
                Replace expensive marketing agencies, missed calls, and manual review replies with our unified autonomous growth co-pilot.
              </p>
            </div>

            {/* Pillar Selector Buttons */}
            <div className={s.pillarTabs}>
              <button
                type="button"
                className={`${s.pillarTabBtn} ${activePillar === 'gbp' ? s.pillarTabActive : ''}`}
                onClick={() => setActivePillar('gbp')}
              >
                <MapPin size={16} /> 1. Google Maps Autopilot
              </button>
              <button
                type="button"
                className={`${s.pillarTabBtn} ${activePillar === 'ai' ? s.pillarTabActive : ''}`}
                onClick={() => setActivePillar('ai')}
              >
                <Bot size={16} /> 2. 24/7 AI Sales Receptionist
              </button>
              <button
                type="button"
                className={`${s.pillarTabBtn} ${activePillar === 'website' ? s.pillarTabActive : ''}`}
                onClick={() => setActivePillar('website')}
              >
                <Globe size={16} /> 3. Instant Website at bgos.site
              </button>
              <button
                type="button"
                className={`${s.pillarTabBtn} ${activePillar === 'standee' ? s.pillarTabActive : ''}`}
                onClick={() => setActivePillar('standee')}
              >
                <QrCode size={16} /> 4. Physical Review Standee
              </button>
            </div>

            {/* Pillar Content Showcase */}
            {activePillar === 'gbp' && (
              <div className={s.pillarShowcase}>
                <div className={s.pillarInfo}>
                  <div className={s.badge}>RANK BOOSTING</div>
                  <h3>Never Miss a Review. Rank Top 3 in Your City.</h3>
                  <p>
                    Google algorithms reward businesses that respond quickly, upload photos regularly, and maintain fresh posts. BGOS handles it all automatically.
                  </p>
                  <ul className={s.pillarBullets}>
                    <li>
                      <CheckCircle2 size={16} /> <b>Instant AI Review Replies:</b> Sentiment-aware replies in English, Hindi, or Spanish within 30 seconds.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Photo Freshness Engine:</b> Regular photo publishing proven to increase direction requests by 42%.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Local SEO Keyword Autopilot:</b> Automatically targets high-intent search terms (e.g. "near me", "best in city").
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Weekly Radar Scan:</b> Tracks rank movements on Google Search &amp; Maps every 7 days.
                    </li>
                  </ul>
                  <a className={s.primary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                    Autopilot My Google Profile <ArrowRight size={15} />
                  </a>
                </div>
                <div className={s.pillarCardMock}>
                  <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Google Business Autopilot</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 10 }}>ACTIVE</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Last 30 Days Performance:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                      <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#009f50' }}>148</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Reviews Replied</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0284c7' }}>24</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Posts Published</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>#1</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Local Map Rank</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePillar === 'ai' && (
              <div className={s.pillarShowcase}>
                <div className={s.pillarInfo}>
                  <div className={s.badge}>24/7 CONVERSATIONAL SALES</div>
                  <h3>Your AI Concierge That Sells While You Sleep.</h3>
                  <p>
                    Trained automatically on your business services, pricing, hours, and brand voice. Handles inquiries, provides instant quotes, and books appointments.
                  </p>
                  <ul className={s.pillarBullets}>
                    <li>
                      <CheckCircle2 size={16} /> <b>Zero Knowledge Training Needed:</b> Auto-learns from your website, catalog, and GBP profile.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Direct Booking &amp; Lead Capture:</b> Captures customer name, phone number, and requested service right inside the chat.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Instant WhatsApp &amp; Push Handoff:</b> Notifies you or your employees in real-time when human takeover is requested.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Multilingual Fluency:</b> Communicates fluently in English, Hindi, Hinglish, and regional dialects.
                    </li>
                  </ul>
                  <a className={s.primary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                    Try AI Receptionist on App <ArrowRight size={15} />
                  </a>
                </div>
                <div className={s.pillarCardMock}>
                  <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #bbf7d0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#009f50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Bot size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>24/7 AI Business Assistant</div>
                        <div style={{ fontSize: 10.5, color: '#15803d' }}>● Online &amp; Ready</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                      <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '10px 10px 10px 2px', alignSelf: 'flex-start' }}>
                        Do you have availability for dental checkup tomorrow at 4 PM?
                      </div>
                      <div style={{ background: '#009f50', color: '#fff', padding: '8px 12px', borderRadius: '10px 10px 2px 10px', alignSelf: 'flex-end', maxWidth: '85%' }}>
                        Yes! Dr. Sharma has a slot open at 4:15 PM. May I have your name and contact number to confirm your appointment?
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePillar === 'website' && (
              <div className={s.pillarShowcase}>
                <div className={s.pillarInfo}>
                  <div className={s.badge}>INSTANT SHORT DOMAIN</div>
                  <h3>Your Own Branded Website: bgos.site/your-business</h3>
                  <p>
                    No complex domain setups, no coding, and no web design fees. Get an ultra-fast, mobile-optimized business website ready in under 60 seconds.
                  </p>
                  <ul className={s.pillarBullets}>
                    <li>
                      <CheckCircle2 size={16} /> <b>Custom Short Link:</b> Easy to share on WhatsApp, Instagram bio, and print on business cards.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Live Product &amp; Service Catalog:</b> Showcase pricing, offerings, and customer reviews cleanly.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>1-Tap WhatsApp &amp; Call Action:</b> Direct buttons that make it effortless for customers to contact you.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Integrated Booking &amp; Inquiry:</b> Customers book consultations without downloading any app.
                    </li>
                  </ul>
                  <a className={s.primary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                    Get My Free Website <ArrowRight size={15} />
                  </a>
                </div>
                <div className={s.pillarCardMock}>
                  <div style={{ background: '#ffffff', borderRadius: 14, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                    <div style={{ height: 100, background: 'linear-gradient(135deg, #009f50, #0284c7)', display: 'flex', alignItems: 'flex-end', padding: 14 }}>
                      <span style={{ background: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#009f50' }}>
                        bgos.site/kanvi
                      </span>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>Delhi Farm Kanvi</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Holiday Stays &amp; Swimming Pool</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                        <div style={{ flex: 1, padding: 8, background: '#f8fafc', borderRadius: 6, textAlign: 'center', fontSize: 11, fontWeight: 600 }}>
                          🏊 Swimming Pool
                        </div>
                        <div style={{ flex: 1, padding: 8, background: '#f8fafc', borderRadius: 6, textAlign: 'center', fontSize: 11, fontWeight: 600 }}>
                          🏡 Farmhouse Stay
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePillar === 'standee' && (
              <div className={s.pillarShowcase}>
                <div className={s.pillarInfo}>
                  <div className={s.badge}>PHYSICAL TO DIGITAL</div>
                  <h3>Print Custom Counter Standees with 1-Tap</h3>
                  <p>
                    Turn walk-in customers into 5-star Google reviews and repeat sales. Download a high-resolution, print-ready QR standee tailored to your brand.
                  </p>
                  <ul className={s.pillarBullets}>
                    <li>
                      <CheckCircle2 size={16} /> <b>Direct Google 5-Star Review Flow:</b> Customers scan and are taken straight to your Google review box.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Branded with Your Logo &amp; Phone:</b> Formatted professionally for acrylic counter stands and tabletop cards.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>QR Code Tracking:</b> Know exactly how many scans turn into positive customer reviews.
                    </li>
                  </ul>
                  <a className={s.primary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                    Generate Standee in App <ArrowRight size={15} />
                  </a>
                </div>
                <div className={s.pillarCardMock}>
                  <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, textAlign: 'center', border: '2px solid #009f50', maxWidth: 280, margin: 'auto' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#009f50' }}>★ SCAN TO REVIEW ★</div>
                    <div style={{ fontSize: 14, fontWeight: 700, margin: '8px 0 16px' }}>Delhi Farm Kanvi</div>
                    <div style={{ width: 140, height: 140, background: '#f1f5f9', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px dashed #94a3b8' }}>
                      <QrCode size={90} color="#0f172a" />
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 14 }}>
                      Powered by <b>BGOS</b> • Verified Google Review
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── BEFORE VS AFTER (Dhanda Style) ────────────────────────────── */}
        <section className={`${s.section} ${s.sectionAlt}`} id="comparison">
          <div className={s.container}>
            <div className={s.sectionHeader}>
              <div className={s.badge}>THE BGOS ADVANTAGE</div>
              <h2>Why Businesses Switch from Chaos to Autopilot</h2>
              <p>Compare doing everything manually versus letting BGOS handle your customer growth.</p>
            </div>

            <div className={s.compareGrid}>
              <div className={s.compareColOld}>
                <div className={s.compareHeader}>
                  <X size={24} className={s.badIcon} />
                  <h4>Without BGOS (Manual Friction)</h4>
                </div>
                <ul className={s.compareList}>
                  <li>
                    <X size={16} className={s.badIcon} />
                    <span><b>Unreplied Reviews:</b> Negative or delayed review replies hurt Google local search ranking.</span>
                  </li>
                  <li>
                    <X size={16} className={s.badIcon} />
                    <span><b>Missed Late-Night Inquiries:</b> Customers looking for services after 8 PM go to your competitor.</span>
                  </li>
                  <li>
                    <X size={16} className={s.badIcon} />
                    <span><b>Dead Social Feeds:</b> No time to create posters, write captions, or post regular photos.</span>
                  </li>
                  <li>
                    <X size={16} className={s.badIcon} />
                    <span><b>Expensive Agencies:</b> Paying ₹15,000 to ₹30,000/mo for marketing agencies that don't deliver bookings.</span>
                  </li>
                  <li>
                    <X size={16} className={s.badIcon} />
                    <span><b>Scattered Records:</b> Customer phone numbers lost in WhatsApp chats and paper notebooks.</span>
                  </li>
                </ul>
              </div>

              <div className={s.compareColNew}>
                <div className={s.compareHeader}>
                  <CheckCircle2 size={24} className={s.goodIcon} />
                  <h4>With BGOS (Autonomous Growth)</h4>
                </div>
                <ul className={s.compareList}>
                  <li>
                    <CheckCircle2 size={16} className={s.goodIcon} />
                    <span><b>100% Reviews Answered in 30s:</b> AI crafts personalized, brand-voiced replies automatically.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className={s.goodIcon} />
                    <span><b>24/7 AI Sales Receptionist:</b> Instant replies on WhatsApp &amp; web that book appointments 24 hours a day.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className={s.goodIcon} />
                    <span><b>Automated Weekly Google Posts:</b> AI generates seasonal offers, photo updates, and festival wishes.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className={s.goodIcon} />
                    <span><b>Complete Growth OS from ₹499/mo:</b> Unlimited forms, CRM leads, reviews, and website in one app.</span>
                  </li>
                  <li>
                    <CheckCircle2 size={16} className={s.goodIcon} />
                    <span><b>Instant Short URL:</b> Your professional profile live at <b>bgos.site/your-business</b> in 60s.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── INDUSTRY VERTICALS (Grexa Style) ──────────────────────────── */}
        <section className={s.section} id="solutions">
          <div className={s.container}>
            <div className={s.sectionHeader}>
              <div className={s.badge}>TAILORED FOR YOUR INDUSTRY</div>
              <h2>Built for Business Owners Like You</h2>
              <p>Every industry has unique customer needs. BGOS adapts its AI brain to match your trade.</p>
            </div>

            <div className={s.industryGrid}>
              <div className={s.industryCard}>
                <Stethoscope size={28} />
                <h4>Clinics &amp; Dentists</h4>
                <span className={s.industryBenefit}>+48% More Consultations</span>
                <p>Auto-reply to patient reviews, confirm appointment slots, and answer pricing inquiries without front-desk bottlenecks.</p>
              </div>

              <div className={s.industryCard}>
                <Scissors size={28} />
                <h4>Salons &amp; Spas</h4>
                <span className={s.industryBenefit}>Zero Unanswered Inquiries</span>
                <p>Send review requests after appointments, showcase styling photos, and auto-book appointments via WhatsApp chat.</p>
              </div>

              <div className={s.industryCard}>
                <Palmtree size={28} />
                <h4>Farmhouses &amp; Resorts</h4>
                <span className={s.industryBenefit}>0% Commission Direct Bookings</span>
                <p>Accept swimming pool access and stay reservations directly on <b>bgos.site/your-resort</b> without paying OTA commissions.</p>
              </div>

              <div className={s.industryCard}>
                <Wrench size={28} />
                <h4>Tradies &amp; Home Services</h4>
                <span className={s.industryBenefit}>Top 3 Google Maps Ranking</span>
                <p>Boost local visibility for plumbers, electricians, painters, and HVAC technicians with automated job photo sync.</p>
              </div>

              <div className={s.industryCard}>
                <Utensils size={28} />
                <h4>Cafes &amp; Restaurants</h4>
                <span className={s.industryBenefit}>+3.4x Direction Inquiries</span>
                <p>Post mouth-watering weekly food specials, manage 5-star Google ratings, and guide customers with counter QR standees.</p>
              </div>

              <div className={s.industryCard}>
                <Dumbbell size={28} />
                <h4>Gyms &amp; Fitness</h4>
                <span className={s.industryBenefit}>Instant Trial Class Signups</span>
                <p>Capture fitness leads on social media, follow up via automated WhatsApp templates, and boost membership renewals.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRANSPARENT PRICING ────────────────────────────────────────── */}
        <section className={`${s.section} ${s.sectionAlt}`} id="pricing">
          <div className={s.container}>
            <div className={s.sectionHeader}>
              <div className={s.badge}>TRANSPARENT PRICING</div>
              <h2>Start Free. Upgrade As You Grow.</h2>
              <p>Download the BGOS Android app from Google Play to activate your 7-day full access trial on any plan. No credit card required.</p>
            </div>

            <div className={s.pricingGrid}>
              {/* Free Plan */}
              <div className={s.planCard}>
                <h4>Free</h4>
                <div className={s.planPrice}>
                  ₹0 <span>/ month</span>
                </div>
                <div className={s.planDesc}>Start your digital presence.</div>
                <ul className={s.planFeatures}>
                  <li>
                    <Check size={14} /> Instant Short URL (bgos.site/slug)
                  </li>
                  <li>
                    <Check size={14} /> Printable Counter QR Standee
                  </li>
                  <li>
                    <Check size={14} /> One Hosted Intake Form
                  </li>
                  <li>
                    <Check size={14} /> Up to 100 Customer Contacts
                  </li>
                </ul>
                <a className={s.secondary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Get on Google Play
                </a>
              </div>

              {/* Starter Plan */}
              <div className={s.planCard}>
                <h4>Starter</h4>
                <div className={s.planPrice}>
                  ₹499 <span>/ month ($9)</span>
                </div>
                <div className={s.planDesc}>Ideal for solo trades and small shops.</div>
                <ul className={s.planFeatures}>
                  <li>
                    <Check size={14} /> Everything in Free
                  </li>
                  <li>
                    <Check size={14} /> 24/7 AI Sales Receptionist
                  </li>
                  <li>
                    <Check size={14} /> Unlimited Lead Forms &amp; Funnels
                  </li>
                  <li>
                    <Check size={14} /> Appointment Booking Engine
                  </li>
                  <li>
                    <Check size={14} /> 1,000 Customer Contacts
                  </li>
                </ul>
                <a className={s.secondary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Download &amp; Start Trial
                </a>
              </div>

              {/* Growth Plan (Featured) */}
              <div className={`${s.planCard} ${s.featuredPlan}`}>
                <div className={s.planBadge}>MOST POPULAR</div>
                <h4>Growth</h4>
                <div className={s.planPrice}>
                  ₹1,499 <span>/ month ($29)</span>
                </div>
                <div className={s.planDesc}>For businesses ready to dominate local Google search.</div>
                <ul className={s.planFeatures}>
                  <li>
                    <Check size={14} /> Everything in Starter
                  </li>
                  <li>
                    <Check size={14} /> <b>Google Maps Rank Autopilot</b>
                  </li>
                  <li>
                    <Check size={14} /> <b>30-Second AI Review Replies</b>
                  </li>
                  <li>
                    <Check size={14} /> Weekly AI Social &amp; Video Posts
                  </li>
                  <li>
                    <Check size={14} /> WhatsApp Outreach Campaigns
                  </li>
                  <li>
                    <Check size={14} /> 10,000 Customer Contacts
                  </li>
                </ul>
                <a className={s.primary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Download &amp; Start 7-Day Trial
                </a>
              </div>

              {/* Business Plan */}
              <div className={s.planCard}>
                <h4>Business</h4>
                <div className={s.planPrice}>
                  ₹3,999 <span>/ month ($79)</span>
                </div>
                <div className={s.planDesc}>For multi-location brands &amp; high volume teams.</div>
                <ul className={s.planFeatures}>
                  <li>
                    <Check size={14} /> Everything in Growth
                  </li>
                  <li>
                    <Check size={14} /> Multi-location Location Radar
                  </li>
                  <li>
                    <Check size={14} /> 2,500 Monthly Lead Intelligence Credits
                  </li>
                  <li>
                    <Check size={14} /> Team Roles &amp; Employee Routing
                  </li>
                  <li>
                    <Check size={14} /> Priority WhatsApp Concierge Support
                  </li>
                  <li>
                    <Check size={14} /> 100,000 Contacts
                  </li>
                </ul>
                <a className={s.secondary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Download on Google Play
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FREQUENTLY ASKED QUESTIONS ────────────────────────────────── */}
        <section className={s.section} id="faq">
          <div className={s.container}>
            <div className={s.sectionHeader}>
              <div className={s.badge}>GOT QUESTIONS?</div>
              <h2>Frequently Asked Questions</h2>
              <p>Everything you need to know about setting up and growing with BGOS.</p>
            </div>

            <div className={s.faqGrid}>
              <details className={s.faqItem}>
                <summary>
                  What makes BGOS different from a typical digital marketing agency?
                  <Plus size={18} />
                </summary>
                <p>
                  Agencies charge ₹15,000 to ₹50,000 every month and often take days to answer simple customer reviews.
                  BGOS works 24/7/365 autonomously — replying to reviews in 30 seconds, generating posts, booking customer appointments, and tracking local rankings for a fraction of the cost.
                </p>
              </details>

              <details className={s.faqItem}>
                <summary>
                  How does the custom short URL (bgos.site/your-business) work?
                  <Plus size={18} />
                </summary>
                <p>
                  You don't need to purchase a domain or write code. BGOS instantly gives you a clean, lightning-fast business webpage at <b>https://bgos.site/your-business</b> featuring your services, catalog, photos, direct WhatsApp call button, and your 24/7 AI Receptionist.
                </p>
              </details>

              <details className={s.faqItem}>
                <summary>
                  Can I use BGOS on both my phone and computer?
                  <Plus size={18} />
                </summary>
                <p>
                  Yes! BGOS has native mobile apps for iOS and Android for on-the-go management, daily push updates, and quick review checks, as well as a complete web studio for in-depth marketing campaigns.
                </p>
              </details>

              <details className={s.faqItem}>
                <summary>
                  Does BGOS reply to Google reviews safely?
                  <Plus size={18} />
                </summary>
                <p>
                  Yes. BGOS connects via Google's official Business Profile APIs. You can set the AI to automatically publish replies instantly, or hold them for your 1-tap review and approval.
                </p>
              </details>

              <details className={s.faqItem}>
                <summary>
                  What happens after my 7-day free trial?
                  <Plus size={18} />
                </summary>
                <p>
                  You can explore all Growth features for 7 full days with zero risk and no credit card required. After 7 days, you can choose to continue on a paid plan or stay on the Free plan indefinitely.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA BOX ─────────────────────────────────────────────── */}
        <section className={s.container}>
          <div className={s.ctaBox}>
            <div>
              <div className={s.badge} style={{ background: 'rgba(255,255,255,0.15)', color: '#a7f3d0', borderColor: 'rgba(255,255,255,0.2)' }}>
                READY TO GROW?
              </div>
              <h2>Put BGOS to Work for Your Business Today.</h2>
              <p>Join thousands of local businesses dominating Google Maps and converting customers 24/7.</p>
            </div>
            <div className={s.ctaActions}>
              <a
                className={s.playStoreHeroBtn}
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '14px 28px' }}
              >
                <GooglePlayIcon size={24} />
                <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                  <span style={{ fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.85, display: 'block' }}>GET IT ON</span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>Google Play</span>
                </div>
              </a>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>✓ Free download • 7-day full trial • 2 min setup</span>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerTop}>
            <div className={s.footerBrand}>
              <Logo />
              <p>
                BGOS is the autonomous Business Growth Operating System empowering local enterprises to rank #1 on Google Maps, automate customer conversations, and drive repeat revenue.
              </p>
            </div>

            <div className={s.footerCol}>
              <h5>Product</h5>
              <a href="#features">Google Maps Autopilot</a>
              <a href="#features">24/7 AI Receptionist</a>
              <a href="#features">Instant Short Website</a>
              <a href="#features">QR Review Standee</a>
              <a href="#pricing">Pricing Plans</a>
            </div>

            <div className={s.footerCol}>
              <h5>Industries</h5>
              <a href="#solutions">Clinics &amp; Dentists</a>
              <a href="#solutions">Salons &amp; Spas</a>
              <a href="#solutions">Farmhouses &amp; Resorts</a>
              <a href="#solutions">Tradies &amp; Home Services</a>
              <a href="#solutions">Restaurants &amp; Cafes</a>
            </div>

            <div className={s.footerCol}>
              <h5>Download &amp; Support</h5>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <GooglePlayIcon size={14} /> Android App (Google Play)
              </a>
              <a href="mailto:support@fieseros.com">Contact Support</a>
              <a href="https://fieseros.com/privacy-policy">Privacy Policy</a>
              <a href="https://fieseros.com/terms-of-service">Terms of Service</a>
            </div>
          </div>

          <div className={s.footerBottom}>
            <span>© {new Date().getFullYear()} BGOS (bgos.site) • A Fieseros Platform. All rights reserved.</span>
            <div className={s.footerBottomLinks}>
              <a href="https://fieseros.com/privacy-policy">Privacy</a>
              <a href="https://fieseros.com/terms-of-service">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
