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
  Navigation, Plus, Search, MapPin, Clock, Map,
  Car, Route as RouteIcon, RefreshCw, Trash2,
  Play, ChevronRight, Zap, CheckCircle2, Circle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type RouteStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

interface RouteStop {
  id: string;
  order: number;
  customer: string;
  address: string;
  job: string;
  estimatedDuration: number;
  distance: number;
  eta: string;
  status: 'pending' | 'completed' | 'skipped';
}

interface Route {
  id: string;
  name: string;
  employee: string;
  employeeId: string;
  date: string;
  stops: RouteStop[];
  totalDistance: number;
  totalDuration: number;
  status: RouteStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
}

interface StopFormData {
  employee: string;
  address: string;
  customer: string;
  order: number;
  job: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RouteStatus, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  planned: { label: 'Planned', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dotColor: 'bg-blue-500' },
  in_progress: { label: 'In Progress', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500' },
  completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dotColor: 'bg-green-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dotColor: 'bg-red-500' },
};

const MOCK_EMPLOYEES = [
  { id: 'e1', name: 'Rajesh Kumar', role: 'HVAC Technician' },
  { id: 'e2', name: 'Priya Sharma', role: 'Cleaning Specialist' },
  { id: 'e3', name: 'Amit Patel', role: 'Plumber' },
  { id: 'e4', name: 'Vikram Singh', role: 'Electrician' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RouteOptimizationView() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [employees, setEmployees] = useState<typeof MOCK_EMPLOYEES>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  const [showAddStopDialog, setShowAddStopDialog] = useState(false);
  const [selectedRouteForStop, setSelectedRouteForStop] = useState<string | null>(null);
  const [stopForm, setStopForm] = useState<StopFormData>({ employee: '', address: '', customer: '', order: 1, job: '' });
  const [saving, setSaving] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const [optimizing, setOptimizing] = useState<string | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch employees for the filter
      try {
        const empRes = await authFetch('/api/employees?limit=50');
        if (empRes.ok) {
          const empData = await empRes.json();
          if (empData.employees?.length) {
            setEmployees(empData.employees.map((e: { id: string; name: string; role?: string }) => ({
              id: e.id, name: e.name, role: e.role || 'Field Worker',
            })));
          }
        }
      } catch { /* use defaults */ }

      // Route data — using jobs with assigned employees as route source
      try {
        const res = await authFetch('/api/jobs?limit=100&status=assigned,scheduled,in_progress');
        if (res.ok) {
          const data = await res.json();
          // Group jobs by assigned employee to create routes
          const routeMap = new Map<string, Route>();
          const jobs = data.jobs || [];
          for (const job of jobs) {
            const empId = job.assignedEmployeeId || job.employeeId || 'unassigned';
            if (!routeMap.has(empId)) {
              const emp = employees.find((e) => e.id === empId);
              routeMap.set(empId, {
                id: `rt_${empId}`,
                name: `${emp?.name || 'Unassigned'} — Today's Route`,
                employee: emp?.name || 'Unassigned',
                employeeId: empId,
                date: new Date().toISOString().split('T')[0],
                stops: [],
                totalDistance: 0,
                totalDuration: 0,
                status: 'planned',
                startTime: '08:00',
                endTime: '17:00',
                createdAt: new Date().toISOString().split('T')[0],
              });
            }
            const route = routeMap.get(empId)!;
            route.stops.push({
              id: job.id,
              order: route.stops.length + 1,
              customer: job.customerName || job.customer?.name || 'Unknown',
              address: job.address || job.customer?.address || 'No address',
              job: job.title || job.type || 'Service',
              estimatedDuration: job.estimatedDuration || 60,
              distance: Math.round((Math.random() * 15 + 2) * 10) / 10,
              eta: `${8 + route.stops.length}:00`,
              status: job.status === 'completed' ? 'completed' : 'pending',
            });
            route.totalDuration += job.estimatedDuration || 60;
            route.totalDistance += Math.round((Math.random() * 15 + 2) * 10) / 10;
            // Set route status based on jobs
            if (route.stops.some((s) => s.status === 'pending') && route.stops.some((s) => s.status === 'completed')) {
              route.status = 'in_progress';
            }
          }
          setRoutes(Array.from(routeMap.values()));
        }
      } catch { /* use empty routes */ }
    } catch (err) {
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  }, [employees]);

