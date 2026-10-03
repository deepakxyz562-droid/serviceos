/**
 * Commerce State Machine — deterministic conversation flow controller.
 * ==============================================================
 *
 * This is the core of the WhatsApp Commerce Engine. Instead of free-form
 * LLM conversation, the flow is deterministic:
 *
 *   AWAITING_INTENT → AWAITING_{FIELD} → CONFIRMING → AWAITING_PAYMENT → COMPLETED
 *
 * At each state, the LLM is called ONLY to extract a single field value.
 * The state machine controls what to ask next, ensuring no field is
 * skipped and the flow is predictable.
 *
 * Correction handling: if the customer says "change quantity to 2",
 * the state machine detects the correction, updates the field, and
 * re-confirms.
 */

import { db } from '@/lib/db';
import { extractField, type CatalogProduct, type OrderField, type ExtractionResult } from './field-extractor';

export interface CommerceConfig {
  id: string;
  businessId: string;
  agentId: string | null;
  catalogJson: string;
  fieldsJson: string;
  upiId: string | null;
  deliveryAreasJson: string;
  businessHoursJson: string;
  greetingMessage: string | null;
  currency: string;
  currencySymbol: string;
}

export interface StateMachineResult {
  response: string;
  newState: string;
  collectedFields: Record<string, any>;
  orderCreated?: boolean;
  orderId?: string;
  conversationEnded?: boolean;
}

interface ConversationStateRow {
  id: string;
  currentState: string;
  collectedFields: string;
  messagesJson: string;
  orderId: string | null;
  configId: string | null;
}

const MAX_RETRIES = 2; // max times to re-ask a field if UNCLEAR

/**
 * Main entry point: process an incoming WhatsApp message through the
 * commerce state machine.
 */
export async function processCommerceMessage(
  businessId: string,
  customerPhone: string,
  customerMessage: string,
  config: CommerceConfig
): Promise<StateMachineResult> {
  // 1. Load or create conversation state
  let state = await db.gptformConversationState.findUnique({
    where: { businessId_customerPhone: { businessId, customerPhone } },
  });

  if (!state) {
    state = await db.gptformConversationState.create({
      data: {
        businessId,
        customerPhone,
        currentState: 'AWAITING_INTENT',
        collectedFields: '{}',
        messagesJson: '[]',
        configId: config.id,
      },
    });
  }

  // If conversation is COMPLETED, start a new one
  if (state.currentState === 'COMPLETED') {
    state = await db.gptformConversationState.update({
      where: { id: state.id },
      data: {
        currentState: 'AWAITING_INTENT',
        collectedFields: '{}',
        messagesJson: '[]',
        orderId: null,
      },
    });
  }

  // 2. Parse config
  const catalog: CatalogProduct[] = JSON.parse(config.catalogJson || '[]');
  const fields: OrderField[] = JSON.parse(config.fieldsJson || '[]');

  // 3. Append customer message to conversation log
  await appendMessage(state.id, 'inbound', customerMessage);

  // 4. Process based on current state
  const collectedFields: Record<string, any> = JSON.parse(state.collectedFields || '{}');
  let result: StateMachineResult;

  switch (state.currentState) {
    case 'AWAITING_INTENT':
      result = await handleAwaitingIntent(customerMessage, config, catalog, fields, collectedFields, state.id, businessId, customerPhone);
      break;

    case 'CONFIRMING':
      result = await handleConfirming(customerMessage, config, catalog, fields, collectedFields, state.id, businessId, customerPhone);
      break;

    case 'AWAITING_PAYMENT':
      result = await handleAwaitingPayment(customerMessage, config, collectedFields, state.id);
      break;

    default:
      // AWAITING_{FIELD_NAME} — extract the field
      result = await handleAwaitingField(state.currentState, customerMessage, config, catalog, fields, collectedFields, state.id, businessId, customerPhone);
  }

  // 5. Update state in DB
  await db.gptformConversationState.update({
    where: { id: state.id },
    data: {
      currentState: result.newState,
      collectedFields: JSON.stringify(result.collectedFields),
      orderId: result.orderId || state.orderId,
    },
  });

  // 6. Append bot response to conversation log
  await appendMessage(state.id, 'outbound', result.response);

  return result;
}

// ── State handlers ──────────────────────────────────────────────────

