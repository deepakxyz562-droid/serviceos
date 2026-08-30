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
