'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FormTemplate } from '@/lib/forms/templates';
import { navigateToUseTemplate } from '../templates-gallery-client';

interface UseTemplateCTAButtonProps {
  template: FormTemplate;
  variant?: 'primary' | 'sidebar' | 'inline';
  className?: string;
}

export function UseTemplateCTAButton({
  template,
  variant = 'primary',
  className = '',
}: UseTemplateCTAButtonProps) {
  const handleClick = () => {
    navigateToUseTemplate(template);
  };

  if (variant === 'sidebar') {
    return (
      <Button
        onClick={handleClick}
        className={`mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 gap-2 transition ${className}`}
      >
        <span>Use this template</span>
        <ArrowRight className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition ${className}`}
    >
      <Sparkles className="size-4" />
      <span>Use this template</span>
    </Button>
  );
}
