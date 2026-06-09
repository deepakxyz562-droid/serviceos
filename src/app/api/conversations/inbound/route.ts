import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppStateMachine, findOrCreateConversation, detectIntent, generateReply, transitionState } from '@/lib/whatsapp-state-machine'
import { db } from '@/lib/db'
import { EventBus } from '@/lib/event-bus'

// POST /api/conversations/inbound - Handle inbound WhatsApp messages and button replies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message, buttonId, buttonTitle, metadata, tenantId } = body

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    }

    // Check if this is a button reply or a text message
    if (buttonId) {
      return await handleButtonReply(phone, buttonId, buttonTitle, tenantId, metadata)
    }

    if (!message) {
      return NextResponse.json({ error: 'message or buttonId is required' }, { status: 400 })
    }

    return await handleInboundMessage(phone, message, tenantId, metadata)
  } catch (error) {
    console.error('Error handling inbound message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handle a standard inbound text message.
 */
async function handleInboundMessage(
  phone: string,
  message: string,
  tenantId?: string,
  metadata?: Record<string, unknown>
) {
  // 1. Find or create the in-memory conversation
  const conversation = await findOrCreateConversation(phone, tenantId)

  // 2. Detect intent from the message
  const intent = detectIntent(message)

  // 3. Update conversation with detected intent
  conversation.detectedIntent = intent.intent
  conversation.extractedData = {
    ...conversation.extractedData,
    ...intent.extractedData,
  }
  conversation.lastMessageText = message
  conversation.messageCount++
  conversation.lastMessageAt = new Date()

  // 4. Generate a reply based on state and intent
  const reply = await generateReply(conversation, intent)

  // 5. Handle state transitions based on intent
  let newState = conversation.state
  if (conversation.state === 'greeting' && intent.intent !== 'greeting' && intent.intent !== 'empty' && intent.intent !== 'unknown') {
    newState = 'intent_detected'
  }
  if (intent.intent === 'booking_intent' || (intent.intent !== 'unknown' && intent.intent !== 'empty' && conversation.state === 'intent_detected')) {
    const serviceIntents = [
      'cleaning_service', 'plumbing', 'electrical', 'painting',
      'hvac', 'landscaping', 'pest_control', 'locksmith',
    ]
    if (serviceIntents.includes(intent.intent) || intent.intent === 'booking_intent') {
      if (conversation.state === 'intent_detected' || conversation.state === 'greeting') {
        newState = 'booking'
      }
    }
  }
  if (intent.intent === 'affirmative' && conversation.state === 'booking') {
    newState = 'confirmed'
  }

  if (newState !== conversation.state) {
    try {
      await transitionState(conversation.id, newState as import('@/lib/whatsapp-state-machine').ConversationState, {
        trigger: 'inbound_message',
        metadata: { intent: intent.intent, message },
      })
    } catch (err) {
      console.error('[InboundHandler] State transition failed:', err)
    }
  }

  // 6. Persist conversation to DB
  const dbConversation = await persistConversationToDb(conversation, phone, message, intent, tenantId)

  // 7. Fire event
  try {
    await EventBus.emit('conversation.message_received', {
      conversationId: conversation.id,
      phone,
      message,
      intent: intent.intent,
      confidence: intent.confidence,
      state: conversation.state,
      tenantId,
    })
  } catch (err) {
    console.error('[InboundHandler] Failed to emit event:', err)
  }

  return NextResponse.json({
    reply: reply.message,
    interactive: reply.interactive,
    conversation: {
      id: dbConversation?.id || conversation.id,
      phone: conversation.phone,
      state: conversation.state,
      detectedIntent: intent.intent,
      intentConfidence: intent.confidence,
      lastMessageAt: conversation.lastMessageAt,
    },
    intent: {
      intent: intent.intent,
      confidence: intent.confidence,
      extractedData: intent.extractedData,
    },
  })
}

/**
 * Handle a WhatsApp button reply (e.g., "Accept Job", "Confirm Booking").
 */
async function handleButtonReply(
  phone: string,
  buttonId: string,
  buttonTitle?: string,
  tenantId?: string,
  metadata?: Record<string, unknown>
) {
  // 1. Find or create the in-memory conversation
  const conversation = await findOrCreateConversation(phone, tenantId)

  // 2. Map button IDs to actions
  let newState = conversation.state
  let replyText = ''
  let interactive: Record<string, unknown> | undefined

  const buttonActions: Record<string, { state: string; reply: string; intent?: string }> = {
    btn_book_service: { state: 'booking', reply: 'Great! Let\'s get your service booked. What type of service do you need?', intent: 'booking_intent' },
    btn_check_status: { state: conversation.state, reply: '', intent: 'status_inquiry' },
    btn_get_pricing: { state: conversation.state, reply: '', intent: 'pricing_inquiry' },
    btn_cleaning: { state: 'booking', reply: 'Great choice! You\'re interested in our cleaning service. When would you like to schedule it?', intent: 'cleaning_service' },
    btn_plumbing: { state: 'booking', reply: 'Great choice! You\'re interested in our plumbing service. When would you like to schedule it?', intent: 'plumbing' },
    btn_other: { state: 'booking', reply: 'What type of service do you need? You can describe it and I\'ll help you find the right option.', intent: 'booking_intent' },
    btn_today: { state: 'booking', reply: 'Got it, scheduling for today! We\'ll confirm availability and assign a technician shortly.', intent: 'booking_intent' },
    btn_tomorrow: { state: 'booking', reply: 'Got it, scheduling for tomorrow! We\'ll confirm availability and assign a technician shortly.', intent: 'booking_intent' },
    btn_next_week: { state: 'booking', reply: 'Got it, scheduling for next week! We\'ll confirm availability and assign a technician shortly.', intent: 'booking_intent' },
    btn_confirm_address: { state: 'booking', reply: 'Address confirmed! What date and time works best for you?', intent: 'affirmative' },
    btn_wrong_address: { state: conversation.state, reply: 'No problem! Please provide the correct address.', intent: 'negative' },
    btn_reschedule: { state: 'rescheduled', reply: 'I\'d be happy to help you reschedule! What date and time works better for you?', intent: 'cancellation_intent' },
    btn_cancel: { state: 'archived', reply: 'Your booking has been cancelled. If you change your mind, just send a message to book again!', intent: 'negative' },
    btn_confirm_cancel: { state: 'archived', reply: 'Your booking has been cancelled. If you change your mind, just send a message to book again!', intent: 'negative' },
    btn_keep_booking: { state: conversation.state, reply: 'Great! Your booking is still active. We\'ll notify you when a technician is assigned.', intent: 'affirmative' },
    btn_rate_5: { state: 'review', reply: 'Thank you for your 5-star rating! Your feedback helps us improve. Have a great day! 🙏', intent: 'rating_5' },
    btn_rate_4: { state: 'review', reply: 'Thank you for your 4-star rating! We appreciate your feedback. Have a great day! 🙏', intent: 'rating_4' },
    btn_rate_3: { state: 'review', reply: 'Thank you for your 3-star rating. We\'d love to hear how we can do better next time!', intent: 'rating_3' },
    btn_human_agent: { state: conversation.state, reply: 'I\'ll connect you with a team member right away. Please hold for a moment.', intent: 'human_agent_request' },
  }

  const action = buttonActions[buttonId]
  if (action) {
    newState = action.state as import('@/lib/whatsapp-state-machine').ConversationState
    replyText = action.reply

    // Update conversation
    conversation.detectedIntent = action.intent || null
    conversation.lastMessageText = buttonTitle || buttonId
    conversation.messageCount++
    conversation.lastMessageAt = new Date()

    // Handle status inquiry
    if (action.intent === 'status_inquiry' && conversation.jobId) {
      const job = await db.job.findUnique({ where: { id: conversation.jobId } })
      if (job) {
        replyText = `📋 *Job Status*\n\nTitle: ${job.title}\nStatus: ${job.status.replace(/_/g, ' ')}\n${job.assigneeName ? `Technician: ${job.assigneeName}\n` : ''}${job.scheduledAt ? `Scheduled: ${new Date(job.scheduledAt).toLocaleDateString()}\n` : ''}Address: ${job.address || 'TBD'}`
      } else {
        replyText = 'I couldn\'t find your booking. Could you provide more details?'
      }
    }

    // Handle pricing inquiry
    if (action.intent === 'pricing_inquiry') {
      replyText = 'Our pricing varies based on the service and scope:\n\n• 🧹 Cleaning: Starting from $80\n• 🔧 Plumbing: Starting from $75\n• ⚡ Electrical: Starting from $90\n\nFor an accurate quote, please book a service and we\'ll provide a detailed estimate.'
    }
  } else {
    replyText = `I received your selection. How can I help you further?`
  }

  // Transition state if changed
  if (newState !== conversation.state) {
    try {
      await transitionState(conversation.id, newState, {
        trigger: 'button_reply',
        metadata: { buttonId, buttonTitle },
      })
    } catch (err) {
      console.error('[InboundHandler] Button state transition failed:', err)
    }
  }

  // Persist to DB
  await persistConversationToDb(conversation, phone, buttonTitle || buttonId, { intent: action?.intent || 'button_reply', confidence: 1.0, extractedData: { buttonId } }, tenantId)

  // Fire event
  try {
    await EventBus.emit('conversation.message_received', {
      conversationId: conversation.id,
      phone,
      message: buttonTitle || buttonId,
      isButtonReply: true,
      buttonId,
      state: conversation.state,
      tenantId,
    })
  } catch (err) {
    console.error('[InboundHandler] Failed to emit event:', err)
  }

  return NextResponse.json({
    reply: replyText,
    interactive,
    conversation: {
      id: conversation.id,
      phone: conversation.phone,
      state: conversation.state,
      detectedIntent: action?.intent || 'button_reply',
      lastMessageAt: conversation.lastMessageAt,
    },
  })
}

/**
 * Persist the in-memory conversation state to the database.
 */
async function persistConversationToDb(
  conversation: import('@/lib/whatsapp-state-machine').Conversation,
  phone: string,
  messageBody: string,
  intent: { intent: string; confidence: number; extractedData: Record<string, unknown> },
  tenantId?: string
) {
  try {
    // Try to find an existing DB conversation by phone
    const existing = await db.conversation.findFirst({
      where: { customerPhone: phone, status: 'active' },
      orderBy: { lastMessageAt: 'desc' },
    })

    if (existing) {
      // Update existing
      let messages: unknown[] = []
      try {
        messages = JSON.parse(existing.messagesJson || '[]')
      } catch {
        messages = []
      }
      messages.push({
        id: `msg_${Date.now()}`,
        body: messageBody,
        direction: 'inbound',
        timestamp: new Date().toISOString(),
        intent: intent.intent,
      })

      return await db.conversation.update({
        where: { id: existing.id },
        data: {
          currentStage: conversation.state,
          intentDetected: intent.intent,
          intentConfidence: intent.confidence,
          lastMessageAt: new Date(),
          lastMessageBody: messageBody,
          lastDirection: 'inbound',
          messagesJson: JSON.stringify(messages),
          customerId: conversation.customerId || existing.customerId,
          leadId: conversation.leadId || existing.leadId,
          jobId: conversation.jobId || existing.jobId,
        },
      })
    } else {
      // Create new
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      return await db.conversation.create({
        data: {
          conversationId,
          customerPhone: phone,
          customerName: conversation.customerId ? undefined : undefined,
          customerId: conversation.customerId || null,
          leadId: conversation.leadId || null,
          jobId: conversation.jobId || null,
          status: 'active',
          currentStage: conversation.state,
          intentDetected: intent.intent,
          intentConfidence: intent.confidence,
          lastMessageAt: new Date(),
          lastMessageBody: messageBody,
          lastDirection: 'inbound',
          messagesJson: JSON.stringify([{
            id: `msg_${Date.now()}`,
            body: messageBody,
            direction: 'inbound',
            timestamp: new Date().toISOString(),
            intent: intent.intent,
          }]),
          tenantId: tenantId || conversation.tenantId || null,
        },
      })
    }
  } catch (err) {
    console.error('[InboundHandler] Failed to persist conversation to DB:', err)
    return null
  }
}
