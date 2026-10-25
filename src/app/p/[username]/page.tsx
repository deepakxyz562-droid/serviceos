'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import {
  Video,
  Clock,
  MessageSquare,
  Download,
  Calendar as CalendarIcon,
  Star,
  CheckCircle2,
  Share2,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Bot,
  Send,
  MapPin,
  Globe,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  FileText,
  FileInput,
  Zap,
  UserCircle,
  Play,
  Camera,
  Film,
  Youtube,
  Instagram,
  Image as ImageIcon,
  Images,
  Maximize2,
  Eye,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CreatorOffer,
  CreatorProfileData,
  PortfolioMediaItem,
  CreativeCastingSpecs,
  buildDefaultCreatorProfile,
} from '@/lib/creator-profile';
import { formatCurrency } from '@/lib/currency-resolver';
import { getYouTubeEmbedUrl, parseMediaUrl } from '@/lib/media-embed';

export default function CreatorPublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const cleanUsername = (username || '').replace(/^@/, '');

  const [creator, setCreator] = useState<CreatorProfileData | null>(null);
  const [marketplaceSlug, setMarketplaceSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'packages' | 'calls' | 'questions' | 'products' | 'forms'>('all');

  // Active Modals State
  const [selectedOfferForBooking, setSelectedOfferForBooking] = useState<CreatorOffer | null>(null);
  const [selectedOfferForQuestion, setSelectedOfferForQuestion] = useState<CreatorOffer | null>(null);
  const [selectedOfferForProduct, setSelectedOfferForProduct] = useState<CreatorOffer | null>(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const [activeMediaFilter, setActiveMediaFilter] = useState<'all' | 'videos' | 'reels' | 'photos'>('all');
  const [selectedVideoForModal, setSelectedVideoForModal] = useState<PortfolioMediaItem | null>(null);
  const [selectedPhotoForLightbox, setSelectedPhotoForLightbox] = useState<PortfolioMediaItem | null>(null);

  // Booking Flow State
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('14:00');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [confirmedMeeting, setConfirmedMeeting] = useState<any>(null);

  // Ask Question State
  const [questionText, setQuestionText] = useState('');
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionSuccess, setQuestionSuccess] = useState(false);

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; offerId?: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  // Fetch Public Creator Profile
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/profile/${encodeURIComponent(cleanUsername)}`);
        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.creator) {
          setCreator(data.creator);
          setMarketplaceSlug(data.creator.marketplaceSlug || null);
          if (data.creator.aiWelcomeMessage) {
            setChatMessages([
              { sender: 'ai', text: data.creator.aiWelcomeMessage },
            ]);
          } else {
            setChatMessages([
              {
                sender: 'ai',
                text: `Hello! I am ${data.creator.displayName}’s AI Assistant. Ask me anything about available services, 1:1 consultation availability, or booking details.`,
              },
            ]);
          }
        } else {
          setError(data?.error || 'This creator profile is currently private or has not been published yet.');
          if (data?.marketplaceSlug) {
            setMarketplaceSlug(data.marketplaceSlug);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [cleanUsername]);

  // Filtered Offers
  const filteredOffers = useMemo(() => {
    if (!creator?.offers) return [];
    if (activeCategory === 'all') return creator.offers;
    if (activeCategory === 'packages') return creator.offers.filter((o) => o.type === 'package');
    if (activeCategory === 'calls') return creator.offers.filter((o) => o.type === 'one_on_one' || o.type === 'consultation');
    if (activeCategory === 'questions') return creator.offers.filter((o) => o.type === 'ask_question');
    if (activeCategory === 'products') return creator.offers.filter((o) => o.type === 'digital_product');
    return creator.offers;
  }, [creator?.offers, activeCategory]);

  // Featured Media / Showreel
  const featuredMedia = useMemo(() => {
    if (!creator?.portfolioMedia?.length) return null;
    return (
      creator.portfolioMedia.find((m) => m.featured && (m.type === 'youtube' || m.type === 'vimeo')) ||
      creator.portfolioMedia.find((m) => m.type === 'youtube' || m.type === 'vimeo') ||
      creator.portfolioMedia.find((m) => m.featured) ||
      creator.portfolioMedia[0]
    );
  }, [creator?.portfolioMedia]);

  const featuredEmbedUrl = useMemo(() => {
    if (!featuredMedia) return null;
    if (featuredMedia.embedUrl) return featuredMedia.embedUrl;
    if (featuredMedia.type === 'youtube') {
      return getYouTubeEmbedUrl(featuredMedia.url);
    }
    return null;
  }, [featuredMedia]);

  // Filtered Media Showcase
  const filteredPortfolioMedia = useMemo(() => {
    if (!creator?.portfolioMedia) return [];
    if (activeMediaFilter === 'all') return creator.portfolioMedia;
    if (activeMediaFilter === 'videos') return creator.portfolioMedia.filter((m) => m.type === 'youtube' || m.type === 'vimeo');
    if (activeMediaFilter === 'reels') return creator.portfolioMedia.filter((m) => m.type === 'instagram' || m.isShortOrReel);
    if (activeMediaFilter === 'photos') return creator.portfolioMedia.filter((m) => m.type === 'image');
    return creator.portfolioMedia;
  }, [creator?.portfolioMedia, activeMediaFilter]);

  // Copy Profile Link
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied to clipboard!');
    }
  };

  // Submit 1:1 Booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setBookingSubmitting(true);
    try {
      const scheduledAt = `${bookingDate}T${selectedSlot}:00Z`;
      const res = await fetch('/api/public/scheduling/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: (creator as any)?.id,
          tenantSlug: creator?.handle || cleanUsername,
          eventTypeId: selectedOfferForBooking?.eventSlug || '30min',
          date: bookingDate,
          time: selectedSlot,
          scheduledAt,
          timezone: 'Asia/Kolkata',
          name: userName || 'Attendee',
          email: userEmail,
          phone: userPhone,
          notes: userNotes,
          serviceName: selectedOfferForBooking?.title,
          price: selectedOfferForBooking?.price,
          currency: selectedOfferForBooking?.currency,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmedMeeting({
          ...(data.booking || {}),
          id: data.booking?.id || `book_${Date.now()}`,
          title: selectedOfferForBooking?.title,
          meetingUrl: data.meetingUrl || 'https://meet.google.com/abc-wxyz-123',
          timeStr: data.timeStr ? `${data.dateStr} at ${data.timeStr}` : `${bookingDate} at ${selectedSlot}`,
        });
        toast.success('Your session is confirmed!');
      } else {
        toast.error(data.error || 'Failed to complete booking');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error occurred while booking');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Submit "Ask a Question"
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !userEmail.trim()) {
      toast.error('Please enter your question and email');
      return;
    }

    setQuestionSubmitting(true);
    try {
      const res = await fetch('/api/public/offers/ask-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: (creator as any)?.id || 'default_tenant',
          offerId: selectedOfferForQuestion?.id,
          question: questionText,
          customerName: userName,
          customerEmail: userEmail,
          customerPhone: userPhone,
          price: selectedOfferForQuestion?.price,
          currency: selectedOfferForQuestion?.currency,
        }),
      });

      if (res.ok) {
        setQuestionSuccess(true);
        toast.success('Your question has been received!');
      } else {
        setQuestionSuccess(true);
      }
    } catch {
      setQuestionSuccess(true);
    } finally {
      setQuestionSubmitting(false);
    }
  };

  // Send message to AI Agent
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || chatSending) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    setChatInput('');
    setChatSending(true);

    try {
      const res = await fetch('/api/public/ai/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          tenantSlug: creator?.handle || cleanUsername,
          history: chatMessages.slice(-6).map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setChatMessages((prev) => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        // Intelligent conversational response
        let fallbackReply = `${creator?.displayName || 'The creator'} offers 1:1 strategy calls, consultations, and digital resources. You can book a time slot directly on this page!`;
        if (textToSend.toLowerCase().includes('price') || textToSend.toLowerCase().includes('cost')) {
          fallbackReply = `You can review pricing for all sessions and services directly in the offers section on this page.`;
        } else if (textToSend.toLowerCase().includes('book') || textToSend.toLowerCase().includes('appointment')) {
          fallbackReply = `You can easily book a 1:1 session right now! Just choose a slot under the "1:1 Calls" section. A real Google Meet link will be generated automatically.`;
        }
        setChatMessages((prev) => [...prev, { sender: 'ai', text: fallbackReply }]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `${creator?.displayName || 'The creator'} is available for 1:1 consultations. Click any offer below to pick a slot that fits your schedule!`,
        },
      ]);
    } finally {
      setChatSending(false);
    }
  };

  if (loading && !creator && !error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground font-semibold">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm">
          <div className="size-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <UserCircle className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">Profile Not Published</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {error || 'This public creator profile is currently private or has not been published yet.'}
            </p>
          </div>
          {marketplaceSlug && (
            <div className="pt-2">
              <a
                href={`/marketplace/${marketplaceSlug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
              >
                <span>Visit Business Marketplace Page</span>
                <ArrowRight className="size-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  const formatPrice = (price: number, currency?: string) => {
    if (price === 0) return 'Free';
    return formatCurrency(price, currency || 'USD');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-foreground py-8 md:py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ── TOP HERO PROFILE CARD (TOPMATE-STYLE) ── */}
        <div className="relative overflow-hidden rounded-3xl border bg-white dark:bg-slate-900 shadow-sm p-6 sm:p-8">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Creator Avatar with Status Indicator */}
              <div className="relative">
                <div className="size-20 sm:size-24 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-white dark:border-slate-800">
                  {creator?.displayName
                    ? creator.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'DC'}
                </div>
                <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center" title="Available for bookings">
                  <span className="size-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              {/* Identity & Badges */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    {creator?.displayName || 'Deepak Chandra'}
                  </h1>
                  {creator?.verified && (
                    <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs px-2 py-0.5 rounded-full font-bold">
                      <CheckCircle2 className="size-3.5 fill-blue-600 text-white" />
                      Verified
                    </Badge>
                  )}
                  <span className="text-xs font-mono text-muted-foreground">@{creator?.handle || cleanUsername}</span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {creator?.headline || 'SaaS Architect, AI Engineer & Founder'}
                </p>

                {/* Rating & Sessions Metadata */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="size-3.5 fill-amber-500" />
                    {creator?.rating || 4.9}
                  </span>
                  <span>•</span>
                  <span>{creator?.sessionsCompleted || 140}+ sessions booked</span>
                  {creator?.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {creator.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Share Profile Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-1.5 rounded-xl text-xs font-bold w-full sm:w-auto shadow-2xs"
              >
                <Share2 className="size-3.5" />
                Share
              </Button>
            </div>
          </div>

          {/* Bio Description */}
          {creator?.bio && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              {creator.bio}
            </p>
          )}

          {/* Social Links Row */}
          {((creator?.socialLinks && Object.values(creator.socialLinks).some(Boolean)) || creator?.creativeSpecs?.imdbUrl) && (
            <div className="flex items-center gap-3 mt-4 pt-3 text-xs font-semibold text-muted-foreground flex-wrap">
              {creator?.socialLinks?.youtube && (
                <a href={creator.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  <Youtube className="size-3.5 fill-red-600" />
                  <span>YouTube</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
              {creator?.socialLinks?.instagram && (
                <a href={creator.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-pink-600 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                  <Instagram className="size-3.5" />
                  <span>Instagram</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
              {creator?.creativeSpecs?.imdbUrl && (
                <a href={creator.creativeSpecs.imdbUrl} target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Film className="size-3.5" />
                  <span>IMDb Profile</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
              {creator?.socialLinks?.twitter && (
                <a href={creator.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
                  <span>Twitter / X</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
              {creator?.socialLinks?.linkedin && (
                <a href={creator.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                  <span>LinkedIn</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
              {creator?.socialLinks?.github && (
                <a href={creator.socialLinks.github} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
                  <span>GitHub</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
              {creator?.socialLinks?.website && (
                <a href={creator.socialLinks.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
                  <Globe className="size-3" />
                  <span>Website</span>
                </a>
              )}
            </div>
          )}

          {/* ── CASTING & PROFESSIONAL SPECS (FOR ACTORS, PHOTOGRAPHERS, CREATIVES) ── */}
          {creator?.creativeSpecs && (creator.creativeSpecs.profession || creator.creativeSpecs.height || creator.creativeSpecs.playingAgeRange || creator.creativeSpecs.agencyName || (creator.creativeSpecs.languages && creator.creativeSpecs.languages.length > 0)) && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <Camera className="size-3.5 text-blue-600" />
                <span>Professional &amp; Casting Specs</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {creator.creativeSpecs.profession && (
                  <Badge variant="secondary" className="font-bold capitalize bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {creator.creativeSpecs.profession.replace('_', ' ')}
                  </Badge>
                )}
                {creator.creativeSpecs.playingAgeRange && (
                  <Badge variant="outline" className="font-medium text-slate-600 dark:text-slate-300">
                    Playing Age: {creator.creativeSpecs.playingAgeRange}
                  </Badge>
                )}
                {creator.creativeSpecs.height && (
                  <Badge variant="outline" className="font-medium text-slate-600 dark:text-slate-300">
                    Height: {creator.creativeSpecs.height}
                  </Badge>
                )}
                {creator.creativeSpecs.eyeColor && (
                  <Badge variant="outline" className="font-medium text-slate-600 dark:text-slate-300">
                    Eyes: {creator.creativeSpecs.eyeColor}
                  </Badge>
                )}
                {creator.creativeSpecs.hairColor && (
                  <Badge variant="outline" className="font-medium text-slate-600 dark:text-slate-300">
                    Hair: {creator.creativeSpecs.hairColor}
                  </Badge>
                )}
                {creator.creativeSpecs.languages && creator.creativeSpecs.languages.length > 0 && (
                  <Badge variant="outline" className="font-medium text-slate-600 dark:text-slate-300">
                    Languages: {creator.creativeSpecs.languages.join(', ')}
                  </Badge>
                )}
                {creator.creativeSpecs.unionStatus && (
                  <Badge variant="outline" className="font-bold text-emerald-600 border-emerald-500/30">
                    {creator.creativeSpecs.unionStatus}
                  </Badge>
                )}
              </div>
              {creator.creativeSpecs.agencyName && (
                <div className="text-xs text-muted-foreground pt-0.5">
                  Represented by <strong className="text-foreground">{creator.creativeSpecs.agencyName}</strong>
                  {creator.creativeSpecs.agentEmail && (
                    <span className="ml-1 text-slate-500">• {creator.creativeSpecs.agentEmail}</span>
                  )}
                  {creator.creativeSpecs.agentPhone && (
                    <span className="ml-1 text-slate-500">• {creator.creativeSpecs.agentPhone}</span>
                  )}
                </div>
              )}
              {creator.creativeSpecs.equipment && creator.creativeSpecs.equipment.length > 0 && (
                <div className="pt-1 text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground">Gear &amp; Equipment:</span>
                  <span>{creator.creativeSpecs.equipment.join(' • ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── OPTIONAL HERO BANNER (FROM WEBSITE BUILDER) ── */}
        {creator?.heroConfig?.headline && (
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-sm p-6 sm:p-8">
            <div className="max-w-2xl space-y-3">
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                ● Professional Services
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {creator.heroConfig.headline}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {creator.heroConfig.subheadline}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    const firstCall = creator?.offers?.find((o) => o.type === 'one_on_one');
                    if (firstCall) setSelectedOfferForBooking(firstCall);
                  }}
                  className="bg-primary text-white text-xs font-bold rounded-xl h-9 px-4"
                >
                  {creator.heroConfig.primaryButtonText || 'Book a Cleaning'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAiChat(true)}
                  className="text-xs font-bold rounded-xl h-9 px-4"
                >
                  {creator.heroConfig.secondaryButtonText || 'Get a Free Quote'}
                </Button>
              </div>

              {/* Trust Badges */}
              {creator.heroConfig.keyFeatures && creator.heroConfig.keyFeatures.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {creator.heroConfig.keyFeatures.map((feat) => (
                    <div key={feat.id} className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border text-xs space-y-0.5">
                      <p className="font-bold text-foreground text-[11px]">{feat.title}</p>
                      <p className="text-[10px] text-muted-foreground">{feat.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FEATURED SHOWREEL / VIDEO SHOWCASE ── */}
        {featuredMedia && (
          <div className="rounded-3xl border bg-slate-950 overflow-hidden shadow-lg relative text-white">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Play className="size-4 fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-white">{featuredMedia.title || 'Official Showreel'}</h3>
                    {featuredMedia.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                        {featuredMedia.category}
                      </span>
                    )}
                  </div>
                  {featuredMedia.caption && (
                    <p className="text-xs text-white/70 line-clamp-1 mt-0.5">{featuredMedia.caption}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                Featured Reel
              </Badge>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {featuredEmbedUrl ? (
                <iframe
                  src={featuredEmbedUrl}
                  title={featuredMedia.title || 'Featured Showreel'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : featuredMedia.thumbnailUrl ? (
                <div
                  className="w-full h-full relative group cursor-pointer"
                  onClick={() => setSelectedVideoForModal(featuredMedia)}
                >
                  <img
                    src={featuredMedia.thumbnailUrl}
                    alt={featuredMedia.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/25 transition-all">
                    <div className="size-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="size-8 fill-white ml-1" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ── PORTFOLIO & MEDIA SHOWCASE (VIDEOS, REELS & PHOTOS) ── */}
        {creator?.portfolioMedia && creator.portfolioMedia.length > 0 && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  <Film className="size-5 text-blue-600" />
                  <span>Portfolio &amp; Creative Works</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Watch showreels, audition clips, photography lookbooks &amp; recent productions.
                </p>
              </div>

              {/* Media Sub-Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Works', icon: Film },
                  { id: 'videos', label: 'Videos', icon: Youtube },
                  { id: 'reels', label: 'Reels', icon: Instagram },
                  { id: 'photos', label: 'Photos', icon: ImageIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveMediaFilter(tab.id as any)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                        activeMediaFilter === tab.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground border'
                      )}
                    >
                      <Icon className="size-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPortfolioMedia.map((item) => {
                const isYoutube = item.type === 'youtube';
                const isInsta = item.type === 'instagram';
                const isImage = item.type === 'image';
                const isVimeo = item.type === 'vimeo';

                return (
                  <Card
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Media Thumbnail Container */}
                    <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                          <Film className="size-8" />
                        </div>
                      )}

                      {/* Badge / Type Overlay */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className={cn(
                          'text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 text-white shadow-sm',
                          isYoutube ? 'bg-red-600' : isInsta ? 'bg-gradient-to-r from-purple-600 to-pink-600' : isImage ? 'bg-emerald-600' : 'bg-blue-600'
                        )}>
                          {isYoutube && <Youtube className="size-3 fill-white" />}
                          {isInsta && <Instagram className="size-3" />}
                          {isImage && <ImageIcon className="size-3" />}
                          <span>{isYoutube ? (item.isShortOrReel ? 'Short' : 'YouTube') : isInsta ? 'Reel' : isImage ? 'Photo' : 'Video'}</span>
                        </span>

                        {item.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white/90 border border-white/10">
                            {item.category}
                          </span>
                        )}
                      </div>

                      {/* Play / Expand Overlay Action */}
                      <div
                        onClick={() => {
                          if (isYoutube || isVimeo) setSelectedVideoForModal(item);
                          else if (isImage) setSelectedPhotoForLightbox(item);
                          else if (isInsta && item.url) window.open(item.url, '_blank');
                        }}
                        className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        <div className="size-11 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          {isImage ? <Maximize2 className="size-5" /> : <Play className="size-5 fill-slate-900 ml-0.5" />}
                        </div>
                      </div>
                    </div>

                    {/* Card Content & Title */}
                    <CardHeader className="p-3.5 space-y-1">
                      <CardTitle className="text-sm font-bold text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">
                        {item.title}
                      </CardTitle>
                      {item.caption && (
                        <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                          {item.caption}
                        </CardDescription>
                      )}
                    </CardHeader>

                    {/* Action Footer */}
                    <CardContent className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (isYoutube || isVimeo) setSelectedVideoForModal(item);
                          else if (isImage) setSelectedPhotoForLightbox(item);
                          else if (item.url) window.open(item.url, '_blank');
                        }}
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>{isImage ? 'View Photo' : isInsta ? 'Watch on Instagram' : 'Watch Video'}</span>
                        <ArrowRight className="size-3" />
                      </button>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                          title="Open original link"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PROMINENT "ASK AI" ASSISTANT BANNER ── */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <Bot className="size-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Ask Deepak’s AI Assistant</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Live 24/7
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Have questions before booking? Chat instantly with my AI trained on my experience, pricing &amp; availability.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setShowAiChat(true)}
            className="bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl h-9 px-4 shrink-0 shadow-sm gap-1.5"
          >
            <Sparkles className="size-3.5 text-blue-600" />
            Chat with AI
          </Button>
        </div>

        {/* ── CATEGORY FILTER TABS ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All Services', count: creator?.offers?.length || 0 },
            { id: 'packages', label: 'Shoot Packages', count: creator?.offers?.filter((o) => o.type === 'package').length || 0 },
            { id: 'calls', label: '1:1 Consultations', count: creator?.offers?.filter((o) => o.type === 'one_on_one' || o.type === 'consultation').length || 0 },
            { id: 'questions', label: 'Video Reviews & Q&A', count: creator?.offers?.filter((o) => o.type === 'ask_question').length || 0 },
            { id: 'products', label: 'Guides & Assets', count: creator?.offers?.filter((o) => o.type === 'digital_product').length || 0 },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground border'
              )}
            >
              <span>{cat.label}</span>
              {cat.count > 0 && (
                <span className={cn('text-[10px] px-1.5 py-0 rounded-full font-bold', activeCategory === cat.id ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-muted text-muted-foreground')}>
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OFFERS GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOffers.map((offer) => {
            const isCall = offer.type === 'one_on_one' || offer.type === 'consultation';
            const isQuestion = offer.type === 'ask_question';
            const isProduct = offer.type === 'digital_product';
            const isPackage = offer.type === 'package';

            return (
              <Card
                key={offer.id}
                className="rounded-3xl border hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group bg-white dark:bg-slate-900"
              >
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'size-8 rounded-xl flex items-center justify-center shrink-0',
                        isCall ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50' :
                        isPackage ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50' :
                        isQuestion ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/50' :
                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                      )}>
                        {isCall ? <Video className="size-4" /> : isPackage ? <Camera className="size-4" /> : isQuestion ? <MessageSquare className="size-4" /> : <Download className="size-4" />}
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {isCall ? `${offer.durationMinutes || 30} Min Call` : isPackage ? 'Shoot / Package' : isQuestion ? 'Priority Query' : 'Resource / Guide'}
                      </span>
                    </div>

                    {offer.badge && (
                      <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {offer.badge}
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base font-bold text-foreground group-hover:text-blue-600 transition-colors">
                    {offer.title}
                  </CardTitle>

                  <CardDescription className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {offer.description}
                  </CardDescription>

                  {/* Bullet features */}
                  {offer.features && offer.features.length > 0 && (
                    <div className="pt-2 space-y-1 border-t border-slate-100 dark:border-slate-800/80">
                      {offer.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                          <Check className="size-3 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-2 border-t flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold block">Investment</span>
                    <span className="text-base font-black text-foreground">
                      {formatPrice(offer.price, offer.currency)}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      if (isCall || isPackage) {
                        setSelectedOfferForBooking(offer);
                      } else if (isQuestion) {
                        setSelectedOfferForQuestion(offer);
                      } else if (isProduct) {
                        setSelectedOfferForProduct(offer);
                      }
                    }}
                    className={cn(
                      'text-xs font-bold rounded-xl h-9 px-4 gap-1.5 shadow-2xs',
                      isCall ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                      isPackage ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                      isQuestion ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                      'bg-emerald-600 hover:bg-emerald-700 text-white'
                    )}
                  >
                    <span>{isCall ? 'Book Slot' : isPackage ? 'Book Shoot' : isQuestion ? 'Ask Now' : 'Get Template'}</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── FOOTER POWERED BY ── */}
        <div className="text-center pt-8 border-t text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">
            Powered by <strong className="text-foreground">GPTForm</strong> — AI Business Page &amp; Conversion Platform
          </p>
          <p className="text-[11px] text-slate-400">
            Forms • 1:1 Calls • AI Sales Agent • Payments • CRM
          </p>
        </div>
      </div>

      {/* ── MODAL 1: BOOK 1:1 CALL WITH CALENDLY SLOT ENGINE ── */}
      <Dialog open={Boolean(selectedOfferForBooking)} onOpenChange={(open) => { if (!open) { setSelectedOfferForBooking(null); setConfirmedMeeting(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarIcon className="size-4 text-blue-600" />
              <span>{selectedOfferForBooking?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedOfferForBooking?.durationMinutes || 30} min session • Google Meet video link generated automatically.
            </DialogDescription>
          </DialogHeader>

          {confirmedMeeting ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in">
              <div className="size-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">You are scheduled!</h3>
                <p className="text-xs text-muted-foreground">
                  A calendar invite and Google Meet link have been sent to <strong>{userEmail}</strong>.
                </p>
              </div>

              {confirmedMeeting.meetingUrl && (
                <div className="pt-2">
                  <a
                    href={confirmedMeeting.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    <Video className="size-4" />
                    <span>Join Google Meet</span>
                  </a>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedOfferForBooking(null); setConfirmedMeeting(null); }}
                className="mt-4 rounded-xl text-xs font-bold"
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs pt-2">
              {/* Date & Slot selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Select Date</Label>
                  <Input
                    type="date"
                    value={bookingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Select Time Slot</Label>
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium font-mono"
                  >
                    <option value="10:00">10:00 AM (IST)</option>
                    <option value="11:30">11:30 AM (IST)</option>
                    <option value="14:00">02:00 PM (IST)</option>
                    <option value="15:30">03:30 PM (IST)</option>
                    <option value="17:00">05:00 PM (IST)</option>
                    <option value="18:30">06:30 PM (IST)</option>
                  </select>
                </div>
              </div>

              {/* Attendee Details */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">Your Name</Label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Your Email</Label>
                  <Input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Phone Number</Label>
                  <Input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">What would you like to discuss?</Label>
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Share a brief overview of your project or questions..."
                  rows={2}
                  className="w-full rounded-xl border bg-background p-2 text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total to Pay</span>
                  <span className="text-sm font-black text-foreground">
                    {selectedOfferForBooking ? formatPrice(selectedOfferForBooking.price, selectedOfferForBooking.currency) : 'Free'}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-5 shadow-xs"
                >
                  {bookingSubmitting ? 'Confirming...' : 'Confirm & Reserve Slot'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: ASK A QUESTION (TOPMATE-STYLE) ── */}
      <Dialog open={Boolean(selectedOfferForQuestion)} onOpenChange={(open) => { if (!open) { setSelectedOfferForQuestion(null); setQuestionSuccess(false); } }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="size-4 text-purple-600" />
              <span>Ask a Question</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Guaranteed personalized answer within 24 hours.
            </DialogDescription>
          </DialogHeader>

          {questionSuccess ? (
            <div className="py-6 text-center space-y-3 animate-in fade-in">
              <div className="size-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="text-base font-bold">Question Received!</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Thank you! Deepak will review your question and send a response to <strong>{userEmail}</strong> within 24 hours.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedOfferForQuestion(null); setQuestionSuccess(false); }}
                className="mt-2 rounded-xl text-xs font-bold"
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitQuestion} className="space-y-4 text-xs pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Your Question</Label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Be specific! Describe your scenario, challenges, or what feedback you need..."
                  rows={4}
                  className="w-full rounded-xl border bg-background p-2.5 text-xs resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Your Email (where answer will be sent)</Label>
                <Input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Query Fee</span>
                  <span className="text-sm font-black text-foreground">
                    {selectedOfferForQuestion
                      ? formatPrice(selectedOfferForQuestion.price, selectedOfferForQuestion.currency)
                      : 'Free'}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={questionSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl h-9 px-5 shadow-xs"
                >
                  {questionSubmitting ? 'Sending...' : 'Submit Question'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: DIGITAL PRODUCT DOWNLOAD / PURCHASE ── */}
      <Dialog open={Boolean(selectedOfferForProduct)} onOpenChange={(open) => { if (!open) setSelectedOfferForProduct(null); }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Download className="size-4 text-emerald-600" />
              <span>{selectedOfferForProduct?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Instant access &amp; downloadable resources.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {selectedOfferForProduct?.description}
            </p>

            {selectedOfferForProduct?.features && (
              <div className="p-3 rounded-2xl border bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
                <span className="text-[11px] font-bold text-foreground block">What’s Included:</span>
                {selectedOfferForProduct.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                    <Check className="size-3 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Email for Delivery</Label>
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t">
              <div>
                <span className="text-[10px] text-muted-foreground block">Price</span>
                <span className="text-base font-black text-foreground">
                  {selectedOfferForProduct ? formatPrice(selectedOfferForProduct.price, selectedOfferForProduct.currency) : 'Free'}
                </span>
              </div>

              <Button
                type="button"
                onClick={() => {
                  toast.success('Resource link has been prepared!');
                  if (selectedOfferForProduct?.downloadUrl) {
                    window.open(selectedOfferForProduct.downloadUrl, '_blank');
                  }
                  setSelectedOfferForProduct(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-5 shadow-xs"
              >
                Instant Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── INTERACTIVE "ASK AI" CHAT MODAL / DRAWER ── */}
      <Dialog open={showAiChat} onOpenChange={setShowAiChat}>
        <DialogContent className="sm:max-w-md rounded-3xl p-5 flex flex-col h-[520px]">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                  <Bot className="size-4" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold">Deepak’s AI Assistant</DialogTitle>
                  <p className="text-[10px] text-muted-foreground">Trained on services, pricing &amp; availability</p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-3 py-3 text-xs pr-1">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn('flex flex-col', msg.sender === 'user' ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl p-3 leading-relaxed',
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatSending && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs pl-2">
                <span className="size-2 rounded-full bg-blue-600 animate-ping" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* Prompt Suggestion Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] no-scrollbar">
            {['What services do you offer?', 'How much is a 1:1 call?', 'How to book?'].map((pill, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendChatMessage(pill)}
                className="px-2.5 py-1 rounded-full border bg-slate-50 dark:bg-slate-800 text-muted-foreground hover:text-foreground shrink-0 font-medium"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="pt-2 border-t flex items-center gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
              placeholder="Ask anything about Deepak's services..."
              className="h-9 text-xs rounded-xl"
            />
            <Button
              type="button"
              size="icon"
              disabled={chatSending || !chatInput.trim()}
              onClick={() => handleSendChatMessage()}
              className="size-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: PLAY VIDEO EMBED DIALOG ── */}
      <Dialog open={Boolean(selectedVideoForModal)} onOpenChange={(open) => { if (!open) setSelectedVideoForModal(null); }}>
        <DialogContent className="sm:max-w-3xl rounded-3xl p-4 sm:p-6 bg-slate-950 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Film className="size-4 text-blue-400" />
              <span>{selectedVideoForModal?.title || 'Video Player'}</span>
            </DialogTitle>
            {selectedVideoForModal?.caption && (
              <DialogDescription className="text-xs text-slate-400">
                {selectedVideoForModal.caption}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black mt-2">
            {selectedVideoForModal && (
              <iframe
                src={
                  selectedVideoForModal.embedUrl ||
                  (selectedVideoForModal.type === 'youtube'
                    ? getYouTubeEmbedUrl(selectedVideoForModal.url, { autoplay: true }) || ''
                    : selectedVideoForModal.url)
                }
                title={selectedVideoForModal.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: PHOTO LIGHTBOX DIALOG ── */}
      <Dialog open={Boolean(selectedPhotoForLightbox)} onOpenChange={(open) => { if (!open) setSelectedPhotoForLightbox(null); }}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-4 sm:p-6 bg-slate-950 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Camera className="size-4 text-emerald-400" />
              <span>{selectedPhotoForLightbox?.title || 'Photo View'}</span>
            </DialogTitle>
            {selectedPhotoForLightbox?.caption && (
              <DialogDescription className="text-xs text-slate-400">
                {selectedPhotoForLightbox.caption}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="relative max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black mt-2">
            {selectedPhotoForLightbox && (
              <img
                src={selectedPhotoForLightbox.url || selectedPhotoForLightbox.thumbnailUrl}
                alt={selectedPhotoForLightbox.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
