import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, getAppUrl } from '@/lib/auth'
import { requirePlanFeature } from '@/lib/plan-gate'
import {
  getPayPalAccessToken,
  getPayPalBaseUrl,
  isPayPalConfigured,
} from '@/lib/paypal'
import { createCreemCheckoutSession, isCreemConfigured } from '@/lib/creem'
import { logBillingEvent } from '@/lib/billing-events'

/**
 * POST /api/sms/numbers/buy
 *
 * Initiate the purchase of a dedicated phone number (£5/month) via PayPal
 * Subscriptions or Creem checkout. The actual Twilio purchase happens AFTER
 * payment success — see /api/sms/numbers/[id]/purchase (called from the
 * PayPal/Creem webhooks).
 *
 * Body:
 *   - phoneNumber: string  (E.164, from /api/sms/numbers/search)
 *   - countryCode:  string  ("US", "GB", ...)
 *   - paymentMethod: 'paypal' | 'creem'
 *   - displayName?: string  (optional friendly name)
 *
 * Flow:
 *   1. Create a `PhoneNumber` row with status='pending', tenantId,
 *      paymentProvider, monthlyCost=5.00.
 *   2. PayPal: create (or reuse cached) PayPal Product + Plan for
 *      "Fieseros Dedicated SMS Number — $5/month" then create a
 *      Subscription, return the approval URL.
 *   3. Creem: create a checkout session for the mapped `sms_number_monthly`
 *      product (admin must pre-map it). Return the checkout URL.
 *   4. Store the PayPal subscription ID / Creem checkout session ID on the
 *      PhoneNumber row so the webhook can match the payment back.
 *
 * Auth: owner or admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (authUser.role !== 'owner' && authUser.role !== 'admin' && !authUser.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only owners or admins can buy phone numbers' },
        { status: 403 },
      )
    }

    // ── Plan-tier gating: SMS Numbers add-on is locked on trial/starter ───
    // GET (list) is allowed for everyone so users can see their existing
    // numbers after a downgrade — only POST (buy) is gated.
    const gate = await requirePlanFeature('sms_numbers')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status })
    }

    const tenantId = authUser.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { phoneNumber, countryCode, paymentMethod, displayName } = body as {
      phoneNumber?: string
      countryCode?: string
      paymentMethod?: string
      displayName?: string
    }

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 })
    }
    if (!paymentMethod || (paymentMethod !== 'paypal' && paymentMethod !== 'creem')) {
      return NextResponse.json(
        { error: 'paymentMethod must be "paypal" or "creem"' },
        { status: 400 },
      )
    }

    // De-dupe: refuse to create a second pending row for the same number for
    // the same tenant. If the number is already owned by ANY tenant, refuse
    // outright (a number can only be in Twilio's inventory once).
    const existing = await db.phoneNumber.findUnique({ where: { number: phoneNumber } })
    if (existing && existing.tenantId === tenantId && existing.status !== 'released') {
      return NextResponse.json(
        { error: 'You already own (or are in the process of buying) this number.', phoneNumberId: existing.id },
        { status: 409 },
      )
    }
    if (existing && existing.status === 'active') {
      return NextResponse.json(
        { error: 'This number is already owned by another tenant.' },
        { status: 409 },
      )
    }

    // Compute the public webhook URLs that Twilio will POST to. These are
    // configured on the Twilio number once it's purchased, but we stash them
    // on the PhoneNumber row now so the post-payment purchase endpoint has them.
    const appUrl = getAppUrl(request)
    const smsWebhookUrl = `${appUrl}/api/sms/inbound`
    const voiceWebhookUrl = `${appUrl}/api/sms/voice`

    // Create the PhoneNumber row in pending state.
    const phoneRow = await db.phoneNumber.create({
      data: {
        number: phoneNumber,
        displayName: displayName || null,
        provider: 'twilio',
        capabilities: 'sms,voice',
        countryCode: countryCode || null,
        monthlyCost: 5.0,
        costCurrency: 'USD',
        providerCost: 1.15,
        status: 'pending',
        paymentProvider: paymentMethod,
        smsWebhookUrl,
        voiceWebhookUrl,
        tenantId,
      },
    })

    try {
      if (paymentMethod === 'paypal') {
        const result = await createPayPalSubscriptionForNumber({
          phoneNumberId: phoneRow.id,
          tenantId,
          payerEmail: authUser.email,
          appUrl,
        })

        if (!result.approvalUrl) {
          throw new Error('PayPal did not return an approval URL')
        }

        await db.phoneNumber.update({
          where: { id: phoneRow.id },
          data: { subscriptionId: result.subscriptionId },
        })

        await logBillingEvent({
          tenantId,
          type: 'subscription_created',
          status: 'pending',
          amount: 5.0,
          currency: 'USD',
          description: `PayPal subscription created for phone number ${phoneNumber} (pending approval)`,
          paymentProvider: 'paypal',
          payerEmail: authUser.email,
          metadata: {
            kind: 'phone_number',
            phoneNumberId: phoneRow.id,
            phoneNumber,
            paypalSubscriptionId: result.subscriptionId,
            recurring: true,
          },
        })

        return NextResponse.json({
          checkoutUrl: result.approvalUrl,
          phoneNumberId: phoneRow.id,
          paymentProvider: 'paypal',
          subscriptionId: result.subscriptionId,
        })
      } else {
        // Creem checkout
        const result = await createCreemCheckoutForNumber({
          phoneNumberId: phoneRow.id,
          tenantId,
          userEmail: authUser.email,
          appUrl,
        })

        await db.phoneNumber.update({
          where: { id: phoneRow.id },
          data: { subscriptionId: result.sessionId || null },
        })

        await logBillingEvent({
          tenantId,
          type: 'subscription_created',
          status: 'pending',
          amount: 5.0,
          currency: 'USD',
          description: `Creem checkout session created for phone number ${phoneNumber}`,
          paymentProvider: 'creem',
          payerEmail: authUser.email,
          metadata: {
            kind: 'phone_number',
            phoneNumberId: phoneRow.id,
            phoneNumber,
            creemSessionId: result.sessionId,
          },
        })

        return NextResponse.json({
          checkoutUrl: result.checkoutUrl,
          phoneNumberId: phoneRow.id,
          paymentProvider: 'creem',
          sessionId: result.sessionId,
        })
      }
    } catch (err) {
      // The PayPal/Creem call failed — mark the phone row as failed so the UI
      // can show a clear error and so the user can retry.
      await db.phoneNumber.update({
        where: { id: phoneRow.id },
        data: { status: 'failed' },
      })
      throw err
    }
  } catch (err) {
    console.error('[/api/sms/numbers/buy] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// ─── PayPal helper ─────────────────────────────────────────────────────────

/**
 * Create (or reuse a cached) PayPal Product + Plan for "Fieseros Dedicated
 * SMS Number — $5/month" and then create a Subscription. Returns the approval
 * URL the user must visit to authorise the recurring charge.
 *
 * The PayPal plan ID is cached in the `RevenueFeatureToggle` row with
 * featureKey='sms_number_billing' so we don't recreate the product+plan on
 * every purchase.
 */