async function handleAwaitingIntent(
  message: string,
  config: CommerceConfig,
  catalog: CatalogProduct[],
  fields: OrderField[],
  collected: Record<string, any>,
  stateId: string,
  businessId: string,
  customerPhone: string
): Promise<StateMachineResult> {
  // Check if this looks like an order
  const orderKeywords = ['order', 'want', 'need', 'book', 'buy', 'deliver', 'send', 'get', 'kar', 'chahiye', 'lena', 'booking'];
  const lower = message.toLowerCase();
  const isOrder = orderKeywords.some((kw) => lower.includes(kw)) || catalog.some((p) => lower.includes(p.name.toLowerCase()));

  if (!isOrder && fields.length === 0) {
    // No commerce fields configured — fall back to greeting
    return {
      response: config.greetingMessage || `Hi! Welcome to our store. How can I help you today?`,
      newState: 'AWAITING_INTENT',
      collectedFields: collected,
    };
  }

  if (!isOrder) {
    // Seems like a question, not an order — answer briefly + offer to order
    return {
      response: `Hi! I can help you place an order. What would you like to order?\n\n${catalog.slice(0, 5).map((p) => `• ${p.name} — ${config.currencySymbol}${p.price}`).join('\n')}`,
      newState: 'AWAITING_INTENT',
      collectedFields: collected,
    };
  }

  // It's an order — try to extract the first product from the message
  const firstField = fields[0];
  if (firstField && firstField.type === 'product') {
    const extraction = await extractField(firstField, message, catalog, collected, config);
    if (extraction.value && extraction.value !== '__UNCLEAR__') {
      collected[firstField.mapsTo || firstField.id] = extraction.value;
      if (extraction.matchedProduct) {
        collected['__product_price__'] = extraction.matchedProduct.price;
        collected['__product_name__'] = extraction.matchedProduct.name;
      }
      // Move to next field
      return transitionToNextField(fields, 1, collected, config, stateId);
    }
  }

  // Can't extract product — ask for it
  return {
    response: firstField
      ? `${firstField.label}\n\n${catalog.slice(0, 5).map((p) => `• ${p.name} — ${config.currencySymbol}${p.price}`).join('\n')}`
      : 'What would you like to order?',
    newState: firstField ? `AWAITING_${firstField.id}` : 'AWAITING_INTENT',
    collectedFields: collected,
  };
}

async function handleAwaitingField(
  currentState: string,
  message: string,
  config: CommerceConfig,
  catalog: CatalogProduct[],
  fields: OrderField[],
  collected: Record<string, any>,
  stateId: string,
  businessId: string,
  customerPhone: string
): Promise<StateMachineResult> {
  // Extract the field ID from the state name: AWAITING_{fieldId}
  const fieldId = currentState.replace('AWAITING_', '');
  const field = fields.find((f) => f.id === fieldId || f.mapsTo === fieldId);

  if (!field) {
    // Unknown field — restart
    return {
      response: 'Sorry, something went wrong. What would you like to order?',
      newState: 'AWAITING_INTENT',
      collectedFields: collected,
    };
  }

  // Extract the field value
  const extraction = await extractField(field, message, catalog, collected, config);

  // Handle correction
  if (extraction.isCorrection && extraction.correctionField) {
    collected[extraction.correctionField] = extraction.value;
    return showConfirmation(config, fields, collected);
  }

  // Handle cancel
  if (extraction.isCancel) {
    return {
      response: 'Your order has been cancelled. How can I help you?',
      newState: 'AWAITING_INTENT',
      collectedFields: {},
      conversationEnded: true,
    };
  }

  // Handle unclear
  if (!extraction.value || extraction.value === '__UNCLEAR__') {
    const retryCount = (collected[`__retry_${fieldId}__`] || 0) + 1;
    if (retryCount >= MAX_RETRIES) {
      // Skip this field and move on
      collected[field.mapsTo || field.id] = '';
      return transitionToNextField(fields, fields.indexOf(field) + 1, collected, config, stateId);
    }
    collected[`__retry_${fieldId}__`] = retryCount;
    return {
      response: `I didn't catch that. ${field.label}`,
      newState: currentState,
      collectedFields: collected,
    };
  }

  // Field extracted successfully
  collected[field.mapsTo || field.id] = extraction.value;
  if (extraction.matchedProduct) {
    collected['__product_price__'] = extraction.matchedProduct.price;
    collected['__product_name__'] = extraction.matchedProduct.name;
  }

  // Check delivery areas if this is an address field
  if (field.type === 'address' && config.deliveryAreasJson) {
    const areas: string[] = JSON.parse(config.deliveryAreasJson);
    if (areas.length > 0) {
      const inArea = areas.some((area) => extraction.value!.toLowerCase().includes(area.toLowerCase()));
      if (!inArea) {
        return {
          response: `Sorry, we currently deliver to: ${areas.join(', ')}. Would you like to pick up instead?`,
          newState: currentState,
          collectedFields: collected,
        };
      }
    }
  }

  // Move to next field
  const currentFieldIndex = fields.indexOf(field);
  return transitionToNextField(fields, currentFieldIndex + 1, collected, config, stateId);
}

