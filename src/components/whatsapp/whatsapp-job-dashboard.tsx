'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  MessageCircle, Phone, MapPin, Clock, Star, Plus, Send,
  CheckCircle2, X, User, Truck, Wrench, Package,
  Search, MoreVertical,
  Activity, Users, ListChecks,
  Calendar, UserPlus, ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { Job, Employee, Customer, JobStatus, JobPriority } from './types';

// ============= Helper Functions =============

const statusConfig: Record<JobStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  assigned: { label: 'Assigned', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200', icon: User },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Activity },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: X },
};

const priorityConfig: Record<JobPriority, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: 'text-slate-500', dot: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'text-amber-600', dot: 'bg-amber-400' },
  high: { label: 'High', color: 'text-orange-600', dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-600', dot: 'bg-red-500' },
};

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  delivery: { label: 'Delivery', icon: Truck, color: 'text-teal-600' },
  pickup: { label: 'Pickup', icon: Package, color: 'text-violet-600' },
  service: { label: 'Service', icon: Wrench, color: 'text-orange-600' },
  installation: { label: 'Installation', icon: Wrench, color: 'text-cyan-600' },
};

const employeeStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  busy: { label: 'Busy', color: 'text-amber-700', bg: 'bg-amber-50' },
  offline: { label: 'Offline', color: 'text-slate-500', bg: 'bg-slate-50' },
};

