'use client';

/**
 * Automations Settings section.
 *
 * UI-only implementation (per main agent's decision to avoid DB migrations):
 *   - Toggle states are held in local React state — no persistence.
 *   - "New Automation" opens a placeholder builder dialog with a "Coming soon" note.
 *   - "Let Us Know" opens a feedback dialog that fires a toast on submit.
 *
 * Matches the spec the user provided verbatim (Quotes / Invoices / Requests
 * automation rows + "New Automation" header CTA + "Share your thoughts" feedback card).
 *
 * Style follows the same pattern as company-settings.tsx (emerald accents,
 * `space-y-6` rhythm, Card + shadow-sm, dark-mode compatible).
 */

import { useState } from 'react';
import {
  Zap,
  Plus,
  FileText,
  Receipt,
  Inbox,
  MessageSquareHeart,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AutomationRow {
  id: string;
  label: string;
  description?: string;
  defaultOn?: boolean;
}

interface AutomationCategory {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  rows: AutomationRow[];
}

// ─── Static catalog (UI-only — matches the user's exact spec) ──────────────

const CATEGORIES: AutomationCategory[] = [
  {
    id: 'quotes',
    title: 'Quotes',
    description: 'Automations for quotes you send to clients.',
    icon: FileText,
    rows: [
      { id: 'auto-archive-quotes', label: 'Auto-archive Quotes', defaultOn: false },
      {
        id: 'quote-followup-5d',
        label: 'Follow-up with clients 5 days after quotes are sent',
        defaultOn: true,
      },
      {
        id: 'quote-followup-2d',
        label: 'Follow-up with clients 2 days after quotes are sent',
        defaultOn: false,
      },
    ],
  },
  {
    id: 'invoices',
    title: 'Invoices',
    description: 'Automations for invoices you issue.',
    icon: Receipt,
    rows: [
      {
        id: 'invoice-followup-due',
        label: 'Follow-up with clients on the day invoices are due',
        defaultOn: true,
      },
      {
        id: 'invoice-followup-3d',
        label: 'Follow-up with clients 3 days after invoices are due',
        defaultOn: false,
      },
    ],
  },
  {
    id: 'requests',
    title: 'Requests',
    description: 'Automations for incoming client requests.',
    icon: Inbox,
    rows: [{ id: 'auto-archive-requests', label: 'Auto-archive Requests', defaultOn: false }],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function AutomationsSettings() {
  // Local-only toggle state — NO database persistence (per main agent's decision).
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const cat of CATEGORIES) {
      for (const row of cat.rows) {
        initial[row.id] = !!row.defaultOn;
      }
    }
    return initial;
  });

  const [newAutomationOpen, setNewAutomationOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleToggle = (id: string, checked: boolean) => {
    setToggles((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      toast.error('Please enter your feedback before submitting.');
      return;
    }
    setSubmittingFeedback(true);
    // Simulated submit — no backend.
    setTimeout(() => {
      setSubmittingFeedback(false);
      setFeedbackText('');
      setFeedbackOpen(false);
      toast.success('Thanks for sharing your thoughts! We will review your feedback.');
    }, 400);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header: title + description + "New Automation" CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Zap className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Automations</h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Configure the triggers and conditions and Jobber will complete routine tasks and
            perform actions automatically. Additional automations related to jobs, visits, and
            requests are located under our Emails &amp; Text Messages settings.
          </p>
        </div>
        <Button
          className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setNewAutomationOpen(true)}
        >
          <Plus className="size-4" />
          New Automation
        </Button>
      </div>

      {/* Feedback card: "Share your thoughts" */}
      <Card className="border shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <MessageSquareHeart className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Share your thoughts.</p>
              <p className="text-sm text-muted-foreground">
                Tell us what tasks you&apos;d like to automate.
              </p>
            </div>
          </div>
          <Button
            variant="link"
            className="h-auto shrink-0 p-0 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            onClick={() => setFeedbackOpen(true)}
          >
            Let Us Know →
          </Button>
        </CardContent>
      </Card>

      {/* Category cards: Quotes / Invoices / Requests */}
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        return (
          <Card key={cat.id} className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">{cat.title}</CardTitle>
                  <CardDescription>{cat.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {cat.rows.map((row, idx) => (
                <div key={row.id}>
                  {idx > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between gap-4 py-3">
                    <Label
                      htmlFor={row.id}
                      className="text-sm font-medium leading-snug text-foreground"
                    >
                      {row.label}
                    </Label>
                    <Switch
                      id={row.id}
                      checked={!!toggles[row.id]}
                      onCheckedChange={(c) => handleToggle(row.id, c)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* New Automation dialog — placeholder UI only */}
      <Dialog open={newAutomationOpen} onOpenChange={setNewAutomationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Lightbulb className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle>New Automation</DialogTitle>
            </div>
            <DialogDescription>
              Define a trigger, set conditions, and pick the action Jobber should perform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200">
              <span className="font-semibold">Coming soon.</span> The full automation builder is on
              the roadmap. For now, use the toggles above to enable prebuilt automations.
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Trigger</Label>
              <Select defaultValue="quote-sent">
                <SelectTrigger>
                  <SelectValue placeholder="Choose a trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote-sent">Quote is sent</SelectItem>
                  <SelectItem value="invoice-due">Invoice is due</SelectItem>
                  <SelectItem value="request-received">Request is received</SelectItem>
                  <SelectItem value="job-completed">Job is completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Condition</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input placeholder="e.g. 5 days" disabled />
                <Input placeholder="e.g. after sent" disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Action</Label>
              <Select defaultValue="send-followup">
                <SelectTrigger>
                  <SelectValue placeholder="Choose an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send-followup">Send follow-up message</SelectItem>
                  <SelectItem value="auto-archive">Auto-archive record</SelectItem>
                  <SelectItem value="create-task">Create a task</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAutomationOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setNewAutomationOpen(false);
                toast.info('Automation builder is coming soon. Stay tuned!');
              }}
            >
              Create Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog — Textarea + toast, no backend */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tell us what you&apos;d like to automate</DialogTitle>
            <DialogDescription>
              Share the routine tasks you wish Jobber could handle for you. Your input shapes our
              roadmap.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="automation-feedback" className="text-sm font-medium">
              Your feedback
            </Label>
            <Textarea
              id="automation-feedback"
              placeholder="e.g. I'd like to automatically remind clients 7 days before a job is scheduled…"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSubmitFeedback}
              disabled={submittingFeedback}
            >
              {submittingFeedback ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
