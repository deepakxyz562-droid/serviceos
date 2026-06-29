'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  Clock,
  Inbox,
  UserCircle,
  Zap,
  LogOut,
  Menu,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Settings,
  CheckCircle2,
  AlertCircle,
  Timer,
  MapPin,
  Phone,
  Mail,
  Lock,
  Camera,
  Send,
  ArrowRight,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ──────────────────────────────────────────────────────────────────

type EmployeeSubView = 'home' | 'my-jobs' | 'schedule' | 'attendance' | 'inbox' | 'profile';

interface EmployeePortalLayoutProps {
  onLogout?: () => void;
}

interface MenuItem {
  id: EmployeeSubView;
  label: string;
  icon: React.ElementType;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const menuItems: MenuItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'my-jobs', label: 'My Jobs', icon: Briefcase },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

const pageTitleMap: Record<EmployeeSubView, string> = {
  home: 'Home',
  'my-jobs': 'My Jobs',
  schedule: 'Schedule',
  attendance: 'Attendance',
  inbox: 'Inbox',
  profile: 'Profile',
};

// ─── Placeholder data ───────────────────────────────────────────────────────

const placeholderJobs = [
  { id: '1', title: 'AC Maintenance - Office Unit 4B', status: 'In Progress', priority: 'High', address: '123 Business Park, Suite 4B', scheduledAt: 'Today, 10:00 AM' },
  { id: '2', title: 'Electrical Inspection - Warehouse', status: 'Pending', priority: 'Medium', address: '456 Industrial Zone, Block C', scheduledAt: 'Today, 2:00 PM' },
  { id: '3', title: 'Plumbing Repair - Residential', status: 'Completed', priority: 'Low', address: '789 Oak Street, Apt 12', scheduledAt: 'Yesterday, 9:00 AM' },
  { id: '4', title: 'HVAC Installation - New Building', status: 'Pending', priority: 'High', address: '321 Commerce Blvd, Floor 5', scheduledAt: 'Tomorrow, 8:00 AM' },
  { id: '5', title: 'Generator Service Check', status: 'In Progress', priority: 'Medium', address: '555 Power Lane', scheduledAt: 'Today, 4:30 PM' },
  { id: '6', title: 'Fire Alarm Testing - Mall', status: 'Pending', priority: 'High', address: '100 Shopping Center Dr', scheduledAt: 'Mar 8, 11:00 AM' },
];

const placeholderMessages = [
  { id: '1', from: 'Sarah Chen', subject: 'Schedule change for next week', preview: 'Hi, I wanted to let you know that your Monday shift has been moved to...', time: '10 min ago', unread: true },
  { id: '2', from: 'Operations Team', subject: 'New job assignment: HVAC Installation', preview: 'You have been assigned a new job. Please review the details and confirm...', time: '1 hr ago', unread: true },
  { id: '3', from: 'Mike Johnson', subject: 'RE: Equipment request', preview: 'The tools you requested are now available at the main warehouse. You can...', time: '3 hrs ago', unread: false },
  { id: '4', from: 'HR Department', subject: 'Monthly payslip available', preview: 'Your payslip for February 2026 is now available for download in the...', time: 'Yesterday', unread: false },
  { id: '5', from: 'David Park', subject: 'Customer feedback - Job #2847', preview: 'The customer left a 5-star review for your recent service. Great work!', time: 'Yesterday', unread: true },
  { id: '6', from: 'System', subject: 'Attendance reminder', preview: 'This is a reminder to check in for your shift today. Your scheduled...', time: '2 days ago', unread: false },
];

