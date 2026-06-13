import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Calculate auto-score: 50 base + 10 if email + 10 if company + 20 if source=whatsapp
function calculateLeadScore(data: {
  email?: string | null
  company?: string | null
  source?: string
}): number {
  let score = 50
  if (data.email && data.email.trim().length > 0) score += 10
  if (data.company && data.company.trim().length > 0) score += 10
  if (data.source === 'whatsapp') score += 20
  return Math.min(score, 100)
}

// Basic phone validation: at least 7 digits, allows +, spaces, dashes, parens
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

// Basic email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Safe JSON parse
function safeJsonParse(str: string, fallback: unknown = {}): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// GET /api/whatsapp-lead-sessions — List WhatsApp lead capture sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tenantId = searchParams.get('tenantId')
    const phone = searchParams.get('phone')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (tenantId) where.tenantId = tenantId
    if (phone) where.customerPhone = phone

    const [sessions, total, activeCount, completedCount] = await Promise.all([
      db.whatsAppLeadSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.whatsAppLeadSession.count({ where }),
      db.whatsAppLeadSession.count({
        where: { ...where, status: { in: ['greeting', 'collecting_name', 'collecting_phone', 'collecting_email', 'collecting_address', 'collecting_service', 'collecting_date'] } },
      }),
      db.whatsAppLeadSession.count({
        where: { ...where, status: 'completed' },
      }),
    ])

    return NextResponse.json({
      data: sessions,
      activeCount,
      completedCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to list WhatsApp lead sessions:', error)
    return NextResponse.json(
      { error: 'Failed to list WhatsApp lead sessions' },
      { status: 500 }
    )
  }
}

