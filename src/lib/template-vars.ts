/**
 * Template Variable Catalog & Resolver
 * ------------------------------------
 * Central registry of all merge-tag variables available across the Template Studio.
 * Used by:
 *   - VariablePicker component (searchable, categorized insertion UI)
 *   - Email/WhatsApp editors (to validate declared variables)
 *   - personalize() rendering (to replace {{key}} with actual values)
 *
 * Variable shape: {{category.field}} e.g. {{customer.name}}, {{invoice.amount}}
 * This namespacing prevents collisions (e.g. customer.name vs employee.name).
 */

export interface VariableDef {
  key: string // full key e.g. "customer.name"
  label: string // "Customer Name"
  category: string // "Customer" | "Lead" | "Booking" | "Job" | "Invoice" | "Company" | "Employee"
  example: string // "John Smith"
  description?: string
}

export interface VariableCategory {
  name: string
  icon: string // Lucide icon name
  variables: Omit<VariableDef, 'category'>[]
}

export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    name: 'Customer',
    icon: 'Users',
    variables: [
      { key: 'customer.name', label: 'Customer Name', example: 'John Smith', description: 'Full name of the customer' },
      { key: 'customer.email', label: 'Email', example: 'john@example.com' },
      { key: 'customer.phone', label: 'Phone', example: '+1 555-0100' },
      { key: 'customer.address', label: 'Address', example: '123 Main St, Springfield, IL 62701' },
    ],
  },
  {
    name: 'Lead',
    icon: 'UserPlus',
    variables: [
      { key: 'lead.source', label: 'Lead Source', example: 'Google Ads' },
      { key: 'lead.status', label: 'Lead Status', example: 'New' },
    ],
  },
  {
    name: 'Booking',
    icon: 'CalendarCheck',
    variables: [
      { key: 'booking.number', label: 'Booking Number', example: 'BK-2024-0156' },
      { key: 'booking.date', label: 'Booking Date', example: 'Jan 15, 2025' },
      { key: 'booking.time', label: 'Booking Time', example: '10:00 AM' },
    ],
  },
  {
    name: 'Job',
    icon: 'Wrench',
    variables: [
      { key: 'job.number', label: 'Job Number', example: 'JOB-2024-0089' },
      { key: 'job.service_name', label: 'Service Name', example: 'AC Repair' },
      { key: 'job.technician_name', label: 'Technician Name', example: 'Mike Johnson' },
      { key: 'job.status', label: 'Job Status', example: 'In Progress' },
    ],
  },
  {
    name: 'Invoice',
    icon: 'FileText',
    variables: [
      { key: 'invoice.number', label: 'Invoice Number', example: 'INV-2024-0042' },
      { key: 'invoice.due_date', label: 'Due Date', example: 'Jan 30, 2025' },
      { key: 'invoice.amount', label: 'Amount', example: '$250.00' },
      { key: 'invoice.payment_link', label: 'Payment Link', example: 'https://serviceos.cc/pay/inv/42' },
    ],
  },
  {
    name: 'Company',
    icon: 'Building2',
    variables: [
      { key: 'company.name', label: 'Company Name', example: 'ServiceOS Pro' },
      { key: 'company.logo', label: 'Logo', example: 'https://serviceos.cc/logo.png' },
      { key: 'company.website', label: 'Website', example: 'https://serviceos.cc' },
      { key: 'company.email', label: 'Email', example: 'hello@serviceos.cc' },
      { key: 'company.phone', label: 'Phone', example: '+1 555-0100' },
    ],
  },
  {
    name: 'Employee',
    icon: 'HardHat',
    variables: [
      { key: 'employee.assigned_technician', label: 'Assigned Technician', example: 'Mike Johnson' },
      { key: 'employee.phone', label: 'Employee Phone', example: '+1 555-0199' },
    ],
  },
]

/** Flattened list of all variables (for quick lookup / search) */
export const ALL_VARIABLES: VariableDef[] = VARIABLE_CATEGORIES.flatMap((cat) =>
  cat.variables.map((v) => ({ ...v, category: cat.name }))
)

/** Get a variable definition by key */
export function getVariable(key: string): VariableDef | undefined {
  return ALL_VARIABLES.find((v) => v.key === key)
}

/** Search variables by label, key, or category */
export function searchVariables(query: string): VariableDef[] {
  const q = query.toLowerCase().trim()
  if (!q) return ALL_VARIABLES
  return ALL_VARIABLES.filter(
    (v) =>
      v.label.toLowerCase().includes(q) ||
      v.key.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q)
  )
}

/**
 * Extract all {{variable}} tokens from a string.
 * Returns unique keys (without braces), e.g. ["customer.name", "invoice.amount"]
 */
export function extractVariables(text: string): string[] {
  if (!text) return []
  const matches = text.match(/\{\{([^}]+)\}\}/g) || []
  const keys = matches.map((m) => m.replace(/[{}]/g, '').trim())
  return [...new Set(keys)]
}

/**
 * Personalize a template string — replace {{key}} tokens with values.
 * - Handles both namespaced ({{customer.name}}) and flat ({{name}}) keys.
 * - Unknown tokens are left in place (so reviewers can spot missing data).
 * - Common aliases: {{name}} → customer.name, {{company}} → company.name
 */
export function personalizeTemplate(
  template: string,
  vars: Record<string, string | undefined | null>
): string {
  if (!template) return ''
  let result = template

  // Common aliases (backward compat with existing templates that use {{name}}, {{company}})
  const aliased: Record<string, string | undefined | null> = {
    name: vars['customer.name'] || vars['name'],
    email: vars['customer.email'] || vars['email'],
    phone: vars['customer.phone'] || vars['phone'],
    company: vars['company.name'] || vars['company'],
    ...vars,
  }

  result = result.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) => {
    const cleanKey = key.trim()
    const value = aliased[cleanKey]
    if (value !== undefined && value !== null && value !== '') {
      return String(value)
    }
    return match // leave unknown tokens in place
  })

  return result
}

/** Build a variablesJson array (for storage) from a template's text content */
export function detectVariablesFromContent(
  ...texts: (string | undefined | null)[]
): { key: string; label: string; example: string }[] {
  const combined = texts.filter(Boolean).join(' ')
  const keys = extractVariables(combined)
  return keys.map((key) => {
    const def = getVariable(key)
    return {
      key,
      label: def?.label || key.split('.').pop() || key,
      example: def?.example || '',
    }
  })
}