const weeklySchedule = [
  { day: 'Mon', slots: ['8:00 - AC Maintenance', '13:00 - Team Meeting'] },
  { day: 'Tue', slots: ['9:00 - Electrical Inspection', '14:00 - Plumbing Repair'] },
  { day: 'Wed', slots: ['8:30 - HVAC Installation', '11:00 - Site Visit', '15:00 - Training'] },
  { day: 'Thu', slots: ['9:00 - Generator Service', '13:30 - Report Review'] },
  { day: 'Fri', slots: ['8:00 - Fire Alarm Testing', '12:00 - Lunch Meeting', '16:00 - Weekly Wrap-up'] },
  { day: 'Sat', slots: ['10:00 - On-call (Remote)'] },
  { day: 'Sun', slots: [] },
];

const attendanceData = [
  { day: 'Monday', checkIn: '08:02', checkOut: '17:15', status: 'Present', hours: '9h 13m' },
  { day: 'Tuesday', checkIn: '07:55', checkOut: '17:30', status: 'Present', hours: '9h 35m' },
  { day: 'Wednesday', checkIn: '08:10', checkOut: '17:05', status: 'Present', hours: '8h 55m' },
  { day: 'Thursday', checkIn: '08:00', checkOut: '17:20', status: 'Present', hours: '9h 20m' },
  { day: 'Friday', checkIn: '—', checkOut: '—', status: 'Today', hours: '—' },
];

// ─── Status color helper ────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case 'In Progress':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 hover:bg-blue-100">{status}</Badge>;
    case 'Pending':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 hover:bg-amber-100">{status}</Badge>;
    case 'Completed':
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 hover:bg-emerald-100">{status}</Badge>;
    case 'Present':
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 hover:bg-emerald-100">{status}</Badge>;
    case 'Today':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 hover:bg-blue-100">{status}</Badge>;
    case 'Absent':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 hover:bg-red-100">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPriorityDot(priority: string) {
  switch (priority) {
    case 'High':
      return <span className="size-2 rounded-full bg-red-500" />;
    case 'Medium':
      return <span className="size-2 rounded-full bg-amber-500" />;
    case 'Low':
      return <span className="size-2 rounded-full bg-emerald-500" />;
    default:
      return null;
  }
}

// ─── Sub-View: Home ─────────────────────────────────────────────────────────

