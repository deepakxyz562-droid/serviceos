'use client';

import { useState } from 'react';
import {
  Store, Search, Download, Eye, Star, Filter,
  Sparkles, Clock, CheckCircle2, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  rating: number;
  installs: number;
  icon: string;
  steps: string[];
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Lead Follow-up', 'Appointment Reminder', 'Payment Reminder', 'Review Collection', 'Win-back Campaign'];

const MOCK_TEMPLATES: Template[] = [
  { id: 't1', name: 'Lead Follow-up Sequence', description: 'Automatically follow up with new leads via WhatsApp. 3-step sequence with personalized messages.', category: 'Lead Follow-up', featured: true, rating: 4.8, installs: 1245, icon: '🤝', steps: ['Send welcome message', 'Wait 2 hours', 'Send follow-up', 'Wait 1 day', 'Final reminder'] },
  { id: 't2', name: 'Appointment Reminder', description: 'Send automated appointment reminders 24h and 1h before scheduled time.', category: 'Appointment Reminder', featured: true, rating: 4.9, installs: 2340, icon: '📅', steps: ['24h before reminder', '1h before reminder', 'Post-appointment follow-up'] },
  { id: 't3', name: 'Payment Reminder', description: 'Gentle payment reminders for overdue invoices. Escalating urgency.', category: 'Payment Reminder', featured: false, rating: 4.6, installs: 890, icon: '💰', steps: ['Due date reminder', '3 days overdue', '7 days overdue', 'Final notice'] },
  { id: 't4', name: 'Review Collection', description: 'Request reviews after job completion. Follow up if no review left.', category: 'Review Collection', featured: true, rating: 4.7, installs: 1567, icon: '⭐', steps: ['Send review request', 'Wait 3 days', 'Gentle reminder', 'Thank you message'] },
  { id: 't5', name: 'Win-back Campaign', description: 'Re-engage customers who haven\'t booked in 30+ days with special offers.', category: 'Win-back Campaign', featured: false, rating: 4.5, installs: 678, icon: '🔄', steps: ['We miss you message', 'Special offer', 'Last chance reminder'] },
  { id: 't6', name: 'Quote Follow-up', description: 'Follow up on quotes that haven\'t been accepted within 48 hours.', category: 'Lead Follow-up', featured: false, rating: 4.4, installs: 456, icon: '📋', steps: ['48h follow-up', 'Answer questions', 'Special discount offer'] },
  { id: 't7', name: 'Job Status Updates', description: 'Keep customers informed about job progress with automated status updates.', category: 'Appointment Reminder', featured: false, rating: 4.3, installs: 789, icon: '🔧', steps: ['Technician assigned', 'En route notification', 'Job started', 'Job completed'] },
  { id: 't8', name: 'Seasonal Promotion', description: 'Run seasonal promotions with automated campaign management.', category: 'Win-back Campaign', featured: true, rating: 4.6, installs: 1123, icon: '🎉', steps: ['Announcement', 'Reminder', 'Last day urgency', 'Thank you'] },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function MarketplaceView() {
  const [templates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [installed, setInstalled] = useState<string[]>([]);

  const filteredTemplates = templates.filter(t => {
    if (category !== 'All' && t.category !== category) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const featuredTemplates = templates.filter(t => t.featured);

  const handleInstall = (templateId: string) => {
    setInstalled(prev => [...prev, templateId]);
    toast.success('Template installed successfully!');
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
          <Store className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Marketplace</h2>
          <p className="text-sm text-muted-foreground">Workflow templates & automation</p>
        </div>
      </div>

      {/* Featured Templates */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Store className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No templates available yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Workflow templates will appear here once they are published. Check back later for automation templates and pre-built workflows.
          </p>
        </div>
      ) : (
      <>
      <div>
        <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Sparkles className="size-4 text-emerald-600" /> Featured Templates</h3>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {featuredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-all cursor-pointer border-emerald-200" onClick={() => { setSelectedTemplate(template); setShowPreview(true); }}>
              <CardContent className="p-4 space-y-2">
                <div className="text-2xl">{template.icon}</div>
                <h4 className="font-semibold text-sm">{template.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 text-xs"><Star className="size-3 text-amber-400 fill-amber-400" />{template.rating}</div>
                  <span className="text-xs text-muted-foreground">{template.installs.toLocaleString()} installs</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" className={cn('h-7 text-xs', category === cat && 'bg-emerald-600 hover:bg-emerald-700')} onClick={() => setCategory(cat)}>
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map(template => {
          const isInstalled = installed.includes(template.id);
          return (
            <Card key={template.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{template.icon}</span>
                    <div>
                      <h4 className="font-semibold text-sm">{template.name}</h4>
                      <Badge variant="secondary" className="text-[9px] h-4">{template.category}</Badge>
                    </div>
                  </div>
                  {template.featured && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Featured</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{template.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-xs"><Star className="size-3 text-amber-400 fill-amber-400" />{template.rating}</div>
                    <span className="text-xs text-muted-foreground">{template.installs.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedTemplate(template); setShowPreview(true); }}>
                      <Eye className="size-3 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      className={cn('h-7 text-xs', isInstalled ? 'bg-green-600' : 'bg-emerald-600 hover:bg-emerald-700')}
                      onClick={() => handleInstall(template.id)}
                      disabled={isInstalled}
                    >
                      {isInstalled ? <><CheckCircle2 className="size-3 mr-1" /> Installed</> : <><Download className="size-3 mr-1" /> Install</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedTemplate?.icon}</span>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5"><Star className="size-4 text-amber-400 fill-amber-400" />{selectedTemplate.rating}</div>
                <span className="text-sm text-muted-foreground">{selectedTemplate.installs.toLocaleString()} installs</span>
                <Badge variant="secondary" className="text-xs">{selectedTemplate.category}</Badge>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Workflow Steps</h4>
                <div className="space-y-2">
                  {selectedTemplate.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleInstall(selectedTemplate.id); setShowPreview(false); }} disabled={installed.includes(selectedTemplate.id)}>
                {installed.includes(selectedTemplate.id) ? 'Already Installed' : 'Install Template'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
