'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Search,
  Filter,
  Download,
  RefreshCw,
  User,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Globe,
  CheckCircle2,
  Clock,
  Briefcase,
  UserCheck,
  Eye,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  SubmissionDetailDrawer,
  FormSubmissionItem,
} from '@/features/forms/components/submission-detail-drawer';

interface FormStats {
  total: number;
  newUnread: number;
  convertedLeads: number;
  convertedJobs: number;
}

interface FormOption {
  id: string;
  name: string;
}

export function FormSubmissionsView() {
  const [submissions, setSubmissions] = useState<FormSubmissionItem[]>([]);
  const [stats, setStats] = useState<FormStats>({
    total: 0,
    newUnread: 0,
    convertedLeads: 0,
    convertedJobs: 0,
  });
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFormId, setSelectedFormId] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Inspector Drawer State
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmissionItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch available forms for dropdown filter
  useEffect(() => {
    fetch('/api/forms')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.forms)) {
          setForms(data.forms.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch submissions from central API
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });
      if (selectedFormId !== 'all') params.set('formId', selectedFormId);
      if (selectedSource !== 'all') params.set('source', selectedSource);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/forms/responses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load submissions');

      const data = await res.json();
      setSubmissions(data.responses || []);
      if (data.stats) setStats(data.stats);
      if (data.pagination) setTotalPages(data.pagination.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load form responses');
    } finally {
      setLoading(false);
    }
  }, [page, selectedFormId, selectedSource, selectedStatus, search]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams({ export: 'csv' });
    if (selectedFormId !== 'all') params.set('formId', selectedFormId);
    if (selectedSource !== 'all') params.set('source', selectedSource);
    if (selectedStatus !== 'all') params.set('status', selectedStatus);
    if (search.trim()) params.set('search', search.trim());

    window.open(`/api/forms/responses?${params.toString()}`, '_blank');
  };

  const handleOpenDetail = (sub: FormSubmissionItem) => {
    setSelectedSubmission(sub);
    setDrawerOpen(true);
  };

  // Human friendly source badge
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'chatbot':
        return <Badge className="bg-purple-600 text-white text-[10px] gap-1"><Sparkles className="size-2.5" /> Chatbot</Badge>;
      case 'wordpress':
        return <Badge className="bg-blue-600 text-white text-[10px] gap-1"><Globe className="size-2.5" /> WordPress</Badge>;
      case 'embed':
        return <Badge className="bg-teal-600 text-white text-[10px]">JS Embed</Badge>;
      case 'whatsapp':
        return <Badge className="bg-emerald-600 text-white text-[10px]">WhatsApp</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Direct Form</Badge>;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* ─── Header & Top Actions ────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 text-white">
            <Inbox className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Form Submissions &amp; Lead Store</h2>
            <p className="text-sm text-muted-foreground">
              Centralized inbox for appointments, quotes, contact forms &amp; AI inquiries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={fetchSubmissions}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 text-xs font-semibold"
            onClick={handleExportCsv}
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ─── Metric Overview Cards ──────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Inbox className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Inquiries</p>
              <p className="text-xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">New / Unprocessed</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats.newUnread.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <UserCheck className="size-4" />
            </div>
            <div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">Converted to Leads</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.convertedLeads.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-950/10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300">
              <Briefcase className="size-4" />
            </div>
            <div>
              <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold">Jobs / Bookings</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats.convertedJobs.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Search & Advanced Filter Controls ─────────────────────────── */}
      <Card className="p-3 border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, email, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Form Selector */}
          <Select
            value={selectedFormId}
            onValueChange={(val) => {
              setSelectedFormId(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Forms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms ({forms.length})</SelectItem>
              {forms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Source Filter */}
          <Select
            value={selectedSource}
            onValueChange={(val) => {
              setSelectedSource(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Ingestion Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="chatbot">AI Chatbot</SelectItem>
              <SelectItem value="wordpress">WordPress Plugin</SelectItem>
              <SelectItem value="embed">Website JS Embed</SelectItem>
              <SelectItem value="direct">Direct Form Link</SelectItem>
              <SelectItem value="whatsapp">WhatsApp Form</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onValueChange={(val) => {
              setSelectedStatus(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="new">New / Unprocessed</SelectItem>
              <SelectItem value="with_lead">Converted to Lead</SelectItem>
              <SelectItem value="with_job">Job / Booking Created</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ─── Submissions Spreadsheet Data Table ────────────────────────── */}
      <Card className="border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 font-semibold text-muted-foreground">
                <th className="p-3 w-10">Status</th>
                <th className="p-3">Respondent</th>
                <th className="p-3">Form Name</th>
                <th className="p-3">Submission Summary</th>
                <th className="p-3">Source</th>
                <th className="p-3">Submitted</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin" /> Loading submissions...
                    </div>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center space-y-3">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                      <Inbox className="size-6" />
                    </div>
                    <p className="font-semibold text-sm">No form submissions found</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Inquiries from your website forms, AI chat agent, and WordPress plugin will appear here in real-time.
                    </p>
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const email = (sub.data.email as string) || (sub.respondent?.includes('@') ? sub.respondent : null);
                  const phone = (sub.data.phone as string) || (!sub.respondent?.includes('@') ? sub.respondent : null);

                  // Extract 2 key fields for the summary snippet
                  const summaryEntries = Object.entries(sub.data || {})
                    .filter(([k]) => !['name', 'fullName', 'email', 'phone', 'website'].includes(k))
                    .slice(0, 2);

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetail(sub)}
                    >
                      {/* Status Dot */}
                      <td className="p-3">
                        {sub.leadId ? (
                          <span title="Converted to Lead" className="size-2.5 rounded-full bg-emerald-500 block" />
                        ) : sub.jobId ? (
                          <span title="Job Created" className="size-2.5 rounded-full bg-blue-500 block" />
                        ) : (
                          <span title="New Inquiry" className="size-2.5 rounded-full bg-amber-500 block animate-pulse" />
                        )}
                      </td>

                      {/* Respondent */}
                      <td className="p-3 font-medium">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <User className="size-3 text-muted-foreground" />
                            {sub.respondentName}
                          </p>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            {phone && <span>{phone}</span>}
                            {phone && email && <span>•</span>}
                            {email && <span className="truncate max-w-[140px]">{email}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Form */}
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] font-normal bg-card">
                          {sub.form?.name || 'Smart Form'}
                        </Badge>
                      </td>

                      {/* Submission Summary Snippet */}
                      <td className="p-3 text-muted-foreground max-w-xs truncate">
                        {summaryEntries.length > 0 ? (
                          summaryEntries.map(([k, v]) => (
                            <span key={k} className="mr-2">
                              <strong className="text-foreground capitalize">{k}:</strong> {String(v)}
                            </span>
                          ))
                        ) : (
                          <span className="italic text-[11px]">General inquiry submitted</span>
                        )}
                      </td>

                      {/* Ingestion Source */}
                      <td className="p-3">{getSourceBadge(sub.source)}</td>

                      {/* Timestamp */}
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenDetail(sub)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <p>Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="size-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-7 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Inspector Slide-Over Drawer */}
      <SubmissionDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        submission={selectedSubmission}
        onRefresh={fetchSubmissions}
      />
    </div>
  );
}
