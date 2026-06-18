'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, Star, MessageCircle, Phone,
  CheckCircle2, ArrowRight, ExternalLink, FileText,
  RefreshCw, Loader2, AlertCircle, ChevronRight,
  Building2, User, CreditCard, Zap, Send,
  Globe, Copy, Plus, Search, QrCode, Link2, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { useCompanyCurrency } from '@/hooks/use-company-currency';

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
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
}

interface PortalData {
  customer: Customer;
  bookings: Booking[];
  invoices: Invoice[];
  session: { id: string; expiresAt: string };
}

interface PortalSession {
  id: string;
  token: string;
  customerId: string;
  customerName: string;
  expiresAt: string;
  portalUrl: string;
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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
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
      <Progress value={progressPercent} className="h-2" />
      <div className="flex items-start justify-between">
        {JOB_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
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

// ─── Portal Experience Component (reused for both direct access & preview) ──

function PortalExperience({ portalData, onRefresh }: {
  portalData: PortalData;
  onRefresh?: () => void;
}) {
  const { currency, format } = useCompanyCurrency();

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewJob, setReviewJob] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  const customer = portalData.customer;
  const bookings = portalData.bookings || [];
  const invoices = portalData.invoices || [];

  const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  const activeBooking = activeBookings.find(b => b.id === activeBookingId) || activeBookings[0] || null;

  useEffect(() => {
    if (activeBookings.length > 0 && !activeBookingId) {
      setActiveBookingId(activeBookings[0].id);
    }
  }, [activeBookings, activeBookingId]);

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
      const res = await fetch(`/api/jobs/${reviewJob.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewJob.id, reviewRating, reviewComment }),
      });
      if (res.ok) {
        toast.success('Review submitted! Thank you for your feedback.');
        setShowReviewDialog(false);
        setReviewJob(null);
        setReviewComment('');
        setReviewRating(5);
        onRefresh?.();
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
    toast.info(`Payment for invoice ${invoice.number || invoice.id} — ${format(invoice.total)}`);
  };

  return (
    <div className="space-y-4">
      {/* Job Tracker */}
      {activeBooking && (
        <Card className="border-emerald-200 bg-white shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-emerald-900">
              <Zap className="size-5 text-emerald-600" />
              Job Tracker
            </CardTitle>
            <CardDescription>Real-time status of the active service</CardDescription>
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

            <JobProgressStepper status={activeBooking.status} />

            {activeBooking.assigneeName && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-emerald-200 text-emerald-800 text-sm font-medium">
                    {activeBooking.assigneeName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activeBooking.assigneeName}</p>
                  <p className="text-xs text-gray-500">Technician</p>
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

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="w-full h-10 bg-white border shadow-sm">
          <TabsTrigger value="bookings" className="text-xs flex-1">
            <Calendar className="size-3.5 mr-1" /> Bookings
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

        {/* Bookings Tab */}
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

        {/* Invoices Tab */}
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
                      <span className="text-lg font-bold text-gray-900">{format(invoice.total)}</span>
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

        {/* Reviews Tab */}
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

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <MessageCircle className="size-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900">Need Help?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Reach out via WhatsApp for quick support
                </p>
              </div>

              <Button
                className="w-full h-12 text-sm bg-green-600 hover:bg-green-700 text-white shadow-md"
                onClick={handleWhatsAppContact}
              >
                <MessageCircle className="size-5 mr-2" />
                Message on WhatsApp
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

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="size-5 text-amber-500" />
              Leave a Review
            </DialogTitle>
            <DialogDescription>
              {reviewJob ? `How was the experience with "${reviewJob.title}"?` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Rating</label>
              <div className="flex items-center gap-3">
                <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
                <span className="text-sm text-gray-500">{reviewRating}/5</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your feedback</label>
              <Textarea
                placeholder="Tell us about the experience..."
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

// ─── Management View (no token) ─────────────────────────────────────────────

function PortalManagementView() {
  const { auth } = useAppStore();
  const tenantId = auth.user?.tenantId || null;

  useCompanyCurrency();

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');

  // Portal sessions
  const [sessions, setSessions] = useState<PortalSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Generate link
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  // Preview
  const [previewCustomerId, setPreviewCustomerId] = useState<string>('');
  const [previewData, setPreviewData] = useState<PortalData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('links');

  // ─── Fetch customers ──────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await fetch(`/api/customers${customerSearch ? `?search=${encodeURIComponent(customerSearch)}&XTransformPort=3000` : '?XTransformPort=3000'}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  }, [customerSearch]);

