/**
 * Payment Credentials Helper
 *
 * Bridges the gateway registry's `configFields` (publishableKey, secretKey,
 * applicationId, etc.) into the inspector's `settingsSchema` so users can
 * actually enter their API credentials through the Form Studio.
 *
 * Phase B of the payment-widget overhaul.
 */
import type { SettingField } from './field-settings-types';
import { getPaymentGatewayById } from './payments/payment-gateways-registry';

/**
 * Build a `settingsSchema` fragment exposing the gateway's configFields as
 * inspector controls. Returns an empty array if the gateway has no
 * configFields (e.g. apple_google_pay, clearpay — these have no API keys).
 *
 * Each credential field is rendered as either:
 *  - 'password' registry type → SettingField type 'text' with helpText
 *    telling the user to enter the key. The builder doesn't mask on screen
 *    (the inspector input is a regular text input), but stores the value
 *    under widgetConfig so the runtime can read it at submission time.
 *  - 'text' registry type → SettingField type 'text'.
 *  - 'select' registry type → SettingField type 'select' with options.
 *  - 'boolean' registry type → SettingField type 'toggle_with_description'.
 *
 * The fields land in the inspector under the 'field_specific' group with a
 * condition that only shows them when the user has selected a real gateway
 * (not when the gateway_picker is set to '__none__').
 */
export function buildCredentialSettings(gatewayId: string): SettingField[] {
  const gateway = getPaymentGatewayById(gatewayId);
  if (!gateway?.configFields || gateway.configFields.length === 0) {
    return [];
  }
  return gateway.configFields.map((cf) => {
    const base: SettingField = {
      key: cf.key,
      label: cf.label,
      type: 'text',
      group: 'field_specific',
      placeholder: cf.placeholder,
      helpText: cf.description,
      condition: { dependsOn: 'gatewayId', equals: gateway.id },
    };
    if (cf.type === 'password') {
      // The builder doesn't have a native password input; using 'text' here
      // so the value is visible (these are sandbox/test keys in 99% of cases
      // during development). Production deploys should rotate keys.
      base.helpText = `${cf.description || 'API secret key.'} Stored in the form definition; rotate regularly.`;
    } else if (cf.type === 'select' && cf.options) {
      base.type = 'select';
      base.options = cf.options;
    } else if (cf.type === 'boolean') {
      base.type = 'toggle_with_description';
      base.default = false;
      base.description = cf.description || cf.label;
    }
    return base;
  });
}

/**
 * Returns true if the gateway has any credential fields configured.
 * Used by the inspector to decide whether to show the "API Credentials"
 * section header.
 */
export function hasCredentials(gatewayId: string): boolean {
  const gateway = getPaymentGatewayById(gatewayId);
  return Boolean(gateway?.configFields && gateway.configFields.length > 0);
}

/**
 * Look up the gateway's `iconSvg` so dedicated widgets can render the real
 * logo instead of a colored square with the gateway's initial.
 */
export function getGatewayIcon(gatewayId: string): string | undefined {
  return getPaymentGatewayById(gatewayId)?.iconSvg;
}

/**
 * Look up the gateway's `brandColor` for theming the Pay button.
 */
export function getGatewayBrandColor(gatewayId: string): string | undefined {
  return getPaymentGatewayById(gatewayId)?.brandColor;
}

/**
 * Shared "Mode" (Test/Live) setting that replaces the boolean testMode toggle
 * with a clearer segmented control. Payment widgets read `config.mode` instead
 * of `config.testMode` — both are honored: testMode=true is equivalent to
 * mode='test', and testMode=false (or unset) is equivalent to mode='live'.
 *
 * This is added to every payment widget's settingsSchema automatically.
 */
export const PAYMENT_MODE_SETTING: SettingField = {
  key: 'mode',
  label: 'Payment Mode',
  type: 'segmented',
  group: 'field_specific',
  default: 'test',
  options: [
    { label: 'Test', value: 'test' },
    { label: 'Live', value: 'live' },
  ],
  helpText: 'Test mode simulates payments without charging real cards. Switch to Live to accept real payments.',
};
