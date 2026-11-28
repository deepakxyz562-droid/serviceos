'use client';

import { MessageSquare as ChatBubbleIcon } from 'lucide-react';
import { BgosBusinessChatWidget } from '@/components/bgos/bgos-business-chat-widget';
import type { PublicBusinessChatbotMeta } from '@/lib/bgos-business-chatbot';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  ImageIcon,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Phone,
  Plus,
  QrCode,
  Send,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  UserPlus,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { normalizeWhatsAppDigits } from '@/lib/bgos-business-sanitizers';
import type {
  BgosPublicActivity,
  BgosPublicBusinessProfile,
  BgosPublicGalleryItem,
  BgosPublicService,
} from '@/lib/bgos-public-business';

interface BgosPublicBusinessPageProps {
  profile: BgosPublicBusinessProfile;
  chatbotMeta?: PublicBusinessChatbotMeta | null;
}

interface BookingSlotOption {
  startTime?: string;
  time?: string;
  label?: string;
  available?: boolean;
  startIso?: string;
}

function getSafeAccent(raw?: string | null): string {
  const value = String(raw || '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : '#059669';
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'B';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function toPlainParagraphs(text: string): string[] {
  const cleaned = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');
  return cleaned
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function formatReadableTime(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function getTodayIsoInTz(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function BgosPublicBusinessPage({ profile, chatbotMeta }: BgosPublicBusinessPageProps) {
  const accent = getSafeAccent(profile.accentColor);
  const shareUrl = profile.canonicalUrl;

  // Modals & drawers
  const [bookingOpen, setBookingOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<BgosPublicGalleryItem | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<BgosPublicActivity | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [showMapEmbed, setShowMapEmbed] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [logoError, setLogoError] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const showServices = profile.pageVisibility?.showServices !== false;
  const showProducts = profile.pageVisibility?.showProducts !== false;
  const showPhotos = profile.pageVisibility?.showPhotos !== false;
  const showReviews = profile.pageVisibility?.showReviews !== false;
  const showFaqs = profile.pageVisibility?.showFaqs !== false;
  const showInquiryForm = profile.pageVisibility?.showInquiryForm !== false;
  const showHours = profile.pageVisibility?.showHours !== false;
  const showChatbot = profile.pageVisibility?.showChatbot !== false;

  // Inline / quick inquiry state
  const [inqName, setInqName] = useState('');
  const [inqPhone, setInqPhone] = useState('');
  const [inqEmail, setInqEmail] = useState('');
  const [inqServiceId, setInqServiceId] = useState('');
  const [inqMessage, setInqMessage] = useState('');
  const [inqSubmitting, setInqSubmitting] = useState(false);
  const [inqSuccess, setInqSuccess] = useState<string | null>(null);
  const [inqError, setInqError] = useState<string | null>(null);

  // Appointment booking modal state
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    profile.services[0]?.id || '',
  );
  const [bookingDate, setBookingDate] = useState<string>(() =>
    getTodayIsoInTz(profile.timeZone),
  );
  const [slots, setSlots] = useState<BookingSlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [bookName, setBookName] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  // Multi-item storefront bag & checkout modal state
  const [bag, setBag] = useState<Record<string, number>>({});
  const [bagOpen, setBagOpen] = useState(false);
  const [orderFulfillment, setOrderFulfillment] = useState<'pickup' | 'delivery'>(
    profile.storeSettings?.deliveryEnabled && !profile.storeSettings?.pickupEnabled
      ? 'delivery'
      : 'pickup',
  );
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    message: string;
    orderNumber?: string | null;
    whatsappUrl?: string | null;
  } | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const bagItems = useMemo(() => {
    const items: Array<{
      product: (typeof profile.products)[number];
      quantity: number;
      lineTotal: number | null;
    }> = [];
    for (const prod of profile.products || []) {
      const qty = bag[prod.id] || 0;
      if (qty <= 0) continue;
      const lineTotal = prod.price && prod.price > 0 ? Math.round(prod.price * qty * 100) / 100 : null;
      items.push({ product: prod, quantity: qty, lineTotal });
    }
    return items;
  }, [bag, profile.products]);

  const bagCount = useMemo(
    () => bagItems.reduce((sum, item) => sum + item.quantity, 0),
    [bagItems],
  );

  const bagSubtotal = useMemo(
    () => bagItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0),
    [bagItems],
  );

  const bagHasUnpricedItems = useMemo(
    () => bagItems.some((item) => item.product.price === null || item.product.price <= 0),
    [bagItems],
  );

  const adjustBagQty = useCallback((productId: string, delta: number) => {
    setBag((prev) => {
      const nextQty = Math.max(0, Math.min(99, (prev[productId] || 0) + delta));
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[productId];
      } else {
        next[productId] = nextQty;
      }
      return next;
    });
  }, []);

  const openBagForProduct = useCallback(
    (prod: (typeof profile.products)[number]) => {
      setBag((prev) => {
        if ((prev[prod.id] || 0) > 0) return prev;
        return { ...prev, [prod.id]: 1 };
      });
      setOrderSuccess(null);
      setOrderError(null);
      setBagOpen(true);
    },
    [],
  );

  const todayWeekday = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        timeZone: profile.timeZone,
      }).format(new Date());
    } catch {
      return '';
    }
  }, [profile.timeZone]);

  const descriptionParagraphs = useMemo(
    () => toPlainParagraphs(profile.description),
    [profile.description],
  );

  const locationLabel = useMemo(() => {
    return [profile.city, profile.state].filter(Boolean).join(', ');
  }, [profile.city, profile.state]);

  const whatsappDirectUrl = useMemo(() => {
    if (!profile.whatsappDigits) return null;
    const text = `Hi ${profile.businessName}, I found your business page and would like to inquire.`;
    return `https://wa.me/${profile.whatsappDigits}?text=${encodeURIComponent(text)}`;
  }, [profile.whatsappDigits, profile.businessName]);

  const whatsappShareUrl = useMemo(() => {
    const shareText = `${profile.businessName}${locationLabel ? ` (${locationLabel})` : ''} — View services, hours, directions & book online:\n${shareUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  }, [profile.businessName, locationLabel, shareUrl]);

  const vcardUrl = useMemo(
    () => `/api/public/business/${encodeURIComponent(profile.slug)}/vcard`,
    [profile.slug],
  );

  const mapEmbedUrl = useMemo(() => {
    if (profile.latitude !== null && profile.longitude !== null) {
      return `https://maps.google.com/maps?q=${profile.latitude},${profile.longitude}&z=15&output=embed`;
    }
    const q = [profile.businessName, profile.address, profile.city, profile.state]
      .filter(Boolean)
      .join(', ');
    return q ? `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed` : null;
  }, [profile.latitude, profile.longitude, profile.businessName, profile.address, profile.city, profile.state]);

  const activeSocialEntries = useMemo(
    () =>
      Object.entries(profile.socialLinks || {}).filter(
        ([, url]) => typeof url === 'string' && /^https?:\/\//i.test(url),
      ),
    [profile.socialLinks],
  );

  // Suppress PWA install prompts / mini-infobars on merchant landing pages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Load QR code whenever share sheet is opened
  useEffect(() => {
    if (!shareOpen || qrDataUrl) return;
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [shareOpen, qrDataUrl, shareUrl]);

  // Fetch available appointment slots when booking drawer is open
  useEffect(() => {
    if (!bookingOpen || !bookingDate || !profile.tenantId) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot('');
    const qs = new URLSearchParams({
      tenantId: profile.tenantId,
      date: bookingDate,
      timezone: profile.timeZone,
    });
    if (selectedServiceId && !selectedServiceId.startsWith('seo-')) {
      qs.set('serviceId', selectedServiceId);
    }

    fetch(`/api/availability/slots?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: BookingSlotOption[] = Array.isArray(data?.slots)
          ? data.slots.filter((s: BookingSlotOption) => s.available !== false)
          : [];
        setSlots(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedSlot(first.startTime || first.time || first.label || '');
        }
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingOpen, bookingDate, selectedServiceId, profile.tenantId, profile.timeZone]);

  const handleCopyShareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback ignored
    }
  }, [shareUrl]);

  const handleTriggerShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: profile.businessName,
          text:
            profile.tagline ||
            `Connect with ${profile.businessName}${locationLabel ? ` in ${locationLabel}` : ''}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    setShareOpen(true);
  }, [profile.businessName, profile.tagline, locationLabel, shareUrl]);

  const handleDownloadQr = useCallback(() => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${profile.slug}-qr.png`;
    link.click();
  }, [qrDataUrl, profile.slug]);

  const cleanWaDigits = useMemo(() => {
    if (profile.whatsappDigits) return profile.whatsappDigits;
    const raw = profile.whatsappPhone || profile.phone || '';
    return normalizeWhatsAppDigits(raw, profile.country) || '';
  }, [profile.whatsappDigits, profile.whatsappPhone, profile.phone, profile.country]);

  const scrollToInquiry = useCallback((message?: string) => {
    if (message) {
      setInqMessage(message);
    }
    const el = document.getElementById('bgos-inquiry-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const textarea = el.querySelector('textarea') || el.querySelector('input');
      if (textarea) textarea.focus();
    }
  }, []);

  const scrollToProducts = useCallback(() => {
    const el = document.getElementById('products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const isExternalValidUrl = useCallback(
    (url: string | null | undefined): boolean => {
      if (!url || typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (!/^https?:\/\//i.test(trimmed)) return false;
      try {
        const parsed = new URL(trimmed);
        const host = parsed.hostname.toLowerCase();
        if (host.includes('fieseros.com') && (parsed.pathname === '/' || parsed.pathname === '')) return false;
        if (host.includes('bgos.site') && (parsed.pathname === '/' || parsed.pathname === `/${profile.slug}`)) return false;
        return true;
      } catch {
        return false;
      }
    },
    [profile.slug],
  );

  const openActionForService = useCallback(
    (svc: BgosPublicService) => {
      if (profile.bookingEnabled) {
        setSelectedServiceId(svc.id);
        setBookSuccess(null);
        setBookError(null);
        setBookingOpen(true);
      } else {
        setInqServiceId(svc.id);
        scrollToInquiry(`Hi, I would like a quote for ${svc.name}.`);
      }
    },
    [profile.bookingEnabled, scrollToInquiry],
  );

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInqError(null);
    setInqSuccess(null);
    setInqSubmitting(true);
    try {
      const matchedSvc = profile.services.find((s) => s.id === inqServiceId);
      const res = await fetch(
        `/api/public/business/${encodeURIComponent(profile.slug)}/inquiry`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: inqName.trim(),
            phone: inqPhone.trim(),
            email: inqEmail.trim() || undefined,
            serviceId:
              matchedSvc && !matchedSvc.id.startsWith('seo-') ? matchedSvc.id : undefined,
            serviceName: matchedSvc?.name || undefined,
            message: inqMessage.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setInqError(data?.error || 'Could not send request. Please try again.');
        return;
      }
      setInqSuccess(data.message || 'Thank you! We received your request.');
      setInqName('');
      setInqPhone('');
      setInqEmail('');
      setInqMessage('');
    } catch {
      setInqError('Network error while sending request. Please try again.');
    } finally {
      setInqSubmitting(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookError(null);
    setBookSuccess(null);

    const matchedSvc = profile.services.find((s) => s.id === selectedServiceId);

    // If no slots were configured on the owner calendar, route seamlessly as a callback inquiry
    if (slots.length === 0 && !selectedSlot) {
      setBookSubmitting(true);
      try {
        const res = await fetch(
          `/api/public/business/${encodeURIComponent(profile.slug)}/inquiry`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: bookName.trim(),
              phone: bookPhone.trim(),
              email: bookEmail.trim() || undefined,
              serviceId:
                matchedSvc && !matchedSvc.id.startsWith('seo-') ? matchedSvc.id : undefined,
              serviceName: matchedSvc?.name || undefined,
              message: [
                `Requested date: ${bookingDate}`,
                bookNotes.trim() || null,
              ]
                .filter(Boolean)
                .join('\n'),
            }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setBookError(data?.error || 'Unable to submit booking request.');
          return;
        }
        setBookSuccess(
          data.message || 'Booking request received! The business will confirm your time shortly.',
        );
      } catch {
        setBookError('Network error while confirming request.');
      } finally {
        setBookSubmitting(false);
      }
      return;
    }

    const effectiveEmail =
      bookEmail.trim() || `${bookPhone.replace(/[^0-9]/g, '') || 'guest'}@guest.bgos.local`;

    setBookSubmitting(true);
    try {
      const res = await fetch('/api/public/scheduling/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: profile.tenantId,
          tenantSlug: profile.slug,
          date: bookingDate,
          time: selectedSlot || '10:00',
          timezone: profile.timeZone,
          serviceName: matchedSvc?.name || 'Appointment',
          price: matchedSvc?.price ?? 0,
          currency: profile.currency,
          customer: {
            name: bookName.trim(),
            phone: bookPhone.trim(),
            email: effectiveEmail,
            notes: bookNotes.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBookError(data?.error || 'Unable to complete booking. Try another slot.');
        return;
      }
      setBookSuccess(
        `Appointment confirmed for ${bookingDate} at ${selectedSlot || 'scheduled time'}!`,
      );
    } catch {
      setBookError('Network error while scheduling appointment.');
    } finally {
      setBookSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 sm:pb-12">
      {/* Clean White-Label Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {profile.logoUrl && !logoError ? (
              <img
                src={profile.logoUrl}
                alt={profile.businessName}
                onError={() => setLogoError(true)}
                className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-0.5"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: accent }}
              >
                {getInitials(profile.businessName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {profile.businessName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {locationLabel || profile.category}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={vcardUrl}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Save Contact
            </a>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Open QR code and share options"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">QR</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerShare}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6">
        {/* Hero Card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          {/* Cover / Brand Banner */}
          <div
            className="relative h-32 w-full sm:h-44"
            style={{
              background:
                profile.coverImage && !coverError
                  ? undefined
                  : `linear-gradient(135deg, ${accent}22 0%, ${accent}44 50%, #0f172a18 100%)`,
            }}
          >
            {profile.coverImage && !coverError && (
              <img
                src={profile.coverImage}
                alt={`${profile.businessName} cover`}
                onError={() => setCoverError(true)}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>

          <div className="px-4 pb-6 pt-0 sm:px-8 sm:pb-7">
            <div className="relative -mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
                {profile.logoUrl && !logoError ? (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:h-24 sm:w-24">
                    <img
                      src={profile.logoUrl}
                      alt={`${profile.businessName} logo`}
                      onError={() => setLogoError(true)}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </div>
                ) : (
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white text-2xl font-bold text-white shadow-md sm:h-24 sm:w-24 sm:text-3xl"
                    style={{ backgroundColor: accent }}
                  >
                    {getInitials(profile.businessName)}
                  </div>
                )}

                <div className="pt-1 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      {profile.businessName}
                    </h1>
                    {profile.isGoogleVerified && (
                      <span
                        title="Google Verified Business"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Google Verified
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 sm:text-sm">
                    <span className="font-medium text-slate-700">{profile.category}</span>

                    {locationLabel && (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {locationLabel}
                      </span>
                    )}

                    {profile.openNow !== null && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          profile.openNow
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            profile.openNow ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {profile.openNow ? 'Open Now' : 'Closed Now'}
                      </span>
                    )}
                  </div>

                  {profile.rating > 0 && profile.reviewCount > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        <span>{profile.rating.toFixed(1)}</span>
                        <span className="font-normal text-amber-700">
                          ({profile.reviewCount} Google {profile.reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                      {profile.reviewUrl && (
                        <a
                          href={profile.reviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                        >
                          Write a review
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop / Tablet Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
                {showChatbot && (
                  <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50"
                  >
                    <ChatBubbleIcon className="h-4 w-4" style={{ color: accent }} />
                    <span>Ask AI · Chat</span>
                  </button>
                )}
                {profile.bookingEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setBookSuccess(null);
                      setBookError(null);
                      setBookingOpen(true);
                    }}
                    className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
                    style={{ backgroundColor: accent }}
                  >
                    <Calendar className="h-4 w-4" />
                    Book Appointment
                  </button>
                )}

                {whatsappDirectUrl ? (
                  <a
                    href={whatsappDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollToInquiry()}
                    className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Request Callback
                  </button>
                )}
              </div>
            </div>

            {profile.tagline && (
              <p className="mt-4 text-sm font-medium text-slate-700 sm:text-base">
                {profile.tagline}
              </p>
            )}

            {/* Quick Tap Action Chips */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-600" />
                  Call {profile.phone}
                </a>
              )}

              {profile.mapsUrl && (
                <a
                  href={profile.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5 text-slate-600" />
                  Directions
                </a>
              )}

              <a
                href={vcardUrl}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5 text-slate-600" />
                Save Contact
              </a>

              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5 text-emerald-700" />
                Share on WhatsApp
              </a>

              {profile.reviewUrl && (
                <a
                  href={profile.reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  <Star className="h-3.5 w-3.5 text-amber-600" />
                  Review Us
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Main 2-Column Layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Primary Column */}
          <div className="space-y-6 lg:col-span-7">
            {/* About Section */}
            {descriptionParagraphs.length > 0 && (
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  About {profile.businessName}
                </h2>
                <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
                  {descriptionParagraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
                {profile.additionalCategories.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {profile.additionalCategories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Products, Pickup & Delivery Storefront Section */}
            {showProducts && (profile.products?.length > 0 || profile.storeSettings?.foodOrderingEnabled || profile.storeSettings?.deliveryEnabled) && (
              <section id="products" className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-slate-500" />
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                      {profile.storeSettings?.foodOrderingEnabled ? 'Menu & Products' : 'Products'}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {profile.storeSettings?.pickupEnabled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                        Pickup
                      </span>
                    )}
                    {profile.storeSettings?.deliveryEnabled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200/70">
                        <Truck className="h-3 w-3" />
                        Delivery
                      </span>
                    )}
                    {profile.storeSettings?.foodOrderingEnabled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
                        Food Ordering
                      </span>
                    )}
                    {bagCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderSuccess(null);
                          setOrderError(null);
                          setBagOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                        style={{ backgroundColor: accent }}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Bag ({bagCount})
                      </button>
                    )}
                  </div>
                </div>

                {profile.products?.length > 0 ? (
                  <>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {profile.products.map((prod) => {
                        const qtyInBag = bag[prod.id] || 0;
                        return (
                          <div
                            key={prod.id}
                            className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                              qtyInBag > 0
                                ? 'border-emerald-300 bg-emerald-50/35'
                                : 'border-slate-200/80 bg-slate-50/40'
                            }`}
                          >
                            <div className="flex gap-3">
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
                                />
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    {prod.category}
                                  </span>
                                  {prod.inStock === false && (
                                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                      Out of stock
                                    </span>
                                  )}
                                </div>
                                <h3 className="truncate text-sm font-semibold text-slate-900">
                                  {prod.name}
                                </h3>
                                {prod.description ? (
                                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                    {prod.description}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2.5">
                              <span className="text-sm font-bold text-slate-900">
                                {prod.price && prod.price > 0
                                  ? formatCurrency(prod.price, profile.currency, { compact: true })
                                  : 'Price on inquiry'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {cleanWaDigits && (
                                  <a
                                    href={`https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
                                      `Hi ${profile.businessName}, I would like to order "${prod.name}"${prod.price ? ` (${formatCurrency(prod.price, profile.currency)})` : ''}. Please confirm availability and delivery.`,
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                    title="Order via WhatsApp"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">WhatsApp</span>
                                  </a>
                                )}
                                {prod.inStock === false ? null : qtyInBag > 0 ? (
                                  <div className="inline-flex items-center rounded-lg border border-emerald-300 bg-white">
                                    <button
                                      type="button"
                                      onClick={() => adjustBagQty(prod.id, -1)}
                                      className="px-2 py-1 text-slate-700 hover:bg-slate-50"
                                      aria-label={`Remove one ${prod.name}`}
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="min-w-[24px] text-center text-xs font-bold text-slate-900">
                                      {qtyInBag}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => adjustBagQty(prod.id, 1)}
                                      className="px-2 py-1 text-slate-700 hover:bg-slate-50"
                                      aria-label={`Add one ${prod.name}`}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => adjustBagQty(prod.id, 1)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Add
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openBagForProduct(prod)}
                                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                                      style={{ backgroundColor: accent }}
                                    >
                                      Order
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {bagCount > 0 && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                            Your Order Bag ({bagCount} {bagCount === 1 ? 'item' : 'items'})
                          </p>
                          <p className="text-sm font-extrabold text-slate-900">
                            {bagSubtotal > 0
                              ? `${formatCurrency(bagSubtotal, profile.currency, { compact: true })}${bagHasUnpricedItems ? ' + quote items' : ''}`
                              : 'Quote on request'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {cleanWaDigits && (
                            <a
                              href={`https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
                                `Hi ${profile.businessName}, I would like to order:\n${bagItems
                                  .map(
                                    (item) =>
                                      `• ${item.quantity}x ${item.product.name}${
                                        item.lineTotal
                                          ? ` (${formatCurrency(item.lineTotal, profile.currency)})`
                                          : ''
                                      }`,
                                  )
                                  .join('\n')}${
                                  bagSubtotal > 0
                                    ? `\nTotal: ${formatCurrency(bagSubtotal, profile.currency)}`
                                    : ''
                                }`,
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp Bag
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setOrderSuccess(null);
                              setOrderError(null);
                              setBagOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95"
                            style={{ backgroundColor: accent }}
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Review &amp; Place Order
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3">
                    <p className="text-xs text-slate-600">
                      Available for{' '}
                      {[
                        profile.storeSettings?.pickupEnabled ? 'store pickup' : null,
                        profile.storeSettings?.deliveryEnabled ? 'local delivery' : null,
                        profile.storeSettings?.foodOrderingEnabled ? 'food ordering' : null,
                      ]
                        .filter(Boolean)
                        .join(' & ')}
                      . Send your order request below or message us directly.
                    </p>
                    {profile.storeSettings?.orderActionUrl ? (
                      <a
                        href={profile.storeSettings.orderActionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: accent }}
                      >
                        Order Online
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                )}
              </section>
            )}

            {/* Real Services Section */}
            {showServices && profile.services.length > 0 && (
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    Services
                  </h2>
                  <span className="text-xs font-medium text-slate-500">
                    {profile.services.length} available
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {profile.services.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {svc.name}
                          </h3>
                          {svc.duration ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {svc.duration} min
                            </span>
                          ) : null}
                        </div>
                        {svc.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                            {svc.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                        <span className="text-sm font-bold text-slate-900">
                          {svc.isInquiryOnly || !svc.price || svc.price <= 0
                            ? 'Request Quote'
                            : formatCurrency(svc.price, profile.currency, {
                                compact: true,
                              })}
                        </span>
                        <button
                          type="button"
                          onClick={() => openActionForService(svc)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: accent }}
                        >
                          {profile.bookingEnabled ? 'Book' : 'Inquire'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activities, Events & Special Offers */}
            {profile.activities && profile.activities.length > 0 && (
              <section id="activities" className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                      Activities, Events &amp; Offers
                    </h2>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {profile.activities.length} active
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {profile.activities.map((act) => {
                    const typeBadge =
                      act.type === 'offer'
                        ? { label: 'Special Offer', cls: 'bg-amber-50 text-amber-800 ring-amber-200/80' }
                        : act.type === 'event'
                          ? { label: 'Event', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200/80' }
                          : { label: 'Update', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80' };
                    const isOffer = act.type === 'offer' || act.actionType === 'ORDER';
                    const hasValidExternalUrl = isExternalValidUrl(act.actionUrl);
                    const ctaLabel =
                      act.actionType === 'BOOK'
                        ? 'Book Now'
                        : act.actionType === 'ORDER'
                          ? 'Order Now'
                          : act.actionType === 'CALL'
                            ? 'Call Now'
                            : act.type === 'offer'
                              ? 'Claim Offer'
                              : 'Learn More';

                    return (
                      <div
                        key={act.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition-shadow hover:shadow-xs"
                      >
                        <div
                          className="space-y-2 cursor-pointer transition-opacity hover:opacity-95"
                          onClick={() => setSelectedActivity(act)}
                        >
                          {act.imageUrl ? (
                            <img
                              src={act.imageUrl}
                              alt={act.title}
                              className="h-32 w-full rounded-lg border border-slate-200 bg-white object-cover"
                            />
                          ) : null}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ${typeBadge.cls}`}
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {typeBadge.label}
                            </span>
                            {(act.startDate || act.endDate) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                <Calendar className="h-2.5 w-2.5 text-slate-400" />
                                {act.startDate || 'Now'}
                                {act.endDate && act.endDate !== act.startDate ? ` → ${act.endDate}` : ''}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-emerald-700 transition-colors">
                            {act.title}
                          </h3>
                          {act.summary ? (
                            <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">
                              {act.summary}
                            </p>
                          ) : null}
                          {act.couponCode ? (
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50/80 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                              <span>Code:</span>
                              <span className="font-mono tracking-wide">{act.couponCode}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="pt-1 flex flex-col gap-1.5">
                          {act.actionType === 'CALL' && profile.phone ? (
                            <a
                              href={`tel:${profile.phone}`}
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: accent }}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {ctaLabel}
                            </a>
                          ) : act.actionType === 'BOOK' && profile.bookingEnabled ? (
                            <button
                              type="button"
                              onClick={() => {
                                setBookSuccess(null);
                                setBookError(null);
                                setBookingOpen(true);
                              }}
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: accent }}
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              {ctaLabel}
                            </button>
                          ) : hasValidExternalUrl ? (
                            <a
                              href={act.actionUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: accent }}
                            >
                              {ctaLabel}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : isOffer ? (
                            <div className="flex gap-1.5">
                              {cleanWaDigits ? (
                                <a
                                  href={`https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
                                    `Hi ${profile.businessName}, I want to claim the offer: "${act.title}"${act.couponCode ? ` (Coupon: ${act.couponCode})` : ''}. Please share details and pricing.`,
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span>{ctaLabel}</span>
                                </a>
                              ) : profile.products?.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => scrollToProducts()}
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                                  style={{ backgroundColor: accent }}
                                >
                                  <ShoppingBag className="h-3.5 w-3.5" />
                                  <span>{ctaLabel}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedActivity(act)}
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                                  style={{ backgroundColor: accent }}
                                >
                                  {ctaLabel}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedActivity(act)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                title="View details"
                              >
                                Details
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedActivity(act)}
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: accent }}
                            >
                              {ctaLabel}
                            </button>
                          )}

                          {act.searchUrl && (
                            <a
                              href={act.searchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors pt-0.5"
                            >
                              <Globe className="h-3 w-3 text-blue-500" />
                              <span>View on Google</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Photos & Google Business Media */}
            {showPhotos && profile.gallery.length > 0 && (
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                    <ImageIcon className="h-4 w-4 text-slate-500" />
                    Photos
                  </h2>
                  <span className="text-xs text-slate-500">
                    {profile.gallery.length} photos
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {profile.gallery.slice(0, 9).map((item, idx) => (
                    <button
                      key={`${item.url}-${idx}`}
                      type="button"
                      onClick={() => setLightboxItem(item)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <img
                        src={item.url}
                        alt={item.caption || `${profile.businessName} photo ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Verified Customer & Google Reviews */}
            {showReviews && (profile.reviews.length > 0 || profile.reviewUrl) && (
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                      Customer Reviews
                    </h2>
                    {profile.rating > 0 && profile.reviewCount > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Rated {profile.rating.toFixed(1)} out of 5 based on{' '}
                        {profile.reviewCount} reviews
                      </p>
                    )}
                  </div>
                  {profile.reviewUrl && (
                    <a
                      href={profile.reviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                    >
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      Leave a Google Review
                    </a>
                  )}
                </div>

                {profile.reviews.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {profile.reviews.map((rev) => (
                      <article
                        key={rev.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {rev.authorName}
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < Math.round(rev.rating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {rev.comment && (
                          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {rev.comment}
                          </p>
                        )}
                        {rev.replyText && (
                          <div className="mt-2.5 rounded-lg border-l-2 border-emerald-500 bg-white p-2.5 text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">
                              Owner reply:
                            </span>{' '}
                            {rev.replyText}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    Share your experience with {profile.businessName} on Google.
                  </p>
                )}
              </section>
            )}

            {/* Business FAQs (Only Real Owner FAQs) */}
            {showFaqs && profile.faqs.length > 0 && (
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Frequently Asked Questions
                </h2>
                <div className="mt-3 divide-y divide-slate-100">
                  {profile.faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className="py-3 first:pt-1 last:pb-0">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-900"
                        >
                          <span>{faq.question}</span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {toPlainParagraphs(faq.answer).join(' ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar: Quick Inquiry + Hours + Map + Share */}
          <aside className="space-y-6 lg:col-span-5">
            {/* Instant Lead / Callback Form */}
            {showInquiryForm && (
              <section
                id="bgos-inquiry-section"
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
              >
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Request a Callback or Quote
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Send a message directly to {profile.businessName}. No account required.
              </p>

              {inqSuccess ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-semibold">Request Sent</p>
                      <p className="mt-1 text-xs text-emerald-800">{inqSuccess}</p>
                      <button
                        type="button"
                        onClick={() => setInqSuccess(null)}
                        className="mt-3 text-xs font-semibold text-emerald-700 underline"
                      >
                        Send another inquiry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="mt-4 space-y-3">
                  {inqError && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{inqError}</span>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inqName}
                      onChange={(e) => setInqName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={inqPhone}
                      onChange={(e) => setInqPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={inqEmail}
                      onChange={(e) => setInqEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  {profile.services.length > 0 && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Service Needed
                      </label>
                      <select
                        value={inqServiceId}
                        onChange={(e) => setInqServiceId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                      >
                        <option value="">General Inquiry</option>
                        {profile.services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      How can we help?
                    </label>
                    <textarea
                      rows={3}
                      value={inqMessage}
                      onChange={(e) => setInqMessage(e.target.value)}
                      placeholder="Share details or preferred callback time..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={inqSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
                    style={{ backgroundColor: accent }}
                  >
                    {inqSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Inquiry
                      </>
                    )}
                  </button>
                </form>
              )}
              </section>
            )}

            {/* Business Contact Info, Location & Map */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Location & Contact
              </h2>

              <div className="mt-3.5 space-y-3 text-sm">
                {profile.address && (
                  <div className="flex items-start gap-2.5 text-slate-700">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="leading-snug">{profile.address}</p>
                      {locationLabel && (
                        <p className="text-xs text-slate-500">{locationLabel}</p>
                      )}
                    </div>
                  </div>
                )}

                {profile.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <a
                      href={`tel:${profile.phone}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {profile.phone}
                    </a>
                  </div>
                )}

                {profile.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                    <a
                      href={`mailto:${profile.email}`}
                      className="truncate text-slate-700 hover:underline"
                    >
                      {profile.email}
                    </a>
                  </div>
                )}

                {profile.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 truncate text-slate-700 hover:underline"
                    >
                      <span className="truncate">
                        {profile.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                    </a>
                  </div>
                )}
              </div>

              {/* Service Areas (Sanitized) */}
              {profile.serviceAreas.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Areas Served
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.serviceAreas.map((area) => (
                      <span
                        key={area}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {activeSocialEntries.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Connect Online
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeSocialEntries.map(([network, url]) => (
                      <a
                        key={network}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium capitalize text-slate-700 hover:bg-slate-50"
                      >
                        {network}
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* On-demand Google Map */}
              {mapEmbedUrl && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {showMapEmbed ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <iframe
                        title={`${profile.businessName} Map`}
                        src={mapEmbedUrl}
                        className="h-52 w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          Map & Directions
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {profile.address || locationLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMapEmbed(true)}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        View Map
                      </button>
                    </div>
                  )}

                  {profile.mapsUrl && (
                    <a
                      href={profile.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Open in Google Maps
                    </a>
                  )}
                </div>
              )}
            </section>

            {/* Business Hours */}
            {showHours && profile.hours.length > 0 && (
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                  <Clock className="h-4 w-4 text-slate-500" />
                  Business Hours
                </h2>
                <dl className="mt-3 divide-y divide-slate-100 text-xs sm:text-sm">
                  {profile.hours.map((row) => {
                    const isToday = row.day.toLowerCase() === todayWeekday.toLowerCase();
                    return (
                      <div
                        key={row.day}
                        className={`flex items-center justify-between py-2 ${
                          isToday ? 'font-semibold text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        <dt className="flex items-center gap-1.5">
                          <span>{row.day}</span>
                          {isToday && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                              style={{ backgroundColor: accent }}
                            >
                              Today
                            </span>
                          )}
                        </dt>
                        <dd>
                          {row.open
                            ? `${formatReadableTime(row.openTime)} – ${formatReadableTime(
                                row.closeTime,
                              )}`
                            : 'Closed'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            )}

            {/* Quick Share Card */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-bold text-slate-900">
                Share This Business Card
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Send to friends or customers on WhatsApp, SMS, or scan QR code.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleCopyShareUrl}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR
                </button>
              </div>
            </section>
          </aside>
        </div>

        {/* Minimal White-Label Footer */}
        <footer className="mt-10 border-t border-slate-200/80 pt-6 text-center text-xs text-slate-500">
          <p className="font-medium text-slate-700">{profile.businessName}</p>
          {profile.address && <p className="mt-1">{profile.address}</p>}
        </footer>
      </main>

      {/* Sticky Mobile Bottom Dock */}
      {showChatbot && (
        <BgosBusinessChatWidget
          profile={profile}
          initialMeta={chatbotMeta}
          externalOpen={chatOpen}
          onExternalOpenChange={setChatOpen}
          onRequestBook={() => {
            setBookSuccess(null);
            setBookError(null);
            setBookingOpen(true);
          }}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {profile.phone && (
            <a
              href={`tel:${profile.phone}`}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-800"
            >
              <Phone className="h-4 w-4 text-slate-700" />
              Call
            </a>
          )}

          {whatsappDirectUrl && (
            <a
              href={whatsappDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-emerald-600 py-1.5 text-[11px] font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}

          {profile.bookingEnabled ? (
            <button
              type="button"
              onClick={() => {
                setBookSuccess(null);
                setBookError(null);
                setBookingOpen(true);
              }}
              className="flex flex-[1.3] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              <Calendar className="h-4 w-4" />
              Book Now
            </button>
          ) : (
            <button
              type="button"
              onClick={() => scrollToInquiry()}
              className="flex flex-[1.3] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              <Send className="h-4 w-4" />
              Inquire
            </button>
          )}

          <button
            type="button"
            onClick={handleTriggerShare}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-800"
          >
            <Share2 className="h-4 w-4 text-slate-700" />
            Share
          </button>
        </div>
      </div>

      {/* Activity / Post Details Modal */}
      {selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${
                    selectedActivity.type === 'offer'
                      ? 'bg-amber-50 text-amber-800 ring-amber-200/80'
                      : selectedActivity.type === 'event'
                        ? 'bg-indigo-50 text-indigo-700 ring-indigo-200/80'
                        : 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {selectedActivity.type === 'offer'
                    ? 'Special Offer'
                    : selectedActivity.type === 'event'
                      ? 'Event'
                      : 'Business Update'}
                </span>
                {(selectedActivity.startDate || selectedActivity.endDate) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {selectedActivity.startDate || 'Now'}
                    {selectedActivity.endDate && selectedActivity.endDate !== selectedActivity.startDate
                      ? ` → ${selectedActivity.endDate}`
                      : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedActivity.imageUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={selectedActivity.imageUrl}
                  alt={selectedActivity.title}
                  className="max-h-64 w-full object-cover"
                />
              </div>
            )}

            <div className="mt-4 space-y-3">
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {selectedActivity.title}
              </h3>

              {selectedActivity.couponCode && (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-amber-300 bg-amber-50/90 p-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                      Promo / Coupon Code
                    </p>
                    <p className="font-mono text-base font-bold text-amber-950">
                      {selectedActivity.couponCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedActivity.couponCode) {
                        navigator.clipboard.writeText(selectedActivity.couponCode);
                        setCopiedCoupon(selectedActivity.couponCode);
                        setTimeout(() => setCopiedCoupon(null), 2500);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-200/80 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-300/80 transition-colors"
                  >
                    {copiedCoupon === selectedActivity.couponCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-700" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              )}

              {selectedActivity.summary && (
                <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line pt-1">
                  {selectedActivity.summary}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                {cleanWaDigits && (
                  <a
                    href={`https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
                      selectedActivity.type === 'offer' || selectedActivity.actionType === 'ORDER'
                        ? `Hi ${profile.businessName}, I would like to claim the offer: "${selectedActivity.title}"${selectedActivity.couponCode ? ` (Coupon: ${selectedActivity.couponCode})` : ''}. Please share details and pricing.`
                        : `Hi ${profile.businessName}, I would like to learn more about: "${selectedActivity.title}".`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {selectedActivity.type === 'offer' || selectedActivity.actionType === 'ORDER'
                      ? 'Order / Claim via WhatsApp'
                      : 'Chat on WhatsApp'}
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const title = selectedActivity.title;
                    setSelectedActivity(null);
                    scrollToInquiry(`Hi, I would like more information regarding: "${title}".`);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Inquire Online
                </button>
              </div>

              {(selectedActivity.searchUrl || profile.mapsUrl || profile.googlePlaceId) && (
                <a
                  href={
                    selectedActivity.searchUrl ||
                    profile.mapsUrl ||
                    `https://www.google.com/maps/place/?q=place_id:${profile.googlePlaceId}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  <span>View Post on Google Maps &amp; Search</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {bookingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Book Appointment
                </h3>
                <p className="text-xs text-slate-500">{profile.businessName}</p>
              </div>
              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close booking dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookSuccess ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="mt-3 text-base font-bold text-emerald-950">
                  You&apos;re Scheduled!
                </p>
                <p className="mt-1 text-xs text-emerald-800">{bookSuccess}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingOpen(false)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="mt-4 space-y-3.5">
                {bookError && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{bookError}</span>
                  </div>
                )}

                {profile.services.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Select Service
                    </label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    >
                      {profile.services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.price && s.price > 0
                            ? ` — ${formatCurrency(s.price, profile.currency, {
                                compact: true,
                              })}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={getTodayIsoInTz(profile.timeZone)}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Available Time Slots ({profile.timeZone})
                  </label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking available times...
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.slice(0, 12).map((slot, i) => {
                        const slotVal = slot.startTime || slot.time || slot.label || '';
                        const active = selectedSlot === slotVal;
                        return (
                          <button
                            key={`${slotVal}-${i}`}
                            type="button"
                            onClick={() => setSelectedSlot(slotVal)}
                            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                              active
                                ? 'border-transparent text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                            style={active ? { backgroundColor: accent } : undefined}
                          >
                            {slot.label || formatReadableTime(slotVal)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Instant calendar slots are full or flexible for this date — submit
                      below to request your preferred callback time.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={bookPhone}
                      onChange={(e) => setBookPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Email (optional — for calendar invite)
                  </label>
                  <input
                    type="email"
                    value={bookEmail}
                    onChange={(e) => setBookEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    placeholder="Anything we should know before your visit?"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {bookSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : slots.length > 0 ? (
                    'Confirm Appointment'
                  ) : (
                    'Request Appointment Callback'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 1-Tap Share + QR Code Modal */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Share {profile.businessName}
                </h3>
                <p className="text-xs text-slate-500">
                  Scan QR code or share 1-tap via WhatsApp
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close share dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${profile.businessName}`}
                  className="h-48 w-48 rounded-xl bg-white p-2 shadow-sm"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-white">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}
              <p className="mt-2.5 max-w-full truncate text-[11px] font-medium text-slate-500">
                {shareUrl}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Share on WhatsApp
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyShareUrl}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied Link
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!qrDataUrl}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Item Product Order Bag Modal */}
      {bagOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {orderSuccess ? 'Order Confirmation' : `Your Order Bag (${bagCount})`}
                </h3>
                <p className="text-xs text-slate-500">
                  {orderSuccess
                    ? profile.businessName
                    : bagSubtotal > 0
                      ? `Total: ${formatCurrency(bagSubtotal, profile.currency, { compact: true })}${bagHasUnpricedItems ? ' + quote items' : ''}`
                      : profile.businessName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBagOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close order dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="mt-3 text-base font-bold text-emerald-950">
                  {orderSuccess.orderNumber
                    ? `Order ${orderSuccess.orderNumber} Sent!`
                    : 'Order Request Sent!'}
                </p>
                <p className="mt-1 text-xs text-emerald-800">{orderSuccess.message}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {orderSuccess.whatsappUrl ? (
                    <a
                      href={orderSuccess.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Send Copy on WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setBagOpen(false)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : bagItems.length === 0 ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm font-semibold text-slate-800">Your order bag is empty</p>
                <p className="mt-1 text-xs text-slate-500">Add one or more items from the catalog to place an order.</p>
                <button
                  type="button"
                  onClick={() => setBagOpen(false)}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setOrderError(null);
                  if (!orderName.trim() || !orderPhone.trim()) {
                    setOrderError('Please enter your name and phone number.');
                    return;
                  }
                  if (orderFulfillment === 'delivery' && !orderAddress.trim()) {
                    setOrderError('Please enter your delivery address.');
                    return;
                  }
                  const minOrder = profile.storeSettings?.minOrderAmount;
                  if (
                    orderFulfillment === 'delivery' &&
                    typeof minOrder === 'number' &&
                    minOrder > 0 &&
                    bagSubtotal > 0 &&
                    bagSubtotal < minOrder
                  ) {
                    setOrderError(
                      `Minimum order for delivery is ${formatCurrency(minOrder, profile.currency, { compact: true })}. You can switch to Store Pickup or add more items.`,
                    );
                    return;
                  }
                  const snapshotItems = bagItems.map((entry) => ({
                    productId: entry.product.id,
                    name: entry.product.name,
                    quantity: entry.quantity,
                    unitPrice: entry.product.price ?? null,
                    lineTotal: entry.lineTotal,
                  }));
                  const snapshotSubtotal = bagSubtotal;
                  setOrderSubmitting(true);
                  try {
                    const res = await fetch(
                      `/api/public/business/${encodeURIComponent(profile.slug)}/inquiry`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: orderName.trim(),
                          phone: orderPhone.trim(),
                          address:
                            orderFulfillment === 'delivery'
                              ? orderAddress.trim()
                              : 'Store Pickup',
                          order: {
                            fulfillment: orderFulfillment,
                            notes: orderNotes.trim() || undefined,
                            items: snapshotItems.map((i) => ({
                              productId: i.productId,
                              name: i.name,
                              quantity: i.quantity,
                              unitPrice: i.unitPrice,
                            })),
                          },
                        }),
                      },
                    );
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setOrderError(data.error || 'Could not place order.');
                    } else {
                      const waNumber = cleanWaDigits;
                      const waText = `Hi ${profile.businessName}, I placed order ${data.orderNumber || ''} (${orderFulfillment}):\n${snapshotItems
                        .map(
                          (i) =>
                            `• ${i.quantity}x ${i.name}${i.lineTotal ? ` (${formatCurrency(i.lineTotal, profile.currency)})` : ''}`,
                        )
                        .join('\n')}${snapshotSubtotal > 0 ? `\nTotal: ${formatCurrency(snapshotSubtotal, profile.currency)}` : ''}\nName: ${orderName.trim()}`;
                      setBag({});
                      setOrderSuccess({
                        message:
                          data.message ||
                          `${profile.businessName} received your order and will confirm shortly.`,
                        orderNumber: data.orderNumber || null,
                        whatsappUrl: waNumber
                          ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`
                          : null,
                      });
                    }
                  } catch {
                    setOrderError('Network error — please try again.');
                  } finally {
                    setOrderSubmitting(false);
                  }
                }}
                className="mt-4 space-y-3.5"
              >
                {orderError && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{orderError}</span>
                  </div>
                )}

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  {bagItems.map((entry) => (
                    <div
                      key={entry.product.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {entry.product.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {entry.lineTotal !== null
                            ? formatCurrency(entry.lineTotal, profile.currency, { compact: true })
                            : 'Quote on request'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => adjustBagQty(entry.product.id, -1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                            aria-label={`Decrease quantity for ${entry.product.name}`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[22px] text-center text-xs font-semibold text-slate-900">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustBagQty(entry.product.id, 1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                            aria-label={`Increase quantity for ${entry.product.name}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustBagQty(entry.product.id, -entry.quantity)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${entry.product.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Fulfillment</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['pickup', 'delivery'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOrderFulfillment(mode)}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold capitalize ${
                          orderFulfillment === mode
                            ? 'border-transparent text-white'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                        style={orderFulfillment === mode ? { backgroundColor: accent } : undefined}
                      >
                        {mode === 'pickup' ? 'Store Pickup' : 'Local Delivery'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={orderName}
                      onChange={(e) => setOrderName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={orderPhone}
                      onChange={(e) => setOrderPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                {orderFulfillment === 'delivery' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderAddress}
                      onChange={(e) => setOrderAddress(e.target.value)}
                      placeholder="House / street / landmark"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Size, spice level, preferred delivery window..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={orderSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {orderSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : bagSubtotal > 0 ? (
                    `Place Order (${formatCurrency(bagSubtotal, profile.currency, { compact: true })})`
                  ) : (
                    'Place Order Request'
                  )}
                </button>

                <div className="flex flex-wrap gap-2">
                  {cleanWaDigits && (
                    <a
                      href={`https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
                        `Hi ${profile.businessName}, I want to order (${orderFulfillment}):\n${bagItems
                          .map((i) => `• ${i.quantity}x ${i.product.name}`)
                          .join('\n')}${bagSubtotal > 0 ? `\nTotal: ${formatCurrency(bagSubtotal, profile.currency)}` : ''}${orderName ? `\nName: ${orderName}` : ''}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Order via WhatsApp
                    </a>
                  )}
                  {profile.storeSettings?.orderActionUrl && (
                    <a
                      href={profile.storeSettings.orderActionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Order Online
                    </a>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxItem(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxItem(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxItem.url}
              alt={lightboxItem.caption || profile.businessName}
              className="max-h-[80vh] w-auto object-contain"
            />
            {lightboxItem.caption && (
              <p className="bg-black/80 px-4 py-2 text-center text-xs text-white/90">
                {lightboxItem.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
