'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Star, Plus, Search, Send, TrendingUp, MessageCircle,
  MoreHorizontal, Eye, Trash2, BarChart3, Mail,
  RefreshCw, ThumbsUp, Settings, ExternalLink, Save,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  comment?: string;
  source: string;
  status: string;
  npsScore?: number;
  employeeId?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReviewRequest {
  id: string;
  jobId?: string;
  customerId?: string;
  employeeId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: string;
  channel: string;
  sentAt?: string;
  openedAt?: string;
  reviewedAt?: string;
  reminderCount: number;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return '—'; }
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`size-3.5 ${star <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
    </div>
  );
}

const SOURCE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  internal: { label: 'Internal', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  google: { label: 'Google', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  whatsapp: { label: 'WhatsApp', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  form: { label: 'Form', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  email: { label: 'Email', icon: <Mail className="size-3" />, bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle className="size-3" />, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  sms: { label: 'SMS', icon: <Send className="size-3" />, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const REQUEST_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dotColor: 'bg-amber-500' },
  sent: { label: 'Sent', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dotColor: 'bg-sky-500' },
  opened: { label: 'Opened', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dotColor: 'bg-violet-500' },
  reviewed: { label: 'Reviewed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500' },
  expired: { label: 'Expired', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dotColor: 'bg-red-500' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ReviewsView() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reviews');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState({ customerId: '', channel: 'whatsapp', message: '' });
  const [saving, setSaving] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  // Settings state
  const [googleReviewLink, setGoogleReviewLink] = useState('');
  const [autoRequestEnabled, setAutoRequestEnabled] = useState(false);
  const [autoRequestDelay, setAutoRequestDelay] = useState('24');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await authFetch(`/api/reviews?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      setReviews(data.reviews || data || []);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, searchQuery]);

  const fetchReviewRequests = useCallback(async () => {
    try {
      const res = await authFetch('/api/review-requests?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      setReviewRequests(data.reviewRequests || data || []);
    } catch { /* silent */ }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await authFetch('/api/customers?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      setCustomers(data.customers || data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { fetchReviewRequests(); }, []);
  useEffect(() => { fetchCustomers(); }, []);

  // ─── Computed Stats ─────────────────────────────────────────────────────

  const stats = useCallback(() => {
    const totalRequests = reviewRequests.length;
    const reviewsReceived = reviews.length;
    const avgRating = reviews.length > 0 ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10 : 0;
    const conversionRate = totalRequests > 0 ? Math.round((reviewsReceived / totalRequests) * 100) : 0;
    const npsScores = reviews.filter((r) => r.npsScore != null);
    const avgNps = npsScores.length > 0 ? Math.round(npsScores.reduce((s, r) => s + (r.npsScore || 0), 0) / npsScores.length * 10) / 10 : 0;
    return { totalRequests, reviewsReceived, avgRating, conversionRate, avgNps };
  }, [reviews, reviewRequests]);

  // ─── Rating Distribution ────────────────────────────────────────────────

  const ratingDistribution = useCallback(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++; });
    return dist;
  }, [reviews]);

  const s = stats();
  const dist = ratingDistribution();
  const maxRatingCount = Math.max(...Object.values(dist), 1);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleSendRequest = async () => {
    if (!requestForm.customerId) { toast.error('Please select a customer'); return; }
    setSaving(true);
    try {
      const customer = customers.find((c) => c.id === requestForm.customerId);
      const res = await authFetch('/api/review-requests', {
        method: 'POST',
        body: JSON.stringify({
          customerId: requestForm.customerId,
          customerName: customer?.name,
          customerPhone: customer?.phone,
          customerEmail: customer?.email,
          channel: requestForm.channel,
        }),
      });
      if (!res.ok) throw new Error('Failed to send review request');
      toast.success('Review request sent');
      setShowRequestDialog(false);
      setRequestForm({ customerId: '', channel: 'whatsapp', message: '' });
      fetchReviewRequests();
    } catch {
      toast.error('Failed to send review request');
    } finally {
      setSaving(false);
    }
  };

  const handleResendRequest = async (requestId: string) => {
    try {
      const res = await authFetch(`/api/review-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'sent', sentAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Failed to resend');
      toast.success('Review request resent');
      fetchReviewRequests();
    } catch {
      toast.error('Failed to resend request');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const res = await authFetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Review deleted');
      if (selectedReview?.id === reviewId) { setShowDetailDialog(false); setSelectedReview(null); }
      fetchReviews();
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const res = await authFetch(`/api/review-requests/${requestId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Request deleted');
      fetchReviewRequests();
    } catch {
      toast.error('Failed to delete request');
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      // In a real app, save to tenant settings
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // ─── Loading Skeleton ───────────────────────────────────────────────────

  if (loading && reviews.length === 0 && reviewRequests.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <ViewHeader icon={Star} iconBg="bg-amber-600" title="Reviews & Reputation" description="Track reviews, NPS scores, and manage review requests" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ViewHeader
        icon={Star}
        iconBg="bg-amber-600"
        title="Reviews & Reputation"
        description="Track reviews, NPS scores, and manage review requests"
        action={
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setShowRequestDialog(true)}>
            <Send className="size-4 mr-1.5" /> Request Review
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Requests', value: s.totalRequests, icon: Send, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Reviews Received', value: s.reviewsReceived, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Avg Rating', value: s.avgRating || '—', icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Conversion Rate', value: `${s.conversionRate}%`, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'NPS Score', value: s.avgNps || '—', icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold truncate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-xl shrink-0`}><Icon className={`size-4 ${stat.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reviews" className="text-xs">Reviews</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs">Review Requests</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
        </TabsList>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4 mt-4">
          {/* Rating Distribution */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3"><BarChart3 className="size-4 text-amber-600" /><span className="text-sm font-semibold">Rating Distribution</span></div>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm w-6 text-right">{rating}</span>
                    <Star className="size-3.5 text-amber-400 fill-amber-400" />
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(dist[rating] / maxRatingCount) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-6">{dist[rating]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="form">Form</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search reviews..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>

          {/* Review Cards */}
          {reviews.length === 0 ? (
            <EmptyState icon={Star} title="No reviews yet" description="Send review requests to start collecting feedback" actionLabel="Request Review" onAction={() => setShowRequestDialog(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((review) => {
                const sourceConfig = SOURCE_CONFIG[review.source] || SOURCE_CONFIG.internal;
                return (
                  <Card key={review.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <StarRating value={review.rating} />
                        <Badge variant="outline" className={`text-[10px] h-5 ${sourceConfig.bg} ${sourceConfig.text} ${sourceConfig.border}`}>
                          {sourceConfig.label}
                        </Badge>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground line-clamp-3">&ldquo;{review.comment}&rdquo;</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>{formatDate(review.createdAt)}</span>
                        {review.npsScore != null && (
                          <Badge variant="outline" className={`text-[10px] h-5 ${review.npsScore >= 9 ? 'bg-emerald-50 text-emerald-700' : review.npsScore >= 7 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                            NPS: {review.npsScore}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="size-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedReview(review); setShowDetailDialog(true); }}><Eye className="size-3.5 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDeleteReview(review.id)}><Trash2 className="size-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Review Requests Tab */}
        <TabsContent value="requests" className="space-y-4 mt-4">
          {reviewRequests.length === 0 ? (
            <EmptyState icon={Send} title="No review requests" description="Send your first review request to collect customer feedback" actionLabel="Request Review" onAction={() => setShowRequestDialog(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviewRequests.map((request) => {
                const statusConfig = REQUEST_STATUS_CONFIG[request.status] || REQUEST_STATUS_CONFIG.pending;
                const channelConfig = CHANNEL_CONFIG[request.channel] || CHANNEL_CONFIG.whatsapp;
                return (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                          <span className={`size-1.5 rounded-full ${statusConfig.dotColor}`} />
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${channelConfig.bg} ${channelConfig.text} ${channelConfig.border}`}>
                          {channelConfig.icon} {channelConfig.label}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">{request.customerName || 'Unknown Customer'}</p>
                        {request.customerPhone && <p className="text-xs text-muted-foreground">{request.customerPhone}</p>}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Sent: {formatDate(request.sentAt)}</span>
                        {request.reminderCount > 0 && <span>{request.reminderCount} reminder(s)</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {request.status !== 'reviewed' && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleResendRequest(request.id)}>
                            <RefreshCw className="size-3 mr-1" /> Resend
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="size-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem variant="destructive" onClick={() => handleDeleteRequest(request.id)}><Trash2 className="size-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Settings className="size-4" /> Review Settings</CardTitle>
              <CardDescription>Configure Google Review link and auto-request behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Google Review Link</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://search.google.com/local/writereview?placeid=..."
                    value={googleReviewLink}
                    onChange={(e) => setGoogleReviewLink(e.target.value)}
                    className="flex-1"
                  />
                  {googleReviewLink && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={googleReviewLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Customers will be directed to this link to leave a Google review</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-Request Reviews</Label>
                    <p className="text-xs text-muted-foreground">Automatically send review requests after job completion</p>
                  </div>
                  <Switch checked={autoRequestEnabled} onCheckedChange={setAutoRequestEnabled} />
                </div>

                {autoRequestEnabled && (
                  <div className="space-y-2 pl-0 sm:pl-4">
                    <Label className="text-sm">Delay after completion</Label>
                    <Select value={autoRequestDelay} onValueChange={setAutoRequestDelay}>
                      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                        <SelectItem value="72">72 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Wait before sending review request after job is completed</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium">Default Channel</Label>
                <Select defaultValue="whatsapp">
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveSettings} disabled={settingsSaving}>
                <Save className="size-4 mr-1.5" /> {settingsSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Review Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="size-5 text-amber-600" /> Request Review</DialogTitle>
            <DialogDescription>Send a review request to a customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={requestForm.customerId} onValueChange={(v) => setRequestForm((p) => ({ ...p, customerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={requestForm.channel} onValueChange={(v) => setRequestForm((p) => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea placeholder="Custom message for review request..." value={requestForm.message} onChange={(e) => setRequestForm((p) => ({ ...p, message: e.target.value }))} rows={3} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSendRequest} disabled={saving}>{saving ? 'Sending...' : 'Send Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          {selectedReview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Star className="size-5 text-amber-500" /> Review Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <StarRating value={selectedReview.rating} />
                  <span className="text-sm font-semibold">{selectedReview.rating}/5</span>
                </div>
                {selectedReview.comment && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Comment</Label>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">&ldquo;{selectedReview.comment}&rdquo;</p>
                  </div>
                )}
                {selectedReview.npsScore != null && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">NPS Score</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{selectedReview.npsScore}</span>
                      <Progress value={selectedReview.npsScore * 10} className="flex-1 h-2" />
                    </div>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div><p className="font-medium">Source</p><p>{(SOURCE_CONFIG[selectedReview.source] || SOURCE_CONFIG.internal).label}</p></div>
                  <div><p className="font-medium">Status</p><p>{selectedReview.status}</p></div>
                  <div><p className="font-medium">Created</p><p>{formatDate(selectedReview.createdAt)}</p></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowDetailDialog(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
