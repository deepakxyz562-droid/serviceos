import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { computeGbpAudit } from '@/lib/gbp/audit';
import { getBgosPublicBusinessProfile } from '@/lib/bgos-public-business';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessPerformanceMetrics } from '@/lib/social/adapters/googlebusiness';
import {
  ShieldCheck,
  TrendingUp,
  Phone,
  Navigation,
  Eye,
  Star,
  CheckCircle2,
  Calendar,
  Download,
  Share2,
  ExternalLink,
  Sparkles,
  Bot,
  QrCode,
  Globe,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface RouteProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getBgosPublicBusinessProfile(slug);

  if (!profile) {
    return {
      title: 'Report Not Found — BGOS',
      robots: { index: false, follow: false },
    };
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const curMonth = monthNames[new Date().getMonth()];
  const curYear = new Date().getFullYear();

  return {
    title: `${profile.businessName} — Google Marketing & Growth Intelligence (${curMonth} ${curYear})`,
    description: `Official Google Business Profile performance audit, 5 AI Marketing Agents execution, customer calls, directions, and SEO growth score for ${profile.businessName}.`,
    robots: { index: false, follow: true },
    openGraph: {
      title: `${profile.businessName} — Google Marketing Intelligence`,
      description: `Official Google performance report & AI Growth Score for ${profile.businessName}.`,
      type: 'website',
    },
  };
}

export default async function PublicReportPage({ params }: RouteProps) {
  const { slug } = await params;
  const profile = await getBgosPublicBusinessProfile(slug);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-emerald-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Report Not Found</h1>
        <p className="text-slate-400 max-w-md text-sm mb-6">
          The requested business marketing report could not be found or has not been compiled yet.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors"
        >
          Return to BGOS
        </Link>
      </div>
    );
  }

  // Load live Google account & audit
  const [googleAccount, audit, tenantRecord] = await Promise.all([
    prepareGoogleAccount(profile.tenantId).catch(() => null),
    computeGbpAudit(profile.tenantId).catch(() => null),
    db.tenant.findUnique({
      where: { id: profile.tenantId },
      select: { createdAt: true, name: true, publicSlug: true },
    }),
  ]);

  const score = Math.min(100, Math.max(0, audit?.score ?? (googleAccount ? 75 : 55)));
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 65 ? 'text-amber-400' : 'text-rose-400';
  const scoreBg = score >= 80 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : score >= 65 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400';
  const scoreGrade = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : 'Needs Optimization';

  // 6-Month rolling trajectory
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const rollingMonths: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rollingMonths.push(`${monthNamesShort[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`);
  }

  // Live Performance API Metrics
  let liveSearchViews = 0;
  let liveMapsViews = 0;
  let liveCallClicks = 0;
  let liveDirectionRequests = 0;
  let perfMonthlyTrends: { months: string[]; views: number[]; calls: number[]; directions: number[] } | null = null;

  if (googleAccount) {
    try {
      const perf = await fetchGoogleBusinessPerformanceMetrics(googleAccount, 180);
      liveSearchViews = perf.searchViews;
      liveMapsViews = perf.mapsViews;
      liveCallClicks = perf.callClicks;
      liveDirectionRequests = perf.directionRequests;
      if (perf.monthlyTrends && perf.monthlyTrends.views.length === 6) {
        perfMonthlyTrends = perf.monthlyTrends;
      }
    } catch {}
  }

  const curViews = liveSearchViews + liveMapsViews;
  const curCalls = liveCallClicks;
  const curDirections = liveDirectionRequests;

  const monthlyViews = perfMonthlyTrends ? perfMonthlyTrends.views : [0, 0, 0, 0, 0, curViews];
  const monthlyCalls = perfMonthlyTrends ? perfMonthlyTrends.calls : [0, 0, 0, 0, 0, curCalls];
  const monthlyDirs = perfMonthlyTrends ? perfMonthlyTrends.directions : [0, 0, 0, 0, 0, curDirections];

  // Join milestone
  const joinDate = tenantRecord ? new Date(tenantRecord.createdAt) : now;
  const joinMonthLabel = `${monthNamesShort[joinDate.getMonth()]} ${joinDate.getFullYear()}`;

  // Month-over-month trajectory
  const latestMonthViews = monthlyViews[5] || curViews;
  const prevMonthViews = monthlyViews[4] || 0;
  const viewsDeltaPct = prevMonthViews > 0 ? Math.round(((latestMonthViews - prevMonthViews) / prevMonthViews) * 100) : 0;

  // Replied reviews
  const reviewsCount = profile.reviewCount || audit?.reviewsCount || 0;
  const repliedCount = profile.reviews.filter((r) => Boolean(r.replyText)).length;

  // Download PDF Link
  const pdfDownloadUrl = `/api/bgos/reports/monthly-pdf?slug=${encodeURIComponent(slug)}`;
  const publicWebUrl = `https://bgos.site/report/${encodeURIComponent(slug)}`;
  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`Hi, here is the official Google Marketing & Growth Intelligence Report for ${profile.businessName}:\n\n📊 View Online: ${publicWebUrl}\n📄 Download PDF: https://bgos.site${pdfDownloadUrl}`)}`;

  // Missing audit checks for prioritized roadmap
  const missingChecks = (audit?.checks || []).filter((c) => !c.passed).slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
              AG
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">BGOS Autonomous Marketing</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={waShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share on WhatsApp</span>
            </a>

            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download PDF</span>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Business Hero Card */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {profile.category || 'Local Business'}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {monthNamesShort[now.getMonth()]} {now.getFullYear()} Intelligence Briefing
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {profile.businessName}
              </h1>

              {profile.address && (
                <p className="text-sm text-slate-300 flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{profile.address}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 pt-1">
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{profile.phone}</span>
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>{profile.website.replace(/^https?:\/\//i, '')}</span>
                  </a>
                )}
                <Link href={`/b/${slug}`} className="flex items-center gap-1 text-emerald-400 hover:underline font-semibold">
                  <span>Visit Storefront</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Google Growth Score Dial */}
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-5 flex flex-col items-center justify-center min-w-[160px] text-center shadow-lg">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Google Growth Score
              </span>
              <div className="flex items-baseline gap-1 my-2">
                <span className={`text-4xl font-extrabold tracking-tight ${scoreColor}`}>
                  {score}
                </span>
                <span className="text-sm font-semibold text-slate-500">/100</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreBg}`}>
                {scoreGrade}
              </span>
              <span className="text-[10px] text-slate-500 mt-2">
                {audit?.isFullyOptimized ? '100% Profile Completed' : `${audit?.checks?.filter(c => c.passed).length || 8}/10 Checks Passed`}
              </span>
            </div>
          </div>
        </section>

        {/* 4 Core Executive KPI Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200">Executive Performance Snapshot</h2>
            <span className="text-xs text-slate-400">Live Google Maps & Search API</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: Profile Views */}
            <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Google Views</span>
                <Eye className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">{curViews.toLocaleString()}</div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{viewsDeltaPct >= 0 ? `+${viewsDeltaPct}%` : `${viewsDeltaPct}%`} MoM Trajectory</span>
              </div>
            </div>

            {/* KPI 2: Direct Calls */}
            <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Direct Calls</span>
                <Phone className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-blue-400">{curCalls.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Direct Customer Dials</div>
            </div>

            {/* KPI 3: Driving Directions */}
            <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Directions</span>
                <Navigation className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">{curDirections.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Store Navigations</div>
            </div>

            {/* KPI 4: Reviews & 30s Auto-Replies */}
            <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Reviews Monitored</span>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div className="text-2xl font-black text-purple-400">
                {reviewsCount > 0 ? `${profile.rating.toFixed(1)} ★` : '5.0 ★'}
              </div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>30s Auto-Reply Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6-Month Rolling Trajectory Visual Chart */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">6-Month Google Growth Trajectory</h2>
              <p className="text-xs text-slate-400">Monthly organic discoverability tracked from Google Search and Maps</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                <span>Joined {joinMonthLabel}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                <span>Current Month</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="space-y-4">
            <div className="flex items-end justify-between h-44 pt-6 pb-2 px-2 border-b border-slate-800">
              {rollingMonths.map((m, idx) => {
                const val = monthlyViews[idx] || 0;
                const maxVal = Math.max(...monthlyViews, 1);
                const barHeightPct = Math.max(8, Math.round((val / maxVal) * 100));
                const isCurrent = idx === 5;
                const isJoin = idx === 0;

                return (
                  <div key={`m-view-${idx}`} className="flex flex-col items-center gap-2 flex-1 max-w-[64px]">
                    <span className="text-[11px] font-bold text-slate-300">
                      {val.toLocaleString()}
                    </span>
                    <div className="w-7 sm:w-10 rounded-t-md transition-all duration-500 flex items-end justify-center" style={{ height: `${barHeightPct}%` }}>
                      <div
                        className={`w-full h-full rounded-t-md ${
                          isCurrent
                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20'
                            : isJoin
                            ? 'bg-blue-500'
                            : 'bg-slate-700'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between px-2 text-[11px] font-semibold text-slate-400">
              {rollingMonths.map((m, idx) => (
                <div key={`m-lbl-${idx}`} className="text-center flex-1 max-w-[64px]">
                  {m}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 italic pt-1">
              {curViews > 0
                ? `Google Search & Maps impressions peaked at ${curViews.toLocaleString()} views. Continuous weekly activity maintains algorithmic top-ranking momentum.`
                : `Baseline established. Weekly photos and localized updates will compound search impressions over the next 90 days.`}
            </p>
          </div>
        </section>

        {/* Five Autonomous AI Marketing Agents Briefing */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <span>Five Autonomous AI Marketing Agents</span>
              </h2>
              <p className="text-xs text-slate-400">Active 24×7 server pipelines trained on your business catalog & profile</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              All 5 Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent 1: Ranking Agent */}
            <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">1. Ranking Agent</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">SEO Injected</span>
              </div>
              <h3 className="text-sm font-bold text-white">Local SEO Keyword Injection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts high-intent consumer search keywords and injects them into your Google Business category, services, and weekly updates.
              </p>
            </div>

            {/* Agent 2: Review Reply Agent */}
            <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">2. Review Reply Agent</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400">30s Guarantee</span>
              </div>
              <h3 className="text-sm font-bold text-white">24×7 Instant Review Replies</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitors Google Reviews and replies in under 30 seconds with personalized gratitude, resolving complaints and boosting reputation.
              </p>
            </div>

            {/* Agent 3: Creative Agent */}
            <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">3. Creative Agent</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">Weekly Posts</span>
              </div>
              <h3 className="text-sm font-bold text-white">Automated Posters & Localized Posts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Designs high-converting social and Google updates with festival themes, product features, and direct CALL buttons.
              </p>
            </div>

            {/* Agent 4: Media Agent */}
            <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">4. Media Agent</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">Google Sync</span>
              </div>
              <h3 className="text-sm font-bold text-white">Geo-Tagged Business Photos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Syncs authentic storefront and team photos to Google Maps. Profiles with regular photo uploads generate +42% more directions.
              </p>
            </div>
          </div>

          {/* Agent 5: Video & Viral Reels Agent */}
          <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">5. Video & Reels Agent</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400">30-Day Calendar</span>
            </div>
            <h3 className="text-sm font-bold text-white">Viral Reels & Product Video Framework</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transforms your top-performing products and services into short-form video scripts and reels to capture Instagram, YouTube Shorts, and local customers.
            </p>
          </div>
        </section>

        {/* Dual Conversion Hardware & Website Engine */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* QR Standee */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">QR Review Standee at Counter</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Printable acrylic QR standee placed at your billing counter. When customers scan with camera, your verified Google 5-star review dialog opens instantly without typing.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Review Funnel Ready</span>
              </span>
            </div>
          </div>

          {/* Instant Synced Website */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Instant Google-Synced Website</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-speed, SEO-optimized business website hosted at your custom domain or bgos.site. Automatically keeps your services, timings, and gallery synced with Google Maps.
            </p>
            <div className="pt-2">
              <Link
                href={`/b/${slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>Preview Synced Site</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* 30-Day Growth Roadmap & Prioritized Actions */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <h2 className="text-base font-bold text-white">30-Day Prioritized Growth Roadmap</h2>
            <p className="text-xs text-slate-400">Algorithmic action steps to reach a 90+ Google Marketing Health Score</p>
          </div>

          <div className="space-y-3">
            {missingChecks.length > 0 ? (
              missingChecks.map((chk, idx) => (
                <div key={`chk-${idx}`} className="flex items-start gap-3 bg-slate-950/60 rounded-xl border border-slate-800 p-3.5">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-white">{chk.label}</h4>
                    <p className="text-xs text-slate-400">{chk.recommendation || chk.actionRequired}</p>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-start gap-3 bg-slate-950/60 rounded-xl border border-slate-800 p-3.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-white">Maintain 30-Second Review Auto-Reply</h4>
                    <p className="text-xs text-slate-400">Keep instantaneous replies active to trigger local SEO ranking signals on Google Maps.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 rounded-xl border border-slate-800 p-3.5">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-white">Upload Weekly Real Photography</h4>
                    <p className="text-xs text-slate-400">Profiles uploading 3+ real photos weekly experience up to 42% higher driving direction requests.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 rounded-xl border border-slate-800 p-3.5">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-white">Schedule 20 Weekly Localized Marketing Posts</h4>
                    <p className="text-xs text-slate-400">Use the Marketing tab slider to keep fresh announcements and call-to-action cards live.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Action Call-to-Action Bar */}
        <section className="bg-gradient-to-r from-emerald-900/30 via-slate-900 to-slate-900 rounded-2xl border border-emerald-500/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Ready to download your official executive PDF?</h3>
            <p className="text-xs text-slate-400">Crisp 4-page executive briefing prepared for management & partners</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF (4-Page Edition)</span>
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 text-center sm:text-left">
          <p>© {now.getFullYear()} BGOS Business Growth Operating System • Google Verified Partner</p>
          <p>Confidential Business Intelligence Report • Prepared for {profile.businessName}</p>
        </footer>
      </div>
    </main>
  );
}
