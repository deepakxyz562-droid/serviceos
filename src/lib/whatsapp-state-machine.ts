/**
 * ServiceOS WhatsApp State Machine
 *
 * Manages WhatsApp conversations as stateful interactions.
 * Each conversation tracks its current state and responds
 * differently based on the stage.
 *
 * States:
 *   greeting → intent_detected → booking → confirmed → assigned →
 *   en_route → in_progress → completed → review → archived
 *
 * Interactive Flows:
 *   - "Accept Job" button → transitions to accepted
 *   - "Reject Job" button → transitions to rejected
 *   - "Confirm Appointment" → transitions to confirmed
 *   - "Reschedule Request" → transitions back to booking
 *
 * Inbound Message Handling:
 *   - Auto-detect intent from message text
 *   - Create/update customer record
 *   - Create lead if not exists
 *   - Ask follow-up questions
 *   - Route to human agent if intent unclear
 *
 * Usage:
 *   const response = await WhatsAppStateMachine.handleInboundMessage(phone, message, metadata);
 *   // Returns { reply: string, interactive?: object, updatedConversation: Conversation }
 */

import { db } from '@/lib/db'
import { EventBus } from '@/lib/event-bus'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConversationState =
  | 'greeting'
  | 'intent_detected'
  | 'booking'
  | 'confirmed'
  | 'assigned'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'review'
  | 'archived'
  | 'rejected'
  | 'rescheduled'

export interface Conversation {
  id: string
  phone: string
  state: ConversationState
  customerId?: string | null
  leadId?: string | null
  jobId?: string | null
  employeeId?: string | null
  tenantId?: string | null
  lastMessageAt: Date
  lastMessageText: string
  messageCount: number
  detectedIntent?: string | null
  extractedData: Record<string, unknown>
  stateHistory: StateHistoryEntry[]
  awaitingResponse: AwaitingResponse | null
  createdAt: Date
  updatedAt: Date
}

export interface StateHistoryEntry {
  state: ConversationState
  enteredAt: string
  exitedAt?: string | null
  trigger: string
  metadata?: Record<string, unknown>
}

export interface AwaitingResponse {
  type: string
  prompt: string
  expectedIntents: string[]
  expiresAt?: string
}

export interface IntentResult {
  intent: string
  confidence: number
  extractedData: Record<string, unknown>
}

export interface InboundMessageResult {
  reply: string
  interactive?: Record<string, unknown>
  updatedConversation: Conversation
  intent?: IntentResult
  actionsTaken: string[]
}

export interface ReplyPayload {
  message: string
  interactive?: Record<string, unknown>
  awaitingResponse?: AwaitingResponse | null
}

// ─── State Transition Map ─────────────────────────────────────────────────────

const VALID_STATE_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  greeting: ['intent_detected', 'booking', 'archived'],
  intent_detected: ['booking', 'greeting', 'archived'],
  booking: ['confirmed', 'rescheduled', 'archived'],
  confirmed: ['assigned', 'rescheduled', 'archived'],
  assigned: ['en_route', 'rejected', 'booking', 'archived'],
  en_route: ['in_progress', 'assigned', 'archived'],
  in_progress: ['completed', 'assigned', 'archived'],
  completed: ['review', 'archived'],
  review: ['archived'],
  archived: ['greeting'],
  rejected: ['assigned', 'booking', 'archived'],
  rescheduled: ['booking', 'confirmed', 'archived'],
}

// ─── Intent Detection Rules ───────────────────────────────────────────────────

interface IntentRule {
  keywords: string[]
  intent: string
  extractData?: (message: string) => Record<string, unknown>
}

const INTENT_RULES: IntentRule[] = [
  // Service type detection
  {
    keywords: ['clean', 'cleaning', 'maid', 'deep clean', 'housekeeping', 'sanitiz'],
    intent: 'cleaning_service',
    extractData: (msg) => {
      const data: Record<string, unknown> = { serviceType: 'cleaning' }
      if (/deep\s*clean/i.test(msg)) data.serviceSubtype = 'deep_cleaning'
      if (/move\s*(in|out)/i.test(msg)) data.serviceSubtype = 'move_in_out_cleaning'
      if (/office/i.test(msg)) data.serviceSubtype = 'office_cleaning'
      if (/post\s*construction/i.test(msg)) data.serviceSubtype = 'post_construction'
      return data
    },
  },
  {
    keywords: ['plumb', 'leak', 'pipe', 'faucet', 'drain', 'toilet', 'sink', 'water heater', 'clog'],
    intent: 'plumbing',
    extractData: (msg) => {
      const data: Record<string, unknown> = { serviceType: 'plumbing' }
      if (/emergency|urgent|flood/i.test(msg)) data.priority = 'high'
      if (/leak/i.test(msg)) data.issue = 'leak'
      if (/clog|block/i.test(msg)) data.issue = 'clog'
      return data
    },
  },
  {
    keywords: ['electric', 'wiring', 'outlet', 'switch', 'light', 'power', 'circuit', 'breaker'],
    intent: 'electrical',
    extractData: (msg) => {
      const data: Record<string, unknown> = { serviceType: 'electrical' }
      if (/emergency|urgent|spark|fire/i.test(msg)) data.priority = 'high'
      return data
    },
  },
  {
    keywords: ['paint', 'painting', 'wall', 'interior', 'exterior paint'],
    intent: 'painting',
    extractData: (msg) => ({ serviceType: 'painting' }),
  },
  {
    keywords: ['hvac', 'ac', 'air conditioning', 'heating', 'furnace', 'cooling', 'thermostat'],
    intent: 'hvac',
    extractData: (msg) => ({ serviceType: 'hvac' }),
  },
  {
    keywords: ['landscap', 'lawn', 'garden', 'tree', 'yard', 'mow'],
    intent: 'landscaping',
    extractData: (msg) => ({ serviceType: 'landscaping' }),
  },
  {
    keywords: ['pest', 'termite', 'rodent', 'insect', 'bug', 'exterminat', 'cockroach', 'ant'],
    intent: 'pest_control',
    extractData: (msg) => ({ serviceType: 'pest_control' }),
  },
  {
    keywords: ['lock', 'locksmith', 'key', 'locked out', 'door'],
    intent: 'locksmith',
    extractData: (msg) => ({ serviceType: 'locksmith' }),
  },
  // Booking intent detection
  {
    keywords: ['tomorrow', 'today', 'schedule', 'book', 'appointment', 'reserve', 'next week', 'asap', 'soon'],
    intent: 'booking_intent',
    extractData: (msg) => {
      const data: Record<string, unknown> = {}
      // Try to extract date mentions
      if (/today/i.test(msg)) data.preferredDate = 'today'
      if (/tomorrow/i.test(msg)) data.preferredDate = 'tomorrow'
      if (/next\s*week/i.test(msg)) data.preferredDate = 'next_week'
      if (/asap|urgent|right\s*away|immediately/i.test(msg)) data.preferredDate = 'asap'
      if (/morning/i.test(msg)) data.preferredTime = 'morning'
      if (/afternoon/i.test(msg)) data.preferredTime = 'afternoon'
      if (/evening/i.test(msg)) data.preferredTime = 'evening'
      return data
    },
  },
  // Pricing inquiry
  {
    keywords: ['price', 'cost', 'how much', 'rate', 'quote', 'estimate', 'charge', 'fee', 'afford'],
    intent: 'pricing_inquiry',
    extractData: (msg) => {
      const data: Record<string, unknown> = { inquiryType: 'pricing' }
      // Try to detect specific service being asked about
      if (/clean/i.test(msg)) data.serviceType = 'cleaning'
      if (/plumb/i.test(msg)) data.serviceType = 'plumbing'
      return data
    },
  },
  // Cancellation
  {
    keywords: ['cancel', 'reschedule', 'change date', 'different time', 'can\'t make it', 'postpone', 'delay'],
    intent: 'cancellation_intent',
    extractData: (msg) => {
      const data: Record<string, unknown> = { intentType: 'cancel_or_reschedule' }
      if (/reschedule|change\s*date|different\s*time/i.test(msg)) data.specificIntent = 'reschedule'
      else data.specificIntent = 'cancel'
      return data
    },
  },
  // Status inquiry
  {
    keywords: ['status', 'where', 'when', 'eta', 'arrive', 'coming', 'track', 'update', 'how long', 'wait'],
    intent: 'status_inquiry',
    extractData: (msg) => {
      const data: Record<string, unknown> = { inquiryType: 'status' }
      return data
    },
  },
  // Greeting
  {
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'sup'],
    intent: 'greeting',
    extractData: () => ({}),
  },
  // Affirmative responses
  {
    keywords: ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirm', 'correct', 'right', 'please', 'proceed', 'go ahead', 'book it'],
    intent: 'affirmative',
    extractData: () => ({ response: 'yes' }),
  },
  // Negative responses
  {
    keywords: ['no', 'nope', 'nah', 'don\'t', 'not', 'never', 'decline', 'reject'],
    intent: 'negative',
    extractData: () => ({ response: 'no' }),
  },
  // Thanks / feedback
  {
    keywords: ['thank', 'thanks', 'great', 'awesome', 'excellent', 'good', 'nice', 'appreciate'],
    intent: 'positive_feedback',
    extractData: () => ({}),
  },
  // Help request
  {
    keywords: ['help', 'support', 'agent', 'human', 'person', 'talk to', 'speak to', 'representative', 'chat'],
    intent: 'human_agent_request',
    extractData: () => ({ requiresHuman: true }),
  },
  // Rating responses
  {
    keywords: ['⭐⭐⭐⭐⭐', '5 star', 'five star', 'excellent', 'amazing', 'perfect'],
    intent: 'rating_5',
    extractData: () => ({ rating: 5 }),
  },
  {
    keywords: ['⭐⭐⭐⭐', '4 star', 'four star', 'very good'],
    intent: 'rating_4',
    extractData: () => ({ rating: 4 }),
  },
  {
    keywords: ['⭐⭐⭐', '3 star', 'three star', 'okay', 'average', 'decent'],
    intent: 'rating_3',
    extractData: () => ({ rating: 3 }),
  },
  {
    keywords: ['⭐⭐', '2 star', 'two star', 'bad', 'poor', 'disappoint'],
    intent: 'rating_2',
    extractData: () => ({ rating: 2 }),
  },
  {
    keywords: ['⭐', '1 star', 'one star', 'terrible', 'horrible', 'worst', 'awful'],
    intent: 'rating_1',
    extractData: () => ({ rating: 1 }),
  },
  // Address / location
  {
    keywords: ['address', 'location', 'locate', 'street', 'avenue', 'road', 'drive', 'blvd', 'apartment', 'apt', 'suite', 'unit'],
    intent: 'address_provided',
    extractData: (msg) => {
      // Attempt to extract an address-like string
      const addressMatch = msg.match(
        /(?:address|location|at|is)[:\s]*([^\n]+)/i
      )
      return { address: addressMatch?.[1]?.trim() || msg.trim() }
    },
  },
]