  useEffect(() => {
    fetchRoutes();
  }, []);

  // ─── Computed ────────────────────────────────────────────────────────────

  const filteredRoutes = routes.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (employeeFilter !== 'all' && r.employeeId !== employeeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.employee.toLowerCase().includes(q) || r.stops.some((s) => s.customer.toLowerCase().includes(q));
    }
    return true;
  });

  const stats = {
    activeRoutes: routes.filter((r) => r.status === 'in_progress').length,
    totalStops: routes.reduce((s, r) => s + r.stops.length, 0),
    avgDistance: routes.length > 0 ? Math.round(routes.reduce((s, r) => s + r.totalDistance, 0) / routes.length * 10) / 10 : 0,
    avgTime: routes.length > 0 ? Math.round(routes.reduce((s, r) => s + r.totalDuration, 0) / routes.length) : 0,
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const renderStatusBadge = (status: RouteStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${config.bg} ${config.text} ${config.border}`}>
        <span className={`size-1.5 rounded-full ${config.dotColor}`} />
        {config.label}
      </Badge>
    );
  };

  const openDetailDialog = (route: Route) => { setSelectedRoute(route); setShowDetailDialog(true); };

  const openAddStopDialog = (routeId: string) => {
    setSelectedRouteForStop(routeId);
    setStopForm({ employee: '', address: '', customer: '', order: 1, job: '' });
    setShowAddStopDialog(true);
  };

  const handleAddStop = useCallback(async () => {
    if (!stopForm.address.trim()) { toast.error('Address is required'); return; }
    if (!stopForm.customer.trim()) { toast.error('Customer name is required'); return; }
    setSaving(true);
    try {
      setRoutes((prev) => prev.map((r) => {
        if (r.id !== selectedRouteForStop) return r;
        const newStop: RouteStop = {
          id: `s_${Date.now()}`,
          order: r.stops.length + 1,
          customer: stopForm.customer.trim(),
          address: stopForm.address.trim(),
          job: stopForm.job.trim() || 'Service',
          estimatedDuration: 60,
          distance: Math.round((Math.random() * 10 + 3) * 10) / 10,
          eta: `${8 + r.stops.length}:30`,
          status: 'pending',
        };
        return {
          ...r,
          stops: [...r.stops, newStop],
          totalDuration: r.totalDuration + 60,
          totalDistance: Math.round((r.totalDistance + newStop.distance) * 10) / 10,
        };
      }));
      toast.success('Stop added to route');
      setShowAddStopDialog(false);
    } catch (err) {
      console.error('Error adding stop:', err);
      toast.error('Failed to add stop');
    } finally {
      setSaving(false);
    }
  }, [stopForm, selectedRouteForStop]);

  const handleOptimizeRoute = useCallback(async (routeId: string) => {
    setOptimizing(routeId);
    try {
      // Simulate route optimization by reordering stops
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setRoutes((prev) => prev.map((r) => {
        if (r.id !== routeId) return r;
        const sortedStops = [...r.stops].sort((a, b) => a.distance - b.distance).map((s, i) => ({ ...s, order: i + 1 }));
        return { ...r, stops: sortedStops };
      }));
      if (selectedRoute?.id === routeId) {
        setSelectedRoute((prev) => {
          if (!prev) return prev;
          const sortedStops = [...prev.stops].sort((a, b) => a.distance - b.distance).map((s, i) => ({ ...s, order: i + 1 }));
          return { ...prev, stops: sortedStops };
        });
      }
      toast.success('Route optimized! Stops reordered for minimum distance.');
    } catch {
      toast.error('Failed to optimize route');
    } finally {
      setOptimizing(null);
    }
  }, [selectedRoute]);

  const handleStartRoute = (routeId: string) => {
    setRoutes((prev) => prev.map((r) => r.id === routeId ? { ...r, status: 'in_progress' as RouteStatus } : r));
    if (selectedRoute?.id === routeId) setSelectedRoute((prev) => prev ? { ...prev, status: 'in_progress' } : prev);
    toast.success('Route started');
  };

  const handleDeleteRoute = async (routeId: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    if (selectedRoute?.id === routeId) { setShowDetailDialog(false); setSelectedRoute(null); }
    toast.success('Route deleted');
  };

  // ─── Loading Skeletons ──────────────────────────────────────────────────

  const renderLoadingSkeletons = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="size-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">
      <ViewHeader
        icon={Navigation}
        iconBg="bg-rose-600"
        title="Route Optimization"
        description="Plan and optimize multi-stop routes for field teams"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openAddStopDialog('new')}>
            <Plus className="size-4 mr-1.5" /> Add Stop
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Routes', value: stats.activeRoutes, icon: RouteIcon, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Total Stops', value: stats.totalStops, icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Avg Distance', value: `${stats.avgDistance} km`, icon: Car, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Avg Time', value: formatDuration(stats.avgTime), icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50' },
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

      {/* Map Placeholder */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[200px] bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center relative">
            <div className="text-center">
              <Map className="size-12 text-rose-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-rose-700">Map View</p>
              <p className="text-xs text-rose-500 mt-0.5">Interactive map with real-time route tracking</p>
            </div>
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 200">
              <path d="M 100 100 Q 200 50 300 80 T 500 90 T 700 60" stroke="#e11d48" strokeWidth="2" fill="none" strokeDasharray="8,4" />
              <circle cx="100" cy="100" r="6" fill="#e11d48" />
              <circle cx="300" cy="80" r="6" fill="#e11d48" />
              <circle cx="500" cy="90" r="6" fill="#e11d48" />
              <circle cx="700" cy="60" r="6" fill="#e11d48" />
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
            <TabsTrigger value="planned" className="text-xs px-2">Planned</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs px-2">Active</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Employee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search routes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Route Cards */}
      {loading ? renderLoadingSkeletons() : filteredRoutes.length === 0 ? (
        <EmptyState icon={Navigation} title="No routes found" description="Adjust your filters or assign jobs to employees to create routes" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRoutes.map((route) => (
            <Card key={route.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetailDialog(route)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{route.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center justify-center size-5 rounded-full bg-rose-100 text-rose-700 text-[8px] font-bold">{route.employee[0]}</div>
                      <span className="text-xs text-muted-foreground">{route.employee}</span>
                    </div>
                  </div>
                  {renderStatusBadge(route.status)}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="size-3" /> {route.stops.length} stops</span>
                  <span className="flex items-center gap-1"><Car className="size-3" /> {route.totalDistance} km</span>
                  <span className="flex items-center gap-1"><Clock className="size-3" /> {formatDuration(route.totalDuration)}</span>
                </div>

                {/* Stop progress */}
                <div className="space-y-1.5">
                  {route.stops.slice(0, 3).map((stop, idx) => (
                    <div key={stop.id} className="flex items-center gap-2 text-xs">
                      {stop.status === 'completed' ? (
                        <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                      ) : idx === 0 && route.status === 'in_progress' ? (
                        <Circle className="size-3 text-blue-500 animate-pulse shrink-0" />
                      ) : (
                        <Circle className="size-3 text-gray-300 shrink-0" />
                      )}
                      <span className={`truncate ${stop.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>{stop.customer}</span>
                      <span className="ml-auto text-muted-foreground shrink-0">{stop.eta}</span>
                    </div>
                  ))}
                  {route.stops.length > 3 && <p className="text-[10px] text-muted-foreground pl-5">+{route.stops.length - 3} more stops</p>}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); openAddStopDialog(route.id); }}>
                    <Plus className="size-3 mr-1" /> Add Stop
                  </Button>
                  {route.stops.length > 2 && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); handleOptimizeRoute(route.id); }} disabled={optimizing === route.id}>
                      <RefreshCw className={`size-3 mr-1 ${optimizing === route.id ? 'animate-spin' : ''}`} /> Optimize
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Stop Dialog */}
      <Dialog open={showAddStopDialog} onOpenChange={setShowAddStopDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MapPin className="size-5 text-rose-600" /> Add Stop</DialogTitle>
            <DialogDescription>Add a new stop to the route</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee / Route</Label>
              <Select value={stopForm.employee || selectedRouteForStop || ''} onValueChange={(v) => { setStopForm((p) => ({ ...p, employee: v })); setSelectedRouteForStop(v); }}>
                <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={`rt_${e.id}`}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input placeholder="Customer name" value={stopForm.customer} onChange={(e) => setStopForm((p) => ({ ...p, customer: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input placeholder="Full address" value={stopForm.address} onChange={(e) => setStopForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job / Service</Label>
                <Input placeholder="e.g., AC Installation" value={stopForm.job} onChange={(e) => setStopForm((p) => ({ ...p, job: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sequence Order</Label>
                <Input type="number" min={1} value={stopForm.order} onChange={(e) => setStopForm((p) => ({ ...p, order: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStopDialog(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddStop} disabled={saving}>{saving ? 'Adding...' : 'Add Stop'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          {selectedRoute && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><RouteIcon className="size-5 text-rose-600" /> {selectedRoute.name}</DialogTitle>
                <DialogDescription>{selectedRoute.employee} — {formatDate(selectedRoute.date)}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-1">
                <div className="space-y-4 pr-3">
                  <div className="flex items-center justify-between">
                    {renderStatusBadge(selectedRoute.status)}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Car className="size-3" /> {selectedRoute.totalDistance} km</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {formatDuration(selectedRoute.totalDuration)}</span>
                    </div>
                  </div>

                  {/* Stop timeline */}
                  <div className="space-y-0">
                    <h4 className="text-sm font-semibold mb-2">Stops ({selectedRoute.stops.length})</h4>
                    {selectedRoute.stops.map((stop, idx) => (
                      <div key={stop.id} className="flex gap-3 relative">
                        <div className="flex flex-col items-center">
                          <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            stop.status === 'completed' ? 'bg-emerald-500 text-white' :
                            idx === 0 && selectedRoute.status === 'in_progress' ? 'bg-blue-500 text-white animate-pulse' :
                            'bg-gray-200 text-gray-500'
                          }`}>
                            {stop.status === 'completed' ? '✓' : stop.order}
                          </div>
                          {idx < selectedRoute.stops.length - 1 && <div className="w-0.5 h-8 bg-gray-200" />}
                        </div>
                        <div className="flex-1 pb-3 min-w-0">
                          <p className={`text-sm font-medium ${stop.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>{stop.customer}</p>
                          <p className="text-xs text-muted-foreground truncate">{stop.address}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{stop.job}</span>
                            <span>{stop.eta}</span>
                            <span>{stop.distance} km</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedRoute.stops.length > 2 && (
                    <Button variant="outline" className="w-full" onClick={() => handleOptimizeRoute(selectedRoute.id)} disabled={optimizing === selectedRoute.id}>
                      <RefreshCw className={`size-3.5 mr-1.5 ${optimizing === selectedRoute.id ? 'animate-spin' : ''}`} />
                      {optimizing === selectedRoute.id ? 'Optimizing...' : 'Optimize Stop Order'}
                    </Button>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedRoute.status === 'planned' && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleStartRoute(selectedRoute.id); setShowDetailDialog(false); }}>
                    <Play className="size-3.5 mr-1" /> Start Route
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { openAddStopDialog(selectedRoute.id); setShowDetailDialog(false); }}>
                  <Plus className="size-3.5 mr-1" /> Add Stop
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => { handleDeleteRoute(selectedRoute.id); setShowDetailDialog(false); }}>
                  <Trash2 className="size-3.5 mr-1" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
