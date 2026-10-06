'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCircle,
  Save,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Bot,
  Globe,
  MapPin,
  Star,
  CheckCircle2,
  Share2,
  RefreshCw,
  Eye,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { CreatorProfileData, buildDefaultCreatorProfile } from '@/lib/creator-profile';
import { cn } from '@/lib/utils';

export function CreatorProfileView() {
  const [profile, setProfile] = useState<CreatorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load Profile
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/creator/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      } else {
        toast.error('Failed to load creator profile');
      }
    } catch {
      toast.error('Network error loading profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Save Profile
  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/creator/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        toast.success('Public creator profile saved successfully!');
      } else {
        toast.error('Failed to save profile');
      }
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/p/${profile?.handle || 'creator'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Public page link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !profile) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="size-6 animate-spin text-blue-600" />
          <p className="text-xs text-muted-foreground">Loading creator profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground">My Public Profile (@page)</h1>
            <Badge variant="secondary" className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Topmate-Style Mini Website
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your all-in-one link for your bio, 1:1 call bookings, digital products, and AI agent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={!profile?.isEnabled}
            className="text-xs font-bold gap-1.5 rounded-xl h-9 shadow-2xs"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
          </Button>

          <a
            href={`/p/${profile?.handle || 'creator'}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-900 text-foreground font-bold text-xs hover:bg-slate-50 transition-colors shadow-2xs h-9",
              !profile?.isEnabled && "opacity-60 pointer-events-none"
            )}
          >
            <span>{profile?.isEnabled ? 'View Live Page' : 'Draft (Unpublished)'}</span>
            <ExternalLink className="size-3.5" />
          </a>

          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-1.5 shadow-xs"
          >
            <Save className="size-3.5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* ── Status & Opt-in Banner ── */}
      <div className={cn(
        'p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
        profile?.isEnabled
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'size-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold',
            profile?.isEnabled ? 'bg-emerald-600' : 'bg-amber-600'
          )}>
            <Globe className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Public Profile Status: {profile?.isEnabled ? 'Published & Active' : 'Private / Unpublished (Draft)'}
              </h3>
              <Badge className={profile?.isEnabled ? 'bg-emerald-600 text-white text-[10px]' : 'bg-amber-600 text-white text-[10px]'}>
                {profile?.isEnabled ? 'LIVE' : 'DRAFT'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {profile?.isEnabled
                ? `Your page is live for clients and visitors at /p/${profile?.handle || 'creator'}.`
                : 'Turn this on only when you want to publish your Topmate-style creator storefront. Your CRM marketplace page remains separate.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Label htmlFor="publish-toggle" className="text-xs font-bold text-foreground cursor-pointer">
            {profile?.isEnabled ? 'Published' : 'Publish Page'}
          </Label>
          <Switch
            id="publish-toggle"
            checked={!!profile?.isEnabled}
            onCheckedChange={(checked) =>
              setProfile((prev) => (prev ? { ...prev, isEnabled: checked } : null))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── LEFT: Profile Editor Form ── */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold">Profile Identity &amp; Bio</CardTitle>
              <CardDescription className="text-xs">
                Visible to all visitors on your public page.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Handle / Custom URL */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">Your Unique Handle / URL</Label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-mono text-xs">/p/</span>
                  <Input
                    value={profile?.handle || ''}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, '') } : null
                      )
                    }
                    placeholder="deepak"
                    className="h-9 text-xs font-mono rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Your public link will be: <strong>{publicUrl}</strong>
                </p>
              </div>

              {/* Display Name & Headline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Display Name</Label>
                  <Input
                    value={profile?.displayName || ''}
                    onChange={(e) =>
                      setProfile((prev) => (prev ? { ...prev, displayName: e.target.value } : null))
                    }
                    placeholder="e.g. Deepak Chandra"
                    className="h-9 text-xs rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Professional Title / Headline</Label>
                  <Input
                    value={profile?.headline || ''}
                    onChange={(e) =>
                      setProfile((prev) => (prev ? { ...prev, headline: e.target.value } : null))
                    }
                    placeholder="e.g. Senior SaaS Architect & Coach"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Location & Verification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Location</Label>
                  <Input
                    value={profile?.location || ''}
                    onChange={(e) =>
                      setProfile((prev) => (prev ? { ...prev, location: e.target.value } : null))
                    }
                    placeholder="e.g. Bangalore, India"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Verified Badge</Label>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={profile?.verified ?? true}
                      onCheckedChange={(checked) =>
                        setProfile((prev) => (prev ? { ...prev, verified: checked } : null))
                      }
                    />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Show &ldquo;✓ Verified Creator&rdquo; badge
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">Bio / About You</Label>
                <textarea
                  value={profile?.bio || ''}
                  onChange={(e) => setProfile((prev) => (prev ? { ...prev, bio: e.target.value } : null))}
                  placeholder="Share a compelling overview of your expertise, who you help, and what clients can expect..."
                  rows={4}
                  className="w-full rounded-2xl border bg-background p-3 text-xs resize-none leading-relaxed"
                />
              </div>

              {/* Social Links */}
              <div className="pt-2 border-t space-y-3">
                <Label className="text-xs font-bold text-foreground">Social Links</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Twitter / X</span>
                    <Input
                      value={profile?.socialLinks?.twitter || ''}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev
                            ? { ...prev, socialLinks: { ...prev.socialLinks, twitter: e.target.value } }
                            : null
                        )
                      }
                      placeholder="https://x.com/username"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">LinkedIn</span>
                    <Input
                      value={profile?.socialLinks?.linkedin || ''}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev
                            ? { ...prev, socialLinks: { ...prev.socialLinks, linkedin: e.target.value } }
                            : null
                        )
                      }
                      placeholder="https://linkedin.com/in/username"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">GitHub</span>
                    <Input
                      value={profile?.socialLinks?.github || ''}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev
                            ? { ...prev, socialLinks: { ...prev.socialLinks, github: e.target.value } }
                            : null
                        )
                      }
                      placeholder="https://github.com/username"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Personal Website</span>
                    <Input
                      value={profile?.socialLinks?.website || ''}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev
                            ? { ...prev, socialLinks: { ...prev.socialLinks, website: e.target.value } }
                            : null
                        )
                      }
                      placeholder="https://yourwebsite.com"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── AI Assistant Settings ── */}
          <Card className="rounded-3xl border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bot className="size-4 text-blue-600" />
                    <span>Public AI Sales Agent</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Allow visitors to chat with your AI assistant on your public page.
                  </CardDescription>
                </div>
                <Switch
                  checked={profile?.aiAgentEnabled ?? true}
                  onCheckedChange={(checked) =>
                    setProfile((prev) => (prev ? { ...prev, aiAgentEnabled: checked } : null))
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold">AI Assistant Greeting Message</Label>
                <textarea
                  value={profile?.aiWelcomeMessage || ''}
                  onChange={(e) =>
                    setProfile((prev) => (prev ? { ...prev, aiWelcomeMessage: e.target.value } : null))
                  }
                  placeholder="Hello! Ask me anything about Deepak’s background, pricing or availability..."
                  rows={2}
                  className="w-full rounded-xl border bg-background p-2.5 text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Live Mobile/Desktop Preview Card ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Eye className="size-3.5" />
              <span>Live Page Preview</span>
            </h3>
            <Badge variant="outline" className="text-[10px]">
              Instant Sync
            </Badge>
          </div>

          <div className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                {profile?.displayName
                  ? profile.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'DC'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black text-foreground truncate">
                    {profile?.displayName || 'Deepak Chandra'}
                  </h4>
                  {profile?.verified && <CheckCircle2 className="size-3.5 fill-blue-600 text-white shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {profile?.headline || 'SaaS Architect & Coach'}
                </p>
                <span className="text-[10px] font-mono text-slate-400">@{profile?.handle || 'creator'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t">
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="size-3 fill-amber-500" /> 4.9
              </span>
              <span>•</span>
              <span>140+ sessions</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">🟢 Available</span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
              {profile?.bio || 'Helping founders and engineers build, launch, and monetize high-converting AI-powered products.'}
            </p>

            {/* Simulated Live Ask AI Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <Bot className="size-4 shrink-0" />
                <span className="text-[11px] font-bold">Chat with AI</span>
              </div>
              <Badge className="bg-white/20 text-white text-[9px] py-0">24/7</Badge>
            </div>

            {/* Simulated Offers */}
            <div className="space-y-2 pt-1 border-t">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Featured Offers:</span>
              <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">1:1 Strategy Call</p>
                  <p className="text-[10px] text-muted-foreground">30 mins • Google Meet</p>
                </div>
                <span className="text-xs font-black text-blue-600">₹999</span>
              </div>

              <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Ask a Question</p>
                  <p className="text-[10px] text-muted-foreground">24h Priority Response</p>
                </div>
                <span className="text-xs font-black text-purple-600">₹199</span>
              </div>
            </div>

            <a
              href={`/p/${profile?.handle || 'creator'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <span>Open Public Page</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