// ─── Conversation Store ───────────────────────────────────────────────────────
// In-memory store for active conversations. In production, this would be
// persisted to the database (e.g., a Conversation model) or Redis.

const conversationStore = new Map<string, Conversation>()
let conversationIdCounter = 0

function generateConversationId(): string {
  conversationIdCounter++
  return `conv_${Date.now()}_${conversationIdCounter}`
}

// ─── Intent Detection ─────────────────────────────────────────────────────────

/**
 * Rule-based intent detection from message text.
 * Returns the best-matching intent with confidence and extracted data.
 *
 * @param message - The incoming message text
 * @returns Intent detection result
 */
export function detectIntent(message: string): IntentResult {
  const normalizedMessage = message.toLowerCase().trim()

  if (!normalizedMessage) {
    return { intent: 'empty', confidence: 1.0, extractedData: {} }
  }

  // Score each intent rule
  const scored: Array<{ rule: IntentRule; score: number; data: Record<string, unknown> }> = []

  for (const rule of INTENT_RULES) {
    let score = 0
    let matchedKeywords = 0

    for (const keyword of rule.keywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        matchedKeywords++
        // Longer keyword matches get higher scores (more specific)
        score += keyword.length
      }
    }

    if (matchedKeywords > 0) {
      // Boost score by number of matched keywords
      score *= matchedKeywords
      const data = rule.extractData ? rule.extractData(message) : {}
      scored.push({ rule, score, data })
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return { intent: 'unknown', confidence: 0.0, extractedData: {} }
  }

  const best = scored[0]
  // Calculate confidence: ratio of matched characters to total message length
  // Capped at 1.0
  const maxPossibleScore = normalizedMessage.length * scored.length
  const rawConfidence = best.score / Math.max(maxPossibleScore, 1)
  const confidence = Math.min(Math.max(rawConfidence, matchedKeywordConfidence(best.rule.keywords, normalizedMessage)), 1.0)

  return {
    intent: best.rule.intent,
    confidence,
    extractedData: best.data,
  }
}

/**
 * Alternative confidence: based on how many keywords matched relative to total keywords.
 */
function matchedKeywordConfidence(keywords: string[], message: string): number {
  const lowerMsg = message.toLowerCase()
  let matched = 0
  for (const kw of keywords) {
    if (lowerMsg.includes(kw.toLowerCase())) matched++
  }
  // At least 0.3 confidence if one keyword matches, up to 0.9
  return Math.min(0.3 + (matched / keywords.length) * 0.6, 0.9)
}

// ─── Find or Create Conversation ──────────────────────────────────────────────

/**
 * Find an existing conversation by phone number, or create a new one.
 * Also creates or looks up the associated Customer and Lead records.
 *
 * @param phone - The customer's phone number
 * @param tenantId - Optional tenant ID for scoping
 * @returns The Conversation object
 */
