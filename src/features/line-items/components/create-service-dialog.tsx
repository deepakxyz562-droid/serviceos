'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SERVICE_TYPES } from '../constants';
import type { CatalogService } from '../types';

export interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillName: string;
  onCreated: (svc: CatalogService) => void;
}

export function CreateServiceDialog({
  open,
  onOpenChange,
  prefillName,
  onCreated,
}: CreateServiceDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [basePrice, setBasePrice] = useState('0');
  const [duration, setDuration] = useState('60');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(prefillName || '');
      setDescription('');
      setCategory('general');
      setBasePrice('0');
      setDuration('60');
    }
  }, [open, prefillName]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Service name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category,
          basePrice: parseFloat(basePrice) || 0,
          duration: parseInt(duration) || 60,
          isActive: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const svc = data.service;
        toast.success(`Service "${svc.name}" created`);
        onCreated(svc);
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create service');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-emerald-600" /> Add New Item
          </DialogTitle>
          <DialogDescription>Create a new product or service in your catalog</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drain cleaning"
            />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Base Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            Create &amp; Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
