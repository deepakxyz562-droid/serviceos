'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Star, ShieldCheck, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Booking {
  id: string;
  status: string;
  agreedPrice: number;
  scheduledStart: string;
  addressUnlocked: boolean;
  request: { id: string; title: string; categorySlug: string; city: string; state: string; publicSlug: string };
  proposal: { id: string; title: string; price: number; tierType: string };
  provider: { id: string; name: string; logo: string | null; rating: number; reviewCount: number; phone: string; identityVerified: boolean; businessVerified: boolean };
  jobId: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('all');

  useEffect(() => {
    fetch('/api/marketplace/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.customer) router.push('/request');
      });
  }, [router]);

  useEffect(() => {
    fetch(`/api/marketplace/customer/bookings?status=${filter}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBookings(data.bookings);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const upcoming = bookings.filter((b) => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status));
  const past = bookings.filter((b) => ['COMPLETED', 'CANCELLED'].includes(b.status));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/requests"><ChevronLeft className="size-5 text-slate-400" /></Link>
            <h1 className="text-xl font-bold text-slate-900">My Bookings</h1>
          </div>
          <div className="flex gap-1">
            {(['upcoming', 'past', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full ${filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : bookings.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Calendar className="size-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No bookings yet</p>
            <p className="text-xs text-slate-500 mt-1">Bookings will appear here once you accept a proposal.</p>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => router.push('/requests')}>
              View My Requests
            </Button>
          </CardContent></Card>
        ) : (
          (filter === 'all' ? [{ label: 'Upcoming', items: upcoming }, { label: 'Past', items: past }] : [{ label: '', items: bookings }]).map((section) =>
            section.items.length > 0 && (
              <div key={section.label} className="space-y-3">
                {section.label && <h2 className="text-sm font-bold text-slate-700 uppercase">{section.label} ({section.items.length})</h2>}
                {section.items.map((booking) => (
                  <Link key={booking.id} href={`/bookings/${booking.id}`}>
                    <Card className="hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`text-[10px] ${STATUS_COLORS[booking.status] || 'bg-slate-100'}`}>
                                {booking.status}
                              </Badge>
                              <span className="text-[10px] text-slate-400">
                                {new Date(booking.scheduledStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 truncate">{booking.request.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{booking.provider.name}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                              {booking.provider.rating > 0 && (
                                <span className="flex items-center gap-0.5"><Star className="size-3 text-amber-400 fill-current" /> {booking.provider.rating.toFixed(1)}</span>
                              )}
                              {(booking.provider.identityVerified || booking.provider.businessVerified) && (
                                <span className="flex items-center gap-0.5 text-emerald-600"><ShieldCheck className="size-3" /> Verified</span>
                              )}
                              <span>${booking.agreedPrice}</span>
                            </div>
                          </div>
                          <ArrowRight className="size-4 text-slate-300 shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )
          )
        )}
      </main>
    </div>
  );
}
