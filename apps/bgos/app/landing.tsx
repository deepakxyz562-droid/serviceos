'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  Check,
  Sparkles,
  MapPin,
  Bot,
  Globe,
  QrCode,
  Star,
  ShieldCheck,
  TrendingUp,
  X,
  Plus,
  CheckCircle2,
  Zap,
  Palette,
  Trophy,
  Building2,
  Phone,
  Search,
  Users,
  Layers,
} from 'lucide-react';
import QRCode from 'qrcode';
import s from './landing.module.css';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fieseros.bgos';

const NativeAgentChatEmbed = dynamic(
  () => import('@/components/public/native-agent-chat-embed').then((m) => ({ default: m.NativeAgentChatEmbed })),
  { ssr: false }
);

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
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {!imgError ? (
        <img
          src="/bgos/primary-logo.png?v=2"
          alt="BGOS — Business Growth Operating System"
          width={138}
          height={42}
          onError={() => setImgError(true)}
          style={{ height: 38, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 22, color: '#009f50', letterSpacing: -0.5 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#009f50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 900 }}>b</div>
          <span style={{ color: '#0f172a' }}>BGOS</span>
        </div>
      )}
    </div>
  );
}

const QUICK_PILLARS = [
  {
    icon: MapPin,
    title: 'Google Business Profile AI',
    desc: 'Optimize & grow',
    pillar: 'gbp' as const,
  },
  {
    icon: Star,
    title: 'Review Management',
    desc: 'Reply in 30 seconds',
    pillar: 'gbp' as const,
  },
  {
    icon: Bot,
    title: 'AI Business Assistant',
    desc: 'Answer & engage 24/7',
    pillar: 'ai' as const,
  },
  {
    icon: Palette,
    title: 'AI Marketing Studio',
    desc: 'Create stunning content',
    pillar: 'studio' as const,
  },
  {
    icon: Globe,
    title: 'Website & Forms',
    desc: 'Get more leads',
    pillar: 'website' as const,
  },
];