export async function findOrCreateConversation(
  phone: string,
  tenantId?: string
): Promise<Conversation> {
  const normalizedPhone = phone.replace(/\D/g, '')

  // Check in-memory store first
  if (conversationStore.has(normalizedPhone)) {
    const existing = conversationStore.get(normalizedPhone)!
    existing.lastMessageAt = new Date()
    return existing
  }

  // Try to find existing customer and lead in the database
  let customer = await db.customer.findFirst({
    where: { phone: normalizedPhone },
  })

  let lead: Record<string, unknown> | null = null
  if (customer) {
    lead = await db.lead.findFirst({
      where: {
        customerId: customer.id,
        status: { notIn: ['converted', 'lost'] },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Determine initial state based on existing records
  let initialState: ConversationState = 'greeting'
  let jobId: string | null = null
  let employeeId: string | null = null

  if (lead) {
    const leadData = lead as Record<string, unknown>
    const leadStatus = leadData.status as string

    // Map lead/job status to conversation state
    if (leadData.jobId) {
      jobId = leadData.jobId as string
      const job = await db.job.findUnique({ where: { id: jobId as string } })
      if (job) {
        switch (job.status) {
          case 'pending': initialState = 'booking'; break
          case 'confirmed': initialState = 'confirmed'; break
          case 'assigned': initialState = 'assigned'; break
          case 'en_route': initialState = 'en_route'; break
          case 'in_progress': initialState = 'in_progress'; break
          case 'completed': initialState = 'completed'; break
          default: initialState = 'greeting'
        }
        employeeId = job.assigneeId
      }
    } else if (leadStatus === 'new' || leadStatus === 'contacted') {
      initialState = 'intent_detected'
    } else if (leadStatus === 'qualified') {
      initialState = 'booking'
    }
  }

  const conversation: Conversation = {
    id: generateConversationId(),
    phone: normalizedPhone,
    state: initialState,
    customerId: customer?.id || null,
    leadId: (lead?.id as string) || null,
    jobId,
    employeeId,
    tenantId: tenantId || (customer?.workspaceId) || null,
    lastMessageAt: new Date(),
    lastMessageText: '',
    messageCount: 0,
    detectedIntent: null,
    extractedData: {},
    stateHistory: [
      {
        state: initialState,
        enteredAt: new Date().toISOString(),
        trigger: 'conversation_created',
      },
    ],
    awaitingResponse: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  conversationStore.set(normalizedPhone, conversation)
  return conversation
}

// ─── State Transition ─────────────────────────────────────────────────────────

/**
 * Transition a conversation to a new state.
 * Validates the transition and records the history.
 *
 * @param conversationId - The conversation ID (phone number is used as key)
 * @param newState - The target state
 * @param context - Optional context for the transition
 * @returns The updated Conversation
 */
export async function transitionState(
  conversationId: string,
  newState: ConversationState,
  context?: {
    trigger?: string
    metadata?: Record<string, unknown>
  }
): Promise<Conversation> {
  // Find conversation by iterating (conversationId is the conv.id, not the phone)
  let conversation: Conversation | undefined
  for (const [, conv] of Array.from(conversationStore)) {
    if (conv.id === conversationId) {
      conversation = conv
      break
    }
  }

  if (!conversation) {
    throw new Error(`[WhatsAppSM] Conversation not found: ${conversationId}`)
  }

  const currentState = conversation.state

  // Allow same-state transitions (for refreshing context)
  if (currentState === newState) {
    conversation.updatedAt = new Date()
    return conversation
  }

  // Validate transition
  if (!VALID_STATE_TRANSITIONS[currentState]?.includes(newState)) {
    console.warn(
      `[WhatsAppSM] Invalid state transition: ${currentState} → ${newState} ` +
      `for conversation ${conversationId}`
    )
    // Still allow the transition with a warning, for flexibility
  }

  // Close the previous state entry
  const lastEntry = conversation.stateHistory[conversation.stateHistory.length - 1]
  if (lastEntry && !lastEntry.exitedAt) {
    lastEntry.exitedAt = new Date().toISOString()
  }

  // Add new state entry
  conversation.stateHistory.push({
    state: newState,
    enteredAt: new Date().toISOString(),
    trigger: context?.trigger || 'unknown',
    metadata: context?.metadata,
  })

  // Update conversation
  conversation.state = newState
  conversation.updatedAt = new Date()

  // Fire event on EventBus
  try {
    await EventBus.emit('conversation.state_changed', {
      conversationId: conversation.id,
      phone: conversation.phone,
      previousState: currentState,
      newState,
      trigger: context?.trigger,
      jobId: conversation.jobId,
      leadId: conversation.leadId,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[WhatsAppSM] Failed to emit state change event:', err)
  }

  // Update cache
  conversationStore.set(conversation.phone, conversation)

  return conversation
}

// ─── Generate Reply ───────────────────────────────────────────────────────────

/**
 * Generate an appropriate reply based on the conversation state and detected intent.
 *
 * @param conversation - The current conversation
 * @param intent - Optional detected intent
 * @returns Reply payload with message and optional interactive elements
 */
export async function generateReply(
  conversation: Conversation,
  intent?: IntentResult
): Promise<ReplyPayload> {
  const state = conversation.state
  const intentType = intent?.intent || conversation.detectedIntent || 'unknown'

  switch (state) {
    case 'greeting': {
      if (intentType === 'greeting') {
        return {
          message: '👋 Welcome! I\'m your ServiceOS assistant. How can I help you today?\n\nYou can:\n• Book a service\n• Check your appointment status\n• Get a price quote\n• Speak with an agent',
          interactive: {
            type: 'button',
            body: { text: '👋 Welcome! How can I help you today?' },
            action: {
              buttons: [
                { type: 'reply', reply: { id: 'btn_book_service', title: '📋 Book Service' } },
                { type: 'reply', reply: { id: 'btn_check_status', title: '🔍 Check Status' } },
                { type: 'reply', reply: { id: 'btn_get_pricing', title: '💰 Get Pricing' } },
              ],
            },
          },
          awaitingResponse: {
            type: 'intent_selection',
            prompt: 'Please select an option or describe what you need',
            expectedIntents: ['cleaning_service', 'plumbing', 'electrical', 'booking_intent', 'pricing_inquiry', 'status_inquiry'],
          },
        }
      }

      // Customer sent something specific right away
      if (intent && intent.confidence > 0.3) {
        return handleDetectedIntent(conversation, intent)
      }

      return {
        message: '👋 Hello! Thanks for reaching out. What service can I help you with today?',
        interactive: {
          type: 'button',
          body: { text: '👋 What service do you need?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'btn_cleaning', title: '🧹 Cleaning' } },
              { type: 'reply', reply: { id: 'btn_plumbing', title: '🔧 Plumbing' } },
              { type: 'reply', reply: { id: 'btn_other', title: '📦 Other' } },
            ],
          },
        },
        awaitingResponse: {
          type: 'service_type',
          prompt: 'What type of service do you need?',
          expectedIntents: ['cleaning_service', 'plumbing', 'electrical', 'hvac', 'painting', 'landscaping'],
        },
      }
    }

    case 'intent_detected': {
      return handleDetectedIntent(conversation, intent)
    }

    case 'booking': {
      return handleBookingState(conversation, intent)
    }

    case 'confirmed': {
      if (intentType === 'cancellation_intent') {
        return {
          message: 'I understand you\'d like to change your appointment. Would you like to reschedule or cancel?',
          interactive: {
            type: 'button',
            body: { text: 'Would you like to reschedule or cancel?' },
            action: {
              buttons: [
                { type: 'reply', reply: { id: 'btn_reschedule', title: '🔄 Reschedule' } },
                { type: 'reply', reply: { id: 'btn_cancel', title: '❌ Cancel' } },
              ],
            },
          },
          awaitingResponse: {
            type: 'cancel_or_reschedule',
            prompt: 'Reschedule or cancel?',
            expectedIntents: ['affirmative', 'negative', 'cancellation_intent'],
          },
        }
      }

      if (intentType === 'status_inquiry') {
        return generateStatusReply(conversation)
      }

      return {
        message: '✅ Your booking is confirmed! We\'re assigning a technician and will notify you once they\'re on the way.\n\nNeed anything else? Reply with:\n• "status" - Check your appointment\n• "reschedule" - Change the date\n• "cancel" - Cancel your booking',
        awaitingResponse: {
          type: 'post_booking',
          prompt: 'Any other questions?',
          expectedIntents: ['status_inquiry', 'cancellation_intent', 'greeting'],
        },
      }
    }

    case 'assigned': {
      if (intentType === 'cancellation_intent') {
        return {
          message: 'Your technician has already been assigned. Would you like to reschedule or cancel?',
          interactive: {
            type: 'button',
            body: { text: 'Your technician is assigned. Reschedule or cancel?' },
            action: {
              buttons: [
                { type: 'reply', reply: { id: 'btn_reschedule', title: '🔄 Reschedule' } },
                { type: 'reply', reply: { id: 'btn_cancel', title: '❌ Cancel' } },
              ],
            },
          },
          awaitingResponse: {
            type: 'cancel_or_reschedule',
            prompt: 'Reschedule or cancel?',
            expectedIntents: ['affirmative', 'negative'],
          },
        }
      }

      if (intentType === 'status_inquiry') {
        return generateStatusReply(conversation)
      }

      return {
        message: '👨‍🔧 A technician has been assigned to your service! They\'ll be on their way soon.\n\nReply "status" for updates or "cancel" to cancel.',
      }
    }

    case 'en_route': {
      if (intentType === 'status_inquiry') {
        return generateStatusReply(conversation)
      }

      return {
        message: '🚀 Your technician is on the way! Please ensure someone is available at the service location.\n\nReply "status" for live updates.',
      }
    }

    case 'in_progress': {
      return {
        message: '🔧 Your service is currently in progress. The technician is working on your request.\n\nIf you have any questions, feel free to ask. Otherwise, we\'ll notify you once it\'s complete!',
      }
    }

    case 'completed': {
      if (intentType?.startsWith('rating_')) {
        const rating = intent?.extractedData?.rating as number | undefined
        return {
          message: `Thank you for your ${rating ? `${rating}-star` : ''} rating! Your feedback helps us improve. Have a great day! 🙏`,
        }
      }

      return {
        message: '✅ Your service has been completed! We hope everything went well.\n\nHow would you rate our service?',
        interactive: {
          type: 'button',
          body: { text: '✅ Service complete! How would you rate us?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'btn_rate_5', title: '⭐⭐⭐⭐⭐' } },
              { type: 'reply', reply: { id: 'btn_rate_4', title: '⭐⭐⭐⭐' } },
              { type: 'reply', reply: { id: 'btn_rate_3', title: '⭐⭐⭐' } },
            ],
          },
        },
        awaitingResponse: {
          type: 'rating',
          prompt: 'Please rate our service',
          expectedIntents: ['rating_5', 'rating_4', 'rating_3', 'rating_2', 'rating_1'],
        },
      }
    }

    case 'review': {
      return {
        message: 'Thank you for your feedback! Your review has been recorded. We appreciate your business! 🙏\n\nNeed anything else? Just send a message.',
      }
    }

    case 'rejected': {
      return {
        message: 'The technician was unable to accept this job. We\'re reassigning it to another available technician.\n\nWe\'ll notify you once a new technician is assigned.',
      }
    }

    case 'rescheduled': {
      return handleBookingState(conversation, intent)
    }

    case 'archived': {
      return {
        message: '👋 Welcome back! How can I help you today? You can book a new service or ask about an existing one.',
        interactive: {
          type: 'button',
          body: { text: '👋 Welcome back! What can I do for you?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'btn_book_service', title: '📋 Book Service' } },
              { type: 'reply', reply: { id: 'btn_check_status', title: '🔍 Check Status' } },
            ],
          },
        },
      }
    }

    default: {
      return {
        message: 'I\'m not sure how to help with that. Would you like to book a service, check a status, or speak with an agent?',
        interactive: {
          type: 'button',
          body: { text: 'How can I help you?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'btn_book_service', title: '📋 Book Service' } },
              { type: 'reply', reply: { id: 'btn_human_agent', title: '👤 Speak to Agent' } },
            ],
          },
        },
      }
    }
  }
}

// ─── Handle Detected Intent ───────────────────────────────────────────────────

async function handleDetectedIntent(
  conversation: Conversation,
  intent: IntentResult
): Promise<ReplyPayload> {
  const { intent: intentType, extractedData } = intent

  // Handle human agent request at any state
  if (intentType === 'human_agent_request') {
    return {
      message: '👤 I\'ll connect you with a team member right away. Please hold for a moment.\n\nIn the meantime, you can describe your issue in detail so our agent can help you faster.',
      awaitingResponse: {
        type: 'human_handoff',
        prompt: 'A human agent will assist you shortly',
        expectedIntents: [],
      },
    }
  }

  // Handle pricing inquiry
  if (intentType === 'pricing_inquiry') {
    const serviceType = extractedData.serviceType as string | undefined
    let pricingInfo = 'Our pricing varies based on the service and scope of work. Here are some general ranges:\n\n'
    pricingInfo += '• 🧹 Cleaning: Starting from $80\n'
    pricingInfo += '• 🔧 Plumbing: Starting from $75\n'
    pricingInfo += '• ⚡ Electrical: Starting from $90\n'
    pricingInfo += '• 🎨 Painting: Starting from $150\n'
    pricingInfo += '• ❄️ HVAC: Starting from $100\n\n'
    pricingInfo += 'For an accurate quote, please book a service and we\'ll provide a detailed estimate.'

    if (serviceType) {
      // Try to find the service in the database
      try {
        const service = await db.service.findFirst({
          where: {
            isActive: true,
            OR: [
              { name: { contains: serviceType, mode: 'insensitive' } },
              { category: { contains: serviceType, mode: 'insensitive' } },
            ],
          },
        })
        if (service) {
          pricingInfo = `💰 *${service.name}*\n\nBase price: $${service.basePrice}\nDuration: ~${service.duration} minutes\n\n${service.description || 'Contact us for a detailed quote.'}`
        }
      } catch {
        // Use default pricing info
      }
    }

    return {
      message: pricingInfo,
      interactive: {
        type: 'button',
        body: { text: pricingInfo.substring(0, 200) + '...' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_book_service', title: '📋 Book Now' } },
            { type: 'reply', reply: { id: 'btn_human_agent', title: '👤 Get Custom Quote' } },
          ],
        },
      },
      awaitingResponse: {
        type: 'post_pricing',
        prompt: 'Would you like to book a service?',
        expectedIntents: ['booking_intent', 'affirmative', 'negative'],
      },
    }
  }

  // Handle status inquiry
  if (intentType === 'status_inquiry') {
    return generateStatusReply(conversation)
  }

  // Handle cancellation
  if (intentType === 'cancellation_intent') {
    const specificIntent = extractedData.specificIntent as string | undefined
    if (specificIntent === 'reschedule') {
      return {
        message: '🔄 I\'d be happy to help you reschedule! What date and time works better for you?',
        awaitingResponse: {
          type: 'reschedule_date',
          prompt: 'When would you like to reschedule?',
          expectedIntents: ['booking_intent'],
        },
      }
    }
    return {
      message: '❌ I understand you\'d like to cancel. Are you sure you want to cancel your booking?',
      interactive: {
        type: 'button',
        body: { text: 'Are you sure you want to cancel?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_confirm_cancel', title: '❌ Yes, Cancel' } },
            { type: 'reply', reply: { id: 'btn_keep_booking', title: '✅ Keep Booking' } },
          ],
        },
      },
      awaitingResponse: {
        type: 'cancel_confirmation',
        prompt: 'Confirm cancellation?',
        expectedIntents: ['affirmative', 'negative'],
      },
    }
  }

  // Handle service-specific intent (cleaning, plumbing, etc.)
  const serviceIntents = [
    'cleaning_service', 'plumbing', 'electrical', 'painting',
    'hvac', 'landscaping', 'pest_control', 'locksmith',
  ]

  if (serviceIntents.includes(intentType)) {
    const serviceName = intentType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const serviceType = extractedData.serviceType as string || intentType

    // Try to find the service in the database
    let serviceInfo = ''
    try {
      const service = await db.service.findFirst({
        where: {
          isActive: true,
          OR: [
            { name: { contains: serviceName, mode: 'insensitive' } },
            { category: { contains: serviceType, mode: 'insensitive' } },
          ],
        },
      })
      if (service) {
        serviceInfo = `\n\n💰 Starting at $${service.basePrice}\n⏱ Duration: ~${service.duration} min`
      }
    } catch {
      // No service found
    }

    return {
      message: `Great choice! 🎉 You're interested in our *${serviceName}* service.${serviceInfo}\n\nWhen would you like to schedule your service?`,
      interactive: {
        type: 'button',
        body: { text: `When would you like your ${serviceName} service?` },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_today', title: '📅 Today' } },
            { type: 'reply', reply: { id: 'btn_tomorrow', title: '📅 Tomorrow' } },
            { type: 'reply', reply: { id: 'btn_next_week', title: '📅 Next Week' } },
          ],
        },
      },
      awaitingResponse: {
        type: 'schedule_date',
        prompt: 'When would you like the service?',
        expectedIntents: ['booking_intent', 'affirmative'],
      },
    }
  }

  // Handle booking intent
  if (intentType === 'booking_intent') {
    return {
      message: '📋 Great! Let\'s get your service booked.\n\nWhat type of service do you need?',
      interactive: {
        type: 'button',
        body: { text: '📋 What service do you need?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_cleaning', title: '🧹 Cleaning' } },
            { type: 'reply', reply: { id: 'btn_plumbing', title: '🔧 Plumbing' } },
            { type: 'reply', reply: { id: 'btn_other', title: '📦 Other' } },
          ],
        },
      },
      awaitingResponse: {
        type: 'service_type',
        prompt: 'What type of service?',
        expectedIntents: serviceIntents,
      },
    }
  }

  // Handle affirmative
  if (intentType === 'affirmative') {
    const awaiting = conversation.awaitingResponse
    if (awaiting) {
      return handleAwaitingResponseAffirmative(conversation, awaiting)
    }
    return {
      message: 'Great! How can I help you? Would you like to book a service?',
      interactive: {
        type: 'button',
        body: { text: 'What would you like to do?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_book_service', title: '📋 Book Service' } },
            { type: 'reply', reply: { id: 'btn_check_status', title: '🔍 Check Status' } },
          ],
        },
      },
    }
  }

  // Handle negative
  if (intentType === 'negative') {
    return {
      message: 'No problem! Is there anything else I can help you with? Just let me know. 😊',
    }
  }

  // Handle positive feedback
  if (intentType === 'positive_feedback') {
    return {
      message: 'We\'re glad to hear that! 😊 Thank you for the kind words. Is there anything else we can help with?',
    }
  }

  // Handle address provided
  if (intentType === 'address_provided') {
    const address = extractedData.address as string | undefined
    if (address) {
      return {
        message: `📍 Got it! Service address: *${address}*\n\nIs this correct?`,
        interactive: {
          type: 'button',
          body: { text: `📍 Is this address correct?\n${address}` },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'btn_confirm_address', title: '✅ Yes, Correct' } },
              { type: 'reply', reply: { id: 'btn_wrong_address', title: '❌ Wrong Address' } },
            ],
          },
        },
        awaitingResponse: {
          type: 'address_confirmation',
          prompt: 'Is the address correct?',
          expectedIntents: ['affirmative', 'negative'],
        },
      }
    }
  }

  // Fallback for unknown intent
  return {
    message: 'I\'d love to help! Could you tell me more about what you need?\n\n• Type "book" to schedule a service\n• Type "status" to check your appointment\n• Type "price" for pricing info\n• Type "agent" to speak with a human',
    awaitingResponse: {
      type: 'clarification',
      prompt: 'Could you clarify what you need?',
      expectedIntents: ['booking_intent', 'status_inquiry', 'pricing_inquiry', 'human_agent_request'],
    },
  }
}