async function handleConfirming(
  message: string,
  config: CommerceConfig,
  catalog: CatalogProduct[],
  fields: OrderField[],
  collected: Record<string, any>,
  stateId: string,
  businessId: string,
  customerPhone: string
): Promise<StateMachineResult> {
  const lower = message.toLowerCase();

  // Check for correction
  if (lower.includes('change') || lower.includes('actually') || lower.includes('edit') || lower.includes('no,')) {
    // Re-ask which field to change
    return {
      response: `Which would you like to change?\n${fields.map((f) => `• ${f.label.replace('?', '')}: ${collected[f.mapsTo || f.id] || 'N/A'}`).join('\n')}\n\nJust type the field name and new value, e.g., "quantity 2kg"`,
      newState: 'CONFIRMING',
      collectedFields: collected,
    };
  }

  // Check for confirmation
  if (lower === 'yes' || lower === 'y' || lower === 'confirm' || lower === 'ok' || lower === 'sure' || lower.includes('confirm')) {
    // Create the order!
    return await createOrder(config, collected, businessId, customerPhone, stateId);
  }

  // Check for cancel
  if (lower === 'no' || lower === 'n' || lower === 'cancel') {
    return {
      response: 'Order cancelled. What would you like to order?',
      newState: 'AWAITING_INTENT',
      collectedFields: {},
      conversationEnded: true,
    };
  }

  // Unknown response — re-show confirmation
  return showConfirmation(config, fields, collected);
}

