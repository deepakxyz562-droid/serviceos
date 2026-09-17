# AI Forms — All Widget Settings Audit vs JotForm

> **Status:** Audit complete. Awaiting approval.
> **Scope:** Every widget's settingsSchema across all 5 files compared with JotForm.

---

## SUMMARY

| Area | Status | Count |
|---|---|---|
| **BASIC_FIELDS** (field-registry.ts) | ⚠️ 10 old `boolean` types need → `toggle_with_description` | 19 widgets |
| **Phase 1** (phase-1-widgets.ts) | ⚠️ 29 old `boolean` types need → `toggle_with_description` | 65 widgets |
| **Phase 2** (phase-2-widgets.ts) | ⚠️ 33 old `boolean` + 11 `select` → `segmented` (for 2-4 options) | 105 widgets |
| **Phase 3** (phase-3-widgets.ts) | ✅ Clean — uses compact tuple format, no old types | 110 widgets |
| **Phase 4** (phase-4-widgets.ts) | ⚠️ 1 old `boolean` | 52 widgets |
| **Payment gateways** | ✅ Correct — routed to `PaymentPropertiesPanel` with per-gateway registry | 20 gateways |
| **Duplicates** | ⚠️ 1 duplicate: `cloudflare_turnstile` in both field-registry.ts + phase-2-widgets.ts | 1 |

---

## ISSUE 1: 73 widgets still use old `boolean` type (should be `toggle_with_description`)

JotForm uses toggle switches with descriptive text below each setting. Our code has 73 widgets still using bare `boolean` type (renders as a plain Switch with no description).

**Files affected:**
- `field-registry.ts`: 10 instances (showCounter, thousandsSep, confirmation, blockFreeDomains, validateMobile, allowHTML, clearable, includeLatLon, hidden, showPlayback)
- `phase-1-widgets.ts`: 29 instances (multiSelect, allowDuplicates, showStrength, requireSymbol, disablePast, defaultBrowser, autoSubmitOnExpiry, confirmation, blockFreeDomains, validateMobile, middleName, prefix, includeLatLon, industrySuggest, zoomable, includeTimestamp, includeGps, autoExtract, continuous, enableFormulas, + 10 more)
- `phase-2-widgets.ts`: 33 instances
- `phase-4-widgets.ts`: 1 instance

**Fix:** Global sed replacement: `type: 'boolean'` → `type: 'toggle_with_description'` across all 4 files. Each needs a `description` field added, but for the bulk fix we can add a generic description or leave it empty (the toggle still works, just without the help text).

**Better approach:** Since Phase 3 (110 widgets) uses the compact tuple format with no `boolean` types at all, the fix is only needed in Phase 1, 2, and 4 + BASIC_FIELDS.

---

## ISSUE 2: 11 widgets in Phase 2 use `select` instead of `segmented` for 2-4 option choices

JotForm uses segmented controls (inline button groups) for settings with 2-4 options. Some Phase 2 widgets still use `select` dropdowns for these.

**Examples:**
- Provider (Managed/OSM/BYOK) → should be `segmented`
- Code Length (4/6 Digits) → should be `segmented`
- Theme (Auto/Light/Dark) → should be `segmented`
- Difficulty (Easy/Medium/Hard) → should be `segmented`
- Travel Mode (Driving/Walking/Bicycling) → should be `segmented`

**Fix:** Change these 11 `select` types to `segmented` in phase-2-widgets.ts.

---

## ISSUE 3: 1 duplicate widget (`cloudflare_turnstile`)

`cloudflare_turnstile` exists in BOTH:
- `field-registry.ts` (line 603) — as a WIDGET_FIELD_DEFINITION
- `phase-2-widgets.ts` (line 185) — as a Phase 2 widget

Both show in the palette → user sees it twice.

**Fix:** Remove the one in `phase-2-widgets.ts` (keep the one in `field-registry.ts` which has the more complete schema).

---

## ISSUE 4: Some Phase 2/3/4 widgets have minimal settingsSchema

Many widgets in Phase 2, 3, 4 have only 1-2 settings or no settings at all. While JotForm also has some widgets with minimal settings, most have at least 3-5 configurable options. This is a lower priority issue.

**Examples:**
- `reverse_geocode` — only 1 setting (`showFullAddress`)
- `like_dislike` — only 1 setting (`showLiveCounts`)
- Many Phase 3/4 widgets have 0-2 settings

**Fix:** Add more settings to these widgets over time. Not urgent — the widgets still function.

---

## FIX PLAN

### Phase W1: Fix all `boolean` → `toggle_with_description` (1 commit)

**What:** Global replacement across field-registry.ts, phase-1-widgets.ts, phase-2-widgets.ts, phase-4-widgets.ts.

**How:** Python script to replace `type: 'boolean'` with `type: 'toggle_with_description'` and add a generic `description` field if missing.

**Impact:** 73 settings across ~50 widgets get upgraded to JotForm-style toggles with descriptions.

### Phase W2: Fix `select` → `segmented` for 2-4 option choices (1 commit)

**What:** Change 11 `select` types to `segmented` in phase-2-widgets.ts where there are 2-4 options.

### Phase W3: Remove duplicate `cloudflare_turnstile` (1 commit)

**What:** Remove the duplicate entry from phase-2-widgets.ts.

---

## WHAT I NEED FROM YOU

1. **Approve the plan?**
2. **Should I add descriptions to all 73 boolean→toggle conversions, or just change the type?** (Adding descriptions to all 73 would take longer but match JotForm exactly.)
3. **Should I also add missing settings to the minimal widgets (Issue 4)?** Or focus on the 3 main issues first?
