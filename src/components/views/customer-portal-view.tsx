'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, Star, MessageCircle, Phone,
  CheckCircle2, ArrowRight, ExternalLink, FileText,
  RefreshCw, Loader2, AlertCircle, ChevronRight,
  Building2, User, CreditCard, Zap, Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerPortalProps {
  token?: string;
}

interface Booking {
  id: string;
  title: string;
  status: string;
  priority: string;
  address: string | null;
  scheduledAt: string | null;
  assigneeName: string | null;
  assignee?: { id: string; name: string; phone: string; avatar: string | null; rating: number } | null;
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  tax: number;
  total: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

interface PortalData {
  customer: Customer;
  bookings: Booking[];
  invoices: Invoice[];
  session: { id: string; expiresAt: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const JOB_STEPS = [
  { key: 'pending', label: 'Booked', icon: Calendar },
  { key: 'assigned', label: 'Assigned', icon: User },
  { key: 'en_route', label: 'En Route', icon: ArrowRight },
  { key: 'in_progress', label: 'In Progress', icon: Zap },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
  const idx = JOB_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    en_route: 'bg-sky-100 text-sky-700 border-sky-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getInvoiceStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    sent: 'bg-blue-100 text-blue-700 border-blue-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '--'; }
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--'; }
}

// ─── Star Rating Component ──────────────────────────────────────────────────

function StarRating({ value, onChange, readonly = false, size = 'md' }: {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClasses = { sm: 'size-4', md: 'size-6', lg: 'size-8' };
  const sizeClass = sizeClasses[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200 fill-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Progress Stepper Component ─────────────────────────────────────────────

function JobProgressStepper({ status }: { status: string }) {
  const currentIndex = getStepIndex(status);
  const progressPercent = (currentIndex / (JOB_STEPS.length - 1)) * 100;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <Progress value={progressPercent} className="h-2" />

      {/* Steps */}
      <div className="flex items-start justify-between">
        {JOB_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center size-8 rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-600'
                    : 'bg-gray-50 border-gray-200 text-gray-300'
                }`}
              >
                <Icon className="size-4" />
              </div>
              <span className={`text-[10px] font-medium text-center ${
                isCompleted || isCurrent ? 'text-emerald-700' : 'text-gray-300'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CustomerPortalView({ token: tokenProp }: CustomerPortalProps) {
  // Get token from prop or URL params
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review dialog
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewJob, setReviewJob] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Active booking for tracker
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  // ─── Get token from URL or prop ──────────────────────────────────────
  const getToken = useCallback(() => {
    if (tokenProp) return tokenProp;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('token') || '';
    }
    return '';
  }, [tokenProp]);

  // ─── Fetch portal data ──────────────────────────────────────────────
  const fetchPortalData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('No portal token provided');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/customer-portal/${token}?XTransformPort=3000`);
      if (res.ok) {
        const data = await res.json();
        setPortalData(data);
        setError(null);
        // Set default active booking
        const activeBookings = data.bookings?.filter(
          (b: Booking) => !['completed', 'cancelled'].includes(b.status)
        );
        if (activeBookings?.length > 0 && !activeBookingId) {
          setActiveBookingId(activeBookings[0].id);
        }
      } else if (res.status === 404) {
        setError('Invalid portal link');
      } else if (res.status === 410) {
        setError('This portal link has expired');
      } else {
        setError('Failed to load portal data');
      }
    } catch {
      setError('Unable to connect');
    } finally {
      setLoading(false);
    }
  }, [getToken, activeBookingId]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleReschedule = (booking: Booking) => {
    const message = `Hi, I'd like to reschedule my booking "${booking.title}" (scheduled for ${formatDate(booking.scheduledAt)}). Please let me know available times.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp to request reschedule');
  };

  const handleWhatsAppContact = () => {
    const message = `Hi, I have a question about my service.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmitReview = async () => {
    if (!reviewJob) return;
    setReviewSubmitting(true);
    try {
      // Submit review via API
      const res = await fetch(`/api/jobs/${reviewJob.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reviewJob.id,
          reviewRating,
          reviewComment,
        }),
      });
      if (res.ok) {
        toast.success('Review submitted! Thank you for your feedback.');
        setShowReviewDialog(false);
        setReviewJob(null);
        setReviewComment('');
        setReviewRating(5);
        fetchPortalData();
      } else {
        toast.error('Failed to submit review');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handlePayInvoice = (invoice: Invoice) => {
    toast.info(`Payment for invoice ${invoice.number || invoice.id} — ${formatCurrency(invoice.total)}`);
  };

  // ─── Computed ────────────────────────────────────────────────────────
  const bookings = portalData?.bookings || [];
  const invoices = portalData?.invoices || [];
  const customer = portalData?.customer;

  const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  const activeBooking = activeBookings.find(b => b.id === activeBookingId) || activeBookings[0] || null;

  // ─── Loading / Error States ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-3 text-sm text-emerald-700">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <Card className="w-full max-w-md mx-4 border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="size-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Unable to Access Portal</h2>
            <p className="text-sm text-gray-500">{error}</p>
            <p className="text-xs text-gray-400 mt-3">Please contact the business for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-600 shadow-md shadow-emerald-600/20">
              <Building2 className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">ServiceOS</h1>
              <p className="text-xs text-gray-500">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Hi, {customer?.name || 'there'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ─── 1. Job Tracker (Active Job) ──────────────────────────── */}
        {activeBooking && (
          <Card className="border-emerald-200 bg-white shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-emerald-900">
                <Zap className="size-5 text-emerald-600" />
                Job Tracker
              </CardTitle>
              <CardDescription>Real-time status of your active service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{activeBooking.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    {activeBooking.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" /> {activeBooking.address}
                      </span>
                    )}
                    {activeBooking.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" /> {formatDate(activeBooking.scheduledAt)} {formatTime(activeBooking.scheduledAt)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`${getStatusColor(activeBooking.status)} text-xs`}>
                  {activeBooking.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Progress Stepper */}
              <JobProgressStepper status={activeBooking.status} />

              {/* Assigned technician */}
              {activeBooking.assigneeName && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-emerald-200 text-emerald-800 text-sm font-medium">
                      {activeBooking.assigneeName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activeBooking.assigneeName}</p>
                    <p className="text-xs text-gray-500">Your technician</p>
                  </div>
                  {activeBooking.assignee?.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-7 text-xs"
                      onClick={() => window.open(`tel:${activeBooking.assignee!.phone}`)}
                    >
                      <Phone className="size-3 mr-1" /> Call
                    </Button>
                  )}
                </div>
              )}

              {/* Switch active booking if multiple */}
              {activeBookings.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Track another:</span>
                  {activeBookings.filter(b => b.id !== activeBooking.id).map(b => (
                    <Button
                      key={b.id}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setActiveBookingId(b.id)}
                    >
                      {b.title}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Tabs: Bookings / Invoices / Reviews / Contact ────────── */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="w-full h-10 bg-white border shadow-sm">
            <TabsTrigger value="bookings" className="text-xs flex-1">
              <Calendar className="size-3.5 mr-1" /> My Bookings
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs flex-1">
              <FileText className="size-3.5 mr-1" /> Invoices
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs flex-1">
              <Star className="size-3.5 mr-1" /> Reviews
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs flex-1">
              <MessageCircle className="size-3.5 mr-1" /> Contact
            </TabsTrigger>
          </TabsList>

          {/* ─── 2. My Bookings ─────────────────────────────────────── */}
          <TabsContent value="bookings" className="space-y-3">
            {bookings.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Calendar className="size-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No bookings yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Upcoming */}
                {activeBookings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Clock className="size-3.5 text-emerald-600" /> Upcoming
                    </h3>
                    {activeBookings.map(booking => (
                      <Card key={booking.id} className="border-0 shadow-sm bg-white">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900">{booking.title}</h4>
                              {booking.address && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                  <MapPin className="size-3" /> {booking.address}
                                </div>
                              )}
                              {booking.scheduledAt && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                  <Calendar className="size-3" /> {formatDate(booking.scheduledAt)} at {formatTime(booking.scheduledAt)}
                                </div>
                              )}
                              {booking.assigneeName && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Avatar className="size-5">
                                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[8px]">
                                      {booking.assigneeName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-gray-600">{booking.assigneeName}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <Badge variant="outline" className={`${getStatusColor(booking.status)} text-[10px]`}>
                                {booking.status.replace('_', ' ')}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => handleReschedule(booking)}
                              >
                                <RefreshCw className="size-2.5 mr-1" /> Reschedule
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Past */}
                {pastBookings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-gray-400" /> Past
                    </h3>
                    {pastBookings.map(booking => (
                      <Card key={booking.id} className="border-0 shadow-sm bg-white/70">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-700">{booking.title}</h4>
                              {booking.scheduledAt && (
                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                  <Calendar className="size-3" /> {formatDate(booking.scheduledAt)}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className={`${getStatusColor(booking.status)} text-[10px]`}>
                              {booking.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ─── 5. Invoices ─────────────────────────────────────────── */}
          <TabsContent value="invoices" className="space-y-3">
            {invoices.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="size-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No invoices yet</p>
                </CardContent>
              </Card>
            ) : (
              invoices.map(invoice => (
                <Card key={invoice.id} className="border-0 shadow-sm bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">
                          Invoice {invoice.number || invoice.id.slice(0, 8)}
                        </h4>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span>Issued: {formatDate(invoice.createdAt)}</span>
                          {invoice.dueDate && <span>Due: {formatDate(invoice.dueDate)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${getInvoiceStatusColor(invoice.status)} text-[10px]`}>
                            {invoice.status}
                          </Badge>
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handlePayInvoice(invoice)}
                            >
                              <CreditCard className="size-2.5 mr-1" /> Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {invoice.paidAt && (
                      <p className="text-xs text-emerald-600 mt-1">Paid on {formatDate(invoice.paidAt)}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ─── 6. Reviews ──────────────────────────────────────────── */}
          <TabsContent value="reviews" className="space-y-3">
            {completedBookings.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Star className="size-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No completed jobs to review yet</p>
                </CardContent>
              </Card>
            ) : (
              completedBookings.map(booking => (
                <Card key={booking.id} className="border-0 shadow-sm bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">{booking.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Completed {formatDate(booking.updatedAt)}</p>
                        {booking.assigneeName && (
                          <p className="text-xs text-gray-500 mt-0.5">Technician: {booking.assigneeName}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setReviewJob(booking);
                          setReviewRating(5);
                          setReviewComment('');
                          setShowReviewDialog(true);
                        }}
                      >
                        <Star className="size-3 mr-1" /> Leave Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ─── 7. Contact ──────────────────────────────────────────── */}
          <TabsContent value="contact">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <MessageCircle className="size-10 text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Need Help?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Reach out to us via WhatsApp for quick support
                  </p>
                </div>

                <Button
                  className="w-full h-12 text-sm bg-green-600 hover:bg-green-700 text-white shadow-md"
                  onClick={handleWhatsAppContact}
                >
                  <MessageCircle className="size-5 mr-2" />
                  Message Us on WhatsApp
                </Button>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Common Questions</h4>
                  <div className="space-y-1.5">
                    {[
                      'How do I reschedule my appointment?',
                      'What are your business hours?',
                      'How can I get a quote for a new service?',
                      'I have an issue with my recent service',
                    ].map((question, i) => (
                      <button
                        key={i}
                        className="w-full text-left p-2.5 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors text-sm text-gray-600 flex items-center justify-between group"
                        onClick={() => {
                          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(question)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                      >
                        <span>{question}</span>
                        <ChevronRight className="size-3.5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-emerald-100 bg-white/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Powered by ServiceOS</span>
          {portalData?.session?.expiresAt && (
            <span>Session expires {formatDate(portalData.session.expiresAt)}</span>
          )}
        </div>
      </footer>

      {/* ─── Review Dialog ──────────────────────────────────────────── */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="size-5 text-amber-500" />
              Leave a Review
            </DialogTitle>
            <DialogDescription>
              {reviewJob ? `How was your experience with "${reviewJob.title}"?` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Star rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Rating</label>
              <div className="flex items-center gap-3">
                <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
                <span className="text-sm text-gray-500">{reviewRating}/5</span>
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your feedback</label>
              <Textarea
                placeholder="Tell us about your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {reviewSubmitting ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Send className="size-4 mr-1" />
              )}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