function HomeView() {
  const { auth } = useAppStore();
  const employeeName = auth.user?.name || auth.user?.email || 'Alex Rivera';
  const firstName = employeeName.split(' ')[0] || 'Alex';

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <Card className="border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Good morning, {firstName}! 👋</h2>
              <p className="mt-1 text-emerald-100">Here&apos;s your overview for today, March 5, 2026.</p>
            </div>
            <div className="hidden sm:block size-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Zap className="size-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Briefcase className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">3</p>
              <p className="text-xs text-muted-foreground">Active Jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Calendar className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">5</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Star className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">4.8</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
            <CardDescription>Your appointments and tasks for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { time: '10:00 AM', title: 'AC Maintenance - Office Unit 4B', type: 'Job' },
              { time: '2:00 PM', title: 'Electrical Inspection - Warehouse', type: 'Job' },
              { time: '4:30 PM', title: 'Generator Service Check', type: 'Job' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="text-xs font-mono text-muted-foreground min-w-[70px] pt-0.5">{item.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <Badge variant="outline" className="mt-1 text-[10px] h-5">{item.type}</Badge>
                </div>
                <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Notifications</CardTitle>
            <CardDescription>Latest updates and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'New message from Sarah Chen about schedule change', time: '10 min ago' },
              { icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'New job assigned: HVAC Installation', time: '1 hr ago' },
              { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'Reminder: Fire Alarm Testing tomorrow at 11 AM', time: '3 hrs ago' },
              { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'Job #2847 marked as completed', time: 'Yesterday' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={cn('size-8 rounded-full flex items-center justify-center shrink-0', item.bg)}>
                  <item.icon className={cn('size-4', item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance This Month</CardTitle>
          <CardDescription>Your key metrics for March 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <TrendingUp className="size-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">92%</p>
              <p className="text-xs text-muted-foreground">On-time Rate</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Users className="size-5 text-blue-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">4.8/5</p>
              <p className="text-xs text-muted-foreground">Customer Rating</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Timer className="size-5 text-amber-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">2.3h</p>
              <p className="text-xs text-muted-foreground">Avg. Resolution</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="size-5 text-purple-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">12</p>
              <p className="text-xs text-muted-foreground">Jobs Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-View: My Jobs ──────────────────────────────────────────────────────

function MyJobsView() {
  const [filter, setFilter] = useState<string>('all');

  const filteredJobs = filter === 'all'
    ? placeholderJobs
    : placeholderJobs.filter(j => j.status.toLowerCase().replace(' ', '-') === filter);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Assigned Jobs</CardTitle>
              <CardDescription>View and manage your current job assignments</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'in-progress', 'completed'].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'text-xs h-8',
                    filter === f && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="size-10 mx-auto mb-2 opacity-50" />
                <p>No jobs found for this filter.</p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0 mt-1">
                      {getPriorityDot(job.priority)}
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">{job.priority}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{job.address}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">{job.scheduledAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    {getStatusBadge(job.status)}
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                      View <ArrowRight className="size-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{placeholderJobs.filter(j => j.status === 'Pending').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{placeholderJobs.filter(j => j.status === 'In Progress').length}</p>
            <p className="text-xs text-muted-foreground mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{placeholderJobs.filter(j => j.status === 'Completed').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-View: Schedule ─────────────────────────────────────────────────────

function ScheduleView() {
  const today = 'Wed'; // Simulating Wednesday

  return (
    <div className="space-y-6">
      {/* Week overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Weekly Schedule</CardTitle>
              <CardDescription>March 2 – 8, 2026</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">Previous</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">Next</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {weeklySchedule.map((day) => (
              <div
                key={day.day}
                className={cn(
                  'rounded-lg border p-3 min-h-[120px] transition-colors',
                  day.day === today
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'text-sm font-semibold',
                    day.day === today ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                  )}>
                    {day.day}
                  </span>
                  {day.day === today && (
                    <Badge className="bg-emerald-600 text-white text-[10px] h-5 border-0">Today</Badge>
                  )}
                </div>
                {day.slots.length > 0 ? (
                  <div className="space-y-1.5">
                    {day.slots.map((slot, idx) => (
                      <div key={idx} className="text-xs p-1.5 rounded bg-muted/70 text-foreground">
                        <span className="font-mono text-muted-foreground">{slot.split(' - ')[0]}</span>
                        <span className="block truncate">{slot.split(' - ')[1]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No tasks</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Highlights</CardTitle>
          <CardDescription>Important events and deadlines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { date: 'Mar 6', time: '8:00 AM', title: 'HVAC Installation - New Building', type: 'Job', urgent: true },
            { date: 'Mar 8', time: '11:00 AM', title: 'Fire Alarm Testing - Mall', type: 'Job', urgent: true },
            { date: 'Mar 10', time: '9:00 AM', title: 'Safety Training Workshop', type: 'Training', urgent: false },
            { date: 'Mar 15', time: '2:00 PM', title: 'Monthly Performance Review', type: 'Meeting', urgent: false },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={cn(
                'size-10 rounded-lg flex flex-col items-center justify-center shrink-0',
                item.urgent ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'
              )}>
                <span className="text-[10px] font-bold text-muted-foreground">{item.date.split(' ')[0]}</span>
                <span className="text-xs font-bold text-foreground">{item.date.split(' ')[1]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.time} • {item.type}</p>
              </div>
              {item.urgent && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[10px] h-5">
                  Urgent
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-View: Attendance ───────────────────────────────────────────────────

function AttendanceView() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  const handleCheckIn = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setCheckedIn(true);
    setCheckInTime(timeStr);
  };

  const handleCheckOut = () => {
    setCheckedIn(false);
  };

  return (
    <div className="space-y-6">
      {/* Check-in card */}
      <Card className={cn(
        'border-0 shadow-lg',
        checkedIn
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white'
          : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                {checkedIn ? 'You are checked in' : 'Ready to start your day?'}
              </h3>
              <p className="text-sm opacity-80 mt-1">
                {checkedIn
                  ? `Checked in at ${checkInTime} — Have a productive day!`
                  : 'Check in to mark your attendance for today.'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {!checkedIn ? (
                <Button
                  onClick={handleCheckIn}
                  className="bg-white text-slate-800 hover:bg-white/90 font-semibold"
                >
                  <Clock className="size-4 mr-2" />
                  Check In
                </Button>
              ) : (
                <Button
                  onClick={handleCheckOut}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Clock className="size-4 mr-2" />
                  Check Out
                </Button>
              )}
            </div>
          </div>
          {checkedIn && (
            <div className="mt-4 flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-green-300" />
              </span>
              <span className="text-sm text-emerald-100">Active session</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* This week */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Week&apos;s Attendance</CardTitle>
          <CardDescription>March 2 – 6, 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map((row) => (
                  <TableRow key={row.day}>
                    <TableCell className="font-medium">{row.day}</TableCell>
                    <TableCell className="font-mono text-sm">{row.checkIn}</TableCell>
                    <TableCell className="font-mono text-sm">{row.checkOut}</TableCell>
                    <TableCell className="font-mono text-sm">{row.hours}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">18</p>
            <p className="text-xs text-muted-foreground mt-1">Days Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">1</p>
            <p className="text-xs text-muted-foreground mt-1">Days Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">1</p>
            <p className="text-xs text-muted-foreground mt-1">Late Arrivals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">162h</p>
            <p className="text-xs text-muted-foreground mt-1">Total Hours</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-View: Inbox ────────────────────────────────────────────────────────

function InboxView() {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const unreadCount = placeholderMessages.filter(m => m.unread).length;

  return (
    <div className="space-y-6">
      {/* Inbox header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Messages</h3>
          {unreadCount > 0 && (
            <Badge className="bg-emerald-600 text-white border-0 h-5 text-[10px]">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          Mark all read
        </Button>
      </div>

      {/* Messages */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {placeholderMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedMessage(selectedMessage === msg.id ? null : msg.id)}
                className={cn(
                  'w-full text-left p-4 hover:bg-muted/50 transition-colors',
                  msg.unread && 'bg-emerald-50/50 dark:bg-emerald-950/10',
                  selectedMessage === msg.id && 'bg-muted/80'
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className={cn(
                      'text-xs font-medium',
                      msg.unread
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {msg.from.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'text-sm truncate',
                        msg.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                      )}>
                        {msg.from}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{msg.time}</span>
                    </div>
                    <p className={cn(
                      'text-sm truncate mt-0.5',
                      msg.unread ? 'font-medium text-foreground' : 'text-muted-foreground'
                    )}>
                      {msg.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.preview}</p>
                  </div>
                  {msg.unread && (
                    <span className="size-2.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compose card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Reply</CardTitle>
          <CardDescription>Send a message to your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label htmlFor="msg-to" className="text-xs">To</Label>
              <Input id="msg-to" placeholder="Select recipient..." className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="msg-body" className="text-xs">Message</Label>
              <textarea
                id="msg-body"
                placeholder="Type your message..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex justify-end">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                <Send className="size-3.5 mr-1.5" />
                Send Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-View: Profile ──────────────────────────────────────────────────────

function ProfileView() {
  const { auth } = useAppStore();
  const employeeName = auth.user?.name || 'Alex Rivera';
  const employeeEmail = auth.user?.email || 'alex.rivera@serviceos.cc';

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative">
              <Avatar className="size-20">
                <AvatarFallback className="text-2xl font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors">
                <Camera className="size-3.5" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{employeeName}</h2>
              <p className="text-sm text-muted-foreground">Field Service Technician</p>
              <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">Active</Badge>
                <span className="text-xs text-muted-foreground">Employee ID: EMP-2847</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profile-name" className="text-xs">Full Name</Label>
              <Input id="profile-name" defaultValue={employeeName} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-email" className="text-xs">Email Address</Label>
              <Input id="profile-email" defaultValue={employeeEmail} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-phone" className="text-xs">Phone Number</Label>
              <Input id="profile-phone" defaultValue="+1 (555) 123-4567" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-location" className="text-xs">Location</Label>
              <Input id="profile-location" defaultValue="San Francisco, CA" className="mt-1 h-9 text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="current-password" className="text-xs">Current Password</Label>
              <Input id="current-password" type="password" placeholder="Enter current password" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="new-password" className="text-xs">New Password</Label>
              <Input id="new-password" type="password" placeholder="Enter new password" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-xs">Confirm New Password</Label>
              <Input id="confirm-password" type="password" placeholder="Confirm new password" className="mt-1 h-9 text-sm" />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Lock className="size-3.5" />
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Contact</CardTitle>
          <CardDescription>Emergency contact information on file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Contact Name</Label>
              <Input defaultValue="Maria Rivera" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Relationship</Label>
              <Input defaultValue="Spouse" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Phone Number</Label>
              <Input defaultValue="+1 (555) 987-6543" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Alternate Phone</Label>
              <Input defaultValue="+1 (555) 456-7890" className="mt-1 h-9 text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm">Update Contact</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sidebar Component ──────────────────────────────────────────────────────

function EmployeeSidebar({
  activeView,
  onViewChange,
  onLogout,
  employeeName,
  employeeRole,
}: {
  activeView: EmployeeSubView;
  onViewChange: (view: EmployeeSubView) => void;
  onLogout?: () => void;
  employeeName: string;
  employeeRole: string;
}) {
  return (
    <div className="flex flex-col h-full bg-card">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Zap className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">ServiceOS</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{employeeName}</p>
            <p className="text-xs text-muted-foreground truncate">{employeeRole}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Menu items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-l-[3px] border-emerald-600 pl-[9px]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent pl-[9px]'
                )}
              >
                <item.icon className="size-[18px] shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Logout */}
      <div className="p-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="size-[18px]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EmployeePortalLayout({ onLogout }: EmployeePortalLayoutProps) {
  const [activeView, setActiveView] = useState<EmployeeSubView>('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { auth } = useAppStore();

  const employeeName = auth.user?.name || 'Alex Rivera';
  const employeeRole = 'Field Service Technician';

  const handleViewChange = (view: EmployeeSubView) => {
    setActiveView(view);
    setMobileSidebarOpen(false);
  };

  // Render the active sub-view
  const renderSubView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'my-jobs':
        return <MyJobsView />;
      case 'schedule':
        return <ScheduleView />;
      case 'attendance':
        return <AttendanceView />;
      case 'inbox':
        return <InboxView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-64 shrink-0 border-r border-border bg-card">
          <EmployeeSidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            onLogout={onLogout}
            employeeName={employeeName}
            employeeRole={employeeRole}
          />
        </aside>
      )}

      {/* Mobile sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Employee portal navigation</SheetDescription>
            </SheetHeader>
            <EmployeeSidebar
              activeView={activeView}
              onViewChange={handleViewChange}
              onLogout={onLogout}
              employeeName={employeeName}
              employeeRole={employeeRole}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 -ml-1"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            )}
            <h1 className="text-base font-semibold text-foreground">
              {pageTitleMap[activeView]}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <ThemeToggleButton />

            {/* Notification bell */}
            <Button variant="ghost" size="icon" className="size-9 relative">
              <Bell className="size-[18px]" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
              <span className="sr-only">Notifications</span>
            </Button>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveView('profile')}>
                  <UserCircle className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView('inbox')}>
                  <Settings className="size-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="size-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-muted/30 p-4 lg:p-6">
          {renderSubView()}
        </main>
      </div>
    </div>
  );
}

// ─── Theme Toggle Button ────────────────────────────────────────────────────

function ThemeToggleButton() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={toggleDarkMode}
    >
      {darkMode ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}
