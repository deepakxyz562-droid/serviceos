import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { HostedFormClient } from './hosted-form-client'
import { loadTenantPublicBranding } from '@/lib/tenant-branding'

// Hosted Form Page — Public form accessible via /f/[slug]
// This renders a self-contained form for sharing via email, social media, etc.
export const dynamic = 'force-dynamic'

async function getForm(slug: string) {
  try {
    // `slug` may be either the human-readable slug OR the form's cuid (the UI
    // falls back to form.id when slug is null). Try the slug column first,
    // then fall back to id lookup so both `/f/booking-request` and
    // `/f/cmqmokssc004m...` resolve to the right form.
    const bySlug = await db.form.findUnique({
      where: { slug },
      include: { _count: { select: { responses: true } } },
    })
    if (bySlug) return bySlug

    const byId = await db.form.findUnique({
      where: { id: slug },
      include: { _count: { select: { responses: true } } },
    })
    return byId
  } catch {
    return null
  }
}

export default async function HostedFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = await getForm(slug)

  if (!form || (form.status !== 'active' && form.status !== 'paused')) {
    notFound()
  }

  const fields = typeof form.fieldsJson === 'string'
    ? JSON.parse(form.fieldsJson)
    : form.fieldsJson || []

  // The Form model doesn't have a settingsJson/styleJson column — use the
  // actual fields (completionMessage) + sensible defaults for styling.
  const successMessage = form.completionMessage || 'Thank you for your submission!'
  const submitButtonText = 'Submit'
  const primaryColor = '#10b981'
  const fontFamily = 'Inter, sans-serif'
  const borderRadius = 8
  const isPaused = form.status === 'paused'
  const redirectUrl = ''

  // Resolve white-label flag for the form's tenant. If the tenant paid for
  // white-label, hide the "Powered by Fieseros" promo entirely. Forms without
  // a tenantId (rare edge case) default to showing the promo (fail-open).
  const { hideFieserosBranding } = form.tenantId
    ? await loadTenantPublicBranding(form.tenantId)
    : { hideFieserosBranding: false }

  return (
    <div style={{
      fontFamily,
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'white',
        borderRadius: `${borderRadius + 4}px`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        <HostedFormClient
          formId={form.id}
          formName={form.name}
          formDescription={form.description}
          fields={fields}
          primaryColor={primaryColor}
          fontFamily={fontFamily}
          borderRadius={borderRadius}
          successMessage={successMessage}
          submitButtonText={submitButtonText}
          isPaused={isPaused}
          redirectUrl={redirectUrl}
        />
        {/* Powered by Fieseros — small premium card (inline-styled because this
            page doesn't use Tailwind). Hidden entirely when the tenant has
            white-label enabled. Per review direction: "The tenant's business
            must remain the hero. Fieseros should feel like the technology
            powering a better business experience." */}
        {!hideFieserosBranding && (
          <div style={{
            padding: '16px 24px 20px',
            borderTop: '1px solid #f3f4f6',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                flexShrink: 0,
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#d1fae5',
                color: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}>&#10024;</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#047857' }}>
                  Built for service businesses
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Fieseros CRM
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  Manage customers, jobs, scheduling, invoices and leads — all in one place.
                </p>
                <a
                  href="https://fieseros.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#047857',
                    textDecoration: 'none',
                  }}
                >
                  Run your business with Fieseros →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