const assignmentStatusConfig: Record<string, { label: string; color: string }> = {
  sent: { label: 'Sent', color: 'text-sky-600' },
  delivered: { label: 'Delivered', color: 'text-teal-600' },
  read: { label: 'Read', color: 'text-violet-600' },
  accepted: { label: 'Accepted', color: 'text-emerald-600' },
  rejected: { label: 'Rejected', color: 'text-red-600' },
  failed: { label: 'Failed', color: 'text-red-600' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

function generateJobMessage(job: Job, employeeName?: string): string {
  const lines = [
    `🚨 *New Job Assignment*`,
    ``,
    `*Title:* ${job.title}`,
    `*Type:* ${job.type.charAt(0).toUpperCase() + job.type.slice(1)}`,
    `*Priority:* ${job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}`,
  ];

  if (job.address) lines.push(`*📍 Address:* ${job.address}`);
  if (job.scheduledAt) lines.push(`*🕐 Scheduled:* ${formatDate(job.scheduledAt)}`);
  if (job.customerName) lines.push(`*👤 Customer:* ${job.customerName}`);
  if (job.customerPhone) lines.push(`*📞 Contact:* ${job.customerPhone}`);
  if (job.description) lines.push(``, `*Details:* ${job.description}`);
  if (job.notes) lines.push(``, `*📝 Notes:* ${job.notes}`);
  if (employeeName) lines.push(``, `*Assigned to:* ${employeeName}`);

  lines.push(``, `Please confirm your acceptance by replying *ACCEPT* or *REJECT*.`);

  return lines.join('\n');
}

// ============= Stats Cards =============

function StatsCards({ stats }: { stats: Record<string, unknown> | null }) {
  if (!stats) return null;

  const cards = [
    { title: 'Total Jobs', value: stats.totalJobs as number, icon: ListChecks, color: 'text-teal-600', bg: 'bg-teal-50' },
    { title: 'Pending', value: stats.pendingJobs as number, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'In Progress', value: stats.inProgressJobs as number, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Completed', value: stats.completedJobs as number, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Available Staff', value: stats.availableEmployees as number, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'WA Delivery Rate', value: `${stats.deliveryRate as number}%`, icon: Send, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(card => (
        <Card key={card.title} className="border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============= Job List Item =============

function JobListItem({ job, isSelected, onClick }: { job: Job; isSelected: boolean; onClick: () => void }) {
  const status = statusConfig[job.status];
  const priority = priorityConfig[job.priority];
  const type = typeConfig[job.type] || typeConfig.delivery;
  const StatusIcon = status.icon;
  const TypeIcon = type.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-green-300 bg-green-50/50 shadow-sm ring-1 ring-green-200'
          : 'border-border bg-card hover:border-green-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon className={`h-4 w-4 flex-shrink-0 ${type.color}`} />
            <h3 className="font-semibold text-sm truncate">{job.title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${status.color} ${status.bg} border-0`}>
              <StatusIcon className="h-3 w-3 mr-0.5" />
              {status.label}
            </Badge>
            <span className={`flex items-center gap-1 text-[10px] font-medium ${priority.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              {priority.label}
            </span>
            {job.assigneeName && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <User className="h-3 w-3" />
                {job.assigneeName}
              </span>
            )}
          </div>
          {job.address && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {job.address}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(job.createdAt)}</span>
          {job.assignmentStatus && (
            <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border-0 ${assignmentStatusConfig[job.assignmentStatus]?.color || 'text-gray-500'} bg-gray-50`}>
              WA: {assignmentStatusConfig[job.assignmentStatus]?.label || job.assignmentStatus}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ============= Job Detail Panel =============

function JobDetailPanel({
  job,
  onAssign,
  onUpdateStatus,
  onSendWhatsApp,
}: {
  job: Job | null;
  onAssign: (job: Job) => void;
  onUpdateStatus: (jobId: string, status: JobStatus) => void;
  onSendWhatsApp: (job: Job) => void;
}) {
  if (!job) {
    return (
      <Card className="h-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Select a Job</h3>
          <p className="text-sm text-muted-foreground">
            Choose a job from the list to view details and assign via WhatsApp
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[job.status];
  const priority = priorityConfig[job.priority];
  const type = typeConfig[job.type] || typeConfig.delivery;
  const TypeIcon = type.icon;

  return (
    <Card className="h-full border shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${status.bg}`}>
                <TypeIcon className={`h-4 w-4 ${type.color}`} />
              </div>
              <CardTitle className="text-lg">{job.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${status.color} ${status.bg} border-0`}>
                {status.label}
              </Badge>
              <span className={`flex items-center gap-1 text-xs font-medium ${priority.color}`}>
                <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
                {priority.label} Priority
              </span>
              <Badge variant="outline" className="text-xs">{type.label}</Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {job.status === 'pending' && (
                <DropdownMenuItem onClick={() => onAssign(job)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Assign Job
                </DropdownMenuItem>
              )}
              {job.status === 'assigned' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(job.id, 'in_progress')}>
                  <Activity className="h-4 w-4 mr-2" /> Start Job
                </DropdownMenuItem>
              )}
              {job.status === 'in_progress' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(job.id, 'completed')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Job
                </DropdownMenuItem>
              )}
              {job.status !== 'completed' && job.status !== 'cancelled' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(job.id, 'cancelled')} className="text-red-600">
                  <X className="h-4 w-4 mr-2" /> Cancel Job
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onSendWhatsApp(job)}>
                <MessageCircle className="h-4 w-4 mr-2" /> Send WhatsApp Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <ScrollArea className="h-[calc(100vh-380px)]">
        <CardContent className="space-y-4 pb-6">
          {/* Description */}
          {job.description && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
              <p className="text-sm mt-1 leading-relaxed">{job.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {job.address && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Address</Label>
                <p className="text-sm mt-0.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                  {job.address}
                </p>
              </div>
            )}
            {job.scheduledAt && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled</Label>
                <p className="text-sm mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  {formatDate(job.scheduledAt)}
                </p>
              </div>
            )}
            {job.actualEndTime && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Completed</Label>
                <p className="text-sm mt-0.5 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  {formatDate(job.actualEndTime)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Customer Info */}
          {job.customerName && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Customer</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                    {getInitials(job.customerName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{job.customerName}</p>
                  {job.customerPhone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {job.customerPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assignee Info */}
          {job.assigneeName && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Assigned To</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                    {getInitials(job.assigneeName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{job.assigneeName}</p>
                  {job.assigneePhone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {job.assigneePhone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Status */}
          {job.assignmentStatus && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">WhatsApp Status</Label>
              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${job.assignmentStatus === 'accepted' ? 'bg-emerald-500' : job.assignmentStatus === 'rejected' ? 'bg-red-500' : 'bg-sky-500'}`} />
                  <span className="text-sm font-medium">
                    {assignmentStatusConfig[job.assignmentStatus]?.label || job.assignmentStatus}
                  </span>
                </div>
                {job.whatsappMessageId && (
                  <p className="text-xs text-muted-foreground">Message ID: {job.whatsappMessageId.slice(0, 30)}...</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {job.notes && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
              <p className="text-sm mt-0.5 bg-amber-50 border border-amber-100 rounded-lg p-3">{job.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {job.status === 'pending' && (
              <Button onClick={() => onAssign(job)} className="flex-1 bg-green-600 hover:bg-green-700">
                <MessageCircle className="h-4 w-4 mr-2" /> Assign via WhatsApp
              </Button>
            )}
            {job.status === 'assigned' && (
              <Button onClick={() => onUpdateStatus(job.id, 'in_progress')} className="flex-1">
                <Activity className="h-4 w-4 mr-2" /> Start Job
              </Button>
            )}
            {job.status === 'in_progress' && (
              <Button onClick={() => onUpdateStatus(job.id, 'completed')} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
              </Button>
            )}
            <Button variant="outline" onClick={() => onSendWhatsApp(job)}>
              <Send className="h-4 w-4 mr-2" /> Send Message
            </Button>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

// ============= Assign Job Dialog =============

function AssignJobDialog({
  job,
  employees,
  open,
  onOpenChange,
  onAssign,
}: {
  job: Job | null;
  employees: Employee[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (jobId: string, employeeId: string, employee: Employee) => void;
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedEmployee(null);
      setSearchTerm('');
    }
    onOpenChange(nextOpen);
  };

  if (!job) return null;

  const availableEmployees = employees.filter(e =>
    e.status === 'available' &&
    (searchTerm === '' || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.phone.includes(searchTerm))
  );

  const sortedEmployees = [...availableEmployees].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.completedJobs - a.completedJobs;
  });

  const message = generateJobMessage(job, selectedEmployee?.name);

  const handleAssign = () => {
    if (!selectedEmployee) return;
    onAssign(job.id, selectedEmployee.id, selectedEmployee);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Assign Job via WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Job Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-semibold text-sm">{job.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {job.type} • {job.priority} priority • {job.address || 'No address'}
            </p>
          </div>

          {/* Employee Selection */}
          <div>
            <Label className="text-sm font-medium">Select Employee to Assign</Label>
            <div className="relative mt-1.5 mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {sortedEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No available employees found</p>
                ) : (
                  sortedEmployees.map(emp => {
                    const empStatus = employeeStatusConfig[emp.status];
                    return (
                      <button
                        key={emp.id}
                        onClick={() => setSelectedEmployee(emp)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedEmployee?.id === emp.id
                            ? 'border-green-300 bg-green-50 ring-1 ring-green-200'
                            : 'border-border hover:border-green-200 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`text-xs ${
                              emp.role === 'driver' ? 'bg-teal-100 text-teal-700' :
                              emp.role === 'technician' ? 'bg-orange-100 text-orange-700' :
                              'bg-violet-100 text-violet-700'
                            }`}>
                              {getInitials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{emp.name}</p>
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border-0 ${empStatus.color} ${empStatus.bg}`}>
                                {empStatus.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {emp.role} • {emp.phone}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-medium">{emp.rating.toFixed(1)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{emp.completedJobs} jobs</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* WhatsApp Message Preview */}
          {selectedEmployee && (
            <div>
              <Label className="text-sm font-medium">WhatsApp Message Preview</Label>
              <div className="mt-1.5 bg-[#e5f5d0] rounded-xl p-4 max-w-xs ml-auto relative">
                <div className="absolute top-2 right-2 flex items-center gap-0.5">
                  <span className="text-[10px] text-green-600">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-[10px] text-green-600">✓✓</span>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedEmployee}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" /> Assign & Send via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Create Job Dialog =============

const defaultJobForm = {
  title: '',
  description: '',
  type: 'delivery',
  priority: 'medium',
  address: '',
  scheduledAt: '',
  customerName: '',
  customerPhone: '',
  notes: '',
};

function CreateJobDialog({
  open,
  onOpenChange,
  customers,
  onCreateJob,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onCreateJob: (data: typeof defaultJobForm & { scheduledAt: string | null }) => void;
}) {
  const [form, setForm] = useState(defaultJobForm);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(defaultJobForm);
    }
    onOpenChange(nextOpen);
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setForm(prev => ({
        ...prev,
        customerName: customer.name,
        customerPhone: customer.phone,
        address: customer.address || prev.address,
      }));
    }
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Job title is required');
      return;
    }
    onCreateJob({
      ...form,
      scheduledAt: form.scheduledAt || '',
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Create New Job
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="job-title">Job Title *</Label>
            <Input
              id="job-title"
              placeholder="e.g., AC Installation at Client Site"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Job Type</Label>
              <Select value={form.type} onValueChange={v => setForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="job-desc">Description</Label>
            <Textarea
              id="job-desc"
              placeholder="Describe the job details..."
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="job-address">Address</Label>
            <Input
              id="job-address"
              placeholder="Job location address"
              value={form.address}
              onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="job-schedule">Scheduled Date & Time</Label>
            <Input
              id="job-schedule"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => setForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
              className="mt-1"
            />
          </div>

          <Separator />

          <div>
            <Label>Customer</Label>
            {customers.length > 0 && (
              <Select onValueChange={handleCustomerSelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select existing customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cust-name">Customer Name</Label>
              <Input
                id="cust-name"
                placeholder="Customer name"
                value={form.customerName}
                onChange={e => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cust-phone">Customer Phone</Label>
              <Input
                id="cust-phone"
                placeholder="+91..."
                value={form.customerPhone}
                onChange={e => setForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="job-notes">Notes</Label>
            <Textarea
              id="job-notes"
              placeholder="Additional notes for the assignee..."
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" /> Create Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Add Employee Dialog =============

const defaultEmployeeForm = {
  name: '',
  phone: '',
  role: 'driver',
  whatsappId: '',
};

function AddEmployeeDialog({
  open,
  onOpenChange,
  onAddEmployee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEmployee: (data: typeof defaultEmployeeForm) => void;
}) {
  const [form, setForm] = useState(defaultEmployeeForm);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(defaultEmployeeForm);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    onAddEmployee({
      ...form,
      whatsappId: form.whatsappId || form.phone,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Add Employee
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="emp-name">Full Name *</Label>
            <Input id="emp-name" placeholder="e.g., Rahul Verma" value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="emp-phone">Phone Number *</Label>
            <Input id="emp-phone" placeholder="+919876543216" value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => setForm(prev => ({ ...prev, role: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="emp-wa">WhatsApp ID (optional)</Label>
            <Input id="emp-wa" placeholder="Defaults to phone number" value={form.whatsappId}
              onChange={e => setForm(prev => ({ ...prev, whatsappId: e.target.value }))} className="mt-1" />
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            <UserPlus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Send WhatsApp Message Dialog =============

function SendWhatsAppDialog({
  job,
  open,
  onOpenChange,
}: {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const initialMessage = job ? generateJobMessage(job) : '';
  const [customMessage, setCustomMessage] = useState(initialMessage);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && job) {
      setCustomMessage(generateJobMessage(job));
    }
    onOpenChange(nextOpen);
  };

  if (!job) return null;

  const phone = job.assigneePhone || job.customerPhone;
  if (!phone) return null;

  const waLink = generateWhatsAppLink(phone, customMessage);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Send WhatsApp Message
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm">
              <span className="text-muted-foreground">To:</span>{' '}
              <span className="font-medium">{job.assigneeName || job.customerName}</span>
              <span className="text-muted-foreground ml-2">{phone}</span>
            </p>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              className="mt-1"
              rows={12}
            />
          </div>
          <div className="bg-[#e5f5d0] rounded-xl p-4 max-w-xs ml-auto">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{customMessage}</pre>
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-green-600">
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ✓✓
              </span>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" /> Open in WhatsApp
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Employee Card =============

function EmployeeCard({ employee }: { employee: Employee }) {
  const empStatus = employeeStatusConfig[employee.status];

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={`text-sm ${
              employee.role === 'driver' ? 'bg-teal-100 text-teal-700' :
              employee.role === 'technician' ? 'bg-orange-100 text-orange-700' :
              'bg-violet-100 text-violet-700'
            }`}>
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{employee.name}</p>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border-0 ${empStatus.color} ${empStatus.bg}`}>
                {empStatus.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{employee.role} • {employee.phone}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-0.5 justify-end">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium">{employee.rating.toFixed(1)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{employee.completedJobs} jobs done</p>
          </div>
        </div>
        {employee.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {employee.skills.slice(0, 3).map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                {skill.replace(/_/g, ' ')}
              </Badge>
            ))}
            {employee.skills.length > 3 && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                +{employee.skills.length - 3}
              </Badge>
            )}
          </div>
        )}
        <div className="mt-2 pt-2 border-t flex gap-2">
          <a
            href={generateWhatsAppLink(employee.whatsappId || employee.phone, `Hi ${employee.name}, `)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full h-7 text-xs">
              <MessageCircle className="h-3 w-3 mr-1 text-green-600" /> WhatsApp
            </Button>
          </a>
          <a href={`tel:${employee.phone}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-7 text-xs">
              <Phone className="h-3 w-3 mr-1" /> Call
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ============= Main Dashboard =============

export function WhatsAppJobDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [createJobDialogOpen, setCreateJobDialogOpen] = useState(false);
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [sendWhatsAppDialogOpen, setSendWhatsAppDialogOpen] = useState(false);
  const [jobToAssign, setJobToAssign] = useState<Job | null>(null);
  const [jobToMessage, setJobToMessage] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, empRes, custRes, statsRes] = await Promise.all([
        fetch('/api/jobs?limit=100'),
        fetch('/api/employees?limit=100'),
        fetch('/api/customers'),
        fetch('/api/jobs/stats'),
      ]);

      const jobsData = await jobsRes.json();
      const empData = await empRes.json();
      const custData = await custRes.json();
      const statsData = await statsRes.json();

      setJobs(jobsData.jobs || []);
      setEmployees(empData.employees || []);
      setCustomers(custData.customers || []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && job.priority !== priorityFilter) return false;
      if (searchTerm && !job.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(job.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(job.assigneeName || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [jobs, statusFilter, priorityFilter, searchTerm]);

  // Handlers
  const handleAssignJob = (job: Job) => {
    setJobToAssign(job);
    setAssignDialogOpen(true);
  };

  const handleAssignConfirm = async (jobId: string, employeeId: string, employee: Employee) => {
    try {
      const assignRes = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          assigneeId: employeeId,
          assigneeName: employee.name,
          assigneePhone: employee.phone,
          status: 'assigned',
          assignmentStatus: 'sent',
        }),
      });

      if (!assignRes.ok) throw new Error('Failed to assign job');

      // Send via WhatsApp API
      await fetch('/api/whatsapp/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      // Open WhatsApp deep link for the employee
      const currentJob = jobs.find(j => j.id === jobId);
      if (currentJob) {
        const message = generateJobMessage(currentJob, employee.name);
        const waLink = generateWhatsAppLink(employee.whatsappId || employee.phone, message);
        window.open(waLink, '_blank');
      }

      toast.success(`Job assigned to ${employee.name}! WhatsApp message opened.`);
      fetchData();
    } catch (err) {
      toast.error('Failed to assign job');
      console.error(err);
    }
  };

  const handleUpdateStatus = async (jobId: string, status: JobStatus) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Job status updated to ${statusConfig[status].label}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update job status');
    }
  };

  const handleCreateJob = async (data: typeof defaultJobForm & { scheduledAt: string | null }) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create job');
      toast.success('Job created successfully!');
      fetchData();
    } catch (err) {
      toast.error('Failed to create job');
    }
  };

  const handleAddEmployee = async (data: typeof defaultEmployeeForm) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add employee');
      toast.success('Employee added successfully!');
      fetchData();
    } catch (err) {
      toast.error('Failed to add employee');
    }
  };

  const handleSendWhatsApp = (job: Job) => {
    setJobToMessage(job);
    setSendWhatsAppDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading WhatsApp Job Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">WhatsApp Job Manager</h1>
                <p className="text-green-100 text-sm">Assign & track jobs through WhatsApp</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreateJobDialogOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Plus className="h-4 w-4 mr-1" /> New Job
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAddEmployeeDialogOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <UserPlus className="h-4 w-4 mr-1" /> Add Staff
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
        <StatsCards stats={stats} />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Jobs List - Left Panel */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2 pr-2">
                {filteredJobs.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center py-8">
                      <ClipboardList className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No jobs found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setCreateJobDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Create Job
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  filteredJobs.map(job => (
                    <JobListItem
                      key={job.id}
                      job={job}
                      isSelected={selectedJobId === job.id}
                      onClick={() => setSelectedJobId(job.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Job Detail - Right Panel */}
          <div className="lg:col-span-3">
            <JobDetailPanel
              job={selectedJob}
              onAssign={handleAssignJob}
              onUpdateStatus={handleUpdateStatus}
              onSendWhatsApp={handleSendWhatsApp}
            />
          </div>
        </div>

        {/* Employees Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-600" /> Team Members
            </h2>
            <div className="flex items-center gap-2">
              {stats && (
                <span className="text-xs text-muted-foreground">
                  {stats.availableEmployees as number} available • {stats.busyEmployees as number} busy • {stats.offlineEmployees as number} offline
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {employees.map(emp => (
              <EmployeeCard key={emp.id} employee={emp} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              WhatsApp Job Manager • Powered by WhatsApp Business API
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="h-3 w-3 text-green-500" />
              <span>{(stats?.whatsappSentJobs as number) || 0} messages sent</span>
              <span className="mx-1">•</span>
              <span>{(stats?.deliveryRate as number) || 0}% acceptance rate</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <AssignJobDialog
        job={jobToAssign}
        employees={employees}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={handleAssignConfirm}
      />
      <CreateJobDialog
        open={createJobDialogOpen}
        onOpenChange={setCreateJobDialogOpen}
        customers={customers}
        onCreateJob={handleCreateJob}
      />
      <AddEmployeeDialog
        open={addEmployeeDialogOpen}
        onOpenChange={setAddEmployeeDialogOpen}
        onAddEmployee={handleAddEmployee}
      />
      <SendWhatsAppDialog
        job={jobToMessage}
        open={sendWhatsAppDialogOpen}
        onOpenChange={setSendWhatsAppDialogOpen}
      />
    </div>
  );
}