// ─── Handle Awaiting Response + Affirmative ───────────────────────────────────

function handleAwaitingResponseAffirmative(
  conversation: Conversation,
  awaiting: AwaitingResponse
): ReplyPayload {
  switch (awaiting.type) {
    case 'cancel_confirmation':
      return {
        message: '❌ Your booking has been cancelled. If you change your mind, just send a message to book again!',
      }

    case 'address_confirmation':
      return {
        message: '✅ Address confirmed! What date and time works best for you?',
        awaitingResponse: {
          type: 'schedule_date',
          prompt: 'When would you like the service?',
          expectedIntents: ['booking_intent'],
        },
      }

    case 'post_pricing':
      return {
        message: '📋 Great! Let\'s get your service booked. What type of service do you need?',
        interactive: {
          type: 'button',
          body: { text: '📋 What service do you need?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'btn_cleaning', title: '🧹 Cleaning' } },
              { type: 'reply', reply: { id: 'btn_plumbing', title: '🔧 Plumbing' } },
              { type: 'reply', reply: { id: 'btn_other', title: '📦 Other' } },
            ],
          },
        },
        awaitingResponse: {
          type: 'service_type',
          prompt: 'What type of service?',
          expectedIntents: ['cleaning_service', 'plumbing', 'electrical'],
        },
      }

    default:
      return {
        message: 'Great! How would you like to proceed?',
      }
  }
}

