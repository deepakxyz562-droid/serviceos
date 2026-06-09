'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  FileInput,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'select' | 'checkbox' | 'date';
  required: boolean;
  options?: string[];
}

interface FormData {
  id: string;
  name: string;
  description?: string;
  type: string;
  fieldsJson: string;
  welcomeMessage?: string;
  completionMessage?: string;
  status: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});

  // Fetch form data
  const fetchForm = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wa-forms/${formId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Form not found');
        return;
      }
      const data = await res.json();
      setForm(data.data);

      // Parse fields
      try {
        const parsedFields = JSON.parse(data.data.fieldsJson || '[]');
        setFields(Array.isArray(parsedFields) ? parsedFields : []);
      } catch {
        setFields([]);
      }
    } catch {
      setError('Failed to load form. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    if (formId) {
      fetchForm();
    }
  }, [formId, fetchForm]);

  const handleFieldChange = (fieldId: string, value: string | boolean) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    for (const field of fields) {
      if (field.required) {
        const value = responses[field.id];
        if (field.type === 'checkbox') {
          if (!value) {
            setError(`"${field.label}" is required`);
            return;
          }
        } else if (!value || (typeof value === 'string' && !value.trim())) {
          setError(`"${field.label}" is required`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Convert responses from field IDs to field labels
      const labeledResponses: Record<string, string | boolean> = {};
      for (const field of fields) {
        const value = responses[field.id];
        if (value !== undefined && value !== '') {
          labeledResponses[field.label] = value;
        }
      }

      // Try to get phone from URL params or responses
      const urlParams = new URLSearchParams(window.location.search);
      const phone = urlParams.get('phone') || (labeledResponses['Phone'] as string) || (labeledResponses['Full Name'] ? '' : '');
      const name = (labeledResponses['Full Name'] as string) || (labeledResponses['Name'] as string) || '';

      const res = await fetch(`/api/wa-forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respondentPhone: phone,
          respondentName: name,
          responses: labeledResponses,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit form');
        return;
      }

      setSubmitted(true);
      setCompletionMessage(data.data?.completionMessage || 'Thank you for your submission!');
    } catch {
      setError('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return '📅';
      case 'lead': return '📋';
      case 'feedback': return '💬';
      case 'survey': return '📊';
      case 'quote_request': return '💰';
      default: return '📋';
    }
  };

  // ─── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-emerald-600" />
          <p className="text-muted-foreground text-sm">Loading form...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────
  if (error && !form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="size-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Form Not Available</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="size-4 mr-2" /> Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Success State ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Submitted!</h2>
            <p className="text-muted-foreground">{completionMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Form Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-emerald-600 text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center size-10 rounded-full bg-white/20">
              <span className="text-xl">{getTypeIcon(form?.type || '')}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">{form?.name}</h1>
              {form?.description && (
                <p className="text-sm text-emerald-100">{form.description}</p>
              )}
            </div>
          </div>
          {form?.welcomeMessage && (
            <div className="mt-3 bg-white/10 rounded-lg p-3">
              <p className="text-sm text-emerald-50">{form.welcomeMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Body */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field, idx) => (
            <Card key={field.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center size-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <Label className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                  </div>

                  {field.type === 'select' && field.options ? (
                    <Select
                      value={(responses[field.id] as string) || ''}
                      onValueChange={(val) => handleFieldChange(field.id, val)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={`Select ${field.label}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-3 py-1">
                      <Checkbox
                        checked={!!responses[field.id]}
                        onCheckedChange={(checked) => handleFieldChange(field.id, !!checked)}
                      />
                      <span className="text-sm text-muted-foreground">Yes</span>
                    </div>
                  ) : (
                    <div className="relative">
                      {(field.type === 'phone' || field.type === 'email') && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {field.type === 'phone' ? (
                            <Phone className="size-4" />
                          ) : (
                            <User className="size-4" />
                          )}
                        </div>
                      )}
                      <Input
                        type={
                          field.type === 'number' ? 'number' :
                          field.type === 'date' ? 'date' :
                          field.type === 'email' ? 'email' :
                          field.type === 'phone' ? 'tel' :
                          'text'
                        }
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        value={(responses[field.id] as string) || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className={cn(
                          'h-10',
                          (field.type === 'phone' || field.type === 'email') && 'pl-10'
                        )}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Validation error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="size-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Separator />

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileInput className="size-5 mr-2" />
                Submit
              </>
            )}
          </Button>

          {/* Footer branding */}
          <div className="text-center pt-4 pb-8">
            <p className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-emerald-600">ServiceOS</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
