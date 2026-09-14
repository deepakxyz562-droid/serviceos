'use client';

/**
 * Employee Add/Edit Dialog.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 *
 * A single dialog component used for both adding new employees and editing
 * existing ones (mode controlled by the `mode` prop). The parent owns all
 * form state (name, phone, email, role, etc.) and passes it in via props,
 * along with handlers that perform the actual POST/PUT to /api/employees.
 */

import { Loader2, UserPlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ROLE_OPTIONS, STATUS_OPTIONS } from '../utils/employee-helpers';

export interface EmployeeFormDialogProps {
  mode: 'add' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  // Form state
  formName: string;
  setFormName: (v: string) => void;
  formPhone: string;
  setFormPhone: (v: string) => void;
  formEmail: string;
  setFormEmail: (v: string) => void;
  formRole: string;
  setFormRole: (v: string) => void;
  formStatus: string;
  setFormStatus: (v: string) => void;
  formLocation: string;
  setFormLocation: (v: string) => void;
  formWhatsappId: string;
  setFormWhatsappId: (v: string) => void;
  formSkills: string;
  setFormSkills: (v: string) => void;
  // Compensation & Worker Type state
  formPayType?: string;
  setFormPayType?: (v: string) => void;
  formHourlyRate?: number | string;
  setFormHourlyRate?: (v: number | string) => void;
  formCommissionRate?: number | string;
  setFormCommissionRate?: (v: number | string) => void;
  formFlatAmount?: number | string;
  setFormFlatAmount?: (v: number | string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}

export function EmployeeFormDialog({
  mode,
  open,
  onOpenChange,
  saving,
  formName,
  setFormName,
  formPhone,
  setFormPhone,
  formEmail,
  setFormEmail,
  formRole,
  setFormRole,
  formStatus,
  setFormStatus,
  formLocation,
  setFormLocation,
  formWhatsappId,
  setFormWhatsappId,
  formSkills,
  setFormSkills,
  formPayType = 'hourly',
  setFormPayType,
  formHourlyRate = 0,
  setFormHourlyRate,
  formCommissionRate = 10,
  setFormCommissionRate,
  formFlatAmount = 0,
  setFormFlatAmount,
  onSubmit,
  onCancel,
}: EmployeeFormDialogProps) {
  const isAdd = mode === 'add';
  const title = isAdd ? 'Add Employee' : 'Edit Employee';
  const description = isAdd
    ? 'Add a new team member to your organization.'
    : 'Update employee information and settings.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input placeholder="e.g., John Smith" value={formName} onChange={e => setFormName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <Input placeholder="e.g., +919876543210" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="e.g., john@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
            <p className="text-xs text-muted-foreground">Required to send portal invitations</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input placeholder="e.g., Mumbai, Delhi" value={formLocation} onChange={e => setFormLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp ID</Label>
            <Input placeholder="e.g., 919876543210" value={formWhatsappId} onChange={e => setFormWhatsappId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Skills (comma separated)</Label>
            <Input placeholder="e.g., Plumbing, Electrical, Carpentry" value={formSkills} onChange={e => setFormSkills(e.target.value)} />
          </div>

          {/* ── Compensation & Worker Type ── */}
          <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3 space-y-3 dark:border-teal-900/60 dark:bg-teal-950/20">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-xs text-teal-900 dark:text-teal-200">
                Compensation & Worker Model
              </Label>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">
                Individual per-worker settings
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pay Type</Label>
                <Select value={formPayType} onValueChange={setFormPayType}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly Wage ($/hr)</SelectItem>
                    <SelectItem value="commission">Percentage Commission (%)</SelectItem>
                    <SelectItem value="flat">Flat Rate per Job ($)</SelectItem>
                    <SelectItem value="subcontractor">1099 Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formPayType === 'hourly' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Hourly Rate ($/hr)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    className="h-8 text-xs bg-background"
                    placeholder="25.00"
                    value={formHourlyRate}
                    onChange={(e) => setFormHourlyRate?.(e.target.value)}
                  />
                </div>
              )}

              {formPayType === 'commission' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Commission Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="h-8 text-xs bg-background"
                    placeholder="10"
                    value={formCommissionRate}
                    onChange={(e) => setFormCommissionRate?.(e.target.value)}
                  />
                </div>
              )}

              {formPayType === 'flat' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Flat Amount ($/job)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    className="h-8 text-xs bg-background"
                    placeholder="50.00"
                    value={formFlatAmount}
                    onChange={(e) => setFormFlatAmount?.(e.target.value)}
                  />
                </div>
              )}

              {formPayType === 'subcontractor' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Commission Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="h-8 text-xs bg-background"
                    placeholder="15"
                    value={formCommissionRate}
                    onChange={(e) => setFormCommissionRate?.(e.target.value)}
                  />
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-tight">
              {formPayType === 'hourly'
                ? 'Hourly employees log in each morning and track active shift hours.'
                : 'Commission & 1099 workers operate on-demand without morning clock-in requirements. Earnings auto-calculate upon job completion.'}
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel ?? (() => onOpenChange(false))}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onSubmit}
            disabled={!formName.trim() || !formPhone.trim() || saving}
          >
            {saving ? (
              <><Loader2 className="size-4 mr-1.5 animate-spin" /> {isAdd ? 'Adding...' : 'Saving...'}</>
            ) : isAdd ? (
              <><UserPlus className="size-4 mr-1.5" /> Add Employee</>
            ) : (
              <><Pencil className="size-4 mr-1.5" /> Save Changes</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