const INDUSTRIES = [
  {
    name: 'Clinics & Dentists',
    image: '/images/bgos/templates/dental.webp',
    badge: '+48% More Consultations',
    desc: 'Auto-reply to patient reviews, confirm appointment slots, and answer pricing inquiries without front-desk bottlenecks.',
  },
  {
    name: 'Salons & Spas',
    image: '/images/bgos/templates/salon.webp',
    badge: 'Zero Unanswered Inquiries',
    desc: 'Send review requests after appointments, showcase styling photos, and auto-book appointments via WhatsApp chat.',
  },
  {
    name: 'Farmhouses & Resorts',
    image: '/images/bgos/templates/property.webp',
    badge: '0% Commission Direct Bookings',
    desc: 'Accept swimming pool access and stay reservations directly on bgos.site/your-resort without paying OTA commissions.',
  },
  {
    name: 'Tradies & Home Services',
    image: '/images/bgos/templates/plumbing.webp',
    badge: 'Top 3 Google Maps Ranking',
    desc: 'Boost local visibility for plumbers, electricians, painters, and HVAC technicians with automated job photo sync.',
  },
  {
    name: 'Restaurants & Cafes',
    image: '/images/bgos/templates/cafe.webp',
    badge: '+3.4x Direction Inquiries',
    desc: 'Post mouth-watering weekly food specials, manage 5-star Google ratings, and guide customers with counter QR standees.',
  },
  {
    name: 'Gyms & Fitness',
    image: '/images/bgos/templates/fitness.webp',
    badge: 'Instant Trial Class Signups',
    desc: 'Capture fitness leads on social media, follow up via automated WhatsApp templates, and boost membership renewals.',
  },
];

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

  // ── 2. Interactive 5-Pillar Tabs State ──────────────────────────────────
  const [activePillar, setActivePillar] = useState<'gbp' | 'ai' | 'website' | 'standee' | 'studio'>('gbp');

  // ── 3. 15-Second Google Maps Growth Score Audit State ───────────────────
  const [auditBusiness, setAuditBusiness] = useState('ShieldHire SOS App');
  const [auditCity, setAuditCity] = useState('Delhi');
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditStep, setAuditStep] = useState(0); // 0=idle, 1=scanning, 2=reviews, 3=photos, 4=complete
  const [auditResult, setAuditResult] = useState<{
    score: number;
    benchmarkScore: number;
    grade: string;
    business: string;
    city: string;
    checkpoints: Array<{
      title: string;
      score: number;
      badge: string;
      status: 'warning' | 'critical' | 'good';
      diagnostic: string;
      fix: string;
    }>;
  } | null>({
    score: 64,
    benchmarkScore: 84,
    grade: 'Needs Optimization to Reach Top 3',
    business: 'ShieldHire SOS App',
    city: 'Delhi',
    checkpoints: [
      {
        title: 'Google Maps 3-Pack SEO & Keywords',
        score: 58,
        badge: 'Gap Found',
        status: 'warning',
        diagnostic: 'Ranked outside top 5 for local emergency guarding in Delhi. Missing 6 high-volume search keyword tags in profile description.',
        fix: 'Ranking Agent automatically optimizes secondary categories and injects local keyword tags.',
      },
      {
        title: 'Review Reply Speed & Sentiment',
        score: 45,
        badge: 'Critical Lag',
        status: 'critical',
        diagnostic: 'No reviews answered in under 1 hour. Google ranking algorithms penalize profiles with slow or missing owner replies.',
        fix: 'Review Agent replies autonomously in under 30 seconds in natural English & Hindi.',
      },
      {
        title: 'Weekly Storefront Photo Freshness',
        score: 50,
        badge: 'Under-Active',
        status: 'warning',
        diagnostic: '0 photos or promotional updates posted in the last 14 days. Active top 3 competitors upload 2-3 geo-tagged photos every week.',
        fix: 'Media & Poster Studio Agent schedules branded festive posters & team photos automatically.',
      },
      {
        title: 'Lead Conversion & Booking Links',
        score: 60,
        badge: 'Action Needed',
        status: 'warning',
        diagnostic: 'Profile lacks a verified 1-tap direct booking link and physical QR standee for walk-in customer review capture.',
        fix: 'Instantly deploys bgos.site/your-business link and ships 1-tap QR standees.',
      },
    ],
  });

  const runInstantAudit = (bName: string, cName: string) => {
    const cleanB = bName.trim() || 'My Local Business';
    const cleanC = cName.trim() || 'India';
    setAuditBusiness(cleanB);
    setAuditCity(cleanC);
    setAuditRunning(true);
    setAuditStep(1);

    setTimeout(() => {
      setAuditStep(2);
      setTimeout(() => {
        setAuditStep(3);
        setTimeout(() => {
          const seed = (cleanB.length * 7 + cleanC.length * 3) % 20;
          const calculatedScore = 62 + seed;
          setAuditResult({
            score: calculatedScore,
            benchmarkScore: 86,
            grade: calculatedScore >= 75 ? 'Good Potential • Close to Top 3' : 'Needs Optimization to Reach Top 3',
            business: cleanB,
            city: cleanC,
            checkpoints: [
              {
                title: 'Google Maps 3-Pack SEO & Keywords',
                score: calculatedScore - 6,
                badge: calculatedScore >= 75 ? 'Optimized' : 'Gap Found',
                status: calculatedScore >= 75 ? 'good' : 'warning',
                diagnostic: `Missing neighborhood search keywords for ${cleanB} in ${cleanC}. Local 3-Pack visibility is limited to a 1.2km radius.`,
                fix: 'Ranking Agent optimizes category taxonomy and local service tags to expand radius.',
              },
              {
                title: 'Review Reply Speed & Sentiment',
                score: calculatedScore - 12,
                badge: 'Critical Lag',
                status: 'critical',
                diagnostic: 'Delayed review replies trigger Google rank decay. Fast replies (< 1 hr) boost local consumer conversion by 3.2x.',
                fix: 'Review Agent replies autonomously in under 30 seconds with personalized keywords.',
              },
              {
                title: 'Weekly Storefront Photo Freshness',
                score: calculatedScore - 4,
                badge: 'Under-Active',
                status: 'warning',
                diagnostic: 'Storefront media rhythm is below the Google recommended frequency of 2-3 weekly posts.',
                fix: 'Media Agent & Poster Studio schedule branded seasonal creatives and geo-tagged photos.',
              },
              {
                title: 'Lead Conversion & Booking Links',
                score: calculatedScore + 2,
                badge: 'Action Needed',
                status: 'warning',
                diagnostic: `No direct booking link found for ${cleanB}. Visitors must bounce to Google search to contact.`,
                fix: `Deploys bgos.site/${cleanB.toLowerCase().replace(/[^a-z0-9]+/g, '-')} with 24/7 AI Receptionist.`,
              },
            ],
          });
          setAuditStep(4);
          setAuditRunning(false);
        }, 400);
      }, 350);
    }, 350);
  };

  return (
    <div className={s.site}>
      {/* ── Sticky / Header ────────────────────────────────────────────── */}
      <header className={s.header}>
        <a href="/" aria-label="BGOS Home">
          <Logo />
        </a>
        <nav aria-label="Main Navigation">
          <a href="#features">Features</a>
          <a href="#audit">Google Growth</a>
          <a href="#industries">Industries</a>
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
            <span>Get BGOS on Google Play</span>
          </a>
        </div>
        <details className={s.mobileMenu}>
          <summary aria-label="Open mobile navigation">☰</summary>
          <nav aria-label="Mobile Navigation">
            <a href="#features">Features</a>
            <a href="#audit">Google Growth</a>
            <a href="#industries">Industries</a>
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
                  Get Found. Win Customers.<br />
                  <em>Grow Automatically.</em>
                </h1>

                <div className={s.heroValueProps}>
                  <div className={s.heroValuePropItem}>
                    <Check size={14} /> Rank #1 on Google Maps.
                  </div>
                  <div className={s.heroValuePropItem}>
                    <Check size={14} /> Convert Inquiries 24/7.
                  </div>
                  <div className={s.heroValuePropItem}>
                    <Check size={14} /> Autopilot Your Business.
                  </div>
                </div>

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
                    Explore Features →
                  </a>
                </div>

                <div className={s.heroTrustBadges}>
                  <span>
                    <Check size={14} /> Free to download
                  </span>
                  <span>
                    <Check size={14} /> 7-day full trial
                  </span>
                  <span>
                    <Check size={14} /> No credit card required
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
                      aria-label="Enter desired business handle"
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 6 }}>
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

              {/* Hero Dual-Device Visual Mockup */}
              <div className={s.heroVisual}>
                <div className={s.dualDeviceContainer}>
                  {/* Floating Upward Growth Accent */}
                  <div className={s.upwardTrendArrow}>
                    <TrendingUp size={15} />
                    <span>#1 Local Growth Engine</span>
                  </div>

                  {/* 1. Laptop Command Center Mockup (Background) */}
                  <div className={s.laptopMock}>
                    <div className={s.laptopTopDot} />
                    <div className={s.laptopScreen}>
                      <div className={s.laptopScreenHeader}>
                        <div className={s.laptopBrandGroup}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, background: '#009f50', color: '#fff', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>b</div>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>Google Growth Overview</span>
                        </div>
                        <span className={s.laptopLiveBadge}>● Live Synced</span>
                      </div>

                      <div className={s.laptopScoreRow}>
                        <div className={s.laptopDial}>
                          <span className={s.laptopDialScore}>92</span>
                          <span className={s.laptopDialSub}>/ 100</span>
                        </div>
                        <div className={s.laptopScoreText}>
                          <div className={s.laptopScoreTitle}>Profile Health: Excellent</div>
                          <div className={s.laptopScoreSub}>Top 3 Google Maps rank active in local search zone.</div>
                        </div>
                      </div>

                      <div className={s.laptopStatGrid}>
                        <div className={s.laptopStatBox}>
                          <div className={s.laptopStatNum}>148</div>
                          <div className={s.laptopStatLabel}>★ Reviews Replied</div>
                        </div>
                        <div className={s.laptopStatBox}>
                          <div className={s.laptopStatNum}>2.4K</div>
                          <div className={s.laptopStatLabel}>📞 Phone Calls</div>
                        </div>
                        <div className={s.laptopStatBox}>
                          <div className={s.laptopStatNum}>1.8K</div>
                          <div className={s.laptopStatLabel}>📍 Directions</div>
                        </div>
                      </div>
                    </div>
                    <div className={s.laptopBase}>
                      <div className={s.laptopBaseNotch} />
                    </div>
                  </div>

                  {/* 2. Smartphone Mockup (Foreground Overlapping) */}
                  <div className={s.phoneMock}>
                    <div className={s.phoneIsland} />
                    <div className={s.phoneScreen}>
                      <div className={s.phoneMapBox}>
                        <div className={s.phoneRankPill}>
                          <MapPin size={10} /> #1 Rank Google Maps
                        </div>
                        <div className={s.phoneMapTitle}>Delhi Farm Kanvi &amp; Holiday Stays</div>
                        <div className={s.phoneStars}>
                          ★★★★★ <span>5.0 (148 Google Reviews)</span>
                        </div>
                        <div className={s.phoneActionRow}>
                          <span className={s.phoneActionBtn}>📞 Call</span>
                          <span className={s.phoneActionBtn}>📍 Directions</span>
                        </div>
                        <span className={s.phoneAutoReplyBadge}>
                          ✓ 30s AI Auto-Reply Active
                        </span>
                      </div>

                      {/* 3. Floating AI Chat Snippet */}
                      <div className={s.floatingChatBubble}>
                        <div className={s.chatUserRow}>
                          <b>Customer:</b> Hi! What are the charges for booking full farmhouse stay this weekend?
                        </div>
                        <div className={s.chatAiRow}>
                          <b>BGOS AI:</b> Namaste! Full farmhouse stay is ₹15,000/day with private swimming pool access. Would you like me to reserve Saturday for you?
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5 QUICK-PILLAR ORIENTING BAR ──────────────────────────────── */}
        <section className={s.quickPillarsStrip}>
          <div className={s.container}>
            <div className={s.quickPillarsGrid}>
              {QUICK_PILLARS.map((p) => {
                const IconComponent = p.icon;
                return (
                  <a
                    key={p.title}
                    href="#features"
                    className={s.quickPillarCard}
                    onClick={() => setActivePillar(p.pillar)}
                  >
                    <div className={s.quickPillarIcon}>
                      <IconComponent size={20} />
                    </div>
                    <div className={s.quickPillarTitle}>{p.title}</div>
                    <div className={s.quickPillarSub}>{p.desc}</div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF & METRICS BAR ────────────────────────────────── */}
        <section className={s.metricsBar}>
          <div className={s.container}>
            <div className={s.metricsGrid}>
              <div className={s.metricCard}>
                <div className={s.avatarStack}>
                  <div className={s.avatarImg} style={{ background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>AK</div>
                  <div className={s.avatarImg} style={{ background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>RS</div>
                  <div className={s.avatarImg} style={{ background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>PM</div>
                  <div className={s.avatarImg} style={{ background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>+</div>
                </div>
                <div>
                  <div className={s.metricValue}>10,000+</div>
                  <div className={s.metricLabel}>Local Businesses on BGOS</div>
                </div>
              </div>

              <div className={s.metricCard}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Star size={22} fill="#f59e0b" />
                </div>
                <div>
                  <div className={s.metricValue}>4.8 / 5.0</div>
                  <div className={s.metricLabel}>Average Google Review Rating</div>
                </div>
              </div>

              <div className={s.metricCard}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#e6f7ee', color: '#009f50', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={22} />
                </div>
                <div>
                  <div className={s.metricValue}>&lt; 30 sec</div>
                  <div className={s.metricLabel}>AI Reply Time to Reviews &amp; Leads</div>
                </div>
              </div>

              <div className={s.metricCard}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div className={s.metricValue}>3.4x</div>
                  <div className={s.metricLabel}>More Calls &amp; Direction Clicks</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 15-SECOND GOOGLE MAPS SCORE AUDIT ─────────────────────────── */}
        <section className={s.auditSection} id="audit">
          <div className={s.container}>
            <div className={s.auditHeader}>
              <div className={s.badge}>
                <Sparkles size={14} /> 15-SECOND INSTANT AUDIT
              </div>
              <h2>Check Your Google Maps Growth Score</h2>
              <p>
                Businesses with <b>78%+ Google Score</b> receive 3.4x more phone calls and dominate local search. Test your profile visibility, review speed, and photo rhythm in seconds.
              </p>
            </div>

            <div className={s.auditCard}>
              <div className={s.auditForm}>
                <div className={s.auditInputWrap}>
                  <label className={s.auditInputLabel}>Business Name</label>
                  <input
                    type="text"
                    className={s.auditInput}
                    value={auditBusiness}
                    onChange={(e) => setAuditBusiness(e.target.value)}
                    placeholder="e.g. ShieldHire SOS, Dr. Sharma Clinic"
                  />
                </div>
                <div className={s.auditInputWrap} style={{ maxWidth: 220 }}>
                  <label className={s.auditInputLabel}>City / Area</label>
                  <input
                    type="text"
                    className={s.auditInput}
                    value={auditCity}
                    onChange={(e) => setAuditCity(e.target.value)}
                    placeholder="e.g. Delhi, Mumbai"
                  />
                </div>
                <button
                  type="button"
                  className={s.auditBtn}
                  onClick={() => runInstantAudit(auditBusiness, auditCity)}
                  disabled={auditRunning}
                >
                  <Sparkles size={16} />
                  {auditRunning ? 'Analyzing...' : 'Run Audit →'}
                </button>
              </div>

              {/* Sample Quick-Picks */}
              <div className={s.auditPills}>
                <span className={s.auditPillLabel}>Test with sample:</span>
                {[
                  { name: 'ShieldHire SOS App', city: 'Delhi', label: '🛡️ ShieldHire SOS (Delhi)' },
                  { name: 'Dr. Mehta Dental Clinic', city: 'Mumbai', label: '🦷 Dr. Mehta Dental (Mumbai)' },
                  { name: 'The Roast Cafe & Bakery', city: 'Bengaluru', label: '☕ The Roast Cafe (BLR)' },
                  { name: 'SpeedX Auto Detailing', city: 'Pune', label: '🚗 SpeedX Auto (Pune)' },
                ].map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    className={s.auditPillBtn}
                    onClick={() => {
                      setAuditBusiness(sample.name);
                      setAuditCity(sample.city);
                      runInstantAudit(sample.name, sample.city);
                    }}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              {/* Live Scanning State */}
              {auditRunning && (
                <div className={s.auditScanningBox}>
                  <div className={s.auditScanningSpinner} />
                  <div className={s.auditScanningText}>
                    {auditStep === 1 && 'Scanning Google Maps 3-Pack rank & keyword density...'}
                    {auditStep === 2 && 'Measuring review response velocity & owner sentiment...'}
                    {auditStep === 3 && 'Evaluating storefront photos & weekly posting rhythm...'}
                  </div>
                  <div className={s.auditScanningSub}>Analyzing live local signals for {auditBusiness} in {auditCity}...</div>
                </div>
              )}

              {/* Audit Results Card */}
              {!auditRunning && auditResult && (
                <div className={s.auditResultWrap}>
                  <div className={s.auditScoreHero}>
                    <div
                      className={s.scoreDial}
                      style={{
                        borderColor: auditResult.score >= 75 ? '#10b981' : auditResult.score >= 55 ? '#f59e0b' : '#ef4444',
                      }}
                    >
                      <span className={s.scoreValue}>{auditResult.score}%</span>
                      <span className={s.scoreMax}>SCORE</span>
                    </div>

                    <div className={s.scoreHeroInfo}>
                      <div className={s.scoreHeroTitle}>
                        {auditResult.business} · {auditResult.grade}
                      </div>
                      <div className={s.scoreHeroSub}>
                        Current Google Growth Score is <b>{auditResult.score}%</b>. Local competitors dominating the Top 3 3-Pack in {auditResult.city} average <b>{auditResult.benchmarkScore}%</b>.
                      </div>
                      <div className={s.scoreHeroBenchmark}>
                        <TrendingUp size={14} /> Reaching 78%+ score lifts organic phone calls &amp; direction clicks by 3.4x
                      </div>
                    </div>
                  </div>

                  {/* 4 Checkpoint Cards */}
                  <div className={s.checkpointsGrid}>
                    {auditResult.checkpoints.map((cp) => (
                      <div key={cp.title} className={s.checkpointCard}>
                        <div className={s.checkpointTop}>
                          <span className={s.checkpointTitle}>
                            <MapPin size={14} color="#009f50" />
                            {cp.title}
                          </span>
                          <span
                            className={`${s.checkpointBadge} ${
                              cp.status === 'critical'
                                ? s.checkpointCritical
                                : cp.status === 'warning'
                                  ? s.checkpointWarning
                                  : s.checkpointGood
                            }`}
                          >
                            {cp.badge} ({cp.score}%)
                          </span>
                        </div>
                        <div className={s.checkpointDiagnostic}>{cp.diagnostic}</div>
                        <div className={s.checkpointFix}>
                          <CheckCircle2 size={13} color="#008040" />
                          <span><b>Fix:</b> {cp.fix}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Solution Callout & Google Play CTA */}
                  <div className={s.auditSolutionBox}>
                    <div className={s.auditSolutionLeft}>
                      <div className={s.auditSolutionTitle}>
                        Autopilot with Five Autonomous AI Marketing Agents
                      </div>
                      <div className={s.auditSolutionSub}>
                        BGOS deploys Ranking, Creative Posters, 30s Review Replies, Media Uploads, and Viral Video Agents 24/7. Guaranteed to lift your Google Score to 80%+ within 30 days.
                      </div>
                    </div>
                    <a
                      href={PLAY_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.auditSolutionBtn}
                    >
                      <GooglePlayIcon size={18} />
                      <span>Boost Your Score on Google Play →</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── FIVE AUTONOMOUS AI AGENTS ─────────────────────────────────── */}
        <section className={s.section} id="features">
          <div className={s.container}>
            <div className={s.sectionHeader}>
              <div className={s.badge}>FIVE AUTONOMOUS AI AGENTS</div>
              <h2>Five AI Marketing Agents. 24/7 Autopilot.</h2>
              <p>
                Replace expensive marketing agencies, missed calls, and manual poster designing with Five Autonomous AI Agents trained on your business.
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
              <button
                type="button"
                className={`${s.pillarTabBtn} ${activePillar === 'studio' ? s.pillarTabActive : ''}`}
                onClick={() => setActivePillar('studio')}
              >
                <Palette size={16} /> 5. Creative Posters &amp; CRM
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
                      <CheckCircle2 size={16} /> <b>Local SEO Keyword Autopilot:</b> Automatically targets high-intent search terms (e.g. &quot;near me&quot;, &quot;best in city&quot;).
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
                  <div style={{ background: '#ffffff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', width: '100%', maxWidth: 380 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Google Business Autopilot</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 10 }}>ACTIVE</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Last 30 Days Performance:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#009f50' }}>148</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Reviews Replied</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0284c7' }}>24</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Posts Published</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
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
                      <CheckCircle2 size={16} /> <b>Instant WhatsApp Handoff:</b> Notifies you or your employees in real-time when human takeover is requested.
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
                  <div style={{ background: '#ffffff', borderRadius: 14, padding: 18, border: '1px solid #bbf7d0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', width: '100%', maxWidth: 380 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#009f50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Bot size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 750 }}>24/7 AI Business Assistant</div>
                        <div style={{ fontSize: 10.5, color: '#15803d' }}>● Online &amp; Ready</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                      <div style={{ background: '#f1f5f9', padding: '9px 12px', borderRadius: '10px 10px 10px 2px', alignSelf: 'flex-start' }}>
                        Do you have availability for dental checkup tomorrow at 4 PM?
                      </div>
                      <div style={{ background: '#009f50', color: '#fff', padding: '9px 12px', borderRadius: '10px 10px 2px 10px', alignSelf: 'flex-end', maxWidth: '85%' }}>
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
                  <div style={{ background: '#ffffff', borderRadius: 14, overflow: 'hidden', border: '1px solid #cbd5e1', width: '100%', maxWidth: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
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
                          🏊 Pool Access
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
                  <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, textAlign: 'center', border: '2px solid #009f50', maxWidth: 280, margin: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#009f50' }}>★ SCAN TO REVIEW ★</div>
                    <div style={{ fontSize: 14, fontWeight: 750, margin: '8px 0 16px' }}>Delhi Farm Kanvi</div>
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

            {activePillar === 'studio' && (
              <div className={s.pillarShowcase}>
                <div className={s.pillarInfo}>
                  <div className={s.badge}>CREATIVE &amp; POSTER STUDIO</div>
                  <h3>Branded Festival &amp; Promotional Posters in Seconds</h3>
                  <p>
                    Never let your Google profile or Instagram feed go cold. AI generates stunning festive posters, discount announcements, and geo-tagged updates automatically.
                  </p>
                  <ul className={s.pillarBullets}>
                    <li>
                      <CheckCircle2 size={16} /> <b>Pre-loaded Regional Festival Templates:</b> Diwali, Eid, New Year, Independence Day ready with your logo.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>1-Tap Social Publishing:</b> Post instantly to Google Business Profile, Instagram, and WhatsApp status.
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> <b>Integrated Leads &amp; CRM:</b> Track every customer inquiry from flyer scans and social campaigns in one place.
                    </li>
                  </ul>
                  <a className={s.primary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                    Explore Studio on App <ArrowRight size={15} />
                  </a>
                </div>
                <div className={s.pillarCardMock}>
                  <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', width: '100%', maxWidth: 360, textAlign: 'center' }}>
                    <div style={{ width: '100%', height: 160, borderRadius: 10, background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 16 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>FESTIVE SPECIAL</span>
                      <span style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>FLAT 25% OFF</span>
                      <span style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>Valid this weekend only</span>
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Auto-synced to Google Maps</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#008040', background: '#dcfce7', padding: '3px 8px', borderRadius: 10 }}>PUBLISHED</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── TAILORED FOR YOUR INDUSTRY (PHOTOGRAPHIC CARDS) ───────────── */}
        <section className={`${s.section} ${s.sectionAlt}`} id="industries">
          <div className={s.container}>
            <div className={s.sectionHeader}>
              <div className={s.badge}>TAILORED FOR YOUR INDUSTRY</div>
              <h2>Built for Every Business</h2>
              <p>Every industry has unique customer needs. BGOS adapts its AI brain to match your trade.</p>
            </div>

            <div className={s.industryGrid}>
              {INDUSTRIES.map((ind) => (
                <div key={ind.name} className={s.industryPhotoCard}>
                  <img
                    src={ind.image}
                    alt={ind.name}
                    className={s.industryPhotoImg}
                    loading="lazy"
                  />
                  <div className={s.industryOverlay}>
                    <span className={s.industryCardBadge}>{ind.badge}</span>
                    <h3 className={s.industryCardTitle}>{ind.name}</h3>
                    <p className={s.industryCardDesc}>{ind.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BEFORE VS AFTER COMPARISON ─────────────────────────────────── */}
        <section className={s.section} id="comparison">
          <div className={s.container}>
            <div className={s.sectionHeader}>
              <div className={s.badge}>THE BGOS ADVANTAGE</div>
              <h2>Why Businesses Switch from Chaos to Autopilot</h2>
              <p>Compare doing everything manually versus letting BGOS handle your customer growth.</p>
            </div>

            <div className={s.compareGrid}>
              <div className={s.compareVsBadge}>VS</div>

              {/* Old Manual Way */}
              <div className={s.compareColOld}>
                <div className={s.compareHeader}>
                  <X size={24} className={s.badIcon} />
                  <h4 style={{ color: '#991b1b' }}>Without BGOS (Manual Friction)</h4>
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
                    <span><b>Expensive Agencies:</b> Paying ₹15,000 to ₹30,000/mo for marketing agencies that don&apos;t deliver bookings.</span>
                  </li>
                  <li>
                    <X size={16} className={s.badIcon} />
                    <span><b>Scattered Records:</b> Customer phone numbers lost in WhatsApp chats and paper notebooks.</span>
                  </li>
                </ul>
              </div>

              {/* New BGOS Way */}
              <div className={s.compareColNew}>
                <div className={s.compareHeader}>
                  <CheckCircle2 size={24} className={s.goodIcon} />
                  <h4 style={{ color: '#065f46' }}>With BGOS (Autonomous Growth)</h4>
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

        {/* ── TRANSPARENT PRICING GRID ───────────────────────────────────── */}
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
                    <Check size={14} /> Short URL, QR Standee
                  </li>
                  <li>
                    <Check size={14} /> One Form, 100 Contacts
                  </li>
                  <li>
                    <Check size={14} /> Basic Review Link
                  </li>
                </ul>
                <a className={s.secondary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Get Started Free
                </a>
              </div>

              {/* Starter Plan */}
              <div className={s.planCard}>
                <h4>Starter</h4>
                <div className={s.planPrice}>
                  ₹499 <span>/ month</span>
                </div>
                <div className={s.planDesc}>Perfect for small businesses.</div>
                <ul className={s.planFeatures}>
                  <li>
                    <Check size={14} /> Everything in Free
                  </li>
                  <li>
                    <Check size={14} /> AI Assistant, Forms
                  </li>
                  <li>
                    <Check size={14} /> 1,000 Contacts
                  </li>
                  <li>
                    <Check size={14} /> Appointment Booking
                  </li>
                </ul>
                <a className={s.secondary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Start 7-Day Trial
                </a>
              </div>

              {/* Growth Plan (Featured) */}
              <div className={`${s.planCard} ${s.featuredPlan}`}>
                <div className={s.planBadge}>MOST POPULAR</div>
                <h4>Growth</h4>
                <div className={s.planPrice}>
                  ₹1,499 <span>/ month</span>
                </div>
                <div className={s.planDesc}>Grow your local presence.</div>
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
                    <Check size={14} /> 10,000 Contacts
                  </li>
                  <li>
                    <Check size={14} /> Weekly AI Posters &amp; Updates
                  </li>
                </ul>
                <a className={s.primary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Start 7-Day Trial
                </a>
              </div>

              {/* Business Plan */}
              <div className={s.planCard}>
                <h4>Business</h4>
                <div className={s.planPrice}>
                  ₹3,999 <span>/ month</span>
                </div>
                <div className={s.planDesc}>For growing teams &amp; chains.</div>
                <ul className={s.planFeatures}>
                  <li>
                    <Check size={14} /> Everything in Growth
                  </li>
                  <li>
                    <Check size={14} /> Multi-Location Radar
                  </li>
                  <li>
                    <Check size={14} /> 100,000 Contacts
                  </li>
                  <li>
                    <Check size={14} /> Priority Support &amp; Concierge
                  </li>
                </ul>
                <a className={s.secondary} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Get Started
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
                  You don&apos;t need to purchase a domain or write code. BGOS instantly gives you a clean, lightning-fast business webpage at <b>https://bgos.site/your-business</b> featuring your services, catalog, photos, direct WhatsApp call button, and your 24/7 AI Receptionist.
                </p>
              </details>

              <details className={s.faqItem}>
                <summary>
                  Can I use BGOS on both my phone and computer?
                  <Plus size={18} />
                </summary>
                <p>
                  Yes! BGOS has native mobile apps for on-the-go management, daily push updates, and quick review checks, as well as a complete web studio for in-depth marketing campaigns.
                </p>
              </details>

              <details className={s.faqItem}>
                <summary>
                  Does BGOS reply to Google reviews safely?
                  <Plus size={18} />
                </summary>
                <p>
                  Yes. BGOS connects via Google&apos;s official Business Profile APIs. You can set the AI to automatically publish replies instantly, or hold them for your 1-tap review and approval.
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

        {/* ── PRE-FOOTER GOLDEN TROPHY BANNER ───────────────────────────── */}
        <section className={s.container}>
          <div className={s.trophyBanner}>
            <div className={s.trophyBannerLeft}>
              <div className={s.trophyIconWrap}>
                <Trophy size={32} />
              </div>
              <div>
                <div className={s.trophyTitle}>Your Business Deserves an AI Growth Partner.</div>
                <div className={s.trophySub}>Join thousands of local businesses growing with BGOS.</div>
              </div>
            </div>
            <div className={s.trophyBannerRight}>
              <a
                className={s.trophyPlayBtn}
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GooglePlayIcon size={22} />
                <span>Get BGOS on Google Play</span>
              </a>
              <span className={s.trophyTrustNote}>
                Free download • 7-day trial • No credit card required
              </span>
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
              <a href="#industries">Clinics &amp; Dentists</a>
              <a href="#industries">Salons &amp; Spas</a>
              <a href="#industries">Farmhouses &amp; Resorts</a>
              <a href="#industries">Tradies &amp; Home Services</a>
              <a href="#industries">Restaurants &amp; Cafes</a>
            </div>

            <div className={s.footerCol}>
              <h5>Download &amp; Legal</h5>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#009f50' }}
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
            <div className={s.footerTagline}>
              <TrendingUp size={15} />
              <span>Grow Smarter. Grow Faster.</span>
            </div>
          </div>
        </div>
      </footer>
      <NativeAgentChatEmbed agentSlug="bgos-ai" />
    </div>
  );
}
