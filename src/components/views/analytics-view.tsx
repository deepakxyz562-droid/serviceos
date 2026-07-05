'use client';

import { useState } from 'react';
import {
  BarChart3, TrendingUp, Clock, Star, DollarSign, Users, Target,
  ArrowRight, MessageSquare, Zap, CheckCircle2, AlertTriangle,
  Activity, Eye, ArrowDownRight, ArrowUpRight, List, Flame,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

const monthlyRevenue = [
  { month: 'Jan', value: 42800 },
  { month: 'Feb', value: 38200 },
  { month: 'Mar', value: 51200 },
  { month: 'Apr', value: 47600 },
  { month: 'May', value: 55900 },
  { month: 'Jun', value: 62400 },
  { month: 'Jul', value: 58700 },
  { month: 'Aug', value: 67300 },
  { month: 'Sep', value: 72100 },
  { month: 'Oct', value: 68500 },
  { month: 'Nov', value: 78200 },
  { month: 'Dec', value: 84600 },
];

const jobCompletionRates = [
  { type: 'Plumbing', completed: 142, total: 158, rate: 89.9, color: 'bg-blue-500' },
  { type: 'HVAC', completed: 98, total: 115, rate: 85.2, color: 'bg-amber-500' },
  { type: 'Cleaning', completed: 234, total: 248, rate: 94.4, color: 'bg-emerald-500' },
  { type: 'Electrical', completed: 76, total: 89, rate: 85.4, color: 'bg-violet-500' },
];

const employeeProductivity = [
  { name: 'Mike Torres', initials: 'MT', jobsCompleted: 47, avgRating: 4.8, revenue: 14200 },
  { name: 'Ana Rodriguez', initials: 'AR', jobsCompleted: 52, avgRating: 4.9, revenue: 16800 },
  { name: 'David Chen', initials: 'DC', jobsCompleted: 38, avgRating: 4.6, revenue: 12400 },
  { name: 'Sarah Kim', initials: 'SK', jobsCompleted: 41, avgRating: 4.7, revenue: 13900 },
  { name: 'James Patel', initials: 'JP', jobsCompleted: 35, avgRating: 4.5, revenue: 11200 },
];

const funnelStages = [
  { stage: 'New Leads', count: 1240, color: 'bg-blue-500', pct: 100 },
  { stage: 'Contacted', count: 868, color: 'bg-cyan-500', pct: 70 },
  { stage: 'Qualified', count: 434, color: 'bg-amber-500', pct: 35 },
  { stage: 'Won', count: 217, color: 'bg-emerald-500', pct: 17.5 },
];

const campaignPerformance = [
  { name: 'Spring Flash Sale', ctr: 8.4, conversionRate: 3.2, revenue: 28400, roi: 342, status: 'active' as const },
  { name: 'Customer Win-back', ctr: 6.1, conversionRate: 2.8, revenue: 18900, roi: 256, status: 'active' as const },
  { name: 'New Service Launch', ctr: 11.2, conversionRate: 4.5, revenue: 42100, roi: 478, status: 'active' as const },
  { name: 'Summer Promo', ctr: 5.7, conversionRate: 2.1, revenue: 15200, roi: 198, status: 'completed' as const },
];

export function AnalyticsView() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.value));

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><BarChart3 className="size-5 text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Business Intelligence & Analytics</h1>
            <p className="text-sm text-muted-foreground">Comprehensive performance metrics and insights</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map(period => (
            <Button
              key={period}
              size="sm"
              variant={selectedPeriod === period ? 'default' : 'ghost'}
              className={cn(
                'h-7 text-xs px-3',
                selectedPeriod === period && 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
              onClick={() => setSelectedPeriod(period)}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value="$84,600" subtitle="This month" icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" trend="+8.4%" />
        <StatCard title="Lead Conversion Rate" value="17.5%" subtitle="217 of 1,240 leads" icon={Target} color="text-teal-600" bg="bg-teal-50" trend="+2.3%" />
        <StatCard title="Avg Response Time" value="2.4 min" subtitle="WhatsApp channel" icon={Clock} color="text-green-600" bg="bg-green-50" trend="-12%" />
        <StatCard title="Customer Satisfaction" value="4.7/5.0" subtitle="Based on 842 reviews" icon={Star} color="text-amber-600" bg="bg-amber-50" trend="+0.2" />
      </div>

      {/* Revenue Trends + Job Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue Trends Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Revenue Trends</CardTitle>
                <CardDescription className="text-xs">Monthly revenue over the past year</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <TrendingUp className="size-3 mr-1" />+18.2% YoY
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthlyRevenue.map(m => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-6 shrink-0">{m.month}</span>
                  <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${(m.value / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium w-14 text-right">${(m.value / 1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Completion Rates */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Job Completion Rates</CardTitle>
            <CardDescription className="text-xs">By service type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobCompletionRates.map(job => (
              <div key={job.type}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn('size-2.5 rounded-full', job.color)} />
                    <span className="text-xs font-medium">{job.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{job.completed}/{job.total}</span>
                    <span className="text-xs font-semibold text-emerald-600">{job.rate}%</span>
                  </div>
                </div>
                <Progress value={job.rate} className="h-2" />
              </div>
            ))}
            <div className="pt-3 border-t mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Overall</span>
                <span className="text-sm font-bold text-emerald-600">
                  {(jobCompletionRates.reduce((s, j) => s + j.rate, 0) / jobCompletionRates.length).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={jobCompletionRates.reduce((s, j) => s + j.rate, 0) / jobCompletionRates.length}
                className="h-2.5 mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Productivity + Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Employee Productivity Table */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Employee Productivity</CardTitle>
                <CardDescription className="text-xs">Top performing team members</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <List className="size-3" />View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Employee</div>
                <div className="col-span-2 text-center">Jobs</div>
                <div className="col-span-3 text-center">Avg Rating</div>
                <div className="col-span-3 text-right">Revenue</div>
              </div>
              {employeeProductivity.map((emp, idx) => (
                <div key={emp.name} className={cn(
                  'grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/50',
                  idx === 0 && 'bg-emerald-50/50'
                )}>
                  <div className="col-span-4 flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      {idx < 3 && (
                        <span className={cn(
                          'text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center',
                          idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : 'bg-amber-50 text-amber-600'
                        )}>
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                        {emp.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">{emp.name}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-semibold">{emp.jobsCompleted}</span>
                  </div>
                  <div className="col-span-3 flex items-center justify-center gap-1">
                    <Star className="size-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-semibold">{emp.avgRating}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-xs font-semibold text-emerald-600">${emp.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead Conversion Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Lead Conversion Funnel</CardTitle>
            <CardDescription className="text-xs">Pipeline conversion by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelStages.map((stage, idx) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn('size-2.5 rounded-full', stage.color)} />
                      <span className="text-xs font-medium">{stage.stage}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{stage.count}</span>
                      {idx > 0 && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                          {((funnelStages[idx].count / funnelStages[idx - 1].count) * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="h-8 bg-muted/50 rounded-md overflow-hidden">
                      <div
                        className={cn('h-full rounded-md transition-all duration-500 flex items-center px-2', stage.color)}
                        style={{ width: `${stage.pct}%` }}
                      >
                        <span className="text-[10px] font-semibold text-white">{stage.pct}%</span>
                      </div>
                    </div>
                  </div>
                  {idx < funnelStages.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDownRight className="size-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Overall Conversion</span>
                <span className="text-sm font-bold text-emerald-600">17.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Response Analytics + Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WhatsApp Response Time Analytics */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">WhatsApp Response Analytics</CardTitle>
                <CardDescription className="text-xs">Response time and resolution metrics</CardDescription>
              </div>
              <MessageSquare className="size-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg First Response</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">2.4 min</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="size-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 font-medium">-18% vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Resolution Time</p>
                <p className="text-lg font-bold text-teal-700 mt-1">14.8 min</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="size-3 text-teal-500" />
                  <span className="text-[10px] text-teal-600 font-medium">-8% vs last month</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Response Time Distribution</p>
              {[
                { label: '< 1 min', pct: 42, count: 354 },
                { label: '1-3 min', pct: 31, count: 261 },
                { label: '3-5 min', pct: 17, count: 143 },
                { label: '5-10 min', pct: 7, count: 59 },
                { label: '> 10 min', pct: 3, count: 25 },
              ].map(bucket => (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-14 shrink-0">{bucket.label}</span>
                  <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        bucket.pct >= 30 ? 'bg-emerald-500' : bucket.pct >= 15 ? 'bg-teal-500' : bucket.pct >= 7 ? 'bg-amber-500' : 'bg-red-400'
                      )}
                      style={{ width: `${bucket.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium w-12 text-right">{bucket.count}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="size-3.5 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Target: &lt; 3 min first response</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                  <CheckCircle2 className="size-3 mr-0.5" />On Track
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Campaign Performance</CardTitle>
                <CardDescription className="text-xs">Active and recent campaign metrics</CardDescription>
              </div>
              <Flame className="size-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">CTR</p>
                <p className="text-sm font-bold">7.9%</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">Conv Rate</p>
                <p className="text-sm font-bold">3.2%</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">Revenue</p>
                <p className="text-sm font-bold text-emerald-600">$104.6k</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">ROI</p>
                <p className="text-sm font-bold text-emerald-600">318%</p>
              </div>
            </div>
            {/* Campaign List */}
            <div className="space-y-2">
              {campaignPerformance.map(camp => (
                <div key={camp.name} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'size-2 rounded-full shrink-0',
                      camp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{camp.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">CTR {camp.ctr}%</span>
                        <span className="text-[10px] text-muted-foreground">Conv {camp.conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-emerald-600">${(camp.revenue / 1000).toFixed(1)}k</p>
                      <p className="text-[10px] text-muted-foreground">ROI {camp.roi}%</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      'text-[9px]',
                      camp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                    )}>
                      {camp.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
