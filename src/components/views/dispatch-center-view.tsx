'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Search, Briefcase, MapPin, Clock, Phone, Star,
  Wrench, Droplets, Wind, Zap, Sparkles, Map as MapIcon,
  UserPlus, ArrowRight, CheckCircle2, AlertTriangle, Navigation,
  Calendar, X, Radio, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────
type JobStatus = 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
type JobPriority = 'urgent' | 'high' | 'medium' | 'low';
type EmployeeStatus = 'available' | 'busy' | 'offline' | 'on_leave' | 'traveling';

interface DispatchJob {
  id: string; jobNumber: string | null; title: string; service: string | null;
  status: string; priority: string; address: string | null;
  scheduledAt: string | null; customerName: string | null;
  assigneeId: string | null; assigneeName: string | null;
  notes: string | null; createdAt: string;
  assignee: { id: string; name: string; phone: string; status: string } | null;
}

interface DispatchEmployee {
  id: string; name: string; phone: string; status: EmployeeStatus;
  skills: string[]; activeJobs: number; rating: number;
  location: string | null; serviceAreas: string[];
}

// ─── Status & Priority Config ───────────────────────────────────────
const statusDotColors: Record<string, string> = {
  available: 'bg-green-500', busy: 'bg-amber-500', offline: 'bg-slate-400',
  on_leave: 'bg-blue-500', traveling: 'bg-cyan-500',
};

const statusLabels: Record<string, string> = {
  available: 'Available', busy: 'Busy', offline: 'Offline',
  on_leave: 'On Leave', traveling: 'Traveling',
};

const priorityConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  urgent: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Urgent' },
  high: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', label: 'High' },
  medium: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Medium' },
  low: { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Low' },
};

const jobStatusColors: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const serviceIcons: Record<string, React.ElementType> = {
  plumbing: Droplets, cleaning: Sparkles, hvac: Wind,
  electrical: Zap, landscaping: MapPin, default: Wrench,
};