async function createPayPalSubscriptionForNumber(opts: {
  phoneNumberId: string
  tenantId: string
  payerEmail: string
  appUrl: string
}): Promise<{ subscriptionId: string; approvalUrl: string }> {
  if (!isPayPalConfigured()) {
    throw new Error('PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.')
  }

  const accessToken = await getPayPalAccessToken()
  const baseUrl = getPayPalBaseUrl()

  // ── Look up cached PayPal product+plan IDs ──────────────────────────────
  const toggle = await db.revenueFeatureToggle.findUnique({
    where: { featureKey: 'sms_number_billing' },
  })
  const toggleConfig = (() => {
    try { return toggle?.configJson ? JSON.parse(toggle.configJson) as Record<string, unknown> : {} } catch { return {} }
  })()
  let paypalProductId = (toggleConfig._paypalProductId as string) || ''
  let paypalPlanId = (toggleConfig._paypalPlanId as string) || ''

  // ── Create the PayPal Product if missing ────────────────────────────────
  if (!paypalProductId) {
    const productRes = await fetch(`${baseUrl}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'PayPal-Request-Id': 'product-sms-number',
      },
      body: JSON.stringify({
        name: 'Fieseros Dedicated SMS Number',
        description: 'Dedicated phone number for SMS + voice — $5/month',
        type: 'SERVICE',
        category: 'SOFTWARE',
      }),
    })

    if (productRes.ok) {
      const productData = await productRes.json()
      paypalProductId = productData.id as string
    } else {
      // Product likely already exists (Request-Id dedup) — look it up
      const listRes = await fetch(`${baseUrl}/v1/catalogs/products?page_size=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const listData = await listRes.json()
      const existing = (listData.products as Array<{ name: string; id: string }> | undefined)?.find(
        (p) => p.name === 'Fieseros Dedicated SMS Number',
      )
      if (!existing) {
        const errData = await productRes.json().catch(() => ({}))
        throw new Error(`PayPal create-product failed: ${JSON.stringify(errData)}`)
      }
      paypalProductId = existing.id
    }
  }

  // ── Create the PayPal Plan if missing ───────────────────────────────────
  if (!paypalPlanId) {
    const planRes = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'PayPal-Request-Id': 'plan-sms-number-monthly',
      },
      body: JSON.stringify({
        product_id: paypalProductId,
        name: 'Fieseros SMS Number — Monthly',
        description: 'Dedicated phone number, billed monthly',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: '5.00', currency_code: 'USD' } },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: { value: '0', currency_code: 'USD' },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 2,
        },
      }),
    })

    if (planRes.ok) {
      const planData = await planRes.json()
      paypalPlanId = planData.id as string
    } else {
      const errData = await planRes.json().catch(() => ({}))
      throw new Error(`PayPal create-plan failed: ${JSON.stringify(errData)}`)
    }
  }

  // ── Cache the product+plan IDs so subsequent purchases reuse them ───────
  const updatedConfig = { ...toggleConfig, _paypalProductId: paypalProductId, _paypalPlanId: paypalPlanId }
  await db.revenueFeatureToggle.upsert({
    where: { featureKey: 'sms_number_billing' },
    create: {
      featureKey: 'sms_number_billing',
      displayName: 'Dedicated SMS Number Billing',
      description: 'PayPal/Creem product+plan IDs for the $5/month dedicated SMS number add-on',
      enabled: true,
      configJson: JSON.stringify(updatedConfig),
    },
    update: { configJson: JSON.stringify(updatedConfig) },
  })

  // ── Create the Subscription ─────────────────────────────────────────────
  // `custom_id` carries our phoneNumberId so the PayPal webhook can match the
  // activated subscription back to the PhoneNumber row.
  const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'PayPal-Request-Id': `sub-sms-${opts.phoneNumberId}`,
    },
    body: JSON.stringify({
      plan_id: paypalPlanId,
      start_time: new Date(Date.now() + 60_000).toISOString(),
      quantity: '1',
      custom_id: `phn_${opts.phoneNumberId}`,
      application_context: {
        brand_name: 'Fieseros',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: `${opts.appUrl}/?sms_number=success`,
        cancel_url: `${opts.appUrl}/?sms_number=cancelled`,
      },
    }),
  })

  if (!subRes.ok) {
    const errData = await subRes.json().catch(() => ({}))
    throw new Error(`PayPal create-subscription failed: ${JSON.stringify(errData)}`)
  }

  const subData = await subRes.json()
  const approvalLink = (subData.links as Array<{ rel: string; href: string }> | undefined)?.find(
    (l) => l.rel === 'approve',
  )?.href

  if (!approvalLink) {
    throw new Error('PayPal subscription response did not include an approval link')
  }

  return { subscriptionId: subData.id as string, approvalUrl: approvalLink }
}

