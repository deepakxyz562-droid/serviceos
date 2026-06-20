import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { HostedFormClient } from './hosted-form-client'

// Hosted Form Page — Public form accessible via /f/[slug]
// This renders a self-contained form for sharing on WhatsApp, Facebook, etc.
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
        <div style={{ padding: '12px 24px', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
          <a href="https://serviceos.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'none' }}>Powered by ServiceOS</a>
        </div>
      </div>
    </div>
  )
}
