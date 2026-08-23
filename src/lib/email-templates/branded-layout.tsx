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
    primaryColor = '#0f766e',
    accentColor = '#0d9488',
    fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    footerHtml,
    hideFieserosBranding,
  } = branding;

  const initials = businessName
    ? businessName
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'SO';

  return (
    <div style={{ fontFamily, backgroundColor: '#f1f5f9', margin: 0, padding: 0, width: '100%' }}>
      {/* Preheader (hidden preview text) */}
      {preheader && (
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden', opacity: 0, msoHide: 'all' }}>
          {preheader}
        </div>
      )}

      <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f1f5f9', padding: '32px 16px' }}>
        <tbody>
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
                  border: '1px solid #e2e8f0',
                  maxWidth: '600px',
                  width: '100%',
                }}
              >
                {/* ── Accent color bar ── */}
                <tr>
                  <td style={{ backgroundColor: primaryColor, height: '6px', lineHeight: '6px' }}></td>
                </tr>

                {/* ── Header (logo / business badge) ── */}
                <tr>
                  <td style={{ padding: '32px 40px 20px' }}>
                    <table width="100%" cellPadding="0" cellSpacing="0">
                      <tbody>
                        <tr>
                          <td align="left" style={{ verticalAlign: 'middle' }}>
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={businessName}
                                style={{ maxHeight: '52px', maxWidth: '220px', height: 'auto', display: 'block', border: 0 }}
                              />
                            ) : (
                              <table cellPadding="0" cellSpacing="0">
                                <tbody>
                                  <tr>
                                    <td
                                      style={{
                                        backgroundColor: primaryColor,
                                        borderRadius: '12px',
                                        width: '44px',
                                        height: '44px',
                                        textAlign: 'center',
                                        verticalAlign: 'middle',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '18px',
                                        fontFamily,
                                      }}
                                    >
                                      {initials}
                                    </td>
                                    <td style={{ paddingLeft: '14px', verticalAlign: 'middle' }}>
                                      <span
                                        style={{
                                          fontSize: '20px',
                                          fontWeight: 700,
                                          color: '#0f172a',
                                          letterSpacing: '-0.02em',
                                          fontFamily,
                                          display: 'block',
                                        }}
                                      >
                                        {businessName}
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* ── Body content ── */}
                <tr>
                  <td
                    style={{
                      padding: '8px 40px 36px',
                      fontFamily,
                      color: '#334155',
                      fontSize: '15px',
                      lineHeight: '1.65',
                    }}
                  >
                    {children}
                  </td>
                </tr>

                {/* ── Footer ── */}
                <tr>
                  <td
                    style={{
                      padding: '28px 40px 32px',
                      backgroundColor: '#f8fafc',
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    {/* Contact details */}
                    <table width="100%" cellPadding="0" cellSpacing="0" style={{ fontSize: '13px', color: '#64748b', fontFamily }}>
                      <tbody>
                        <tr>
                          <td style={{ paddingBottom: '10px' }}>
                            <strong style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>{businessName}</strong>
                            {address && (
                              <div style={{ color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                                {address}
                              </div>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ paddingTop: '4px' }}>
                            {(phone || email || website) && (
                              <div style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
                                {phone && (
                                  <span style={{ marginRight: '16px', display: 'inline-block' }}>
                                    <strong style={{ color: '#475569' }}>Phone:</strong> {phone}
                                  </span>
                                )}
                                {email && (
                                  <span style={{ marginRight: '16px', display: 'inline-block' }}>
                                    <strong style={{ color: '#475569' }}>Email:</strong> {email}
                                  </span>
                                )}
                                {website && (
                                  <span style={{ display: 'inline-block' }}>
                                    <strong style={{ color: '#475569' }}>Web:</strong>{' '}
                                    <a
                                      href={website.startsWith('http') ? website : `https://${website}`}
                                      style={{ color: primaryColor, textDecoration: 'none', fontWeight: 500 }}
                                    >
                                      {website.replace(/^https?:\/\//, '')}
                                    </a>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Custom footer HTML (from BrandKit) */}
                    {footerHtml && (
                      <div
                        style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}
                        dangerouslySetInnerHTML={{ __html: footerHtml }}
                      />
                    )}

                    {/* "Powered by Fieseros" (hidden for white-label tenants) */}
                    {!hideFieserosBranding && (
                      <div
                        style={{
                          marginTop: '24px',
                          paddingTop: '16px',
                          borderTop: '1px solid #e2e8f0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          textAlign: 'center',
                          fontFamily,
                        }}
                      >
                        Powered by{' '}
                        <a
                          href="https://fieseros.com"
                          style={{ color: primaryColor, textDecoration: 'none', fontWeight: 600 }}
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
    <table cellPadding="0" cellSpacing="0" style={{ margin: '24px 0 16px' }}>
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: color,
              borderRadius: '10px',
              padding: '13px 28px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <a
              href={href}
              style={{
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                display: 'inline-block',
                letterSpacing: '-0.01em',
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
