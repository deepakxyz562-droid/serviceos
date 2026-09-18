'use client';

/**
 * ShareAsTemplateDialog — lets a user submit their form as a community template.
 *
 * Shown from the Form Studio Builder's publish/settings tab when the user
 * clicks "Share as Template". Collects:
 *   - Template name (defaults to the form's name)
 *   - Short description
 *   - Categories (multi-select from TEMPLATE_CATEGORIES)
 *   - Industries (multi-select from TEMPLATE_INDUSTRIES)
 *   - Tags (free text)
 *
 * On submit, POST /api/templates/submit with the current form's schema +
 * classification. The template goes into the review queue (status='submitted').
 */
import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
  type FormTemplate,
  type TemplateCategoryId,
  type TemplateIndustryId,
} from '@/lib/forms/templates';
import type { FormSchema } from '@/lib/forms/form-schema-types';

export interface ShareAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  formSchema: FormSchema;
  authorId?: string;
}

export function ShareAsTemplateDialog({
  open,
  onOpenChange,
  formName,
  formSchema,
  authorId,
}: ShareAsTemplateDialogProps) {
  const [name, setName] = useState(formName);
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<TemplateCategoryId[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<TemplateIndustryId[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (id: TemplateCategoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleIndustry = (id: TemplateIndustryId) => {
    setSelectedIndustries((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || selectedCategories.length === 0) {
      setError('Name and at least one category are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/templates/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          shortDescription: description.trim().slice(0, 120) || name.trim(),
          categories: selectedCategories,
          industries: selectedIndustries,
          tags,
          schema: formSchema,
          authorId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setSuccess(false);
      setError(null);
      setName(formName);
      setDescription('');
      setSelectedCategories([]);
      setSelectedIndustries([]);
      setTagsInput('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-600" />
            Share as Template
          </DialogTitle>
          <DialogDescription>
            Submit your form to the public template library. After admin review, it will be available for other businesses to use.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="size-12 text-emerald-600 mx-auto" />
            <p className="text-sm font-medium text-foreground">Template submitted!</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your template is now in the review queue. An admin will review it and publish it to the public library. You&apos;ll be notified when it goes live.
            </p>
            <Button onClick={handleClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="template-name" className="text-xs">Template Name *</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Solar Panel Installation Quote Form"
                className="text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="template-desc" className="text-xs">Description</Label>
              <Textarea
                id="template-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this form is for and who it's designed for..."
                className="text-sm"
                rows={3}
              />
            </div>

            {/* Categories */}
            <div className="space-y-1.5">
              <Label className="text-xs">Categories * (select 1-3)</Label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-border rounded-lg">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id as TemplateCategoryId)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                      selectedCategories.includes(cat.id as TemplateCategoryId)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Industries */}
            <div className="space-y-1.5">
              <Label className="text-xs">Industries (optional)</Label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-border rounded-lg">
                {TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').map((ind) => (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => toggleIndustry(ind.id as TemplateIndustryId)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                      selectedIndustries.includes(ind.id as TemplateIndustryId)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="template-tags" className="text-xs">Tags (comma-separated)</Label>
              <Input
                id="template-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="hipaa, multi-step, payment"
                className="text-sm"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Footer */}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !name.trim() || selectedCategories.length === 0}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Review'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