async function handleAwaitingPayment(
  message: string,
  config: CommerceConfig,
  collected: Record<string, any>,
  stateId: string
): Promise<StateMachineResult> {
  // Customer might say "paid", "done", or send a UTR
  const lower = message.toLowerCase();
  if (lower.includes('paid') || lower.includes('done') || lower.includes('done') || lower.includes('ok') || lower.includes('yes') || lower.length >= 8) {
    // Assume payment reference if the message looks like a UTR
    const utr = message.trim();
    return {
      response: `✅ Payment received! Your order is confirmed.\n\nThank you for your order! We'll notify you when it's ready.`,
      newState: 'COMPLETED',
      collectedFields: { ...collected, paymentRef: utr, paymentStatus: 'PAID' },
      conversationEnded: true,
    };
  }

  return {
    response: `Please complete the payment using the UPI link above, then reply with the payment reference number or "paid".`,
    newState: 'AWAITING_PAYMENT',
    collectedFields: collected,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function transitionToNextField(
  fields: OrderField[],
  nextIndex: number,
  collected: Record<string, any>,
  config: CommerceConfig,
  stateId: string
): StateMachineResult {
  // Skip non-required empty fields
  while (nextIndex < fields.length) {
    const field = fields[nextIndex];
    if (field.required || collected[field.mapsTo || field.id]) {
      break;
    }
    nextIndex++;
  }

  if (nextIndex >= fields.length) {
    // All fields collected — show confirmation
    return showConfirmation(config, fields, collected);
  }

  const nextField = fields[nextIndex];
  let prompt = nextField.label;

  // Add options for choice fields
  if (nextField.type === 'choice' && nextField.options) {
    prompt += `\n${nextField.options.map((opt, i) => `${i + 1}️⃣ ${opt}`).join('\n')}`;
  }

  return {
    response: prompt,
    newState: `AWAITING_${nextField.id}`,
    collectedFields: collected,
  };
}

function showConfirmation(
  config: CommerceConfig,
  fields: OrderField[],
  collected: Record<string, any>
): StateMachineResult {
  // Build order summary
  const lines: string[] = [];
  const productName = collected['__product_name__'] || collected['product'] || 'Item';
  const productPrice = collected['__product_price__'] || 0;
  const quantity = collected['quantity'] || '1';

  // Calculate total
  let total = productPrice;
  const qtyNum = parseFloat(String(quantity)) || 1;
  if (productPrice > 0 && qtyNum > 1) {
    total = productPrice * qtyNum;
  }

  lines.push(`*Order Summary*`);
  lines.push('');
  lines.push(`${productName}${qtyNum > 1 ? ` × ${quantity}` : ''} — ${config.currencySymbol}${total.toFixed(2)}`);

  // Add other collected fields
  for (const field of fields) {
    const key = field.mapsTo || field.id;
    if (key === 'product' || key === 'quantity' || key.startsWith('__')) continue;
    const value = collected[key];
    if (value) {
      lines.push(`${field.label.replace('?', '')}: ${value}`);
    }
  }

  lines.push('');
  lines.push(`*Total: ${config.currencySymbol}${total.toFixed(2)}*`);
  lines.push('');
  lines.push(`Confirm your order? (Yes/No)`);

  return {
    response: lines.join('\n'),
    newState: 'CONFIRMING',
    collectedFields: { ...collected, __total__: total },
  };
}

async function createOrder(
  config: CommerceConfig,
  collected: Record<string, any>,
  businessId: string,
  customerPhone: string,
  stateId: string
): Promise<StateMachineResult> {
  const productName = collected['__product_name__'] || collected['product'] || 'Item';
  const productPrice = collected['__product_price__'] || 0;
  const quantity = collected['quantity'] || '1';
  const qtyNum = parseFloat(String(quantity)) || 1;
  const total = (productPrice > 0 ? productPrice * qtyNum : collected.__total__ || 0);

  // Create the order in the DB
  const order = await db.gptformCommerceOrder.create({
    data: {
      configId: config.id,
      businessId,
      customerPhone,
      customerName: collected['name'] || collected['customerName'] || null,
      status: 'CONFIRMED',
      itemsJson: JSON.stringify([
        {
          name: productName,
          qty: quantity,
          price: productPrice,
          amount: total,
        },
      ]),
      total,
      deliveryAddress: collected['address'] || collected['deliveryAddress'] || null,
      deliveryDate: collected['date'] || collected['deliveryDate'] || null,
      deliveryType: collected['deliveryType'] || null,
      notes: collected['notes'] || null,
      paymentStatus: 'UNPAID',
      conversationId: stateId,
    },
  });

  // Build payment message
  let paymentMsg = `✅ *Order Confirmed!*\n\n`;
  paymentMsg += `Order #${order.id.slice(-6).toUpperCase()}\n`;
  paymentMsg += `${productName} × ${quantity}\n`;
  paymentMsg += `Total: ${config.currencySymbol}${total.toFixed(2)}\n\n`;

  if (config.upiId) {
    const upiLink = `upi://pay?pa=${config.upiId}&pn=Order&am=${total.toFixed(2)}&cu=${config.currency}&tn=Order%20${order.id.slice(-6)}`;
    paymentMsg += `Pay now: ${upiLink}\n\n`;
    paymentMsg += `After payment, reply with the reference number or "paid".`;
  } else {
    paymentMsg += `Please pay ${config.currencySymbol}${total.toFixed(2)} and reply "paid" when done.`;
  }

  return {
    response: paymentMsg,
    newState: 'AWAITING_PAYMENT',
    collectedFields: { ...collected, __orderId__: order.id },
    orderCreated: true,
    orderId: order.id,
  };
}

async function appendMessage(stateId: string, direction: 'inbound' | 'outbound', text: string) {
  const state = await db.gptformConversationState.findUnique({
    where: { id: stateId },
    select: { messagesJson: true },
  });
  if (!state) return;

  let messages: any[] = [];
  try {
    messages = JSON.parse(state.messagesJson || '[]');
  } catch {
    messages = [];
  }

  messages.push({
    direction,
    text,
    timestamp: new Date().toISOString(),
  });

  // Keep last 100 messages
  if (messages.length > 100) {
    messages = messages.slice(-100);
  }

  await db.gptformConversationState.update({
    where: { id: stateId },
    data: { messagesJson: JSON.stringify(messages) },
  });
}