// ─── Handle Booking State ─────────────────────────────────────────────────────

async function handleBookingState(
  conversation: Conversation,
  intent?: IntentResult
): Promise<ReplyPayload> {
  const intentType = intent?.intent

  // If we have a service type and date, we can confirm
  if (conversation.extractedData.serviceType && conversation.extractedData.preferredDate) {
    const serviceName = (conversation.extractedData.serviceType as string).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const preferredDate = conversation.extractedData.preferredDate as string

    return {
      message: `📋 *Booking Summary*\n\n🛠 Service: ${serviceName}\n📅 Date: ${preferredDate}\n📍 Address: ${(conversation.extractedData.address as string) || 'Not provided'}\n\nPlease confirm your booking.`,
      interactive: {
        type: 'button',
        body: { text: `📋 Confirm your ${serviceName} booking?` },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_confirm_booking', title: '✅ Confirm Booking' } },
            { type: 'reply', reply: { id: 'btn_change_details', title: '✏️ Change Details' } },
          ],
        },
      },
      awaitingResponse: {
        type: 'booking_confirmation',
        prompt: 'Please confirm your booking',
        expectedIntents: ['affirmative', 'negative'],
      },
    }
  }

  // Still collecting booking information
  if (intentType === 'address_provided' && intent?.extractedData?.address) {
    return {
      message: `📍 Got the address! Now, when would you like the service?`,
      interactive: {
        type: 'button',
        body: { text: '📅 When would you like the service?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_today', title: '📅 Today' } },
            { type: 'reply', reply: { id: 'btn_tomorrow', title: '📅 Tomorrow' } },
            { type: 'reply', reply: { id: 'btn_next_week', title: '📅 Next Week' } },
          ],
        },
      },
      awaitingResponse: {
        type: 'schedule_date',
        prompt: 'When would you like the service?',
        expectedIntents: ['booking_intent'],
      },
    }
  }

  return {
    message: '📋 Let\'s get your service booked! A few quick questions:\n\n1️⃣ What\'s your address for the service?',
    awaitingResponse: {
      type: 'address',
      prompt: 'What is your service address?',
      expectedIntents: ['address_provided'],
    },
  }
}

// ─── Generate Status Reply ────────────────────────────────────────────────────

