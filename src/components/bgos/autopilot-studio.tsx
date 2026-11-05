'use client';

import React, { useEffect, useState } from 'react';
import {
  Zap,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Flame,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Globe,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

interface AutopilotConfig {
  enabled: boolean;
  duration: '30_days' | '1_year';
  platforms: Array<'googlebusiness' | 'instagram' | 'facebook'>;
  postingTime: string;
  timeZone?: string;
  startDate: string;
  endDate: string;
  lastRunAt?: string | null;
  totalPostsCreated: number;
  status: 'active' | 'paused' | 'completed';
}

interface AutopilotData {
  config: AutopilotConfig;
  daysRemaining: number;
  connectedPlatforms: string[];
  accounts: Array<{ id: string; platform: string; accountName: string }>;
  recentPosts: Array<{
    id: string;
    content: string;
    mediaUrls: string;
    publishTargets: string;
    status: string;
    scheduledAt?: string;
    createdAt: string;
  }>;
}

export function AutopilotStudio({ onConnectAccount }: { onConnectAccount?: () => void }) {
  const [data, setData] = useState<AutopilotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Form local state
  const [enabled, setEnabled] = useState(false);
  const [duration, setDuration] = useState<'30_days' | '1_year'>('30_days');
  const [platforms, setPlatforms] = useState<Array<'googlebusiness' | 'instagram' | 'facebook'>>([
    'googlebusiness',
    'instagram',
    'facebook',
  ]);
  const [timeZone,setTimeZone]=useState(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');
  const [postingTime, setPostingTime] = useState('09:00');

  const fetchAutopilotData = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/social/autopilot');
      if (res.ok) {
        const json: AutopilotData = await res.json();
        setData(json);
        setEnabled(json.config.enabled);
        setDuration(json.config.duration);
        setPlatforms(json.config.platforms || ['googlebusiness', 'instagram', 'facebook']);
        setPostingTime(json.config.postingTime || '09:00');
        setTimeZone(json.config.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');
      }
    } catch (err: any) {
      toast.error('Failed to load autopilot configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutopilotData();
  }, []);

  const handleSave = async (overrides?: Partial<AutopilotConfig & { triggerPostNow?: boolean }>) => {
    try {
      setSaving(true);
      const payload = {
        enabled: overrides?.enabled !== undefined ? overrides.enabled : enabled,
        duration: overrides?.duration || duration,
        platforms: overrides?.platforms || platforms,
        postingTime: overrides?.postingTime || postingTime,
        timeZone,
        triggerPostNow: overrides?.triggerPostNow || false,
      };

      const res = await authFetch('/api/social/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok || resJson.triggerResult?.success === false) {
        throw new Error(resJson.triggerResult?.error || resJson.error || 'Failed to update autopilot');
      }

      toast.success(resJson.message || 'Autopilot updated successfully!');
      fetchAutopilotData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update autopilot settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerToday = async () => {
    try {
      setTriggering(true);
      toast.info("Generating today's post with your configured provider...");
      const res = await authFetch('/api/social/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerPostNow: true }),
      });
      const resJson = await res.json();
      if (!res.ok || resJson.triggerResult?.success === false) {
        throw new Error(resJson.triggerResult?.error || resJson.error || "Failed to dispatch today's post");
      }
      toast.success("Today's autopilot post successfully created & dispatched!");
      fetchAutopilotData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate post');
    } finally {
      setTriggering(false);
    }
  };

  const togglePlatform = (p: 'googlebusiness' | 'instagram' | 'facebook') => {
    setPlatforms((prev) => {
      const next = prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p];
      if (next.length === 0) {
        toast.warning('Select at least one publishing channel');
        return prev;
      }
      return next;
    });
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center space-y-3">
        <RefreshCw className="size-6 animate-spin text-[#009F50] mx-auto" />
        <p className="text-xs text-muted-foreground">Loading Autopilot engine...</p>
      </div>
    );
  }

  const isConnected = (p: string) => data?.connectedPlatforms?.includes(p);
  const totalDays = duration === '1_year' ? 365 : 30;
  const daysDone = Math.min(totalDays, (data?.config?.totalPostsCreated || 0));
  const progressPercent = Math.min(100, Math.round((daysDone / totalDays) * 100));

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* ─── Header Hero Card ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-lg border border-emerald-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Zap className="size-3.5 fill-emerald-400 text-emerald-400" />
              <span>Multi-Platform Autopilot Engine</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Daily Automatic Posting for Instagram, Facebook & Google
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Enable full autonomous marketing for <strong>30 days</strong> or <strong>1 year</strong>. Our AI copywriter and Cloudflare Flux-1 Schnell engine craft and publish fresh, high-converting daily posts across your connected accounts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Button
              onClick={() => {
                const nextEnabled = !enabled;
                setEnabled(nextEnabled);
                handleSave({ enabled: nextEnabled });
              }}
              disabled={saving}
              className={`h-11 px-6 rounded-xl font-bold text-xs shadow-md transition-all ${
                enabled
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-[#009F50] hover:bg-[#008A45] text-white'
              }`}
            >
              {enabled ? (
                <>
                  <Clock className="size-4 mr-2" /> Pause Autopilot
                </>
              ) : (
                <>
                  <Zap className="size-4 mr-2 fill-white" /> Activate Autopilot
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleTriggerToday}
              disabled={triggering}
              className="h-11 px-5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            >
              {triggering ? (
                <RefreshCw className="size-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="size-4 mr-2 text-emerald-400" />
              )}
              Post Today Now
            </Button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ─── Configuration & Live Telemetry Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Settings Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Duration & Schedule */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[#009F50]" />
                <h3 className="text-sm font-bold text-foreground">Campaign Duration & Cadence</h3>
              </div>
              <Badge
                variant="secondary"
                className={`text-[11px] font-semibold ${
                  enabled
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                }`}
              >
                {enabled ? '● Active Daily' : '○ Paused'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: 30 Days */}
              <div
                onClick={() => setDuration('30_days')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 ${
                  duration === '30_days'
                    ? 'border-[#009F50] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-border hover:border-slate-300 dark:hover:border-slate-700 bg-background'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">30-Day Autopilot</span>
                  {duration === '30_days' && (
                    <CheckCircle2 className="size-4 text-[#009F50]" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  1 post every single day for 1 month (30 posts total). Perfect for seasonal boosts and high-growth sprints.
                </p>
                <div className="pt-2 text-[11px] font-semibold text-[#009F50]">
                  30 Daily Dispatches
                </div>
              </div>

              {/* Option 2: 1 Year (365 Days) */}
              <div
                onClick={() => setDuration('1_year')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 relative overflow-hidden ${
                  duration === '1_year'
                    ? 'border-[#009F50] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-border hover:border-slate-300 dark:hover:border-slate-700 bg-background'
                }`}
              >
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                  RECOMMENDED
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">1-Year Autopilot</span>
                  {duration === '1_year' && (
                    <CheckCircle2 className="size-4 text-[#009F50]" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  365 continuous daily posts with thematic rotation (tips, offers, reviews, case studies). Completely hands-free.
                </p>
                <div className="pt-2 text-[11px] font-semibold text-[#009F50]">
                  365 Daily Dispatches · 1 Full Year
                </div>
              </div>
            </div>

            {/* Daily Posting Time Selector */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-foreground">Preferred Daily Posting Time</span>
                <p className="text-muted-foreground text-[11px]">
                  Posts generate and publish daily at your target local time.
                </p>
              </div>
              <select
                aria-label={`Posting time in ${timeZone}`}
                value={postingTime}
                onChange={(e) => setPostingTime(e.target.value)}
                className="h-8 px-3 rounded-lg border border-border bg-background text-xs font-semibold"
              >
                <option value="08:00">08:00 AM (Early morning reach)</option>
                <option value="09:00">09:00 AM (Recommended)</option>
                <option value="12:00">12:00 PM (Lunch break peak)</option>
                <option value="17:00">05:00 PM (Evening leisure)</option>
                <option value="19:00">07:00 PM (Prime evening)</option>
              </select>
              <span className="text-xs text-muted-foreground">Timezone: {timeZone}</span>
            </div>
          </div>

          {/* Card: Multi-Platform Publishing Targets */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-[#009F50]" />
                <h3 className="text-sm font-bold text-foreground">Publishing Channels</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Simultaneous multi-network dispatch
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Google Business */}
              <div
                onClick={() => togglePlatform('googlebusiness')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  platforms.includes('googlebusiness')
                    ? 'border-[#009F50] bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-border opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      G
                    </div>
                    <span className="font-bold text-xs text-foreground">Google Maps</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={platforms.includes('googlebusiness')}
                    onChange={() => {}}
                    className="accent-[#009F50]"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`size-2 rounded-full ${
                      isConnected('googlebusiness') ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {isConnected('googlebusiness') ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>

              {/* Instagram */}
              <div
                onClick={() => togglePlatform('instagram')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  platforms.includes('instagram')
                    ? 'border-[#009F50] bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-border opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      IG
                    </div>
                    <span className="font-bold text-xs text-foreground">Instagram</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={platforms.includes('instagram')}
                    onChange={() => {}}
                    className="accent-[#009F50]"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`size-2 rounded-full ${
                      isConnected('instagram') ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {isConnected('instagram') ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>

              {/* Facebook */}
              <div
                onClick={() => togglePlatform('facebook')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  platforms.includes('facebook')
                    ? 'border-[#009F50] bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-border opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                      f
                    </div>
                    <span className="font-bold text-xs text-foreground">Facebook</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={platforms.includes('facebook')}
                    onChange={() => {}}
                    className="accent-[#009F50]"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`size-2 rounded-full ${
                      isConnected('facebook') ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {isConnected('facebook') ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
            </div>

            {(!isConnected('googlebusiness') || !isConnected('instagram') || !isConnected('facebook')) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Some selected channels are not connected yet.</span>
                </div>
                {onConnectAccount && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onConnectAccount}
                    className="h-7 text-xs border-amber-400 text-amber-800 dark:text-amber-200 font-bold"
                  >
                    Connect Accounts
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleSave()}
                disabled={saving}
                className="h-9 px-5 bg-[#009F50] hover:bg-[#008A45] text-white font-bold text-xs rounded-xl"
              >
                {saving ? <RefreshCw className="size-3.5 animate-spin mr-1.5" /> : null}
                Save Autopilot Configuration
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Autopilot Telemetry & Progress */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Autopilot Progress
              </span>
              <Badge
                variant="secondary"
                className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 font-bold"
              >
                {data?.daysRemaining || 0} Days Left
              </Badge>
            </div>

            {/* Circular Progress & Stat Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-3 text-center">
              <div className="flex justify-center">
                <div className="size-20 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-[#009F50] flex flex-col items-center justify-center font-bold">
                  <span className="text-lg text-foreground">{progressPercent}%</span>
                  <span className="text-[9px] text-muted-foreground uppercase">Done</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-foreground">
                  Day {daysDone} of {totalDays}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {data?.config?.totalPostsCreated || 0} automatic posts published so far
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-semibold text-foreground">
                  {data?.config?.startDate ? new Date(data.config.startDate).toLocaleDateString() : 'Today'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">End Date</span>
                <span className="font-semibold text-foreground">
                  {data?.config?.endDate ? new Date(data.config.endDate).toLocaleDateString() : 'In 30 days'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Image Engine</span>
                <span className="font-semibold text-[#009F50] flex items-center gap-1">
                  <ShieldCheck className="size-3" /> Cloudflare Flux-1
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Last Run</span>
                <span className="font-semibold text-foreground">
                  {data?.config?.lastRunAt ? new Date(data.config.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending today'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[#009F50]">
              <Flame className="size-4" />
              <span>7-Day Thematic Rotation</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              Every day features a different angle: Monday Spotlights, Tuesday Pro Tips, Wednesday Discounts, Thursday 5-Star Reviews, Friday Emergency Slots, Saturday Craftsmanship, and Sunday Community.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Recent Autopilot Posts Feed ─── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#009F50]" />
            <h3 className="text-sm font-bold text-foreground">Recent Autopilot Post Dispatches</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {data?.recentPosts?.length || 0} recent posts
          </span>
        </div>

        {(!data?.recentPosts || data.recentPosts.length === 0) ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-border space-y-2">
            <Zap className="size-6 text-muted-foreground/60 mx-auto" />
            <p className="text-xs font-semibold text-foreground">No autopilot posts yet</p>
            <p className="text-[11px] text-muted-foreground">
              Click &quot;Post Today Now&quot; or activate Autopilot to dispatch your first automated post.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recentPosts.map((post) => {
              let mediaList: string[] = [];
              try {
                mediaList = JSON.parse(post.mediaUrls || '[]');
              } catch {}
              const thumb = mediaList[0];

              return (
                <div
                  key={post.id}
                  className="rounded-xl border border-border bg-background p-3.5 space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  {thumb && (
                    <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt="Autopilot graphic"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold ${
                        post.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950'
                          : post.status === 'publishing'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {post.status.toUpperCase()}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
