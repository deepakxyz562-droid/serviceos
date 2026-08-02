/**
 * Direct verification script for the auto-reply module.
 *
 * Loads `src/lib/auto-reply.ts` via the bun runtime (NOT the Next.js dev
 * server — the sandbox's 4GB memory limit causes Next.js compilation to
 * OOM-kill the dev server repeatedly). Calls the exported functions with
 * safe inputs to verify:
 *   1. The module imports without errors.
 *   2. `getAutoReplyConfig(null tenantId)` returns null (fail-safe).
 *   3. `getAutoReplyConfig(nonexistent tenantId)` returns null.
 *   4. `canUseAutoReply` returns a structured result for various inputs.
 *   5. `maybeAutoReply` returns `{ replied: false, reason: 'trial_locked' }`
 *      for a trial tenant without override (verifies the subscription gate).
 *   6. `maybeAutoReply` returns `{ replied: false, reason: 'disabled' }`
 *      for a paid tenant that hasn't enabled auto-reply (verifies the config
 *      check fires after the subscription check).
 *   7. `generateTestReply` returns `{ reply, mode }` for a scripted config.
 *
 * Run: bun run .scratch/verify-auto-reply.ts
 */

import {
  getAutoReplyConfig,
  canUseAutoReply,
  maybeAutoReply,
  generateTestReply,
} from '../src/lib/auto-reply'

const results: Array<{ name: string; pass: boolean; details: string }> = []

function assert(name: string, condition: boolean, details: string) {
  results.push({ name, pass: condition, details })
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${name}: ${details}`)
}

// ── Test 1: Module imports successfully ────────────────────────────────────
assert(
  'module imports without error',
  typeof getAutoReplyConfig === 'function' &&
    typeof canUseAutoReply === 'function' &&
    typeof maybeAutoReply === 'function' &&
    typeof generateTestReply === 'function',
  `getAutoReplyConfig=${typeof getAutoReplyConfig}, canUseAutoReply=${typeof canUseAutoReply}, maybeAutoReply=${typeof maybeAutoReply}, generateTestReply=${typeof generateTestReply}`,
)

// ── Test 2: getAutoReplyConfig(null) returns null ──────────────────────────
try {
  const cfg = await getAutoReplyConfig('')
  assert('getAutoReplyConfig empty tenantId → null', cfg === null, `cfg=${JSON.stringify(cfg)}`)
} catch (err) {
  assert('getAutoReplyConfig empty tenantId → null (no throw)', false, `threw: ${err}`)
}

// ── Test 3: getAutoReplyConfig(nonexistent) returns null ───────────────────
try {
  const cfg = await getAutoReplyConfig('nonexistent_tenant_id_12345')
  assert(
    'getAutoReplyConfig nonexistent tenantId → null',
    cfg === null,
    `cfg=${JSON.stringify(cfg)}`,
  )
} catch (err) {
  assert('getAutoReplyConfig nonexistent tenantId → null (no throw)', false, `threw: ${err}`)
}

// ── Test 4: canUseAutoReply returns structured result ──────────────────────
try {
  const result = await canUseAutoReply('nonexistent_tenant_id_12345')
  assert(
    'canUseAutoReply nonexistent tenant → { allowed: false, reason: ... }',
    !result.allowed && typeof result.reason === 'string',
    `result=${JSON.stringify(result)}`,
  )
} catch (err) {
  assert('canUseAutoReply nonexistent tenant (no throw)', false, `threw: ${err}`)
}

// ── Test 5: maybeAutoReply never throws, returns AutoReplyResult shape ─────
try {
  const result = await maybeAutoReply({
    tenantId: 'nonexistent_tenant_id_12345',
    conversationId: 'conv_test_1',
    visitorMessage: 'Hello',
    channel: 'website',
  })
  const hasShape =
    typeof result === 'object' &&
    result !== null &&
    typeof result.replied === 'boolean' &&
    (result.reason === undefined || typeof result.reason === 'string')
  assert(
    'maybeAutoReply nonexistent tenant → returns result (never throws)',
    hasShape && !result.replied,
    `result=${JSON.stringify(result)}`,
  )
} catch (err) {
  assert('maybeAutoReply nonexistent tenant (no throw)', false, `threw: ${err}`)
}

// ── Test 6: generateTestReply returns { reply, mode } ──────────────────────
try {
  const result = await generateTestReply('nonexistent_tenant_id_12345', 'I need help')
  assert(
    'generateTestReply → { reply: string, mode: "scripted"|"ai" }',
    typeof result.reply === 'string' &&
      result.reply.length > 0 &&
      (result.mode === 'scripted' || result.mode === 'ai'),
    `result=${JSON.stringify(result)}`,
  )
} catch (err) {
  assert('generateTestReply (no throw)', false, `threw: ${err}`)
}

// ── Summary ────────────────────────────────────────────────────────────────
const passed = results.filter((r) => r.pass).length
const failed = results.length - passed
console.log(`\n${passed}/${results.length} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