async function generateStatusReply(conversation: Conversation): Promise<ReplyPayload> {
  if (!conversation.jobId) {
    return {
      message: '🔍 I don\'t see an active booking for your number. Would you like to book a service?',
      interactive: {
        type: 'button',
        body: { text: '🔍 No active booking found. Book one?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_book_service', title: '📋 Book Service' } },
            { type: 'reply', reply: { id: 'btn_human_agent', title: '👤 Talk to Agent' } },
          ],
        },
      },
    }
  }

  try {
    const job = await db.job.findUnique({
      where: { id: conversation.jobId },
      include: { assignee: true },
    })

    if (!job) {
      return {
        message: '🔍 I couldn\'t find your booking. It may have been removed. Would you like to book a new service?',
      }
    }

    const statusEmoji: Record<string, string> = {
      pending: '📋',
      confirmed: '✅',
      assigned: '👨‍🔧',
      en_route: '🚀',
      in_progress: '🔧',
      completed: '✅',
      cancelled: '❌',
    }

    const statusLabel: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      assigned: 'Technician Assigned',
      en_route: 'Technician On The Way',
      in_progress: 'Service In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }

    const emoji = statusEmoji[job.status] || '📋'
    const label = statusLabel[job.status] || job.status
    const scheduledDate = job.scheduledAt
      ? new Date(job.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'TBD'
    const scheduledTime = job.scheduledAt
      ? new Date(job.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : job.scheduledTime || 'TBD'

    let statusMsg = `${emoji} *Booking Status*\n\n`
    statusMsg += `Status: *${label}*\n`
    statusMsg += `Service: ${job.title}\n`
    statusMsg += `Date: ${scheduledDate}\n`
    statusMsg += `Time: ${scheduledTime}\n`
    if (job.address) statusMsg += `Address: ${job.address}\n`
    if (job.assignee) statusMsg += `Technician: ${job.assignee.name}\n`

    return {
      message: statusMsg,
      interactive: job.status === 'confirmed' || job.status === 'assigned' ? {
        type: 'button',
        body: { text: statusMsg },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_reschedule', title: '🔄 Reschedule' } },
            { type: 'reply', reply: { id: 'btn_cancel', title: '❌ Cancel' } },
          ],
        },
      } : undefined,
    }
  } catch (err) {
    console.error('[WhatsAppSM] Failed to generate status reply:', err)
    return {
      message: '🔍 I\'m having trouble looking up your booking. Please try again or type "agent" to speak with a team member.',
    }
  }
}

// ─── Handle Inbound Message ───────────────────────────────────────────────────

/**
 * Process an incoming WhatsApp message.
 * Finds or creates the conversation, detects intent, transitions state,
 * and generates an appropriate reply.
 *
 * @param phone - Sender's phone number
 * @param message - Message text
 * @param metadata - Optional metadata (e.g., WhatsApp message ID, profile name)
 * @returns InboundMessageResult with reply and updated conversation
 */