// POST /api/whatsapp-lead-sessions — Create or update a WhatsApp lead session (chatbot flow)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerPhone, message, whatsappId, formId, tenantId, workspaceId } = body

    if (!customerPhone) {
      return NextResponse.json(
        { error: 'customerPhone is required' },
        { status: 400 }
      )
    }

    // Find an active (non-completed, non-abandoned) session for this phone
    let session = await db.whatsAppLeadSession.findFirst({
      where: {
        customerPhone,
        status: {
          in: ['greeting', 'collecting_name', 'collecting_phone', 'collecting_email', 'collecting_address', 'collecting_service', 'collecting_date'],
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // If no active session, create a new one
    if (!session) {
      const trimmedMessage = (message || '').trim()

      // If the user sent a message with the initial request, treat it as their name
      // and skip the greeting step — go directly to collecting_phone
      if (trimmedMessage) {
        session = await db.whatsAppLeadSession.create({
          data: {
            customerPhone,
            whatsappId: whatsappId ?? null,
            status: 'collecting_phone',
            dataJson: JSON.stringify({ name: trimmedMessage }),
            formId: formId ?? null,
            tenantId: tenantId ?? null,
            customerName: trimmedMessage,
          },
        })

        return NextResponse.json({
          session: {
            id: session.id,
            status: 'collecting_phone',
            customerPhone: session.customerPhone,
            customerName: trimmedMessage,
          },
          nextPrompt: `Nice to meet you, ${trimmedMessage}! 🙌 Could you please share your phone number?`,
          nextStatus: 'collecting_phone',
        })
      }

      // No message provided — start from greeting
      session = await db.whatsAppLeadSession.create({
        data: {
          customerPhone,
          whatsappId: whatsappId ?? null,
          status: 'greeting',
          dataJson: JSON.stringify({}),
          formId: formId ?? null,
          tenantId: tenantId ?? null,
        },
      })

      // Return welcome message
      return NextResponse.json({
        session: {
          id: session.id,
          status: 'greeting',
          customerPhone: session.customerPhone,
        },
        nextPrompt: 'Welcome! 👋 Thanks for reaching out. We\'d love to help you. Could you please tell us your name?',
        nextStatus: 'collecting_name',
      })
    }

    // Parse existing collected data safely
    const collectedData = typeof session.dataJson === 'string'
      ? (safeJsonParse(session.dataJson, {}) as Record<string, string>)
      : (session.dataJson || {}) as Record<string, string>

    let nextStatus = session.status
    let nextPrompt = ''
    let completed = false

    // Process the incoming message based on current status
    // Full flow: greeting → collecting_name → collecting_phone → collecting_email → collecting_address → collecting_service → collecting_date → completed
    switch (session.status) {
      case 'greeting':
        // Move to collecting_name (already sent welcome, now collect name)
        nextStatus = 'collecting_name'
        nextPrompt = 'Thanks for reaching out! Could you please tell us your name?'
        break

      case 'collecting_name': {
        // Validate name: must not be empty
        const name = (message || '').trim()
        if (!name) {
          nextPrompt = 'It looks like you didn\'t enter a name. Could you please tell us your name?'
          // Stay on collecting_name
          nextStatus = 'collecting_name'
          break
        }
        collectedData.name = name
        nextStatus = 'collecting_phone'
        nextPrompt = `Nice to meet you, ${name}! 🙌 Could you please share your phone number?`
        break
      }

      case 'collecting_phone': {
        // Validate phone number
        const phone = (message || '').trim()
        if (!phone || !isValidPhone(phone)) {
          nextPrompt = 'That doesn\'t look like a valid phone number. Please enter a phone number (at least 7 digits).'
          // Stay on collecting_phone
          nextStatus = 'collecting_phone'
          break
        }
        collectedData.phone = phone
        nextStatus = 'collecting_email'
        nextPrompt = 'Got it! Could you please share your email address? (or type "skip" to skip)'
        break
      }

      case 'collecting_email': {
        const emailInput = (message || '').trim().toLowerCase()
        if (emailInput === 'skip') {
          collectedData.email = ''
        } else if (!emailInput || !isValidEmail(emailInput)) {
          nextPrompt = 'That doesn\'t look like a valid email. Please enter a valid email address or type "skip" to skip.'
          // Stay on collecting_email
          nextStatus = 'collecting_email'
          break
        } else {
          collectedData.email = emailInput
        }
        nextStatus = 'collecting_address'
        nextPrompt = 'Great! What\'s your address or area?'
        break
      }

      case 'collecting_address': {
        const address = (message || '').trim()
        if (!address) {
          nextPrompt = 'It looks like you didn\'t enter an address. Could you please tell us your address or area?'
          nextStatus = 'collecting_address'
          break
        }
        collectedData.address = address
        nextStatus = 'collecting_service'
        nextPrompt = 'Got it! What service are you looking for? (e.g., Plumbing, Cleaning, HVAC, Electrical, Painting, etc.)'
        break
      }

      case 'collecting_service': {
        const service = (message || '').trim()
        if (!service) {
          nextPrompt = 'It looks like you didn\'t specify a service. What service are you looking for? (e.g., Plumbing, Cleaning, HVAC, Electrical, Painting, etc.)'
          nextStatus = 'collecting_service'
          break
        }
        collectedData.service = service
        nextStatus = 'collecting_date'
        nextPrompt = 'Great choice! When would you like to schedule the service? (e.g., Tomorrow, Monday, Jan 15, etc.)'
        break
      }

      case 'collecting_date': {
        const date = (message || '').trim()
        if (!date) {
          nextPrompt = 'It looks like you didn\'t specify a date. When would you like to schedule the service? (e.g., Tomorrow, Monday, Jan 15, etc.)'
          nextStatus = 'collecting_date'
          break
        }
        collectedData.date = date
        nextStatus = 'completed'
        completed = true
        nextPrompt = `Perfect! ✅ We've got all your details:\n\n📋 **Summary:**\n• Name: ${collectedData.name || 'N/A'}\n• Phone: ${collectedData.phone || customerPhone}\n• Email: ${collectedData.email || 'N/A'}\n• Address: ${collectedData.address || 'N/A'}\n• Service: ${collectedData.service || 'N/A'}\n• Preferred Date: ${collectedData.date || 'N/A'}\n\nOur team will reach out to you shortly to confirm the booking. Thank you for choosing us! 🙏`
        break
      }

      default:
        nextPrompt = 'It looks like your session has already been completed. If you need anything else, just send us a message and we\'ll start fresh!'
        break
    }

    // Update the session
    await db.whatsAppLeadSession.update({
      where: { id: session.id },
      data: {
        status: nextStatus,
        dataJson: JSON.stringify(collectedData),
        customerName: collectedData.name || session.customerName,
      },
    })

    // If completed, auto-create Lead + Customer
    let leadId: string | null = null
    let customerId: string | null = null

    if (completed) {
      try {
        const name = collectedData.name || ''
        const phone = collectedData.phone || customerPhone
        const address = collectedData.address || null
        const service = collectedData.service || null
        const email = collectedData.email || null

        if (name && phone) {
          // Check if customer with same phone already exists (scoped to tenant)
          let customer = await db.customer.findFirst({
            where: {
              phone,
              tenantId: session.tenantId,
            },
          })

          if (!customer) {
            customer = await db.customer.create({
              data: {
                name,
                phone,
                email: email ?? null,
                address: address ?? null,
                source: 'whatsapp',
                lifecycleStage: 'lead',
                tenantId: session.tenantId,
                workspaceId: workspaceId ?? null,
              },
            })
          }

          customerId = customer.id

          // Calculate lead score
          const score = calculateLeadScore({ email, source: 'whatsapp' })

          // Create lead
          const lead = await db.lead.create({
            data: {
              name,
              phone,
              email: email ?? null,
              source: 'whatsapp',
              score,
              service: service ?? null,
              address: address ?? null,
              customerId: customer.id,
              tenantId: session.tenantId,
              workspaceId: workspaceId ?? null,
            },
          })

          leadId = lead.id

          // Create lead activity
          await db.leadActivity.create({
            data: {
              leadId: lead.id,
              type: 'whatsapp',
              description: 'Lead captured via WhatsApp chatbot',
              metadataJson: JSON.stringify({
                sessionId: session.id,
                service: collectedData.service,
                preferredDate: collectedData.date,
              }),
            },
          })

          // Link lead to the session
          await db.whatsAppLeadSession.update({
            where: { id: session.id },
            data: {
              leadId: lead.id,
            },
          })
        }
      } catch (crmError) {
        // CRM creation failure should not block the chatbot response
        console.error('Auto-CRM creation from WhatsApp session failed:', crmError)
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: nextStatus,
        customerPhone: session.customerPhone,
        customerName: collectedData.name || session.customerName,
        leadId,
        customerId,
      },
      nextPrompt,
      nextStatus,
      completed,
    })
  } catch (error) {
    console.error('WhatsApp lead session failed:', error)
    return NextResponse.json(
      { error: 'WhatsApp lead session failed' },
      { status: 500 }
    )
  }
}
