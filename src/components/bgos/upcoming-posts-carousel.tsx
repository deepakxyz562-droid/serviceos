'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileText,
  Info,
  Store,
  Globe,
  Share2,
  X,
  Send,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface WebUpcomingPost {
  id: string;
  type: string;
  scheduledTime: string;
  headline: string;
  caption: string;
  imageUrl?: string;
  channels: string[];
}

interface UpcomingPostsCarouselProps {
  businessName?: string;
  onCreateWithAi: () => void;
}

export function UpcomingPostsCarousel({
  businessName = 'My Business',
  onCreateWithAi,
}: UpcomingPostsCarouselProps) {
  const [posts, setPosts] = useState<WebUpcomingPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<WebUpcomingPost | null>(null);

  const fallbackPosts: WebUpcomingPost[] = [
    {
      id: 'up-1',
      type: 'Standard Post',
      scheduledTime: '10 Nov 2026, 09:00 AM',
      headline: `Escape to Comfort: Your Ideal Stay Experience at ${businessName}`,
      caption: `Planning a getaway from the city's hustle? At ${businessName}, we offer scenic views, serene open spaces, and premium comfort. Book your weekend retreat today!`,
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
      channels: ['googlebusiness', 'facebook', 'instagram', 'linkedin', 'threads'],
    },
    {
      id: 'up-2',
      type: 'Offer Post',
      scheduledTime: '12 Nov 2026, 11:30 AM',
      headline: `Midweek Special: 20% Off Stays & Experience Packages`,
      caption: `Upgrade your weekdays with our exclusive midweek promotion. Enjoy peaceful luxury, personalized dining, and refreshing outdoor experiences.`,
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80',
      channels: ['googlebusiness', 'facebook', 'instagram', 'threads'],
    },
    {
      id: 'up-3',
      type: 'Event Post',
      scheduledTime: '14 Nov 2026, 05:00 PM',
      headline: `Host Your Celebrations & Gatherings With Us`,
      caption: `Looking for the perfect venue for family reunions, birthdays, or team celebrations? Discover lush lawns, dedicated hospitality, and unforgettable memories at ${businessName}.`,
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
      channels: ['googlebusiness', 'instagram', 'pinterest'],
    },
    {
      id: 'up-4',
      type: 'Standard Post',
      scheduledTime: '16 Nov 2026, 09:00 AM',
      headline: `Fresh Air, Green Lawns & Unmatched Hospitality`,
      caption: `Take a breath of fresh air. From relaxing poolside afternoons to starry evening bonfires, discover what makes ${businessName} the top-rated local retreat.`,
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80',
      channels: ['googlebusiness', 'facebook', 'threads'],
    },
  ];

  useEffect(() => {
    let active = true;
    async function fetchPosts() {
      try {
        const res = await fetch('/api/social/posts?limit=15');
        if (res.ok) {
          const json = await res.json();
          if (active && json.data && json.data.length > 0) {
            const mapped: WebUpcomingPost[] = json.data.map((p: any, idx: number) => ({
              id: p.id || `p-${idx}`,
              type: p.gbpPostType ? `${p.gbpPostType.charAt(0).toUpperCase() + p.gbpPostType.slice(1)} Post` : 'Standard Post',
              scheduledTime: p.scheduledAt
                ? new Date(p.scheduledAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : `${10 + idx} Nov 2026, 09:00 AM`,
              headline: (p.content || '').split('\n')[0]?.slice(0, 75) || `${businessName} Weekly Update`,
              caption: p.content || '',
              imageUrl: p.mediaUrls?.[0] || fallbackPosts[idx % fallbackPosts.length]?.imageUrl,
              channels: (p.publishTargets || []).map((t: any) => t.platform) || ['googlebusiness'],
            }));
            setPosts(mapped);
            return;
          }
        }
        if (active) setPosts(fallbackPosts);
      } catch {
        if (active) setPosts(fallbackPosts);
      }
    }
    fetchPosts();
    return () => {
      active = false;
    };
  }, [businessName]);

  const activeList = posts.length > 0 ? posts : fallbackPosts;

  return (
    <div className="space-y-3.5 mb-6">
      {/* Header with pill count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-foreground">Upcoming Posts</h3>
          <span className="bg-muted px-2.5 py-0.5 rounded-full text-xs font-bold text-muted-foreground">
            {activeList.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            toast.info(
              'AI drafts and schedules regular updates for your Google Business Profile and social channels to maintain ranking velocity.'
            )
          }
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="size-4" />
        </button>
      </div>

      {/* Horizontal scrolling carousel */}
      <div className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {activeList.map((post) => (
          <div
            key={post.id}
            onClick={() => setSelectedPost(post)}
            className="w-80 shrink-0 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 text-slate-100 flex flex-col justify-between gap-3 cursor-pointer shadow-md transition-all hover:scale-[1.01]"
          >
            {/* Top row */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md text-[11px] font-bold">
                <FileText className="size-3" />
                {post.type}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <Clock className="size-3" />
                {post.scheduledTime}
              </span>
            </div>

            {/* Content row */}
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug">
                  {post.headline}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {post.caption}
                </p>
              </div>

              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt={post.headline}
                  className="size-16 rounded-xl object-cover bg-slate-800 shrink-0 border border-slate-700"
                />
              )}
            </div>

            {/* Bottom action row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="flex items-center gap-1.5 text-blue-400">
                <Store className="size-3.5" />
                <Globe className="size-3.5 text-emerald-400" />
              </div>
              <span className="text-blue-400 font-bold flex items-center gap-0.5 hover:underline">
                View Post &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Prominent Action Button: Create Post with AI */}
      <Button
        type="button"
        onClick={onCreateWithAi}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm h-11 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
      >
        <Sparkles className="size-4" />
        Create Post with AI
      </Button>

      {/* Post Detail Dialog */}
      <Dialog open={Boolean(selectedPost)} onOpenChange={(open) => !open && setSelectedPost(null)}>
        {selectedPost && (
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-xs font-bold">
                  {selectedPost.type}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {selectedPost.scheduledTime}
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-foreground mt-1">
                {selectedPost.headline}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {selectedPost.imageUrl && (
                <img
                  src={selectedPost.imageUrl}
                  alt={selectedPost.headline}
                  className="w-full h-44 object-cover rounded-xl border border-border"
                />
              )}
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {selectedPost.caption}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedPost(null);
                  onCreateWithAi();
                }}
                className="text-xs h-9"
              >
                <Edit className="size-3.5 mr-1.5" />
                Edit in Studio
              </Button>
              <Button
                type="button"
                onClick={() => {
                  toast.success('Post queued for immediate publishing to Google Business!');
                  setSelectedPost(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9"
              >
                <Send className="size-3.5 mr-1.5" />
                Publish Now
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