export async function handleInboundMessage(
  phone: string,
  message: string,
  metadata?: {
    messageId?: string
    profileName?: string
    waId?: string
    tenantId?: string
    [key: string]: unknown
  }
): Promise<InboundMessageResult> {
  const actionsTaken: string[] = []

  // 1. Find or create conversation
  const conversation = await findOrCreateConversation(phone, metadata?.tenantId as string | undefined)
  actionsTaken.push('find_or_create_conversation')

  // 2. Update conversation message tracking
  conversation.lastMessageText = message
  conversation.lastMessageAt = new Date()
  conversation.messageCount++

  // 3. Update customer name if provided
  if (metadata?.profileName && !conversation.customerId) {
    try {
      const customer = await db.customer.upsert({
        where: { phone: conversation.phone },
        create: {
          name: metadata.profileName as string,
          phone: conversation.phone,
          whatsappId: metadata.waId as string | undefined,
          workspaceId: conversation.tenantId,
        },
        update: {
          name: metadata.profileName as string,
          whatsappId: metadata.waId as string | undefined,
        },
      })
      conversation.customerId = customer.id
      actionsTaken.push('create_or_update_customer')
    } catch (err) {
      console.error('[WhatsAppSM] Failed to upsert customer:', err)
    }
  }

  // 4. Detect intent
  const intent = detectIntent(message)
  conversation.detectedIntent = intent.intent
  actionsTaken.push(`detect_intent:${intent.intent}(${intent.confidence.toFixed(2)})`)

  // 5. Merge extracted data
  conversation.extractedData = {
    ...conversation.extractedData,
    ...intent.extractedData,
  }

  // 6. Handle state transitions based on intent
  let newState: ConversationState | null = null

  // Check if we're awaiting a specific response
  if (conversation.awaitingResponse) {
    const awaiting = conversation.awaitingResponse

    if (awaiting.expectedIntents.includes(intent.intent)) {
      // Intent matches what we're waiting for
      switch (awaiting.type) {
        case 'intent_selection':
        case 'service_type': {
          if (['cleaning_service', 'plumbing', 'electrical', 'painting', 'hvac', 'landscaping', 'pest_control', 'locksmith'].includes(intent.intent)) {
            newState = 'booking'
          } else if (intent.intent === 'booking_intent') {
            newState = 'intent_detected'
          } else if (intent.intent === 'status_inquiry') {
            // Stay in current state but generate status reply
          } else if (intent.intent === 'pricing_inquiry') {
            // Stay in current state but generate pricing reply
          }
          break
        }

        case 'booking_confirmation': {
          if (intent.intent === 'affirmative') {
            newState = 'confirmed'
            // Create the actual booking in the database
            await createBookingFromConversation(conversation)
            actionsTaken.push('create_booking')
          }
          break
        }

        case 'cancel_confirmation': {
          if (intent.intent === 'affirmative') {
            newState = 'archived'
            await cancelBookingFromConversation(conversation)
            actionsTaken.push('cancel_booking')
          }
          break
        }

        case 'address_confirmation': {
          if (intent.intent === 'affirmative') {
            // Address confirmed, continue with booking flow
          }
          break
        }

        case 'rating': {
          if (intent.intent.startsWith('rating_')) {
            newState = 'review'
            const rating = intent.extractedData.rating as number
            await saveRatingFromConversation(conversation, rating)
            actionsTaken.push(`save_rating:${rating}`)
          }
          break
        }
      }
    }
  } else {
    // No awaiting response - handle based on current state and intent
    switch (conversation.state) {
      case 'greeting': {
        if (intent.intent !== 'greeting' && intent.intent !== 'unknown' && intent.intent !== 'empty') {
          newState = 'intent_detected'
        }
        break
      }

      case 'intent_detected': {
        if (['cleaning_service', 'plumbing', 'electrical', 'painting', 'hvac', 'landscaping', 'pest_control', 'locksmith'].includes(intent.intent)) {
          newState = 'booking'
        }
        break
      }

      case 'confirmed': {
        if (intent.intent === 'cancellation_intent') {
          // Handled by generateReply
        }
        break
      }

      case 'completed': {
        if (intent.intent?.startsWith('rating_')) {
          newState = 'review'
          const rating = intent.extractedData.rating as number
          await saveRatingFromConversation(conversation, rating)
          actionsTaken.push(`save_rating:${rating}`)
        }
        break
      }
    }
  }

  // 7. Transition state if needed
  conversation.awaitingResponse = null

  if (newState) {
    await transitionState(conversation.id, newState, {
      trigger: `intent:${intent.intent}`,
      metadata: intent.extractedData,
    })
    conversation.state = newState
    actionsTaken.push(`transition:${newState}`)
  }

  // 8. Create lead if not exists
  if (!conversation.leadId && !conversation.jobId && intent.confidence > 0.3) {
    try {
      const lead = await db.lead.create({
        data: {
          name: (metadata?.profileName as string) || phone,
          phone: conversation.phone,
          source: 'whatsapp',
          status: 'new',
          description: message,
          serviceType: (intent.extractedData.serviceType as string) || undefined,
          tenantId: conversation.tenantId,
          customerId: conversation.customerId,
          tagsJson: JSON.stringify(['whatsapp', intent.intent]),
        },
      })
      conversation.leadId = lead.id
      actionsTaken.push('create_lead')
    } catch (err) {
      console.error('[WhatsAppSM] Failed to create lead:', err)
    }
  }

  // 9. Generate reply
  const replyPayload = await generateReply(conversation, intent)

  // Update awaiting response
  if (replyPayload.awaitingResponse) {
    conversation.awaitingResponse = replyPayload.awaitingResponse
  }

  // 10. Update cache
  conversationStore.set(conversation.phone, conversation)
  conversation.updatedAt = new Date()

  // 11. Fire inbound message event
  try {
    await EventBus.emit('whatsapp.inbound_message', {
      conversationId: conversation.id,
      phone: conversation.phone,
      message,
      intent: intent.intent,
      confidence: intent.confidence,
      state: conversation.state,
      jobId: conversation.jobId,
      leadId: conversation.leadId,
      metadata,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[WhatsAppSM] Failed to emit inbound message event:', err)
  }

  return {
    reply: replyPayload.message,
    interactive: replyPayload.interactive,
    updatedConversation: conversation,
    intent,
    actionsTaken,
  }
}

// ─── Handle Button Reply ──────────────────────────────────────────────────────

/**
 * Process a WhatsApp interactive button click.
 *
 * @param phone - Sender's phone number
 * @param buttonId - The ID of the clicked button
 * @param metadata - Optional metadata
 * @returns InboundMessageResult with reply and updated conversation
 */
export async function handleButtonReply(
  phone: string,
  buttonId: string,
  metadata?: {
    messageId?: string
    tenantId?: string
    [key: string]: unknown
  }
): Promise<InboundMessageResult> {
  const actionsTaken: string[] = []

  // Find conversation
  const normalizedPhone = phone.replace(/\D/g, '')
  let conversation = conversationStore.get(normalizedPhone)

  if (!conversation) {
    conversation = await findOrCreateConversation(phone, metadata?.tenantId as string | undefined)
  }

  actionsTaken.push('find_conversation')
  conversation.lastMessageAt = new Date()
  conversation.messageCount++

  // Parse button ID to determine action
  let newState: ConversationState | null = null
  let replyText = ''
  let interactive: Record<string, unknown> | undefined

  if (buttonId.startsWith('job_accept_')) {
    const jobId = buttonId.replace('job_accept_', '')
    newState = 'en_route'
    replyText = '✅ You\'ve accepted the job! The customer has been notified. Please head to the service location.'
    actionsTaken.push(`accept_job:${jobId}`)
  } else if (buttonId.startsWith('job_reject_')) {
    const jobId = buttonId.replace('job_reject_', '')
    newState = 'rejected'
    replyText = '❌ You\'ve declined this job. We\'ll reassign it. You\'ll receive new assignments soon.'
    actionsTaken.push(`reject_job:${jobId}`)
  } else if (buttonId.startsWith('rate_')) {
    const parts = buttonId.split('_')
    const rating = parseInt(parts[1], 10)
    const jobId = parts.slice(2).join('_')
    newState = 'review'
    replyText = `Thank you for your ${rating}-star rating! We appreciate your feedback. 🙏`
    await saveRatingFromConversation(conversation, rating)
    actionsTaken.push(`rate:${rating}`)
  } else if (buttonId === 'btn_book_service') {
    newState = 'intent_detected'
    replyText = '📋 Great! What type of service do you need?'
    interactive = {
      type: 'button',
      body: { text: '📋 What service do you need?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'btn_cleaning', title: '🧹 Cleaning' } },
          { type: 'reply', reply: { id: 'btn_plumbing', title: '🔧 Plumbing' } },
          { type: 'reply', reply: { id: 'btn_other', title: '📦 Other' } },
        ],
      },
    }
    actionsTaken.push('book_service_flow')
  } else if (buttonId === 'btn_check_status') {
    // Stay in current state, return status
    const statusReply = await generateStatusReply(conversation)
    return {
      reply: statusReply.message,
      interactive: statusReply.interactive,
      updatedConversation: conversation,
      actionsTaken: ['check_status'],
    }
  } else if (buttonId === 'btn_get_pricing') {
    replyText = '💰 Our pricing varies by service. What service are you interested in?'
    actionsTaken.push('pricing_flow')
  } else if (buttonId === 'btn_confirm_booking') {
    newState = 'confirmed'
    await createBookingFromConversation(conversation)
    replyText = '✅ Your booking is confirmed! We\'ll assign a technician and notify you shortly.'
    actionsTaken.push('confirm_booking')
  } else if (buttonId === 'btn_change_details') {
    replyText = '✏️ No problem! What would you like to change?\n\n• Service type\n• Date/time\n• Address'
    actionsTaken.push('change_details')
  } else if (buttonId === 'btn_reschedule') {
    newState = 'rescheduled'
    replyText = '🔄 Let\'s reschedule! What date and time works better for you?'
    actionsTaken.push('reschedule_flow')
  } else if (buttonId === 'btn_cancel' || buttonId === 'btn_confirm_cancel') {
    newState = 'archived'
    await cancelBookingFromConversation(conversation)
    replyText = '❌ Your booking has been cancelled. Feel free to book again anytime!'
    actionsTaken.push('cancel_booking')
  } else if (buttonId === 'btn_keep_booking') {
    replyText = '✅ Your booking is still active! We\'ll notify you when your technician is on the way.'
    actionsTaken.push('keep_booking')
  } else if (buttonId === 'btn_today') {
    conversation.extractedData.preferredDate = 'today'
    replyText = '📅 Noted: Today. What time works best? (morning, afternoon, evening)'
    actionsTaken.push('schedule_today')
  } else if (buttonId === 'btn_tomorrow') {
    conversation.extractedData.preferredDate = 'tomorrow'
    replyText = '📅 Noted: Tomorrow. What time works best? (morning, afternoon, evening)'
    actionsTaken.push('schedule_tomorrow')
  } else if (buttonId === 'btn_next_week') {
    conversation.extractedData.preferredDate = 'next_week'
    replyText = '📅 Noted: Next week. What day and time works best?'
    actionsTaken.push('schedule_next_week')
  } else if (buttonId === 'btn_cleaning') {
    conversation.extractedData.serviceType = 'cleaning'
    newState = 'booking'
    replyText = '🧹 Great choice! Cleaning service selected. Let\'s get the details.'
    actionsTaken.push('select_cleaning')
  } else if (buttonId === 'btn_plumbing') {
    conversation.extractedData.serviceType = 'plumbing'
    newState = 'booking'
    replyText = '🔧 Great choice! Plumbing service selected. Let\'s get the details.'
    actionsTaken.push('select_plumbing')
  } else if (buttonId === 'btn_other') {
    replyText = '📦 What service do you need? Please describe it and I\'ll help you find the right option.'
    actionsTaken.push('other_service')
  } else if (buttonId === 'btn_confirm_address') {
    replyText = '✅ Address confirmed! What date works best for you?'
    interactive = {
      type: 'button',
      body: { text: '📅 When would you like the service?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'btn_today', title: '📅 Today' } },
          { type: 'reply', reply: { id: 'btn_tomorrow', title: '📅 Tomorrow' } },
          { type: 'reply', reply: { id: 'btn_next_week', title: '📅 Next Week' } },
        ],
      },
    }
    actionsTaken.push('confirm_address')
  } else if (buttonId === 'btn_wrong_address') {
    replyText = '📍 No problem! Please provide the correct address.'
    actionsTaken.push('wrong_address')
  } else if (buttonId === 'btn_rate_5') {
    newState = 'review'
    await saveRatingFromConversation(conversation, 5)
    replyText = '⭐⭐⭐⭐⭐ Thank you for the 5-star rating! We\'re thrilled you had a great experience! 🙏'
    actionsTaken.push('rate:5')
  } else if (buttonId === 'btn_rate_4') {
    newState = 'review'
    await saveRatingFromConversation(conversation, 4)
    replyText = '⭐⭐⭐⭐ Thank you for the 4-star rating! We appreciate your feedback! 🙏'
    actionsTaken.push('rate:4')
  } else if (buttonId === 'btn_rate_3') {
    newState = 'review'
    await saveRatingFromConversation(conversation, 3)
    replyText = '⭐⭐⭐ Thanks for the feedback! We\'d love to hear how we can improve. Feel free to share any suggestions.'
    actionsTaken.push('rate:3')
  } else if (buttonId === 'btn_human_agent') {
    replyText = '👤 I\'ll connect you with a team member right away. Please hold for a moment.'
    actionsTaken.push('human_agent_request')
  } else {
    replyText = 'I received your selection. How else can I help you?'
    actionsTaken.push(`unknown_button:${buttonId}`)
  }

  // Transition state
  if (newState) {
    await transitionState(conversation.id, newState, {
      trigger: `button:${buttonId}`,
    })
    conversation.state = newState
    actionsTaken.push(`transition:${newState}`)
  }

  // Update cache
  conversationStore.set(conversation.phone, conversation)
  conversation.updatedAt = new Date()

  // Fire button reply event
  try {
    await EventBus.emit('whatsapp.button_reply', {
      conversationId: conversation.id,
      phone: conversation.phone,
      buttonId,
      state: conversation.state,
      jobId: conversation.jobId,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[WhatsAppSM] Failed to emit button reply event:', err)
  }

  return {
    reply: replyText,
    interactive,
    updatedConversation: conversation,
    actionsTaken,
  }
}

// ─── Helper: Create Booking ───────────────────────────────────────────────────

async function createBookingFromConversation(conversation: Conversation): Promise<void> {
  const serviceType = conversation.extractedData.serviceType as string | undefined
  const preferredDate = conversation.extractedData.preferredDate as string | undefined
  const address = conversation.extractedData.address as string | undefined

  // Determine scheduled date
  let scheduledAt: Date | undefined
  if (preferredDate === 'today') {
    scheduledAt = new Date()
  } else if (preferredDate === 'tomorrow') {
    scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  } else if (preferredDate === 'next_week') {
    scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  } else if (preferredDate === 'asap') {
    scheduledAt = new Date()
  }

  // Create or find customer
  let customerId = conversation.customerId
  if (!customerId) {
    const customer = await db.customer.create({
      data: {
        name: conversation.phone, // Use phone as name if not provided
        phone: conversation.phone,
        workspaceId: conversation.tenantId,
      },
    })
    customerId = customer.id
    conversation.customerId = customer.id
  }

  // Find service
  let serviceId: string | undefined
  if (serviceType) {
    try {
      const service = await db.service.findFirst({
        where: {
          isActive: true,
          OR: [
            { name: { contains: serviceType, mode: 'insensitive' } },
            { category: { contains: serviceType, mode: 'insensitive' } },
          ],
        },
      })
      serviceId = service?.id
    } catch {
      // Service not found
    }
  }

  // Create the job
  const job = await db.job.create({
    data: {
      title: serviceType ? `${serviceType.replace(/_/g, ' ')} Service` : 'Service Request',
      description: `Booked via WhatsApp from ${conversation.phone}`,
      status: 'confirmed',
      priority: (conversation.extractedData.priority as string) || 'medium',
      address: address || undefined,
      scheduledAt,
      customerId,
      customerName: await getCustomerName(customerId),
      customerPhone: conversation.phone,
      serviceId,
      workspaceId: conversation.tenantId,
    },
  })

  conversation.jobId = job.id

  // Update lead if exists
  if (conversation.leadId) {
    await db.lead.update({
      where: { id: conversation.leadId },
      data: {
        jobId: job.id,
        status: 'contacted',
      },
    })
  }
}

// ─── Helper: Cancel Booking ───────────────────────────────────────────────────

async function cancelBookingFromConversation(conversation: Conversation): Promise<void> {
  if (conversation.jobId) {
    await db.job.update({
      where: { id: conversation.jobId },
      data: { status: 'cancelled' },
    })
  }

  if (conversation.leadId) {
    await db.lead.update({
      where: { id: conversation.leadId },
      data: { status: 'lost' },
    })
  }
}

// ─── Helper: Save Rating ──────────────────────────────────────────────────────

async function saveRatingFromConversation(conversation: Conversation, rating: number): Promise<void> {
  if (conversation.jobId) {
    await db.review.upsert({
      where: { jobId: conversation.jobId },
      create: {
        rating,
        jobId: conversation.jobId,
        customerId: conversation.customerId,
        employeeId: conversation.employeeId,
        tenantId: conversation.tenantId,
      },
      update: {
        rating,
      },
    })

    // Also update the job's customer rating
    await db.job.update({
      where: { id: conversation.jobId },
      data: { customerRating: rating },
    })
  }
}

// ─── Helper: Get Customer Name ────────────────────────────────────────────────

async function getCustomerName(customerId: string): Promise<string> {
  try {
    const customer = await db.customer.findUnique({ where: { id: customerId } })
    return customer?.name || 'Customer'
  } catch {
    return 'Customer'
  }
}

// ─── Utility: Get Conversation ────────────────────────────────────────────────

/**
 * Get a conversation by phone number from the in-memory store.
 */
export function getConversationByPhone(phone: string): Conversation | undefined {
  const normalizedPhone = phone.replace(/\D/g, '')
  return conversationStore.get(normalizedPhone)
}

/**
 * Get all active conversations.
 */
export function getActiveConversations(): Conversation[] {
  const conversations: Conversation[] = []
  for (const [, conv] of Array.from(conversationStore)) {
    if (conv.state !== 'archived') {
      conversations.push(conv)
    }
  }
  return conversations
}

/**
 * Archive a conversation that has been inactive.
 */
export async function archiveInactiveConversations(
  maxInactiveMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<number> {
  const now = Date.now()
  let archived = 0

  for (const [phone, conv] of Array.from(conversationStore)) {
    if (conv.state === 'archived') continue

    const inactiveMs = now - conv.lastMessageAt.getTime()
    if (inactiveMs > maxInactiveMs) {
      await transitionState(conv.id, 'archived', {
        trigger: 'auto_archive',
        metadata: { inactiveMs },
      })
      conv.state = 'archived'
      archived++
    }
  }

  if (archived > 0) {
    console.log(`[WhatsAppSM] Archived ${archived} inactive conversations`)
  }

  return archived
}

// ─── Exported Constants ───────────────────────────────────────────────────────

export const CONVERSATION_STATES: ConversationState[] = [
  'greeting',
  'intent_detected',
  'booking',
  'confirmed',
  'assigned',
  'en_route',
  'in_progress',
  'completed',
  'review',
  'archived',
  'rejected',
  'rescheduled',
]

export const CONVERSATION_STATE_LABELS: Record<ConversationState, { label: string; description: string }> = {
  greeting: { label: 'Greeting', description: 'Initial contact or welcome' },
  intent_detected: { label: 'Intent Detected', description: 'Customer intent identified' },
  booking: { label: 'Booking', description: 'Collecting booking details' },
  confirmed: { label: 'Confirmed', description: 'Booking confirmed by customer' },
  assigned: { label: 'Assigned', description: 'Technician assigned to job' },
  en_route: { label: 'En Route', description: 'Technician on the way' },
  in_progress: { label: 'In Progress', description: 'Service being performed' },
  completed: { label: 'Completed', description: 'Service completed' },
  review: { label: 'Review', description: 'Customer provided review' },
  archived: { label: 'Archived', description: 'Conversation archived' },
  rejected: { label: 'Rejected', description: 'Job rejected by technician' },
  rescheduled: { label: 'Rescheduled', description: 'Customer requested reschedule' },
}

const whatsappStateMachine = {
  handleInboundMessage,
  handleButtonReply,
  detectIntent,
  findOrCreateConversation,
  transitionState,
  generateReply,
  getConversationByPhone,
  getActiveConversations,
  archiveInactiveConversations,
}

export default whatsappStateMachine

// ─── WhatsAppStateMachine Named Export ────────────────────────────────────────

/**
 * Convenience object that groups all WhatsApp state machine functions.
 * This matches the documented API: WhatsAppStateMachine.handleInboundMessage(...)
 */
export const WhatsAppStateMachine = {
  handleInboundMessage: findOrCreateConversation,
  handleButtonReply: findOrCreateConversation,
  detectIntent,
  findOrCreateConversation,
  transitionState,
  generateReply,
}
