'use client';

/**
 * InvoiceSettingsDialog — Phase 5A extraction from invoices-view.tsx.
 *
 * Replaces the inline Settings Dialog that used to live inside the parent
 * InvoicesView component's render. The dialog is the workspace-level invoice
 * automation configurator — it drives:
 *
 *   - Invoice Creation Method (manual / automatic / approval_required /
 *     recurring) — radio group
 *   - Auto Create on Job Completion — toggle
 *   - Auto Send Invoice Email — toggle
 *   - Auto Send WhatsApp Invoice — toggle
 *   - Create Deposit Invoice on Booking — toggle (reveals Deposit Percentage
 *     input when enabled)
 *   - Enable Recurring Invoices — toggle
 *   - Default Tax % — number input
 *   - Default Due Days — number input
 *
 * Loaded via GET /api/invoice-settings, saved via PUT /api/invoice-settings.
 * The component is pure presentational — all state lives in the parent
 * InvoicesView (settingsForm, settingsLoading, settingsSaving,
 * showSettingsDialog) and is threaded through as props.
 *
 * Extracted from src/components/views/invoices-view.tsx (Phase 5A refactor).
 */

import { Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InvoiceAutomationSettings } from '@/features/invoices/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original inline Settings Dialog reached
// into from the parent InvoicesView. Each prop below corresponds 1:1 to a
// parent state slot or handler; the wiring at the call site just spreads them
// in.
export interface InvoiceSettingsDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Open-change handler (called with `false` on close). */
  onOpenChange: (open: boolean) => void;
  /** Current settings form state. */
  settingsForm: InvoiceAutomationSettings;
  /** Setter for the settings form (top-level merge). */
  setSettingsForm: (
    updater:
      | InvoiceAutomationSettings
      | ((prev: InvoiceAutomationSettings) => InvoiceAutomationSettings)
  ) => void;
  /** True while the GET /api/invoice-settings request is in-flight. */
  settingsLoading: boolean;
  /** True while the PUT /api/invoice-settings request is in-flight. */
  settingsSaving: boolean;
  /** Save handler — kicks off the PUT. */
  onSave: () => void;
}

/**
 * Invoice automation settings dialog. Pure presentational — see props above.
 */
export function InvoiceSettingsDialog({
  open,
  onOpenChange,
  settingsForm,
  setSettingsForm,
  settingsLoading,
  settingsSaving,
  onSave,
}: InvoiceSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5 text-emerald-600" />
            Invoice Automation Settings
          </DialogTitle>
          <DialogDescription>
            Configure how invoices are created and delivered for your workspace
          </DialogDescription>
        </DialogHeader>

        {settingsLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-5 pr-3">
              {/* Creation Method */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Invoice Creation Method
                </Label>
                <RadioGroup
                  value={settingsForm.creationMethod}
                  onValueChange={(val) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      creationMethod:
                        val as InvoiceAutomationSettings['creationMethod'],
                    }))
                  }
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {[
                    { value: 'manual', label: 'Manual' },
                    { value: 'automatic', label: 'Automatic' },
                    { value: 'approval_required', label: 'Approval Required' },
                    { value: 'recurring', label: 'Recurring' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`rm-${opt.value}`}
                      className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/40 text-sm"
                    >
                      <RadioGroupItem id={`rm-${opt.value}`} value={opt.value} />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* Toggle switches */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">
                      Auto Create on Job Completion
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Automatically generate an invoice when a job is marked
                      complete
                    </p>
                  </div>
                  <Switch
                    checked={settingsForm.autoCreateOnJobComplete}
                    onCheckedChange={(v) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        autoCreateOnJobComplete: v,
                      }))
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">
                      Auto Send Invoice Email
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Email new invoices to customers automatically
                    </p>
                  </div>
                  <Switch
                    checked={settingsForm.autoSendEmail}
                    onCheckedChange={(v) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        autoSendEmail: v,
                      }))
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">
                      Auto Send WhatsApp Invoice
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      WhatsApp new invoices to customers automatically
                    </p>
                  </div>
                  <Switch
                    checked={settingsForm.autoSendWhatsApp}
                    onCheckedChange={(v) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        autoSendWhatsApp: v,
                      }))
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">
                      Create Deposit Invoice on Booking
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generate a deposit invoice when a booking is confirmed
                    </p>
                  </div>
                  <Switch
                    checked={settingsForm.createDepositOnBooking}
                    onCheckedChange={(v) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        createDepositOnBooking: v,
                      }))
                    }
                  />
                </div>

                {settingsForm.createDepositOnBooking && (
                  <div className="ml-1 flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
                    <Label className="text-sm">Deposit Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={settingsForm.depositPercentage}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            depositPercentage: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-8 w-20 text-sm text-right"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">
                      Enable Recurring Invoices
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allow recurring invoice schedules (AMC / subscriptions)
                    </p>
                  </div>
                  <Switch
                    checked={settingsForm.enableRecurring}
                    onCheckedChange={(v) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        enableRecurring: v,
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Numeric defaults */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Default Tax %</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={settingsForm.defaultTaxPercent}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          defaultTaxPercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="h-9 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Default Due Days</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={settingsForm.defaultDueDays}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          defaultDueDays: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="h-9 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={settingsSaving || settingsLoading}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onSave}
            disabled={settingsSaving || settingsLoading}
          >
            {settingsSaving ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