  // ─── Fetch portal sessions ────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`/api/customer-portal?list=true&tenantId=${tenantId || ''}&XTransformPort=3000`);
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      } else {
        // If list endpoint not available, try alternative approach
        setSessions([]);
      }
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchCustomers();
    fetchSessions();
  }, [fetchCustomers, fetchSessions]);

  // ─── Generate portal link ─────────────────────────────────────────────
  const handleGenerateLink = async (customerId: string) => {
    setGeneratingFor(customerId);
    try {
      const res = await fetch('/api/customer-portal?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          expiresInHours: 72,
          tenantId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newSession: PortalSession = {
          id: data.session.id,
          token: data.session.token,
          customerId: data.session.customerId,
          customerName: data.session.customerName,
          expiresAt: data.session.expiresAt,
          portalUrl: data.session.portalUrl,
        };
        setSessions(prev => [newSession, ...prev]);
        toast.success(`Portal link generated for ${data.session.customerName}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to generate portal link');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setGeneratingFor(null);
    }
  };

  // ─── Copy link to clipboard ───────────────────────────────────────────
  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Portal link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // ─── Open portal in new tab ───────────────────────────────────────────
  const handleOpenPortal = (token: string) => {
    window.open(`/portal/${token}`, '_blank');
  };

  // ─── Preview portal ──────────────────────────────────────────────────
  const handleStartPreview = async () => {
    if (!previewCustomerId) {
      toast.error('Please select a customer first');
      return;
    }

    setPreviewLoading(true);
    setPreviewData(null);
    setPreviewToken(null);

    try {
      // Generate a temporary portal session
      const genRes = await fetch('/api/customer-portal?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: previewCustomerId,
          expiresInHours: 1,
          tenantId,
        }),
      });

      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to generate preview session');
        setPreviewLoading(false);
        return;
      }

      const genData = await genRes.json();
      const token = genData.session.token;
      setPreviewToken(token);

      // Fetch portal data using the token
      const dataRes = await fetch(`/api/customer-portal/${token}?XTransformPort=3000`);
      if (dataRes.ok) {
        const portalData = await dataRes.json();
        setPreviewData(portalData);
      } else {
        toast.error('Failed to load portal preview data');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRefreshPreview = async () => {
    if (!previewToken) return;
    try {
      const dataRes = await fetch(`/api/customer-portal/${previewToken}?XTransformPort=3000`);
      if (dataRes.ok) {
        const portalData = await dataRes.json();
        setPreviewData(portalData);
      }
    } catch {
      toast.error('Failed to refresh preview');
    }
  };

  // ─── Computed ─────────────────────────────────────────────────────────
  const filteredCustomers = customers.filter(c =>
    !customerSearch ||
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === previewCustomerId);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600 shadow-md shadow-emerald-600/20">
                <Globe className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Customer Portal</h1>
                <p className="text-xs text-gray-500">Manage portal access & preview customer experience</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { fetchCustomers(); fetchSessions(); }}
              >
                <RefreshCw className="size-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border shadow-sm h-10">
            <TabsTrigger value="links" className="text-sm px-4">
              <Link2 className="size-4 mr-1.5" /> Portal Links
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-sm px-4">
              <Eye className="size-4 mr-1.5" /> Preview
            </TabsTrigger>
          </TabsList>

          {/* ─── Portal Links Tab ───────────────────────────────────────── */}
          <TabsContent value="links" className="space-y-6">
            {/* Customer List & Generate */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Building2 className="size-4 text-emerald-600" />
                      Customers
                    </CardTitle>
                    <CardDescription className="mt-1">Generate portal links for customers to self-serve</CardDescription>
                  </div>
                </div>
                <div className="relative mt-3">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search customers by name, phone, or email..."
                    className="pl-9 h-9 text-sm"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-emerald-600" />
                    <span className="ml-2 text-sm text-gray-500">Loading customers...</span>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="size-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {customerSearch ? 'No customers match your search' : 'No customers found'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-1">
                      {filteredCustomers.map(customer => {
                        const existingSession = sessions.find(s => s.customerId === customer.id && !isExpired(s.expiresAt));
                        const isGenerating = generatingFor === customer.id;

                        return (
                          <div
                            key={customer.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="size-9 shrink-0">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                                  {customer.name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{customer.name || 'Unnamed'}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  {customer.phone && <span>{customer.phone}</span>}
                                  {customer.email && <span className="truncate">{customer.email}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {existingSession ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  <CheckCircle2 className="size-3 mr-1" /> Active Link
                                </Badge>
                              ) : null}
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={isGenerating}
                                onClick={() => handleGenerateLink(customer.id)}
                              >
                                {isGenerating ? (
                                  <Loader2 className="size-3 mr-1 animate-spin" />
                                ) : (
                                  <Plus className="size-3 mr-1" />
                                )}
                                Generate Link
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Active Portal Sessions */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <QrCode className="size-4 text-emerald-600" />
                  Portal Sessions
                </CardTitle>
                <CardDescription>Active and recent portal access links</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-emerald-600" />
                    <span className="ml-2 text-sm text-gray-500">Loading sessions...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Link2 className="size-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No portal sessions yet</p>
                    <p className="text-xs text-gray-400 mt-1">Generate a link above to create a session</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {sessions.map(session => {
                        const expired = isExpired(session.expiresAt);
                        return (
                          <div
                            key={session.id}
                            className={`p-4 rounded-lg border transition-colors ${
                              expired
                                ? 'bg-gray-50/50 border-gray-100'
                                : 'bg-white border-emerald-100 hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <Avatar className="size-9 shrink-0 mt-0.5">
                                  <AvatarFallback className={`text-xs font-medium ${
                                    expired
                                      ? 'bg-gray-100 text-gray-500'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {session.customerName?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium ${expired ? 'text-gray-500' : 'text-gray-900'}`}>
                                    {session.customerName || 'Unknown Customer'}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Link2 className="size-3 text-gray-400" />
                                    <span className="text-xs text-gray-400 font-mono truncate max-w-[200px] sm:max-w-[320px]">
                                      {session.portalUrl || `/portal/${session.token.slice(0, 12)}...`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs">
                                    <span className={`flex items-center gap-1 ${expired ? 'text-red-500' : 'text-gray-500'}`}>
                                      <Clock className="size-3" />
                                      {expired ? `Expired ${timeAgo(session.expiresAt)}` : `Expires ${formatDate(session.expiresAt)}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    expired
                                      ? 'bg-red-50 text-red-600 border-red-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {expired ? 'Expired' : 'Active'}
                                </Badge>
                                {!expired && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleCopyLink(session.portalUrl || `${window.location.origin}/portal/${session.token}`)}
                                      title="Copy link"
                                    >
                                      <Copy className="size-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleOpenPortal(session.token)}
                                      title="Open portal"
                                    >
                                      <ExternalLink className="size-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Preview Tab ────────────────────────────────────────────── */}
          <TabsContent value="preview" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Eye className="size-4 text-emerald-600" />
                  Portal Preview
                </CardTitle>
                <CardDescription>
                  Preview the portal experience as a specific customer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                  <div className="flex-1 w-full space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Select Customer</Label>
                    <Select value={previewCustomerId} onValueChange={setPreviewCustomerId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a customer to preview..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customersLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="size-4 animate-spin text-emerald-600" />
                            <span className="ml-2 text-xs text-gray-500">Loading...</span>
                          </div>
                        ) : customers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-500">No customers available</div>
                        ) : (
                          customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="size-6">
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[8px]">
                                    {customer.name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{customer.name || 'Unnamed'}</span>
                                {customer.phone && <span className="text-gray-400 text-xs">({customer.phone})</span>}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 w-full sm:w-auto"
                    disabled={!previewCustomerId || previewLoading}
                    onClick={handleStartPreview}
                  >
                    {previewLoading ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <Eye className="size-4 mr-1.5" />
                    )}
                    {previewLoading ? 'Loading Preview...' : 'Preview Portal'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview Content */}
            {previewLoading && !previewData && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
                  <p className="mt-3 text-sm text-gray-500">Generating preview session...</p>
                </div>
              </div>
            )}

            {previewData && selectedCustomer && (
              <div className="space-y-4">
                {/* Preview Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      Previewing portal for <strong>{selectedCustomer.name}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                      onClick={handleRefreshPreview}
                    >
                      <RefreshCw className="size-3 mr-1" /> Refresh
                    </Button>
                    {previewToken && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        onClick={() => handleOpenPortal(previewToken)}
                      >
                        <ExternalLink className="size-3 mr-1" /> Open in New Tab
                      </Button>
                    )}
                  </div>
                </div>

                {/* Embedded Portal Experience */}
                <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-lg border border-emerald-100 p-4 sm:p-6">
                  {/* Mini header for context */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-600 shadow-md shadow-emerald-600/20">
                        <Building2 className="size-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">ServiceOS</h2>
                        <p className="text-[10px] text-gray-500">Customer Portal</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">Hi, {selectedCustomer.name}</span>
                  </div>

                  <PortalExperience portalData={previewData} onRefresh={handleRefreshPreview} />

                  {/* Mini footer */}
                  <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Powered by ServiceOS</span>
                    {previewData.session?.expiresAt && (
                      <span>Session expires {formatDate(previewData.session.expiresAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!previewData && !previewLoading && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="flex items-center justify-center size-16 rounded-2xl bg-emerald-50 mx-auto mb-4">
                    <Eye className="size-8 text-emerald-300" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Select a Customer to Preview</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Choose a customer above and click &quot;Preview Portal&quot; to see their portal experience inline
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-100 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Customer Portal Management</span>
          <span>{sessions.filter(s => !isExpired(s.expiresAt)).length} active session(s)</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Direct Portal Access View (with token) ─────────────────────────────────

function DirectPortalView({ token }: { token: string }) {
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useCompanyCurrency();

  const fetchPortalData = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer-portal/${token}?XTransformPort=3000`);
      if (res.ok) {
        const data = await res.json();
        setPortalData(data);
        setError(null);
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
  }, [token]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

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

  if (error || !portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <Card className="w-full max-w-md mx-4 border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="size-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Unable to Access Portal</h2>
            <p className="text-sm text-gray-500">{error || 'Unknown error'}</p>
            <p className="text-xs text-gray-400 mt-3">Please contact the business for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
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
            <span className="text-sm text-gray-600">Hi, {portalData.customer?.name || 'there'}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
        <PortalExperience portalData={portalData} onRefresh={fetchPortalData} />
      </main>

      <footer className="mt-auto border-t border-emerald-100 bg-white/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Powered by ServiceOS</span>
          {portalData.session?.expiresAt && (
            <span>Session expires {formatDate(portalData.session.expiresAt)}</span>
          )}
        </div>
      </footer>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CustomerPortalView({ token: tokenProp }: CustomerPortalProps) {
  const { auth } = useAppStore();

  // Get token from prop, URL params, or localStorage (for OTP-authenticated customers)
  const getToken = (): string => {
    if (tokenProp) return tokenProp;
    if (typeof window !== 'undefined') {
      // Check URL params first
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) return urlToken;

      // Check localStorage for OTP-authenticated customer token
      try {
        const stored = localStorage.getItem('serviceos_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.portalToken && (parsed.isCustomer || parsed.user?.role === 'customer')) {
            return parsed.portalToken;
          }
        }
      } catch {
        // localStorage read failed
      }
    }
    return '';
  };

  const token = getToken();
  const isCustomer = auth.user?.role === 'customer' ||
    (typeof window !== 'undefined' && (() => {
      try {
        const stored = localStorage.getItem('serviceos_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.isCustomer === true;
        }
      } catch { /* ignore */ }
      return false;
    })());

  // If token is provided or user is a customer, show the direct portal access view
  if (token || isCustomer) {
    return <DirectPortalView token={token} />;
  }

  // Otherwise, show the management view (for business users)
  return <PortalManagementView />;
}
