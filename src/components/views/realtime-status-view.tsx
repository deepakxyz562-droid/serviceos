'use client';

import { useState } from 'react';
import {
  Activity, CheckCircle2, Clock, Circle, ShieldCheck, Send, MapPin,
  ArrowRight, Briefcase, Battery, BatteryCharging, BatteryLow,
  BatteryMedium, BatteryFull, Navigation, RefreshCw, Star, Filter,
  Settings2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ─── Shared StatCard ──────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color, bg, trend }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color: string; bg: string; trend?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.startsWith('+') ? (
                  <ArrowUpRight className="size-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3 text-red-500" />
                )}
                <span className={cn('text-[10px] font-medium', trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600')}>
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl', bg)}><Icon className={cn('size-5', color)} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

type EmployeeStatus = 'Available' | 'Busy' | 'Offline' | 'On Leave' | 'In Transit';

interface EmployeeStatusEntry {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: EmployeeStatus;
  lastSeen: string;
  currentJob: string | null;
  location: string;
  batteryLevel: number;
  rating: number;
  jobsToday: number;
}

const employeeStatuses: EmployeeStatusEntry[] = [
  { id: 'e1', name: 'Mike Torres', initials: 'MT', role: 'Senior Plumber', status: 'Available', lastSeen: 'Just now', currentJob: null, location: 'Downtown District', batteryLevel: 85, rating: 4.8, jobsToday: 3 },
  { id: 'e2', name: 'Ana Rodriguez', initials: 'AR', role: 'Cleaning Lead', status: 'Busy', lastSeen: '2 min ago', currentJob: 'JOB-1003 - Deep Clean', location: 'Riverside Heights', batteryLevel: 62, rating: 4.9, jobsToday: 4 },
  { id: 'e3', name: 'David Chen', initials: 'DC', role: 'HVAC Technician', status: 'In Transit', lastSeen: 'Just now', currentJob: 'JOB-1002 - HVAC Repair', location: 'En route to Westfield', batteryLevel: 44, rating: 4.6, jobsToday: 2 },
  { id: 'e4', name: 'Sarah Kim', initials: 'SK', role: 'Electrician', status: 'Busy', lastSeen: '5 min ago', currentJob: 'JOB-1006 - Panel Upgrade', location: 'Oakwood Estate', batteryLevel: 91, rating: 4.7, jobsToday: 3 },
  { id: 'e5', name: 'James Patel', initials: 'JP', role: 'Plumber', status: 'Offline', lastSeen: '2 hrs ago', currentJob: null, location: 'Unknown', batteryLevel: 12, rating: 4.5, jobsToday: 0 },
  { id: 'e6', name: 'Lisa Wang', initials: 'LW', role: 'Cleaning Tech', status: 'On Leave', lastSeen: '1 day ago', currentJob: null, location: 'N/A', batteryLevel: 0, rating: 4.8, jobsToday: 0 },
  { id: 'e7', name: 'Robert Adams', initials: 'RA', role: 'HVAC Specialist', status: 'Available', lastSeen: 'Just now', currentJob: null, location: 'Central Hub', batteryLevel: 73, rating: 4.4, jobsToday: 2 },
  { id: 'e8', name: 'Emily Foster', initials: 'EF', role: 'Electrician', status: 'In Transit', lastSeen: '1 min ago', currentJob: 'JOB-1008 - Wiring Install', location: 'En route to Elm St', batteryLevel: 56, rating: 4.6, jobsToday: 2 },
  { id: 'e9', name: 'Carlos Mendez', initials: 'CM', role: 'Senior Cleaner', status: 'Busy', lastSeen: '3 min ago', currentJob: 'JOB-1009 - Office Clean', location: 'Business Park A', batteryLevel: 38, rating: 4.7, jobsToday: 5 },
  { id: 'e10', name: 'Diana Lee', initials: 'DL', role: 'Plumber', status: 'Available', lastSeen: 'Just now', currentJob: null, location: 'Eastside Depot', batteryLevel: 97, rating: 4.9, jobsToday: 1 },
];

const statusConfig: Record<EmployeeStatus, { color: string; bgColor: string; dotColor: string; borderColor: string; badgeClass: string }> = {
  'Available': { color: 'text-emerald-700', bgColor: 'bg-emerald-50', dotColor: 'bg-emerald-500', borderColor: 'border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'Busy': { color: 'text-amber-700', bgColor: 'bg-amber-50', dotColor: 'bg-amber-500', borderColor: 'border-amber-200', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  'Offline': { color: 'text-slate-600', bgColor: 'bg-slate-50', dotColor: 'bg-slate-400', borderColor: 'border-slate-200', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  'On Leave': { color: 'text-blue-700', bgColor: 'bg-blue-50', dotColor: 'bg-blue-500', borderColor: 'border-blue-200', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
  'In Transit': { color: 'text-cyan-700', bgColor: 'bg-cyan-50', dotColor: 'bg-cyan-500', borderColor: 'border-cyan-200', badgeClass: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
};

function BatteryIndicator({ level }: { level: number }) {
  const IconComponent = level === 0 ? Battery : level <= 20 ? BatteryLow : level <= 50 ? BatteryMedium : level <= 80 ? BatteryCharging : BatteryFull;
  const color = level === 0 ? 'text-slate-300' : level <= 20 ? 'text-red-500' : level <= 50 ? 'text-amber-500' : 'text-emerald-500';
  return (
    <div className="flex items-center gap-1">
      <IconComponent className={cn('size-3.5', color)} />
      <span className={cn('text-[10px] font-medium', color)}>{level}%</span>
    </div>
  );
}

export function RealtimeStatusView() {
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'All'>('All');

  const filteredEmployees = statusFilter === 'All'
    ? employeeStatuses
    : employeeStatuses.filter(e => e.status === statusFilter);

  const statusCounts = {
    Available: employeeStatuses.filter(e => e.status === 'Available').length,
    Busy: employeeStatuses.filter(e => e.status === 'Busy').length,
    Offline: employeeStatuses.filter(e => e.status === 'Offline').length,
    'On Leave': employeeStatuses.filter(e => e.status === 'On Leave').length,
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Activity className="size-5 text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Real-Time Employee Status</h1>
            <p className="text-sm text-muted-foreground">Live tracking and workforce management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Live</span>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
            <RefreshCw className="size-3" />Refresh
          </Button>
        </div>
      </div>

      {/* Status Count Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Available" value={statusCounts.Available.toString()} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Busy" value={statusCounts.Busy.toString()} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Offline" value={statusCounts.Offline.toString()} icon={Circle} color="text-slate-500" bg="bg-slate-50" />
        <StatCard title="On Leave" value={statusCounts['On Leave'].toString()} icon={ShieldCheck} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="size-4 text-muted-foreground" />
        {(['All', 'Available', 'Busy', 'In Transit', 'On Leave', 'Offline'] as const).map(status => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? 'default' : 'outline'}
            className={cn(
              'h-7 text-xs gap-1.5',
              statusFilter === status && 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
            onClick={() => setStatusFilter(status)}
          >
            {status !== 'All' && (
              <div className={cn('size-2 rounded-full', statusConfig[status].dotColor)} />
            )}
            {status}
            {status !== 'All' && (
              <span className="text-[9px] opacity-70">
                ({employeeStatuses.filter(e => e.status === status).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEmployees.map(emp => {
          const config = statusConfig[emp.status];
          const isOnline = emp.status === 'Available' || emp.status === 'Busy' || emp.status === 'In Transit';
          return (
            <Card key={emp.id} className={cn('hover:shadow-md transition-all relative overflow-hidden', config.borderColor, 'border')}>
              {/* Status bar top */}
              <div className={cn('h-1', config.dotColor)} />
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarFallback className={cn('text-xs font-semibold', config.bgColor, config.color)}>
                        {emp.initials}
                      </AvatarFallback>
                    </Avatar>
                    {/* Live presence dot */}
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <div className={cn('size-3.5 rounded-full border-2 border-white', config.dotColor)} />
                        <div className={cn('absolute inset-0 size-3.5 rounded-full animate-ping opacity-40', config.dotColor)} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-semibold truncate">{emp.name}</p>
                      <Badge variant="outline" className={cn('text-[9px] shrink-0 px-1.5', config.badgeClass)}>
                        {emp.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{emp.role}</p>
                  </div>
                </div>

                {/* Job Assignment */}
                {emp.currentJob && (
                  <div className="mt-3 p-2 rounded-md bg-muted/50 border">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="size-3 text-emerald-600" />
                      <span className="text-[10px] font-medium text-emerald-700 truncate">{emp.currentJob}</span>
                    </div>
                  </div>
                )}

                {/* Info Row */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{emp.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{emp.lastSeen}</span>
                    </div>
                    <BatteryIndicator level={emp.batteryLevel} />
                  </div>
                </div>

                {/* Bottom Stats */}
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="size-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-medium">{emp.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="size-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{emp.jobsToday} today</span>
                  </div>
                  {emp.status === 'Available' && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                      <Send className="size-2.5" />Assign
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Auto-Status Rules */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Settings2 className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Auto-Status Rules</CardTitle>
                <CardDescription className="text-xs">Automatic status transitions based on activity</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Settings2 className="size-3" />Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { rule: 'Job Assigned', from: 'Available', to: 'Busy', icon: Briefcase, active: true },
              { rule: 'Job Completed', from: 'Busy', to: 'Available', icon: CheckCircle2, active: true },
              { rule: 'No Activity (30 min)', from: 'Available', to: 'Offline', icon: Clock, active: true },
              { rule: 'GPS En Route Detected', from: 'Busy', to: 'In Transit', icon: Navigation, active: true },
              { rule: 'Arrival Detected', from: 'In Transit', to: 'Busy', icon: MapPin, active: false },
              { rule: 'Low Battery (&lt;10%)', from: 'Any', to: 'Offline', icon: BatteryLow, active: true },
            ].map((rule, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2.5">
                  <rule.icon className="size-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">{rule.rule}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {rule.from} <ArrowRight className="inline size-2.5 mx-0.5" /> {rule.to}
                    </p>
                  </div>
                </div>
                <Badge className={cn('text-[9px]', rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                  {rule.active ? 'Active' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
