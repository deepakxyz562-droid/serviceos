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
  Navigation,
  Phone,
  QrCode,
  Send,
  Share2,
  ShieldCheck,
  Star,
  UserPlus,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import type {
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
  const [showMapEmbed, setShowMapEmbed] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

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

  const openActionForService = useCallback(
    (svc: BgosPublicService) => {
      if (profile.bookingEnabled) {
        setSelectedServiceId(svc.id);
        setBookSuccess(null);
        setBookError(null);
        setBookingOpen(true);
      } else {
        setInqServiceId(svc.id);
        setInqMessage(`Hi, I would like a quote for ${svc.name}.`);
        document.getElementById('bgos-inquiry-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    },
    [profile.bookingEnabled],
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

    if (!bookEmail.trim()) {
      setBookError('Please enter your email address so we can send your confirmation.');
      return;
    }

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
            email: bookEmail.trim(),
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
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={profile.businessName}
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
              background: profile.coverImage
                ? undefined
                : `linear-gradient(135deg, ${accent}22 0%, ${accent}44 50%, #0f172a18 100%)`,
            }}
          >
            {profile.coverImage && (
              <img
                src={profile.coverImage}
                alt={`${profile.businessName} cover`}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>

          <div className="px-4 pb-6 pt-0 sm:px-8 sm:pb-7">
            <div className="relative -mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
                {profile.logoUrl ? (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:h-24 sm:w-24">
                    <img
                      src={profile.logoUrl}
                      alt={`${profile.businessName} logo`}
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
                  <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50"
                  >
                    <ChatBubbleIcon className="h-4 w-4" style={{ color: accent }} />
                    <span>Ask AI · Chat</span>
                  </button>
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
                  <a
                    href="#bgos-inquiry-section"
                    className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Request Callback
                  </a>
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

            {/* Real Services Section */}
            {profile.services.length > 0 && (
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

            {/* Photos & Google Business Media */}
            {profile.gallery.length > 0 && (
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
            {(profile.reviews.length > 0 || profile.reviewUrl) && (
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
            {profile.faqs.length > 0 && (
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
            {profile.hours.length > 0 && (
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
            <a
              href="#bgos-inquiry-section"
              className="flex flex-[1.3] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              <Send className="h-4 w-4" />
              Inquire
            </a>
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
                    Email {slots.length > 0 ? '*' : '(optional)'}
                  </label>
                  <input
                    type="email"
                    required={slots.length > 0}
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
