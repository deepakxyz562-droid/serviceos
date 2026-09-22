'use client';

/**
 * SMS OTP Confirmation — lazy-loadable wrapper around SmsOtpVerification.
 *
 * This file exists to bridge two gaps:
 *
 * 1. **Props adapter**: The existing `SmsOtpVerification` component declares
 *    `SmsOtpVerificationProps` (value, onChange, disabled), which is narrower
 *    than the `WidgetProps` interface the lazy registry expects (value,
 *    onChange, config, disabled, allFormData, field). This wrapper accepts
 *    full WidgetProps and delegates only the props the underlying component
 *    actually needs — no component duplication.
 *
 * 2. **Lazy-map entry**: Before this wrapper, `sms_otp_verification` was only
 *    reachable via the legacy switch statement in widget-runtime-dispatcher.tsx.
 *    The dispatcher's `resolveRuntimeComponent()` checks the lazy
 *    `WIDGET_RUNTIME_MAP` first, so the switch case was unreachable from the
 *    3-layer resolution chain. Adding this wrapper to the map makes both
 *    `sms_otp_verification` (canonical) and `sms_otp_confirmation` (legacy
 *    alias via FIELD_ALIASES) resolve through the unified path.
 *
 * Backward compatibility: saved forms using either `widgetType:
 * 'sms_otp_verification'` or `widgetType: 'sms_otp_confirmation'` will both
 * render this component. The legacy switch case for `sms_otp_verification`
 * is now dead code (the lazy map is checked first) but is retained for safety.
 */
import React from 'react';
import { SmsOtpVerification } from '../sms-otp-verification';
import type { WidgetProps } from '../widget-props';

export function SmsOtpConfirmationWidget({
  value,
  onChange,
  config,
  disabled,
}: WidgetProps) {
  // Forward the full `config` so the inner component can read
  // `codeLength`/`expiryMinutes`/`provider` written by settings.
  return (
    <SmsOtpVerification
      value={value as never}
      onChange={onChange as never}
      disabled={disabled}
      config={config}
    />
  );
}

export default SmsOtpConfirmationWidget;
