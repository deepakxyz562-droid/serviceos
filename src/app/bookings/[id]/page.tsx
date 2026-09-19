'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, MapPin, Calendar, Clock, DollarSign, Star, ShieldCheck,
  Phone, MessageSquare, Loader2, CheckCircle2, Navigation, Camera,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface BookingDetail {
  id: string;
  status: string;
  agreedPrice: number;
  marketplaceFeeRate: number;
  scheduledStart: string;
  addressUnlocked: boolean;
  request: { id: string; title: string; description: string; categorySlug: string; city: string; state: string; streetAddress: string | null; publicSlug: string };
  proposal: { id: string; title: string; price: number; tierType: string; arrivalWindow: string | null; warrantyMonths: number };
  provider: { id: string; name: string; logo: string | null; rating: number; reviewCount: number; phone: string; identityVerified: boolean; businessVerified: boolean };
  jobId: string | null;
}

const STATUS_TIMELINE = [
  { key: 'CONFIRMED', label: 'Booking Confirmed', icon: CheckCircle2 },
  { key: 'IN_PROGRESS', label: 'Job In Progress', icon: Clock },
  { key: 'COMPLETED', label: 'Job Completed', icon: CheckCircle2 },
];

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/marketplace/customer/bookings/${bookingId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBooking(data.booking);
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="size-8 animate-spin text-slate-400" /></div>;
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-sm text-slate-500">Booking not found.</p>
          <Link href="/bookings" className="text-xs text-emerald-600 mt-2 inline-block">← Back to Bookings</Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = STATUS_TIMELINE.findIndex((s) => s.key === booking.status);
  const address = booking.addressUnlocked ? (booking.request.streetAddress || `${booking.request.city}, ${booking.request.state}`) : `${booking.request.city}, ${booking.request.state} (address locked)`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/bookings"><ChevronLeft className="size-5 text-slate-400" /></Link>
          <h1 className="text-sm font-bold text-slate-900 flex-1 truncate">{booking.request.title}</h1>
          <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{booking.status}</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Status Timeline */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {STATUS_TIMELINE.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1 relative">
                    {idx < STATUS_TIMELINE.length - 1 && (
                      <div className={`absolute top-4 left-1/2 w-full h-0.5 ${idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    )}
                    <div className={`size-8 rounded-full flex items-center justify-center z-10 ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}>
                      <Icon className="size-4" />
                    </div>
                    <span className={`text-[10px] mt-1 ${isDone ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Provider Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-12 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-600">
                {booking.provider.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">{booking.provider.name}</h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  {booking.provider.rating > 0 && (
                    <span className="flex items-center gap-0.5"><Star className="size-3 text-amber-400 fill-current" /> {booking.provider.rating.toFixed(1)} ({booking.provider.reviewCount})</span>
                  )}
                  {(booking.provider.identityVerified || booking.provider.businessVerified) && (
                    <span className="flex items-center gap-0.5 text-emerald-600"><ShieldCheck className="size-3" /> Verified</span>
                  )}
                </div>
              </div>
            </div>
            {/* Contact actions */}
            <div className="flex gap-2">
              {booking.addressUnlocked && (
                <a href={`tel:${booking.provider.phone}`}>
                  <Button variant="outline" size="sm" className="text-xs"><Phone className="size-3.5 mr-1" /> Call Provider</Button>
                </a>
              )}
              <Button variant="outline" size="sm" className="text-xs"><MessageSquare className="size-3.5 mr-1" /> Message</Button>
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Job Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="size-3.5 text-slate-400" /> {address}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="size-3.5 text-slate-400" /> {new Date(booking.scheduledStart).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              {booking.proposal.arrivalWindow && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="size-3.5 text-slate-400" /> {booking.proposal.arrivalWindow}
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <DollarSign className="size-3.5 text-slate-400" /> ${booking.agreedPrice}
                <span className="text-slate-400">({booking.proposal.tierType} tier)</span>
              </div>
              {booking.proposal.warrantyMonths > 0 && (
                <div className="flex items-center gap-2 text-slate-600">
                  <ShieldCheck className="size-3.5 text-slate-400" /> {booking.proposal.warrantyMonths} month warranty
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-600">{booking.request.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* FSM Integration (for Fieseros subscribers) */}
        {booking.jobId && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="size-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Job Tracking</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">This provider uses Fieseros OS — you can track the job in real-time.</p>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => router.push(`/pwa/jobs/${booking.jobId}`)}>
                <Camera className="size-3.5 mr-1" /> Track Job
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
