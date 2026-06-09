'use client';

import { useState } from 'react';
import {
  User, Search, Phone, Mail, MapPin, MessageSquare, Briefcase, FileText,
  DollarSign, Star, Tag, Plus, Send, Calendar, Clock, ArrowRight,
  Hash, Shield, ChevronRight, X, Edit2, CheckCircle2,
  TrendingUp, Heart, Award, Activity, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer360 {
  id: string;
  name: string;
  phone: string;
  email: string;
  whatsappId: string;
  address: string;
  tags: string[];
  customerValue: number;
  valueScore: number;
  totalSpent: number;
  totalJobs: number;
  totalConversations: number;
  lastActivity: string;
  createdAt: string;
}

interface TimelineEvent {
  id: string;
  type: 'message' | 'booking' | 'job_update' | 'payment' | 'campaign' | 'note';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_CUSTOMERS: Customer360[] = [
  { id: 'cu1', name: 'Alex Rivera', phone: '+1 555-0101', email: 'alex@email.com', whatsappId: '+15550101', address: '123 Oak Street, Springfield, IL', tags: ['VIP', 'repeat-customer'], customerValue: 4500, valueScore: 85, totalSpent: 4500, totalJobs: 8, totalConversations: 12, lastActivity: '2 hours ago', createdAt: '2024-01-15' },
  { id: 'cu2', name: 'Maria Santos', phone: '+1 555-0102', email: 'maria@email.com', whatsappId: '+15550102', address: '456 Elm Ave, Chicago, IL', tags: ['cleaning', 'monthly'], customerValue: 2800, valueScore: 72, totalSpent: 2800, totalJobs: 5, totalConversations: 8, lastActivity: '5 min ago', createdAt: '2024-03-22' },
  { id: 'cu3', name: 'James Wilson', phone: '+1 555-0103', email: 'james@email.com', whatsappId: '+15550103', address: '789 Pine Rd, Naperville, IL', tags: ['plumbing', 'new'], customerValue: 800, valueScore: 45, totalSpent: 800, totalJobs: 2, totalConversations: 3, lastActivity: '1 day ago', createdAt: '2025-01-10' },
  { id: 'cu4', name: 'Sophie Chen', phone: '+1 555-0104', email: 'sophie@email.com', whatsappId: '+15550104', address: '321 Maple Dr, Evanston, IL', tags: ['packing', 'one-time'], customerValue: 1200, valueScore: 55, totalSpent: 1200, totalJobs: 1, totalConversations: 4, lastActivity: '3 days ago', createdAt: '2024-11-05' },
  { id: 'cu5', name: 'Robert Kim', phone: '+1 555-0105', email: 'robert@email.com', whatsappId: '+15550105', address: '654 Cedar Ln, Oak Park, IL', tags: ['cleaning', 'commercial'], customerValue: 6200, valueScore: 92, totalSpent: 6200, totalJobs: 15, totalConversations: 20, lastActivity: '1 hr ago', createdAt: '2023-06-20' },
];

const MOCK_TIMELINE: Record<string, TimelineEvent[]> = {
  cu1: [
    { id: 't1', type: 'message', title: 'WhatsApp Message', description: 'Sent inquiry about deep cleaning', timestamp: '2 hours ago', icon: <MessageSquare className="size-4" />, color: 'text-emerald-600 bg-emerald-100' },
    { id: 't2', type: 'payment', title: 'Payment Received', description: '$450 for Cleaning Job #1234', timestamp: '1 day ago', icon: <DollarSign className="size-4" />, color: 'text-green-600 bg-green-100' },
    { id: 't3', type: 'job_update', title: 'Job Completed', description: 'Deep Cleaning completed successfully', timestamp: '2 days ago', icon: <CheckCircle2 className="size-4" />, color: 'text-teal-600 bg-teal-100' },
    { id: 't4', type: 'booking', title: 'Booking Created', description: 'Scheduled deep cleaning for Mar 5', timestamp: '5 days ago', icon: <Calendar className="size-4" />, color: 'text-violet-600 bg-violet-100' },
    { id: 't5', type: 'campaign', title: 'Campaign Interaction', description: 'Opened "Spring Cleaning Promo" email', timestamp: '1 week ago', icon: <Send className="size-4" />, color: 'text-orange-600 bg-orange-100' },
    { id: 't6', type: 'note', title: 'Internal Note', description: 'Customer prefers morning appointments', timestamp: '2 weeks ago', icon: <FileText className="size-4" />, color: 'text-amber-600 bg-amber-100' },
  ],
  cu5: [
    { id: 't10', type: 'message', title: 'WhatsApp Message', description: 'Requested commercial cleaning quote', timestamp: '1 hr ago', icon: <MessageSquare className="size-4" />, color: 'text-emerald-600 bg-emerald-100' },
    { id: 't11', type: 'payment', title: 'Payment Received', description: '$800 for Office Cleaning', timestamp: '3 days ago', icon: <DollarSign className="size-4" />, color: 'text-green-600 bg-green-100' },
  ],
};

// ─── Component ──────────────────────────────────────────────────────────────

export function Customer360View() {
  const [customers] = useState<Customer360[]>(MOCK_CUSTOMERS);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cu1');
  const [search, setSearch] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const timeline = MOCK_TIMELINE[selectedCustomerId] || [];

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    toast.success('Note added successfully');
    setNoteText('');
    setShowAddNote(false);
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    toast.success(`Tag "${newTag}" added`);
    setNewTag('');
    setShowAddTag(false);
  };

  const handleRemoveTag = (tag: string) => {
    toast.success(`Tag "${tag}" removed`);
  };

  const getValueScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-slate-500';
  };

  const getValueScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-slate-50 border-slate-200';
  };

  const getValueScoreLabel = (score: number) => {
    if (score >= 80) return 'High Value';
    if (score >= 60) return 'Medium Value';
    return 'Low Value';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shadow-lg shadow-emerald-600/20">
            <User className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Customer 360</h2>
            <p className="text-sm text-muted-foreground">Complete customer profile & timeline</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name, phone, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Customer List */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4 text-emerald-600" />
              Customers ({filteredCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y">
                {filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    className={cn(
                      'w-full p-3 text-left hover:bg-muted/50 transition-colors',
                      selectedCustomerId === customer.id && 'bg-emerald-50 border-l-2 border-l-emerald-600'
                    )}
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarFallback className={cn(
                          'text-xs font-medium',
                          customer.valueScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          customer.valueScore >= 60 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-medium text-sm truncate">{customer.name}</p>
                          {customer.valueScore >= 80 && (
                            <Award className="size-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {customer.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[9px] h-4">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Customer Detail */}
        {selectedCustomer && (
          <div className="lg:col-span-3 space-y-4">
            {/* Profile Card - Enhanced */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Large Avatar with score ring */}
                  <div className="relative shrink-0">
                    <Avatar className="size-20 ring-4 ring-emerald-100">
                      <AvatarFallback className={cn(
                        'text-xl font-bold',
                        selectedCustomer.valueScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        selectedCustomer.valueScore >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {selectedCustomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      'absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white',
                      selectedCustomer.valueScore >= 80 ? 'bg-emerald-500 text-white' :
                      selectedCustomer.valueScore >= 60 ? 'bg-amber-500 text-white' :
                      'bg-slate-400 text-white'
                    )}>
                      {selectedCustomer.valueScore}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold">{selectedCustomer.name}</h3>
                      <Badge className={cn(
                        'text-xs',
                        selectedCustomer.valueScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        selectedCustomer.valueScore >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {getValueScoreLabel(selectedCustomer.valueScore)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><Phone className="size-3.5" /> {selectedCustomer.phone}</div>
                      <div className="flex items-center gap-2"><Mail className="size-3.5" /> {selectedCustomer.email}</div>
                      <div className="flex items-center gap-2"><MessageSquare className="size-3.5" /> WhatsApp: {selectedCustomer.whatsappId}</div>
                      <div className="flex items-center gap-2"><MapPin className="size-3.5" /> {selectedCustomer.address}</div>
                    </div>
                    {/* Tags */}
                    <div className="flex items-center gap-1 mt-3 flex-wrap">
                      <Tag className="size-3.5 text-muted-foreground" />
                      {selectedCustomer.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs h-6 gap-1">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500"><X className="size-3" /></button>
                        </Badge>
                      ))}
                      {showAddTag ? (
                        <div className="flex items-center gap-1">
                          <Input className="h-6 w-24 text-xs" placeholder="Tag name" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} autoFocus />
                          <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 min-h-[24px]" onClick={handleAddTag}>Add</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 text-xs min-h-[24px]" onClick={() => setShowAddTag(true)}>
                          <Plus className="size-3" /> Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t flex-wrap">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"><MessageSquare className="size-3.5 mr-1" /> Send WhatsApp</Button>
                  <Button size="sm" variant="outline" className="min-h-[44px]"><Briefcase className="size-3.5 mr-1" /> Create Job</Button>
                  <Button size="sm" variant="outline" className="min-h-[44px]"><FileText className="size-3.5 mr-1" /> Create Quote</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddNote(true)} className="min-h-[44px]"><Edit2 className="size-3.5 mr-1" /> Add Note</Button>
                </div>

                {/* Key Metrics Row - Enhanced */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div className="rounded-lg bg-emerald-50 p-3 text-center border border-emerald-100">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <DollarSign className="size-4 text-emerald-600" />
                      <p className="text-2xl font-bold text-emerald-600">${selectedCustomer.totalSpent.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-emerald-600/70 font-medium">Total Spent</p>
                  </div>
                  <div className="rounded-lg bg-teal-50 p-3 text-center border border-teal-100">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Briefcase className="size-4 text-teal-600" />
                      <p className="text-2xl font-bold text-teal-600">{selectedCustomer.totalJobs}</p>
                    </div>
                    <p className="text-xs text-teal-600/70 font-medium">Jobs Completed</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-center border border-amber-100">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <MessageSquare className="size-4 text-amber-600" />
                      <p className="text-2xl font-bold text-amber-600">{selectedCustomer.totalConversations}</p>
                    </div>
                    <p className="text-xs text-amber-600/70 font-medium">Conversations</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center border border-slate-200">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Clock className="size-4 text-slate-500" />
                      <p className="text-sm font-bold text-slate-600">{selectedCustomer.lastActivity}</p>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Last Activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="timeline">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="conversations" className="text-xs">Conversations</TabsTrigger>
                <TabsTrigger value="leads" className="text-xs">Leads</TabsTrigger>
                <TabsTrigger value="jobs" className="text-xs">Jobs</TabsTrigger>
                <TabsTrigger value="quotes" className="text-xs">Quotes</TabsTrigger>
                <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
                <TabsTrigger value="reviews" className="text-xs">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <Card>
                  <CardContent className="p-4">
                    {timeline.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="size-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No timeline events</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {timeline.map((event, i) => (
                          <div key={event.id} className="flex gap-3 pb-4">
                            <div className="flex flex-col items-center">
                              <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0 shadow-sm', event.color)}>
                                {event.icon}
                              </div>
                              {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{event.title}</p>
                                <span className="text-xs text-muted-foreground shrink-0 bg-muted/50 px-2 py-0.5 rounded">{event.timestamp}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="conversations">
                <Card>
                  <CardContent className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Message</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium text-sm">Deep cleaning inquiry</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700">Resolved</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">Thanks for choosing us!</TableCell>
                          <TableCell className="text-xs text-muted-foreground">2 hrs ago</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-sm">Reschedule request</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700">Open</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">Can we move it to Friday?</TableCell>
                          <TableCell className="text-xs text-muted-foreground">1 day ago</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leads">
                <Card>
                  <CardContent className="p-4">
                    <Table>
                      <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Status</TableHead><TableHead>Value</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium text-sm">Commercial Cleaning</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700">Won</Badge></TableCell>
                          <TableCell className="text-sm font-semibold text-emerald-600">$2,400</TableCell>
                          <TableCell className="text-xs text-muted-foreground">Feb 15, 2025</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-sm">Window Cleaning</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] bg-teal-100 text-teal-700">Qualified</Badge></TableCell>
                          <TableCell className="text-sm">$800</TableCell>
                          <TableCell className="text-xs text-muted-foreground">Mar 1, 2025</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs">
                <Card>
                  <CardContent className="p-4">
                    <Table>
                      <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Status</TableHead><TableHead>Scheduled</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium text-sm">Deep Cleaning #1234</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] bg-green-100 text-green-700">Completed</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">Mar 5, 2025</TableCell>
                          <TableCell className="text-sm font-semibold text-emerald-600">$450</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-sm">Office Cleaning #1256</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700">Scheduled</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">Mar 15, 2025</TableCell>
                          <TableCell className="text-sm font-semibold text-emerald-600">$350</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="quotes">
                <Card><CardContent className="p-4"><div className="text-center py-8 text-muted-foreground"><FileText className="size-8 mx-auto mb-2 opacity-20" /><p className="text-sm">No quotes yet</p></div></CardContent></Card>
              </TabsContent>
              <TabsContent value="invoices">
                <Card><CardContent className="p-4"><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium text-sm">INV-001</TableCell><TableCell className="text-sm font-semibold text-emerald-600">$450</TableCell><TableCell><Badge variant="outline" className="text-[10px] bg-green-100 text-green-700">Paid</Badge></TableCell><TableCell className="text-xs text-muted-foreground">Mar 5, 2025</TableCell></TableRow></TableBody></Table></CardContent></Card>
              </TabsContent>
              <TabsContent value="payments">
                <Card><CardContent className="p-4"><Table><TableHeader><TableRow><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="text-sm font-semibold text-emerald-600">$450</TableCell><TableCell className="text-sm">Credit Card</TableCell><TableCell><Badge variant="outline" className="text-[10px] bg-green-100 text-green-700">Completed</Badge></TableCell><TableCell className="text-xs text-muted-foreground">Mar 5, 2025</TableCell></TableRow><TableRow><TableCell className="text-sm font-semibold text-emerald-600">$350</TableCell><TableCell className="text-sm">Bank Transfer</TableCell><TableCell><Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700">Pending</Badge></TableCell><TableCell className="text-xs text-muted-foreground">Mar 10, 2025</TableCell></TableRow></TableBody></Table></CardContent></Card>
              </TabsContent>
              <TabsContent value="reviews">
                <Card><CardContent className="p-4"><div className="space-y-3"><div className="p-3 rounded-lg border"><div className="flex items-center gap-1 mb-1">{[1,2,3,4,5].map(s=><Star key={s} className="size-4 text-amber-400 fill-amber-400" />)}</div><p className="text-sm">"Excellent service! The team was very professional."</p><p className="text-xs text-muted-foreground mt-1">2 weeks ago</p></div></div></CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-4 text-emerald-600" />
              Add Note
            </DialogTitle>
            <DialogDescription>Add an internal note for this customer</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Enter note..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={handleAddNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
