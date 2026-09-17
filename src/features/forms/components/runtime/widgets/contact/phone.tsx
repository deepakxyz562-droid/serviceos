'use client';

import React from 'react';
import { PhoneInput as UIPhoneInput } from '@/components/ui/phone-input';
import { WidgetProps, str } from '../widget-props';

export function Phone({ value, onChange, config, disabled, field }: WidgetProps) {
  const val = typeof value === 'string' ? value : '';
  const defaultCountry = str(config.defaultCountry, 'US');
  const ariaLabel = str(field?.label, 'Phone');
  const placeholder = str(config.placeholder, '(555) 000-0000');

  return (
    <div aria-label={ariaLabel} role="group">
      <UIPhoneInput
        value={val}
        onChange={(v) => onChange(v)}
        defaultCountry={defaultCountry}
        placeholder={placeholder}
        disabled={disabled}
        required={false}
      />
    </div>
  );
}

export default Phone;
