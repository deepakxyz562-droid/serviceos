# Payment Gateway Connection — Audit Findings & Fix Plan

> **Status:** Audit complete. Awaiting approval.

---

## CRITICAL BUGS FOUND

### Bug 1: 3 `useState` declarations have broken syntax (lines 136-138)

```typescript
const odalMode, setModalMode] = useState<'live' | 'test'>(mode);        // MISSING [
const odalConnName, setModalConnName] = useState<string>(connectionName); // MISSING [
const odalIsConnected, setModalIsConnected] = useState<boolean>(isConnected); // MISSING [
```

**Should be:**
```typescript
const [modalMode, setModalMode] = useState<'live' | 'test'>(mode);
const [modalConnName, setModalConnName] = useState<string>(connectionName);
const [modalIsConnected, setModalIsConnected] = useState<boolean>(isConnected);
```

**Impact:** These 3 lines have **missing opening brackets** — `const odalMode` instead of `const [modalMode`. This causes a **parse error** that prevents the entire `PaymentPropertiesPanel` component from rendering. When a user clicks on any payment field, the properties panel **crashes or shows nothing**.

### Bug 2: Payment method toggle has broken syntax (line 185)

```typescript
const next = { ...enabledMethods, ethodId]: checked };
```

**Should be:**
```typescript
const next = { ...enabledMethods, [methodId]: checked };
```

**Impact:** When a user toggles a payment method (Card, Apple Pay, Google Pay, etc.), the code tries to set a property called `ethodId]` instead of the actual method ID. Payment method toggles **don't work**.

### Bug 3: Field mapping value has broken syntax (line 610)

```typescript
value={String(widgetConfigap.key] || 'auto_detect')}
```

**Should be:**
```typescript
value={String(widgetConfig[map.key] || 'auto_detect')}
```

**Impact:** When rendering the Customer Email / Phone field mapping dropdown, the value is read from `widgetConfigap.key]` (nonsense) instead of `widgetConfig[map.key]`. The dropdown always shows "Auto-detect" even when a field is already mapped.

### Bug 4: OAuth connection is FAKE (no backend API call)

```typescript
const handleOAuthConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setModalIsConnected(true);  // Just sets a boolean — no actual OAuth flow
    }, 600);
};
```

**Impact:** Clicking "Connect with Stripe/PayPal/Square" shows a spinner for 600ms, then says "Connected" — but **no actual OAuth flow happens**. No redirect to Stripe/PayPal, no token exchange, no API keys saved. The connection is purely cosmetic.

### Bug 5: Connection doesn't persist to database

`handleSaveConnectionModal()` only calls `onConfigChange()` which updates the in-memory `formData` object. When the form is saved to the database, the `isConnected` boolean is stored in `widgetConfig` — but there's **no actual gateway connection record** in the database. No API keys are saved server-side.

### Bug 6: Disconnect only sets `isConnected: false`

```typescript
const handleDisconnect = () => {
    onConfigChange('isConnected', false);
};
```

**Impact:** Disconnecting doesn't revoke any OAuth tokens or clear API keys — it just flips a boolean. This is acceptable for a UI prototype but not production-ready.

---

## WHAT WORKS CORRECTLY

✅ Gateway connection card UI (logo, name, "Add a {gateway} connection" warning, Connect/Disconnect buttons)
✅ Connection modal (Environment selector, Connection Name input, OAuth button, Save/Cancel)
✅ Payment Type dropdown
✅ Currency selector
✅ Per-gateway payment methods list (Card, ACH, Klarna, Google Pay, etc.)
✅ Send Email / Receipt toggle
✅ Authorization Only toggle
✅ Charge Customer Immediately toggle
✅ Create Customer Record + radio
✅ Business Location dropdown
✅ Order Fulfillment Type dropdown
✅ Ask Billing Information toggle
✅ Credit Card Label Text input
✅ BYOK credentials section (collapsible, per-gateway configFields)
✅ Sticky footer (Close + Update)

---

## FIX PLAN

### Phase C1: Fix 3 syntax bugs (1 commit, 5 minutes)

Fix the 3 broken `useState` declarations + the `ethodId]` bug + the `widgetConfigap.key]` bug. These are simple find-and-replace fixes.

### Phase C2: Add real OAuth redirect flow (1 commit, 30 minutes)

Replace the fake `setTimeout` with a real OAuth redirect:
- Click "Connect with Stripe" → redirect to Stripe OAuth URL
- On return, exchange the authorization code for access token
- Save the token server-side via an API route
- Update the connection status

**Note:** This requires creating a new API route (`/api/forms/payment/connect/[gateway]`) and handling the OAuth callback. For now, I'll implement a simplified version that redirects to the gateway's OAuth URL and handles the callback.

### Phase C3: Persist connection to database (1 commit, 30 minutes)

Save the gateway connection (including API keys, connection name, mode) to the `Form.widgetConfig` JSON field when the form is saved. This already works via `onConfigChange` → `handleUpdateWidgetConfig` → `onFormDataChange` → form save — but we need to verify it actually persists.

---

## WHAT I NEED FROM YOU

1. **Approve the plan?**
2. **Fix the 3 syntax bugs first (Phase C1), then implement OAuth (Phase C2)?** Or fix everything at once?
3. **For the OAuth flow — should I implement real Stripe/PayPal/Square OAuth redirect?** Or keep it as a simulated connection for now and focus on fixing the bugs?
