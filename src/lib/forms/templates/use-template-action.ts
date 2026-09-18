'use client';

import type { FormTemplate } from './types';

/**
 * Universal helper to clone and open a template in the form builder.
 * Stashes template ID and full schema into storage, and smoothly routes
 * authenticated users to the builder or unauthenticated users to signup.
 */
export function navigateToUseTemplate(template: FormTemplate) {
  try {
    sessionStorage.setItem('pendingTemplateId', template.id);
    localStorage.setItem('fieseros_pending_template_id', template.id);
    localStorage.setItem(
      'fieseros_pending_template',
      JSON.stringify({
        id: template.id,
        name: template.name,
        shortDescription: template.shortDescription,
        schema: template.schema,
      })
    );
  } catch {
    // Storage may be restricted in private mode
  }

  // Detect active authentication
  let isAuthenticated = false;
  try {
    const rawAuth = localStorage.getItem('fieseros_auth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      if (parsed?.isAuthenticated && parsed?.token) {
        isAuthenticated = true;
      }
    }
  } catch {}

  if (isAuthenticated) {
    window.location.href = `/?view=formBuilder&templateId=${encodeURIComponent(template.id)}`;
  } else {
    window.location.href = `/?auth=signup&returnUrl=${encodeURIComponent('/?view=formBuilder&templateId=' + template.id)}&templateId=${encodeURIComponent(template.id)}`;
  }
}
