'use client'

import { useState } from 'react'

interface FormField {
  id: string
  type: string
  label: string
  required?: boolean
  options?: string[]
}

interface HostedFormClientProps {
  formId: string
  formName: string
  formDescription: string | null
  fields: FormField[]
  primaryColor: string
  fontFamily: string
  borderRadius: number
  successMessage: string
  submitButtonText: string
  isPaused: boolean
  redirectUrl?: string
}

export function HostedFormClient({
  formId,
  formName,
  formDescription,
  fields,
  primaryColor,
  fontFamily,
  borderRadius,
  successMessage,
  submitButtonText,
  isPaused,
  redirectUrl,
}: HostedFormClientProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [checkboxData, setCheckboxData] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (isPaused) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <h2 style={{ fontSize: '18px', color: '#6b7280', marginBottom: '8px' }}>This form is currently unavailable</h2>
        <p style={{ fontSize: '14px', color: '#9ca3af' }}>Please check back later or contact us directly.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: `${primaryColor}15`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke={primaryColor} style={{ width: '32px', height: '32px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 style={{ fontSize: '22px', color: '#111827', marginBottom: '8px' }}>{successMessage}</h2>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // Merge text inputs and checkbox data
      const data: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(formData)) {
        data[key] = value
      }
      for (const [key, values] of Object.entries(checkboxData)) {
        if (values.length === 1) {
          data[key] = values[0]
        } else if (values.length > 1) {
          data[key] = values
        }
      }

      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, source: 'hosted_link' }),
      })

      const result = await res.json()

      if (result.error) {
        setError(result.error + (result.details ? ': ' + result.details.join(', ') : ''))
        return
      }

      setSubmitted(true)

      if (redirectUrl) {
        setTimeout(() => { window.location.href = redirectUrl }, 2000)
      }
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db',
    borderRadius: `${borderRadius}px`, fontSize: '14px', fontFamily, outline: 'none',
  }

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleCheckboxChange = (fieldId: string, value: string, checked: boolean) => {
    setCheckboxData(prev => {
      const current = prev[fieldId] || []
      return {
        ...prev,
        [fieldId]: checked ? [...current, value] : current.filter(v => v !== value),
      }
    })
  }

  return (
    <>
      <div style={{ background: primaryColor, padding: '24px', color: 'white' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{formName}</h1>
        {formDescription && <p style={{ fontSize: '14px', opacity: 0.9 }}>{formDescription}</p>}
      </div>
      <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: `${borderRadius}px`, padding: '12px 16px',
            fontSize: '14px', color: '#991b1b', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}
        {fields.map((field, idx) => {
          const fieldId = field.id || `field-${idx}`
          return (
            <div key={fieldId} style={{ marginBottom: '20px' }}>
              <label htmlFor={fieldId} style={{
                display: 'block', fontSize: '14px', fontWeight: 500,
                color: '#374151', marginBottom: '6px',
              }}>
                {field.label || `Field ${idx + 1}`}
                {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
              </label>

              {field.type === 'Textarea' || field.type === 'textarea' ? (
                <textarea id={fieldId} placeholder={`Enter ${field.label?.toLowerCase() || 'value'}`}
                  required={field.required}
                  value={formData[fieldId] || ''}
                  onChange={e => handleFieldChange(fieldId, e.target.value)}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' as const }} />
              ) : field.type === 'Dropdown' || field.type === 'Select' || field.type === 'dropdown' ? (
                <select id={fieldId} required={field.required}
                  value={formData[fieldId] || ''}
                  onChange={e => handleFieldChange(fieldId, e.target.value)}
                  style={inputStyle}>
                  <option value="">Select...</option>
                  {field.options?.map((opt, optIdx) => (
                    <option key={optIdx} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'Checkbox' || field.type === 'checkbox' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {field.options && field.options.length > 0 ? (
                    field.options.map((opt, optIdx) => (
                      <label key={optIdx} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '14px', cursor: 'pointer', color: '#374151',
                      }}>
                        <input type="checkbox" name={fieldId} value={opt}
                          checked={(checkboxData[fieldId] || []).includes(opt)}
                          onChange={e => handleCheckboxChange(fieldId, opt, e.target.checked)}
                          style={{ accentColor: primaryColor, width: '18px', height: '18px' }} />
                        {opt}
                      </label>
                    ))
                  ) : (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontSize: '14px', cursor: 'pointer', color: '#374151',
                    }}>
                      <input type="checkbox" id={fieldId} required={field.required}
                        checked={formData[fieldId] === 'true'}
                        onChange={e => handleFieldChange(fieldId, e.target.checked ? 'true' : '')}
                        style={{ accentColor: primaryColor, width: '18px', height: '18px' }} />
                      {field.label}
                    </label>
                  )}
                </div>
              ) : field.type === 'Multi-select' || field.type === 'multi-select' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {field.options?.map((opt, optIdx) => (
                    <label key={optIdx} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontSize: '14px', cursor: 'pointer', color: '#374151',
                    }}>
                      <input type="checkbox" name={fieldId} value={opt}
                        checked={(checkboxData[fieldId] || []).includes(opt)}
                        onChange={e => handleCheckboxChange(fieldId, opt, e.target.checked)}
                        style={{ accentColor: primaryColor, width: '18px', height: '18px' }} />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  type={
                    field.type === 'Email' || field.type === 'email' ? 'email' :
                    field.type === 'Phone' || field.type === 'phone' ? 'tel' :
                    field.type === 'Number' || field.type === 'number' ? 'number' :
                    field.type === 'Date' || field.type === 'date' ? 'date' : 'text'
                  }
                  id={fieldId}
                  placeholder={`Enter ${field.label?.toLowerCase() || 'value'}`}
                  required={field.required}
                  value={formData[fieldId] || ''}
                  onChange={e => handleFieldChange(fieldId, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          )
        })}
        <button type="submit" disabled={submitting} style={{
          width: '100%', padding: '12px 24px', background: primaryColor,
          color: 'white', border: 'none', borderRadius: `${borderRadius}px`,
          fontSize: '16px', fontWeight: 600, fontFamily, cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1, transition: 'opacity 0.15s',
        }}>
          {submitting ? 'Submitting...' : submitButtonText}
        </button>
      </form>
    </>
  )
}
