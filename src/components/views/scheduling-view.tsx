'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MapPin,
  Wrench,
  Sparkles,
  Wind,
  CheckCircle2,
  Circle,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  customerName: string;
  employeeName: string;
  employeeInitials: string;
  jobType: 'Plumbing' | 'Cleaning' | 'HVAC';
  startTime: string;
  endTime: string;
  day: string;
  status: 'Confirmed' | 'Pending' | 'In Progress' | 'Overdue';
  location: string;
  duration: string;
}

const mockAppointments: Appointment[] = [
  { id: 'apt-1', customerName: 'Sarah Mitchell', employeeName: 'Mike Torres', employeeInitials: 'MT', jobType: 'Plumbing', startTime: '9:00 AM', endTime: '11:00 AM', day: 'Mon', status: 'In Progress', location: '123 Oak St', duration: '2h' },
  { id: 'apt-2', customerName: 'James Peterson', employeeName: 'David Chen', employeeInitials: 'DC', jobType: 'HVAC', startTime: '11:00 AM', endTime: '1:00 PM', day: 'Mon', status: 'Confirmed', location: '456 Elm Ave', duration: '2h' },
  { id: 'apt-3', customerName: 'Emily Chen', employeeName: 'Ana Rodriguez', employeeInitials: 'AR', jobType: 'Cleaning', startTime: '2:00 PM', endTime: '4:00 PM', day: 'Tue', status: 'Pending', location: '789 Pine Dr', duration: '2h' },
  { id: 'apt-4', customerName: 'Robert Kim', employeeName: 'Mike Torres', employeeInitials: 'MT', jobType: 'Plumbing', startTime: '8:30 AM', endTime: '10:00 AM', day: 'Wed', status: 'Overdue', location: '321 Maple Ln', duration: '1.5h' },
  { id: 'apt-5', customerName: 'Lisa Wang', employeeName: 'David Chen', employeeInitials: 'DC', jobType: 'HVAC', startTime: '1:00 PM', endTime: '3:30 PM', day: 'Wed', status: 'Confirmed', location: '654 Cedar Ct', duration: '2.5h' },
  { id: 'apt-6', customerName: 'Mark Johnson', employeeName: 'Ana Rodriguez', employeeInitials: 'AR', jobType: 'Cleaning', startTime: '10:00 AM', endTime: '12:00 PM', day: 'Thu', status: 'Confirmed', location: '987 Birch Way', duration: '2h' },
];

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const timeSlots = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const jobTypeColors: Record<Appointment['jobType'], { bg: string; border: string; text: string; dot: string }> = {
  'Plumbing': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Cleaning': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'HVAC': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const jobTypeIcons: Record<Appointment['jobType'], React.ElementType> = {
  'Plumbing': Wrench,
  'Cleaning': Sparkles,
  'HVAC': Wind,
};

const statusColors: Record<Appointment['status'], string> = {
  'Confirmed': 'bg-green-100 text-green-700 border-green-200',
  'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Overdue': 'bg-red-100 text-red-700 border-red-200',
};

