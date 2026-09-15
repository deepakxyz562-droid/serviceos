'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Calendar,
  Star,
  MapPin,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { FormSchema, FormField } from '@/lib/forms/form-schema-types';

export default function PublicFormPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState<string | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [branding, setBranding] = useState<{ businessName: string } | null>(null);

  // Form State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ title: string; message: string }>({
    title: 'Thank you!',
    message: 'Your submission has been received.',
  });

  const fetchForm = useCallback(async () => {
    if (!formId) return;
    try {
      const res = await fetch(`/api/public/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setFormName(data.name);
        setFormDescription(data.description);
        setSchema(data.schema);
        setBranding(data.branding);
      } else {
        toast.error('Form not found or unavailable');
      }
    } catch {
      toast.error('Failed to load form');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Form Unavailable</h2>
          <p className="text-xs text-muted-foreground mt-1">This form does not exist or has been archived.</p>
        </Card>
      </div>
    );
  }

  const steps = schema.steps || [{ id: 'step_1', title: 'Details' }];
  const currentStep = steps[currentStepIndex] || steps[0];
  const stepFields = schema.fields.filter(
    (f) => !f.stepId || f.stepId === currentStep.id || steps.length === 1
  );

  const handleInputChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};
    for (const field of stepFields) {
      if (field.required) {
        const val = formData[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          source: 'hosted_form',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessInfo({
          title: data.successTitle || 'Thank you!',
          message: data.successMessage || 'Your submission has been received.',
        });
        setSubmitted(true);
        if (data.redirectUrl) {
          setTimeout(() => {
            window.location.href = data.redirectUrl;
          }, 1500);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to submit form');
      }
    } catch {
      toast.error('Network error submitting form');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 shadow-sm">
          <CheckCircle2 className="size-12 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground">{successInfo.title}</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{successInfo.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-4">
        <Card className="shadow-md border-border/80 overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-100">
              {branding?.businessName || 'Fieseros Form'}
            </p>
            <h1 className="text-xl font-black mt-1">{formName}</h1>
            {formDescription && <p className="text-xs text-emerald-100/90 mt-1">{formDescription}</p>}

            {/* Progress bar if multi-step */}
            {steps.length > 1 && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-emerald-100 font-medium mb-1">
                  <span>
                    Step {currentStepIndex + 1} of {steps.length}: {currentStep.title}
                  </span>
                  <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot field (hidden from users) */}
              <input type="text" name="_hp" className="hidden" tabIndex={-1} autoComplete="off" />

              <div className="space-y-4">
                {stepFields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </span>
                    </Label>

                    {/* Short Answer / Email / Phone / Number */}
                    {['short_answer', 'email', 'phone', 'numerical', 'date'].includes(field.type) && (
                      <Input
                        type={
                          field.type === 'email'
                            ? 'email'
                            : field.type === 'phone'
                            ? 'tel'
                            : field.type === 'numerical'
                            ? 'number'
                            : field.type === 'date'
                            ? 'date'
                            : 'text'
                        }
                        placeholder={field.placeholder || ''}
                        value={(formData[field.id] as string) || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="text-xs"
                      />
                    )}

                    {/* Long Answer */}
                    {field.type === 'long_answer' && (
                      <Textarea
                        placeholder={field.placeholder || ''}
                        value={(formData[field.id] as string) || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="text-xs min-h-[80px]"
                      />
                    )}

                    {/* Dropdown */}
                    {field.type === 'dropdown' && (
                      <Select
                        value={(formData[field.id] as string) || ''}
                        onValueChange={(val) => handleInputChange(field.id, val)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder={field.placeholder || 'Select an option...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map((opt, i) => (
                            <SelectItem key={i} value={opt.value || opt.label} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Radio Group */}
                    {field.type === 'radio' && (
                      <RadioGroup
                        value={(formData[field.id] as string) || ''}
                        onValueChange={(val) => handleInputChange(field.id, val)}
                        className="space-y-2 pt-1"
                      >
                        {(field.options || []).map((opt, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.value || opt.label} id={`${field.id}_${i}`} />
                            <Label htmlFor={`${field.id}_${i}`} className="text-xs font-normal cursor-pointer">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {/* Checkbox */}
                    {field.type === 'checkbox' && (
                      <div className="flex items-center space-x-2 pt-1">
                        <Checkbox
                          id={field.id}
                          checked={!!formData[field.id]}
                          onCheckedChange={(checked) => handleInputChange(field.id, !!checked)}
                        />
                        <Label htmlFor={field.id} className="text-xs font-normal cursor-pointer">
                          {field.placeholder || 'Yes, I agree'}
                        </Label>
                      </div>
                    )}

                    {/* Error Message */}
                    {errors[field.id] && (
                      <p className="text-[11px] text-red-500 font-medium">{errors[field.id]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t gap-3">
                {currentStepIndex > 0 ? (
                  <Button type="button" variant="outline" size="sm" onClick={handlePrev} className="gap-1 text-xs">
                    <ArrowLeft className="size-3.5" /> Back
                  </Button>
                ) : <div />}

                {currentStepIndex < steps.length - 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleNext}
                    className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Next <ArrowRight className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-xs"
                  >
                    {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    {schema.settings.submitButtonText || 'Submit Form'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          Powered by{' '}
          <a href="https://fieseros.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
            Fieseros AI Forms
          </a>
        </p>
      </div>
    </div>
  );
}