// ─── Creem helper ──────────────────────────────────────────────────────────

/**
 * Create a Creem checkout session for the dedicated SMS number add-on.
 *
 * Creem requires the admin to pre-create a product in the Creem dashboard and
 * map its ID to 'sms_number' in the RevenueFeatureToggle config:
 *
 *   {
 *     "products": { "sms_number": { "monthly": "prod_xxx" } }
 *   }
 *
 * If the mapping is missing we throw a clear error explaining what to do.
 */
async function createCreemCheckoutForNumber(opts: {
  phoneNumberId: string
  tenantId: string
  userEmail: string
  appUrl: string
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const configured = await isCreemConfigured()
  if (!configured) {
    throw new Error('Creem is not configured. Ask the platform admin to add a Creem API key.')
  }

  // We reuse the public `createCreemCheckoutSession` helper, but it looks up
  // the Plan catalog by planCode. For SMS numbers there is no Plan row, so we
  // need to bypass that helper and call the Creem API directly. We resolve
  // the Creem config ourselves to get the product_id mapping.
  const { getCreemConfig } = await import('@/lib/creem')
  const cfg = await getCreemConfig()
  if (!cfg) {
    throw new Error('Creem is not configured.')
  }

  const productId = cfg.products?.['sms_number']?.monthly
  if (!productId) {
    throw new Error(
      'No Creem product_id mapped for "sms_number.monthly". Ask the platform admin to create a $5/month "SMS Number" product in the Creem dashboard and add its ID to the Creem billing settings.',
    )
  }

  const baseUrl = cfg.apiKey.startsWith('creem_test_')
    ? 'https://test-api.creem.io'
    : 'https://api.creem.io'

  const body: Record<string, unknown> = {
    product_id: productId,
    success_url: `${opts.appUrl}/?sms_number=success`,
    request_id: `co_sms_${opts.phoneNumberId}_${Date.now()}`,
    metadata: {
      kind: 'phone_number',
      phoneNumberId: opts.phoneNumberId,
      tenantId: opts.tenantId,
      source: 'fieseros-sms',
    },
    customer: { email: opts.userEmail },
  }

  const res = await fetch(`${baseUrl}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })

  const rawText = await res.text()
  let json: Record<string, unknown> = {}
  try { json = rawText ? JSON.parse(rawText) : {} } catch { /* keep rawText */ }

  if (!res.ok) {
    const msgField = json.message
    const message =
      (typeof msgField === 'string' && msgField) ||
      (Array.isArray(msgField) && msgField.join('; ')) ||
      (json.error as string | undefined) ||
      rawText.slice(0, 300) ||
      `Creem API returned HTTP ${res.status}`
    throw new Error(`Failed to create Creem checkout for SMS number: ${message}`)
  }

  const checkoutUrl =
    (json.checkout_url as string | undefined) ||
    (json.checkoutUrl as string | undefined) ||
    (json.url as string | undefined)
  const sessionId =
    (json.id as string | undefined) ||
    (json.session_id as string | undefined) ||
    (json.sessionId as string | undefined) ||
    ''

  if (!checkoutUrl) {
    throw new Error('Creem checkout response did not include a checkout_url')
  }

  return { checkoutUrl, sessionId }
}