function getServiceIcon(service: string | null): React.ElementType {
  if (!service) return Wrench;
  const s = service.toLowerCase();
  if (s.includes('plumb')) return Droplets;
  if (s.includes('clean')) return Sparkles;
  if (s.includes('hvac') || s.includes('ac') || s.includes('air')) return Wind;
  if (s.includes('electr')) return Zap;
  if (s.includes('landscape') || s.includes('garden')) return MapIcon;
  return Wrench;
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

// ─── Helper ─────────────────────────────────────────────────────────
function getSkillMatch(jobService: string, empSkills: string[]): number {
  if (!jobService) return 0;
  const s = jobService.toLowerCase();
  return empSkills.filter(skill => skill.toLowerCase().includes(s) || s.includes(skill.toLowerCase())).length;
}

const fmtDate = (d: string | null | undefined) => {
  if (!d) return 'Not scheduled';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch { return '—'; }
};

// ════════════════════════════════════════════════════════════════════
// DISPATCH CENTER VIEW
// ════════════════════════════════════════════════════════════════════
export function DispatchCenterView() {
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [employees, setEmployees] = useState<DispatchEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');
  const [jobPriorityFilter, setJobPriorityFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<DispatchJob | null>(null);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [jobsRes, empsRes] = await Promise.all([
        fetch('/api/jobs?limit=100'),
        fetch('/api/employees?autoRefreshStatus=true&limit=50'),
      ]);
      if (!jobsRes.ok) throw new Error('Failed to fetch jobs');
      if (!empsRes.ok) throw new Error('Failed to fetch employees');
      const jobsData = await jobsRes.json();
      const empsData = await empsRes.json();
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setEmployees((empsData.data || []).map((e: any) => ({
        id: e.id, name: e.name, phone: e.phone, status: e.status,
        skills: parseJsonArray(e.skills), activeJobs: e.activeJobs || 0,
        rating: e.rating || 0, location: e.location || null,
        serviceAreas: parseJsonArray(e.serviceAreas),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Computed Stats ──────────────────────────────────────────────
  const availableEmployees = employees.filter(e => e.status === 'available');
  const busyEmployees = employees.filter(e => e.status === 'busy' || e.status === 'traveling');
  const unassignedJobs = jobs.filter(j => j.status === 'pending' && !j.assigneeId);
  const activeJobs = jobs.filter(j => ['assigned', 'accepted', 'in_progress'].includes(j.status));
  const todayJobs = jobs; // All jobs from API

  // ─── Filtered Jobs ───────────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    return todayJobs.filter(job => {
      const matchesSearch = !searchQuery ||
        (job.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.address || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = jobStatusFilter === 'all' || job.status === jobStatusFilter;
      const matchesPriority = jobPriorityFilter === 'all' || job.priority === jobPriorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [todayJobs, searchQuery, jobStatusFilter, jobPriorityFilter]);

  // ─── Assign Job ──────────────────────────────────────────────────
  const handleAssign = async (jobId: string, empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    setAssigning(jobId);
    try {
      const res = await fetch('/api/jobs', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, assigneeId: emp.id, assigneeName: emp.name, assigneePhone: emp.phone, status: 'assigned' }),
      });
      if (!res.ok) throw new Error('Failed to assign job');
      toast.success(`${emp.name} assigned`, { description: 'Job status updated to Assigned' });
      await fetchData();
    } catch { toast.error('Failed to assign job'); }
    finally { setAssigning(null); }
  };

  // ─── Auto Assign (Skill Match) ───────────────────────────────────
  const handleAutoAssign = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    let bestMatch: DispatchEmployee | null = null;
    let bestScore = -1;
    for (const emp of availableEmployees) {
      const score = getSkillMatch(job.service || '', emp.skills);
      if (score > bestScore) { bestScore = score; bestMatch = emp; }
    }
    // If no skill match, just pick first available
    if (!bestMatch && availableEmployees.length > 0) {
      bestMatch = availableEmployees.reduce((a, b) => a.activeJobs <= b.activeJobs ? a : b);
    }
    if (bestMatch) {
      await handleAssign(jobId, bestMatch.id);
    } else {
      toast.error('No available employees', { description: 'All employees are currently busy or offline' });
    }
  };

  // ─── AI Auto-Assign All ──────────────────────────────────────────
  const handleAIAssignAll = async () => {
    setAutoAssigning(true);
    const pendingUnassigned = unassignedJobs;
    let assigned = 0;
    for (const job of pendingUnassigned) {
      const availEmps = employees.filter(e => e.status === 'available');
      let bestMatch: DispatchEmployee | null = null;
      let bestScore = -1;
      for (const emp of availEmps) {
        const score = getSkillMatch(job.service || '', emp.skills);
        if (score > bestScore) { bestScore = score; bestMatch = emp; }
      }
      if (!bestMatch && availEmps.length > 0) {
        bestMatch = availEmps.reduce((a, b) => a.activeJobs <= b.activeJobs ? a : b);
      }
      if (bestMatch) {
        try {
          const res = await fetch('/api/jobs', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: job.id, assigneeId: bestMatch.id, assigneeName: bestMatch.name, assigneePhone: bestMatch.phone, status: 'assigned' }),
          });
          if (res.ok) assigned++;
        } catch {}
      }
    }
    toast.success(`Auto-assigned ${assigned} jobs`, { description: `${assigned} of ${pendingUnassigned.length} unassigned jobs have been assigned` });
    setAutoAssigning(false);
    await fetchData();
  };

  const handleOpenJobDetail = (job: DispatchJob) => { setSelectedJob(job); setJobDetailOpen(true); };

  // ─── Loading State ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm text-muted-foreground">Loading dispatch center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="p-4 rounded-full bg-red-50"><AlertCircle className="size-8 text-red-500" /></div>
        <p className="text-sm font-medium text-red-600">Failed to load dispatch data</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw className="size-3.5" />Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Radio className="size-5 text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Smart Dispatch Center</h1>
            <p className="text-sm text-muted-foreground">Assign and track today&apos;s jobs in real time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchData}>
            <RefreshCw className="size-3.5" />Refresh
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-xs" size="sm" onClick={handleAIAssignAll} disabled={autoAssigning || unassignedJobs.length === 0}>
            {autoAssigning ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {autoAssigning ? 'Assigning...' : 'AI Auto-Assign All'}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground font-medium">Available</p><p className="text-2xl font-bold text-green-600">{availableEmployees.length}</p></div>
              <div className="p-2.5 rounded-xl bg-green-50"><Users className="size-5 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground font-medium">Busy / Traveling</p><p className="text-2xl font-bold text-amber-600">{busyEmployees.length}</p></div>
              <div className="p-2.5 rounded-xl bg-amber-50"><Briefcase className="size-5 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground font-medium">Total Jobs</p><p className="text-2xl font-bold">{todayJobs.length}</p></div>
              <div className="p-2.5 rounded-xl bg-emerald-50"><Calendar className="size-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground font-medium">Unassigned</p><p className="text-2xl font-bold text-red-600">{unassignedJobs.length}</p></div>
              <div className="p-2.5 rounded-xl bg-red-50"><AlertTriangle className="size-5 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Today's Jobs */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="size-4 text-emerald-600" />
                    Jobs <Badge variant="secondary" className="text-[10px]">{filteredJobs.length}</Badge>
                  </CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input placeholder="Search jobs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-xs" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                      <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={jobPriorityFilter} onValueChange={setJobPriorityFilter}>
                      <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    {(jobStatusFilter !== 'all' || jobPriorityFilter !== 'all' || searchQuery) && (
                      <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setJobStatusFilter('all'); setJobPriorityFilter('all'); setSearchQuery(''); }}>
                        <X className="size-3 mr-1" />Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-2">
                  {filteredJobs.length === 0 ? (
                    <div className="py-12 text-center">
                      <Briefcase className="size-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium text-sm">No jobs found</p>
                    </div>
                  ) : (
                    filteredJobs.map(job => {
                      const prioCfg = priorityConfig[job.priority] || priorityConfig.medium;
                      const ServiceIcon = getServiceIcon(job.service);
                      const isUnassigned = job.status === 'pending' && !job.assigneeId;

                      return (
                        <div key={job.id} className={cn(
                          'p-3.5 rounded-lg border transition-all hover:shadow-sm cursor-pointer group',
                          job.priority === 'urgent' ? 'border-red-200 bg-red-50/30' :
                          isUnassigned ? 'border-amber-200 bg-amber-50/20' :
                          'border-transparent hover:border-muted'
                        )} onClick={() => handleOpenJobDetail(job)}>
                          <div className="flex items-start gap-3">
                            <div className={cn('p-2 rounded-lg shrink-0', prioCfg.bg)}>
                              <ServiceIcon className={cn('size-4', prioCfg.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h4 className="text-sm font-semibold truncate">{job.title}</h4>
                                  <Badge variant="outline" className={cn('text-[9px] shrink-0', prioCfg.bg, prioCfg.color, prioCfg.border)}>{prioCfg.label}</Badge>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isUnassigned && (
                                    <>
                                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={(e) => { e.stopPropagation(); handleAutoAssign(job.id); }} disabled={assigning === job.id}>
                                        <Wrench className="size-3" />Auto
                                      </Button>
                                      <Select onValueChange={(v) => { handleAssign(job.id, v); }}>
                                        <SelectTrigger className="h-7 text-[10px] w-24" onClick={e => e.stopPropagation()}>
                                          <SelectValue placeholder="Assign" />
                                        </SelectTrigger>
                                        <SelectContent onClick={e => e.stopPropagation()}>
                                          {availableEmployees.length === 0 ? (
                                            <SelectItem value="none" disabled>No available</SelectItem>
                                          ) : (
                                            availableEmployees.map(emp => (
                                              <SelectItem key={emp.id} value={emp.id}>
                                                <div className="flex items-center gap-1.5">
                                                  <Avatar className="size-4"><AvatarFallback className="text-[7px] bg-emerald-100 text-emerald-700">{emp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</AvatarFallback></Avatar>
                                                  <span>{emp.name}</span>
                                                </div>
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </>
                                  )}
                                  {!isUnassigned && job.assigneeId && (
                                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                      <CheckCircle2 className="size-3 mr-0.5" />{job.assigneeName}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {job.address && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" />{job.address}</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {job.scheduledAt && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" />{fmtDate(job.scheduledAt)}</span>}
                                <Badge variant="outline" className={cn('text-[9px]', jobStatusColors[job.status] || 'bg-slate-100 text-slate-600 border-slate-200')}>{job.status}</Badge>
                                {job.service && <span className="text-[10px] text-muted-foreground">{job.service}</span>}
                                {job.customerName && <span className="text-[10px] text-muted-foreground">{job.customerName}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Available Employees + Map */}
        <div className="space-y-4">
          {/* Available Employees */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4 text-emerald-600" />
                Employees <Badge variant="secondary" className="text-[10px]">{employees.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {employees.map(emp => (
                    <div key={emp.id} className="p-3 rounded-lg border border-transparent hover:border-muted hover:bg-muted/30 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <Avatar className="size-9">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                              {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white', statusDotColors[emp.status] || 'bg-slate-400')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold truncate">{emp.name}</h4>
                            <span className="text-[9px] text-muted-foreground">{emp.rating > 0 ? `${emp.rating}★` : ''}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {emp.skills.slice(0, 2).map(skill => (
                              <Badge key={skill} variant="secondary" className="text-[8px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700">{skill}</Badge>
                            ))}
                            {emp.skills.length > 2 && <span className="text-[8px] text-muted-foreground">+{emp.skills.length - 2}</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            {emp.status === 'available' ? (
                              <><Navigation className="size-3 text-green-500" /><span className="text-[9px] text-green-700">{emp.location || 'Available'}</span></>
                            ) : (
                              <><Briefcase className="size-3 text-amber-500" /><span className="text-[9px] text-amber-700">{emp.activeJobs} active job{emp.activeJobs !== 1 ? 's' : ''}</span></>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {employees.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      <Users className="size-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No employees found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Map Placeholder */}
          <Card className="border-dashed border-2">
            <CardContent className="p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]">
              <div className="p-4 rounded-full bg-muted"><MapIcon className="size-8 text-muted-foreground" /></div>
              <div className="text-center">
                <h3 className="font-semibold text-sm text-muted-foreground">Map View</h3>
                <p className="text-xs text-muted-foreground mt-1">Coming Soon</p>
              </div>
              <Badge variant="outline" className="text-[10px] bg-muted/50">Real-time location tracking</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Job Detail Sheet */}
      <Sheet open={jobDetailOpen} onOpenChange={setJobDetailOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader>
                <SheetTitle>Job Details</SheetTitle>
                <SheetDescription>{selectedJob.jobNumber || selectedJob.id.slice(0, 8)}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Job Title & Priority */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold">{selectedJob.title}</h2>
                    <Badge variant="outline" className={cn('text-xs', (priorityConfig[selectedJob.priority] || priorityConfig.medium).bg, (priorityConfig[selectedJob.priority] || priorityConfig.medium).color, (priorityConfig[selectedJob.priority] || priorityConfig.medium).border)}>
                      {(priorityConfig[selectedJob.priority] || priorityConfig.medium).label}
                    </Badge>
                  </div>
                  <Badge variant="outline" className={cn('text-xs mt-2', jobStatusColors[selectedJob.status] || 'bg-slate-100 text-slate-600 border-slate-200')}>{selectedJob.status}</Badge>
                </div>

                <Separator />

                {/* Job Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                    <Users className="size-4 text-muted-foreground shrink-0" />
                    <div><p className="text-[10px] text-muted-foreground">Customer</p><p className="text-sm font-medium">{selectedJob.customerName || 'Unknown'}</p></div>
                  </div>
                  {selectedJob.address && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      <MapPin className="size-4 text-muted-foreground shrink-0" />
                      <div><p className="text-[10px] text-muted-foreground">Address</p><p className="text-sm font-medium">{selectedJob.address}</p></div>
                    </div>
                  )}
                  {selectedJob.scheduledAt && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      <Clock className="size-4 text-muted-foreground shrink-0" />
                      <div><p className="text-[10px] text-muted-foreground">Scheduled</p><p className="text-sm font-medium">{fmtDate(selectedJob.scheduledAt)}</p></div>
                    </div>
                  )}
                  {selectedJob.service && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      {(() => { const SI = getServiceIcon(selectedJob.service); return <SI className="size-4 text-muted-foreground shrink-0" />; })()}
                      <div><p className="text-[10px] text-muted-foreground">Service</p><p className="text-sm font-medium">{selectedJob.service}</p></div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Assignment */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Assignment</h4>
                  {selectedJob.assigneeId ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <Avatar className="size-9"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">{(selectedJob.assigneeName || '?').split(' ').map(n => n[0]).join('').substring(0, 2)}</AvatarFallback></Avatar>
                      <div><p className="text-sm font-medium">{selectedJob.assigneeName}</p><p className="text-[10px] text-emerald-600">Assigned to this job</p></div>
                      <CheckCircle2 className="size-5 text-emerald-600 ml-auto" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertTriangle className="size-5 text-amber-500" />
                        <div><p className="text-sm font-medium text-amber-700">No employee assigned</p><p className="text-[10px] text-amber-600">Assign an employee to proceed</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => handleAutoAssign(selectedJob.id)} disabled={assigning === selectedJob.id}>
                          <Wrench className="size-3.5" />Auto Assign
                        </Button>
                        <Select onValueChange={(v) => handleAssign(selectedJob.id, v)}>
                          <SelectTrigger className="flex-1 h-9 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent>
                            {availableEmployees.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {selectedJob.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Notes</h4>
                      <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">{selectedJob.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