export function SchedulingView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

  const weekDates = weekDays.map((day, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return { day, date: date.getDate(), month: date.toLocaleString('en-US', { month: 'short' }) };
  });

  const stats = [
    {
      title: "Today's Jobs",
      value: mockAppointments.filter((a) => a.day === 'Mon').length.toString(),
      icon: Calendar,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Scheduled This Week',
      value: mockAppointments.length.toString(),
      icon: Clock,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      title: 'Unassigned',
      value: '2',
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Overdue',
      value: mockAppointments.filter((a) => a.status === 'Overdue').length.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  const getAppointmentsForSlot = (day: string, time: string) => {
    return mockAppointments.filter((apt) => {
      if (apt.day !== day) return false;
      const aptHour = apt.startTime.replace(':00', '').replace(':30', ':30');
      return aptHour === time.replace(':00', '').replace(':30', ':30') || apt.startTime === time;
    });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50">
            <Calendar className="size-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Scheduling & Dispatch</h1>
            <p className="text-sm text-muted-foreground">Manage appointments and field team assignments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => setWeekOffset((p) => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-[140px] text-center">
              {weekDates[0]?.month} {weekDates[0]?.date} - {weekDates[4]?.month} {weekDates[4]?.date}
            </span>
            <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => setWeekOffset((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={cn('p-2.5 rounded-xl', stat.bg)}>
                    <Icon className={cn('size-5', stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Calendar + Upcoming */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Week Calendar Grid */}
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Week View</CardTitle>
              <div className="flex items-center gap-3">
                {(['Plumbing', 'Cleaning', 'HVAC'] as const).map((type) => {
                  const colors = jobTypeColors[type];
                  const Icon = jobTypeIcons[type];
                  return (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className={cn('size-2 rounded-full', colors.dot)} />
                      <span className="text-[10px] text-muted-foreground">{type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 rounded-md px-2 py-1 w-fit">
              <GripVertical className="size-3" />
              Drag appointments to reschedule
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Day headers */}
                <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b">
                  <div className="p-2 text-xs text-muted-foreground font-medium">Time</div>
                  {weekDates.map(({ day, date, month }) => (
                    <div key={day} className={cn(
                      'p-2 text-center border-l',
                      day === 'Mon' && 'bg-emerald-50/50'
                    )}>
                      <p className="text-xs text-muted-foreground">{day}</p>
                      <p className={cn(
                        'text-sm font-semibold mt-0.5',
                        day === 'Mon' && 'text-emerald-700'
                      )}>
                        {month} {date}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Time slots */}
                <div className="max-h-[420px] overflow-y-auto">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-dashed min-h-[50px]">
                      <div className="p-2 text-xs text-muted-foreground font-mono flex items-start pt-3">
                        {time}
                      </div>
                      {weekDays.map((day) => {
                        const appointments = getAppointmentsForSlot(day, time);
                        return (
                          <div key={`${day}-${time}`} className="border-l p-1 relative">
                            {appointments.map((apt) => {
                              const colors = jobTypeColors[apt.jobType];
                              const Icon = jobTypeIcons[apt.jobType];
                              return (
                                <div
                                  key={apt.id}
                                  className={cn(
                                    'rounded-md p-2 border cursor-grab active:cursor-grabbing transition-shadow hover:shadow-sm',
                                    colors.bg,
                                    colors.border
                                  )}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <GripVertical className="size-3 text-muted-foreground/50 shrink-0" />
                                    <Icon className={cn('size-3 shrink-0', colors.text)} />
                                    <span className={cn('text-xs font-medium truncate', colors.text)}>
                                      {apt.customerName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 ml-5">
                                    <Timer className="size-2.5 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">
                                      {apt.startTime} - {apt.endTime}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="xl:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Upcoming</CardTitle>
            <CardDescription className="text-xs">Next scheduled appointments</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-0 px-4 pb-4">
                {mockAppointments
                  .sort((a, b) => weekDays.indexOf(a.day) - weekDays.indexOf(b.day))
                  .map((apt, index) => {
                    const colors = jobTypeColors[apt.jobType];
                    const Icon = jobTypeIcons[apt.jobType];
                    return (
                      <div key={apt.id}>
                        <div className="py-3">
                          <div className="flex items-start gap-2.5">
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback className={cn('text-[10px] font-semibold', colors.bg, colors.text)}>
                                {apt.employeeInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-sm font-medium truncate">{apt.customerName}</p>
                                <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5 shrink-0', statusColors[apt.status])}>
                                  {apt.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Icon className={cn('size-3', colors.text)} />
                                <span className="text-xs text-muted-foreground">{apt.jobType}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="size-2.5" />
                                  {apt.startTime} - {apt.endTime}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="size-2.5" />
                                  {apt.location}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 mt-1.5">
                                <span className="text-[10px] text-muted-foreground">Assigned to</span>
                                <span className="text-[10px] font-medium">{apt.employeeName}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {index < mockAppointments.length - 1 && <Separator />}
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
