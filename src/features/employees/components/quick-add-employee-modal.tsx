'use client';

import { useState } from 'react';
import { UserPlus, Loader2, Mail, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { apiUrl } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export interface QuickAddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (employee: any) => void;
  defaultRole?: string;
}

const COMMON_ROLES = [
  { value: 'technician', label: 'Technician' },
  { value: 'driver', label: 'Driver' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'hvac', label: 'HVAC Tech' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'painter', label: 'Painter' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'staff', label: 'General Staff' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function QuickAddEmployeeModal({
  open,
  onOpenChange,
  onCreated,
  defaultRole = 'technician',
}: QuickAddEmployeeModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setRole(defaultRole);
    setLocation('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter employee full name');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(apiUrl('/api/employees'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          role: role || 'technician',
          status: 'available',
          location: location.trim() || undefined,
          skills: [role || 'technician'],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create employee');
      }

      const created = await res.json();
      toast.success(`${created.name || 'Technician'} added successfully`);

      // Invalidate all relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'assignees'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['smart-assign'] });

      if (onCreated) {
        onCreated(created);
      }
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(
    name.trim() &&
    phone.trim() &&
    email.trim() &&
    EMAIL_REGEX.test(email.trim()) &&
    !loading
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-teal-600" />
            Add New Technician / Employee
          </DialogTitle>
          <DialogDescription>
            Add a team member with required contact details for scheduling and dispatch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="emp-name" className="text-xs font-semibold">
              Full Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="emp-name"
                placeholder="e.g. John Doe"
                className="pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-phone" className="text-xs font-semibold">
                Phone Number *
              </Label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="Phone number *"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-role" className="text-xs font-semibold">
                Role / Skill
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="emp-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-email" className="text-xs font-semibold">
              Email Address *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="emp-email"
                type="email"
                placeholder="john@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-loc" className="text-xs font-semibold">
              Base Location / City (Optional)
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="emp-loc"
                placeholder="e.g. Downtown / Austin, TX"
                className="pl-9"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="size-4 mr-1.5" />
                  Add & Enable Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
