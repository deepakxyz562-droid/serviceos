import * as React from 'react';

/**
 * Branded Email Layout
 *
 * Wraps customer-facing email content with tenant branding:
 *   - Header: logo (if set) + business name + accent color bar
 *   - Body: white card with the email content
 *   - Footer: business contact info + "Powered by Fieseros" (unless white-label)
 *
 * Uses inline styles (not Tailwind) because email clients (Gmail, Outlook,
 * Apple Mail) have inconsistent CSS support. Inline styles are the only
 * universally-rendered approach.
 *
 * Colors come from the TenantEmailBranding DTO (resolved by loadTenantEmailBranding).
 */

import type { TenantEmailBranding } from '@/lib/tenant-branding';

interface BrandedLayoutProps {
  branding: TenantEmailBranding;
  children: React.ReactNode;
  /** Optional preheader text (shows as preview in email client inbox). */
  preheader?: string;
}

export function BrandedLayout({ branding, children, preheader }: BrandedLayoutProps) {
  const {
    businessName,
    logoUrl,
    phone,
    email,
    website,
    address,
    primaryColor,
    accentColor,
    fontFamily,
    footerHtml,
    hideFieserosBranding,
  } = branding;

  return (
    <div style={{ fontFamily, backgroundColor: '#f4f5f7', margin: 0, padding: 0 }}>
      {/* Preheader (hidden preview text) */}
      {preheader && (
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden', opacity: 0 }}>
          {preheader}
        </div>
      )}

      <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f4f5f7', padding: '24px 0' }}>
        <tbody>
          <tr>
            <td align="center">
              <table width="600" cellPadding="0" cellSpacing="0" style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                maxWidth: '600px',
                width: '100%',
              }}>
                {/* ── Accent color bar ── */}
                <tr>
                  <td style={{ backgroundColor: primaryColor, height: '6px', lineHeight: '6px' }}></td>
                </tr>

                {/* ── Header (logo + business name) ── */}
                <tr>
                  <td style={{ padding: '32px 40px 24px' }}>
                    <table width="100%" cellPadding="0" cellSpacing="0">
                      <tbody>
                        <tr>
                          <td>
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={businessName}
                                style={{ maxHeight: '48px', maxWidth: '200px', height: 'auto', display: 'inline-block' }}
                              />
                            ) : (
                              <span style={{
                                fontSize: '22px',
                                fontWeight: 700,
                                color: primaryColor,
                                fontFamily,
                              }}>
                                {businessName}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* ── Body content ── */}
                <tr>
                  <td style={{ padding: '0 40px 32px', fontFamily, color: '#1f2937', fontSize: '15px', lineHeight: '1.6' }}>
                    {children}
                  </td>
                </tr>

                {/* ── Footer ── */}
                <tr>
                  <td style={{ padding: '24px 40px 32px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                    {/* Contact details */}
                    <table width="100%" cellPadding="0" cellSpacing="0" style={{ fontSize: '13px', color: '#6b7280' }}>
                      <tbody>
                        <tr>
                          <td style={{ paddingBottom: '12px' }}>
                            <strong style={{ color: '#374151' }}>{businessName}</strong>
                            {address && <><br />{address}</>}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            {(phone || email || website) && (
                              <span>
                                {phone && <>📞 {phone} &nbsp;&nbsp;</>}
                                {email && <>✉️ {email} &nbsp;&nbsp;</>}
                                {website && <>🌐 {website}</>}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Custom footer HTML (from BrandKit) */}
                    {footerHtml && (
                      <div
                        style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280' }}
                        dangerouslySetInnerHTML={{ __html: footerHtml }}
                      />
                    )}

                    {/* "Powered by Fieseros" (hidden for white-label tenants) */}
                    {!hideFieserosBranding && (
                      <div style={{
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: '1px solid #e5e7eb',
                        fontSize: '12px',
                        color: '#9ca3af',
                        textAlign: 'center',
                      }}>
                        Powered by{' '}
                        <a
                          href="https://fieseros.com"
                          style={{ color: accentColor, textDecoration: 'none', fontWeight: 600 }}
                        >
                          Fieseros
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * A simple branded button for use inside BrandedLayout.
 * Renders as a table (not <a>) for email client compatibility.
 */
interface BrandedButtonProps {
  href: string;
  children: React.ReactNode;
  color?: string; // defaults to branding.primaryColor
}

export function BrandedButton({ href, children, color = '#0f766e' }: BrandedButtonProps) {
  return (
    <table cellPadding="0" cellSpacing="0" style={{ margin: '16px 0' }}>
      <tbody>
        <tr>
          <td style={{
            backgroundColor: color,
            borderRadius: '8px',
            padding: '12px 24px',
          }}>
            <a
              href={href}
              style={{
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                display: 'inline-block',
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
