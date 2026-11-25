'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Camera,
  FolderOpen,
  MapPin,
  Edit2,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface CampaignPost {
  id: string;
  dayOffset?: number;
  scheduledAt?: string | null;
  content: string;
  mediaUrls?: string[];
  status: string;
  approvalStatus?: string | null;
  publishTargets?: Array<{ platform: string; status: string }>;
  title?: string;
  theme?: string;
}

export function WebCampaignPlanner({ businessName }: { businessName?: string }) {
  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals
  const [selectedPost, setSelectedPost] = useState<CampaignPost | null>(null);
  const [photoSwitcherOpen, setPhotoSwitcherOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Photo Switcher tab & assets
  const [mediaTab, setMediaTab] = useState<'google' | 'uploaded' | 'category' | 'ai'>('google');
  const [googlePhotos, setGooglePhotos] = useState<Array<{ url: string; title: string }>>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ id: string; url: string; title: string }>>([]);
  const [categoryPhotos, setCategoryPhotos] = useState<Array<{ url: string; title: string }>>([]);
  const [aiQuota, setAiQuota] = useState<{ used: number; limit: number; remaining: number; isTrial: boolean }>({
    used: 0,
    limit: 5,
    remaining: 5,
    isTrial: false,
  });
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isGeneratingAiPhoto, setIsGeneratingAiPhoto] = useState(false);

  // Edit Caption
  const [editCaption, setEditCaption] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 1. Fetch Posts
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/social/posts?limit=30');
      const data = await res.json();
      if (data && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.warn('[WebCampaignPlanner] Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  // 2. Fetch Media Library for Switcher
  const fetchMediaLibrary = useCallback(async () => {
    try {
      setIsLoadingMedia(true);
      const res = await fetch('/api/social/media-library');
      const data = await res.json();
      if (data) {
        setGooglePhotos(data.googlePhotos || []);
        setUploadedPhotos(data.uploadedPhotos || []);
        setCategoryPhotos(data.categoryPhotos || []);
        if (data.aiQuota) setAiQuota(data.aiQuota);
      }
    } catch (err) {
      console.warn('[WebCampaignPlanner] Error fetching media library:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  // 3. 1-Tap Autonomous Async Generation (No prompt required!)
  const handleGenerateCampaign = async () => {
    try {
      setIsGenerating(true);
      const idempotencyKey = `web_camp_${Date.now()}`;
      const res = await fetch('/api/social/ai-batch-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysCount: 30, idempotencyKey }),
      });
      const data = await res.json();

      if (data?.async && data?.jobId) {
        const deadline = Date.now() + 90_000;
        let finished = false;
        while (!finished && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1500));
          const stRes = await fetch(
            `/api/social/ai-batch-campaign/status?jobId=${encodeURIComponent(data.jobId)}`,
          );
          const st = await stRes.json();
          if (st?.status === 'completed') {
            finished = true;
            break;
          }
          if (st?.status === 'failed') {
            throw new Error(st?.error || 'Failed to generate 30-day campaign');
          }
        }
        if (!finished) {
          throw new Error('Campaign generation timed out; refresh shortly to view drafted posts.');
        }
        await fetchPosts();
      } else if (data?.success) {
        await fetchPosts();
      } else {
        alert(data?.error || 'Failed to generate 30-day campaign');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not generate campaign.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Batch Approve All
  const handleApproveAll = async () => {
    try {
      const res = await fetch('/api/social/posts/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approveAll: true }),
      });
      const data = await res.json();

      if (data?.success) {
        await fetchPosts();
      } else {
        alert(data?.error || 'Failed to approve posts');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not approve posts.');
    }
  };

  // 5. Open Photo Switcher
  const openPhotoSwitcher = (post: CampaignPost) => {
    setSelectedPost(post);
    setPhotoSwitcherOpen(true);
    void fetchMediaLibrary();
  };

  // 6. Select New Photo
  const handleSelectNewPhoto = async (newUrl: string) => {
    if (!selectedPost || !newUrl) return;

    try {
      await fetch(`/api/social/posts/${selectedPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrls: [newUrl] }),
      });

      setPosts((prev) =>
        prev.map((p) => (p.id === selectedPost.id ? { ...p, mediaUrls: [newUrl] } : p)),
      );
      setPhotoSwitcherOpen(false);
      setSelectedPost(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Please try again.');
    }
  };

  // 7. Generate 1 AI Photo on Demand
  const handleGenerateAiPhoto = async () => {
    if (aiQuota.remaining <= 0) {
      alert('You have used all 5 AI photo generations today. Quota resets tomorrow at midnight!');
      return;
    }

    try {
      setIsGeneratingAiPhoto(true);
      const res = await fetch('/api/social/media-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedPost?.title || businessName,
          prompt: selectedPost?.content || '',
        }),
      });
      const data = await res.json();

      if (data?.success && data.url) {
        setAiQuota((prev) => ({
          ...prev,
          used: data.quota?.used ?? prev.used + 1,
          remaining: data.quota?.remaining ?? Math.max(0, prev.remaining - 1),
        }));
        await handleSelectNewPhoto(data.url);
      } else {
        alert(data?.error || 'Failed to generate AI photo');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not generate photo.');
    } finally {
      setIsGeneratingAiPhoto(false);
    }
  };

  // 8. Open Edit Caption Modal
  const openEditModal = (post: CampaignPost) => {
    setSelectedPost(post);
    setEditCaption(post.content || '');
    setEditModalOpen(true);
  };

  // 9. Save Caption
  const handleSaveCaption = async () => {
    if (!selectedPost) return;

    try {
      setIsSavingEdit(true);
      await fetch(`/api/social/posts/${selectedPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editCaption.trim() }),
      });

      setPosts((prev) =>
        prev.map((p) => (p.id === selectedPost.id ? { ...p, content: editCaption.trim() } : p)),
      );
      setEditModalOpen(false);
      setSelectedPost(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not update post.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const pendingCount = posts.filter((p) => p.approvalStatus === 'pending').length;

  return (
    <div className="space-y-6">
      {/* ── Status Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card border border-border rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">30-Day Autonomous Marketing</h2>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              Zero Effort Plan
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            BGOS analyzes your services, city, and verified Google reviews to create 30 high-converting posts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {posts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateCampaign}
              disabled={isGenerating}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`size-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate 30 Days</span>
            </Button>
          )}

          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={handleApproveAll}
              className="h-9 gap-1.5 bg-[#009F50] hover:bg-[#009F50]/90 text-white font-semibold text-xs shadow-xs rounded-xl px-4"
            >
              <CheckCircle2 className="size-4" />
              <span>Approve All ({pendingCount})</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Content View ── */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#009F50]" />
          <p className="text-xs text-muted-foreground">Loading your 30-day campaign...</p>
        </div>
      ) : isGenerating ? (
        <Card className="p-12 text-center max-w-lg mx-auto">
          <Loader2 className="size-10 animate-spin text-[#009F50] mx-auto mb-4" />
          <h3 className="text-base font-bold text-foreground">Analyzing Your Business</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Crafting 30 customized posts for {businessName || 'your business'} using real Google reviews and local keywords...
          </p>
        </Card>
      ) : posts.length === 0 ? (
        <Card className="p-10 text-center max-w-md mx-auto">
          <div className="size-14 rounded-full bg-emerald-50 text-[#009F50] flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Sparkles className="size-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">Plan Your Next 30 Days</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Tap below to generate 30 days of posts with ready-to-publish photos and captions. You don&apos;t have to write anything.
          </p>
          <Button
            onClick={handleGenerateCampaign}
            className="mt-6 w-full bg-[#009F50] hover:bg-[#009F50]/90 text-white font-bold text-sm h-11 rounded-xl shadow-xs gap-2"
          >
            <Sparkles className="size-4" />
            <span>Generate 30-Day Campaign (1-Tap)</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post, idx) => {
            const mediaUrl =
              post.mediaUrls && post.mediaUrls.length > 0
                ? post.mediaUrls[0]
                : googlePhotos[idx % Math.max(1, googlePhotos.length)]?.url || '';

            const dateDisplay = post.scheduledAt
              ? new Date(post.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : `Day ${idx + 1}`;

            const isScheduled = post.status === 'scheduled' || post.approvalStatus === 'approved';

            return (
              <Card key={post.id || idx} className="overflow-hidden flex flex-col justify-between border-border/80 shadow-xs hover:shadow-md transition-shadow">
                <div>
                  {/* Top Bar: Date & Status */}
                  <div className="flex items-center justify-between p-3.5 border-b border-border/60 bg-muted/20">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span>{dateDisplay}</span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                        isScheduled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isScheduled ? 'Scheduled' : 'Pending Review'}
                    </Badge>
                  </div>

                  {/* Image */}
                  <div className="relative aspect-video bg-muted overflow-hidden flex items-center justify-center">
                    {mediaUrl ? (
                      <img src={mediaUrl} alt="Campaign post visual" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">Choose GBP or AI Photo</span>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="p-4 space-y-2.5">
                    <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        📍 Google Maps
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        📸 Instagram
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        📘 Facebook
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-3 border-t border-border/60 bg-muted/10 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPhotoSwitcher(post)}
                    className="h-8 text-xs font-semibold gap-1 text-[#009F50] border-emerald-200 hover:bg-emerald-50"
                  >
                    <Camera className="size-3.5" />
                    <span>Change Photo</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(post)}
                    className="h-8 text-xs font-semibold gap-1 text-slate-700 hover:bg-slate-50"
                  >
                    <Edit2 className="size-3.5" />
                    <span>Edit Text</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── PHOTO SWITCHER MODAL ── */}
      {photoSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <Card className="w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden bg-card shadow-xl rounded-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Select New Photo</h3>
              <button
                type="button"
                onClick={() => setPhotoSwitcherOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border bg-muted/20 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaTab('google')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  mediaTab === 'google'
                    ? 'border-[#009F50] text-[#009F50]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapPin className="size-3.5" />
                <span>Google Maps ({googlePhotos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaTab('uploaded')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  mediaTab === 'uploaded'
                    ? 'border-[#009F50] text-[#009F50]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FolderOpen className="size-3.5" />
                <span>Uploaded ({uploadedPhotos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaTab('ai')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  mediaTab === 'ai'
                    ? 'border-[#009F50] text-[#009F50]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="size-3.5" />
                <span>Generate AI Photo ({aiQuota.remaining}/5)</span>
              </button>
            </div>

            {/* Grid */}
            <div className="p-4 flex-1 overflow-y-auto">
              {isLoadingMedia ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="size-6 animate-spin text-[#009F50]" />
                </div>
              ) : mediaTab === 'ai' ? (
                <div className="py-8 text-center space-y-3">
                  <Sparkles className="size-8 text-[#009F50] mx-auto" />
                  <h4 className="text-sm font-bold text-foreground">Create Custom Commercial Photo</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Generates a photo specifically tailored for this post topic.
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 inline-block">
                    {aiQuota.remaining} of 5 daily AI photos remaining
                  </p>
                  <div className="pt-2">
                    <Button
                      onClick={handleGenerateAiPhoto}
                      disabled={isGeneratingAiPhoto || aiQuota.remaining <= 0}
                      className="bg-[#009F50] hover:bg-[#009F50]/90 text-white font-semibold text-xs h-9 px-6 rounded-xl"
                    >
                      {isGeneratingAiPhoto ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                      <span>Generate AI Photo</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {((mediaTab === 'google' ? googlePhotos : uploadedPhotos).length === 0) ? (
                    <div className="col-span-3 py-10 text-center text-xs text-muted-foreground">
                      No photos found in this library.
                    </div>
                  ) : (
                    (mediaTab === 'google' ? googlePhotos : uploadedPhotos).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectNewPhoto(item.url)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-[#009F50] transition-colors focus:outline-none"
                      >
                        <img src={item.url} alt="Media thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── EDIT CAPTION MODAL ── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <Card className="w-full max-w-md p-5 bg-card shadow-xl rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Edit Post Caption</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <Textarea
              rows={4}
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              placeholder="Write post caption..."
              className="text-xs"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCaption}
                disabled={isSavingEdit}
                className="bg-[#009F50] hover:bg-[#009F50]/90 text-white text-xs font-semibold h-9"
              >
                {isSavingEdit ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                <span>Save Changes</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
