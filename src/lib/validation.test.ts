import { describe, it, expect } from 'vitest'
import {
  createLeadSchema,
  createCustomerSchema,
  createConversationSchema,
} from '@/lib/validation'

describe('createLeadSchema', () => {
  it('validates a valid lead', () => {
    const result = createLeadSchema.safeParse({
      name: 'John Doe',
      phone: '555-0100',
      email: 'john@example.com',
      source: 'website',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createLeadSchema.safeParse({ phone: '555-0100' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true)
    }
  })

  it('requires phone', () => {
    const result = createLeadSchema.safeParse({ name: 'John' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('phone'))).toBe(true)
    }
  })

  it('rejects invalid email', () => {
    const result = createLeadSchema.safeParse({
      name: 'John',
      phone: '555',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string for email (optional)', () => {
    const result = createLeadSchema.safeParse({
      name: 'John',
      phone: '555',
      email: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all optional fields as omitted', () => {
    const result = createLeadSchema.safeParse({
      name: 'John',
      phone: '555',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative value', () => {
    const result = createLeadSchema.safeParse({
      name: 'John',
      phone: '555',
      value: -100,
    })
    expect(result.success).toBe(false)
  })
})

describe('createCustomerSchema', () => {
  it('validates a valid customer', () => {
    const result = createCustomerSchema.safeParse({
      name: 'Jane Doe',
      phone: '555-0200',
      email: 'jane@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createCustomerSchema.safeParse({ phone: '555' })
    expect(result.success).toBe(false)
  })

  it('requires phone', () => {
    const result = createCustomerSchema.safeParse({ name: 'Jane' })
    expect(result.success).toBe(false)
  })

  it('accepts tags array', () => {
    const result = createCustomerSchema.safeParse({
      name: 'Jane',
      phone: '555',
      tags: ['vip', 'repeat'],
    })
    expect(result.success).toBe(true)
  })
})

describe('createConversationSchema', () => {
  it('validates a valid conversation', () => {
    const result = createConversationSchema.safeParse({
      customerPhone: '+1234567890',
      customerName: 'Bob',
    })
    expect(result.success).toBe(true)
  })

  it('requires customerPhone', () => {
    const result = createConversationSchema.safeParse({
      customerName: 'Bob',
    })
    expect(result.success).toBe(false)
  })
})
