# AI Forms — Field Settings Audit vs JotForm (Round 3)

> **Status:** Audit complete. Awaiting approval before fixing.
> **Scope:** Compare EVERY basic field, payment field, and widget settingsSchema with JotForm's exact properties panel.

---

## PART A — JotForm's Exact Properties Panel Structure (from your HTML)

JotForm's properties panel has **3 tabs** that adapt per field type:

### Tab 1: General (universal — same for every field type)
- Field Label (text input + enable/disable toggle)
- Label Align (segmented: Top | Left | Right)
- Align (segmented: Left | Center | Right)
- Width (number + PX unit)
- Height (number + PX unit)
- Required (toggle + description: "Prevent submission if this field is empty")
- Duplicate Field (button)

### Tab 2: Options / Field-Specific (adapts per field type)
For **Dropdown** (from your HTML):
- **Dropdown Options** — TEXTAREA (one option per line, NOT a sortable list)
  - "Give options for users to select from. Enter each option on a new line."
  - "Presets" button next to the label
- **Default Value** — SELECT dropdown (populated from the options above)
  - "Choose an option to be selected by default"
  - Shows "No Selection" when empty
- **Calculation Values** — toggle + description "Add values to be used in calculations"
- **Show Text in Empty Option** — toggle + description "Use text instead of the empty option. Treated as an empty answer."

### Tab 3: Advanced (universal)
- Sub-label / Hover Text
- Default Value
- Read-only (toggle)
- Hidden (toggle)
- Field Name (machine)
- Show if (conditional logic)
- Auto-calculate value (formula)
- Custom error message
- Time limit
- Custom CSS

---

## PART B — Current Fieseros Implementation Audit

### B1. Universal General Settings (✅ matches JotForm)

Our `UNIVERSAL_GENERAL_SETTINGS` already matches JotForm:
- ✅ `labelEnabled` (label_with_toggle) — Field Label + enable/disable
- ✅ `label` (text) — Label Text
- ✅ `labelAlign` (segmented: Top/Left/Right)
- ✅ `align` (segmented: Left/Center/Right)
- ✅ `widthPx` (dimension: 350 PX)
- ✅ `heightPx` (dimension: 100 PX)
- ✅ `required` (toggle_with_description)
- ✅ `_duplicate` (duplicate_button)

### B2. Universal Advanced Settings (✅ matches JotForm)

Our `UNIVERSAL_ADVANCED_SETTINGS` already matches:
- ✅ placeholder, helpText, defaultValue, readOnly, hidden, fieldName
- ✅ condition (condition_builder), calculation (formula_editor)
- ✅ customError, timeLimit, customCss

### B3. Tab Naming (❌ doesn't match JotForm)

**Current:** `{definition.category} Settings` (e.g. "choice Settings", "payment Settings")
**JotForm:** "Options" for choice fields, "Field Settings" for others, "Payment Properties" for payments

### B4. Dropdown Field-Specific Settings (❌ 3 settings missing)

**Current** `dropdown_widget` settingsSchema:
- ✅ Options (options_editor — sortable list)
- ✅ Allow "Other" (toggle_with_description)
- ✅ "Other" placeholder text (conditional)
- ✅ Allow multi-select (toggle_with_description)
- ✅ Enable search (toggle_with_description)
- ✅ Randomize order (toggle_with_description)

**Missing vs JotForm:**
- ❌ **Default Value** — SELECT dropdown populated from the options (JotForm: "Choose an option to be selected by default")
- ❌ **Calculation Values** — toggle + description "Add values to be used in calculations"
- ❌ **Show Text in Empty Option** — toggle + description "Use text instead of the empty option. Treated as an empty answer."

**Extra (not in JotForm):**
- Options uses sortable list (`options_editor`) — JotForm uses a TEXTAREA (one option per line). Both work, but JotForm's is simpler.
- "Allow multi-select" / "Enable search" / "Randomize order" — JotForm doesn't show these for basic Dropdown (they may be in Advanced or hidden). However these ARE useful features and JotForm's Single Choice / Multiple Choice fields have similar options.

### B5. Basic `dropdown` in field-registry.ts (❌ uses old `boolean` type)

The `dropdown` definition in `BASIC_FIELDS` (field-registry.ts) still uses old `boolean` type instead of `toggle_with_description`:
```
{ key: 'allowOther', label: 'Allow "Other"', type: 'boolean', ... }
{ key: 'multiSelect', label: 'Allow multi-select', type: 'boolean', ... }
```
Should be `toggle_with_description` like the Phase 1 `dropdown_widget`.

### B6. Other Basic Fields — Missing Field-Specific Settings

| Field Type | Missing vs JotForm |
|---|---|
| **Short Text** | ❌ Max Characters (number), Validation (select: None/Email/URL/Alphanumeric), Input Mask (text) — currently has these ✅ |
| **Long Text** | ❌ Max Characters (number), Show Character Counter (toggle) — currently has these ✅ |
| **Number** | ❌ Min/Max/Step/Decimals/Thousands separator — currently has these ✅ |
| **Email** | ❌ Require Confirmation (toggle), Block Free Domains (toggle) — currently has these ✅ |
| **Phone** | ❌ Default Country, Validate Mobile, Format — currently has these ✅ |
| **Date Picker** | ❌ Missing: Default Value (date), Disable Specific Dates (multi-date picker), Time Zone (select) |
| **Single Choice** | ❌ Missing: Default Value (select from options), Spread (inline/stacked), Special Values (Other/None) |
| **Multiple Choice** | ❌ Missing: Default Value (multi-select from options), Min/Max selections validation text |
| **File Upload** | ❌ Missing: Default Value (file URL), File Types as multi_checkbox (currently text) |
| **Star Rating** | ❌ Missing: Default Value (number of stars), Hover text |
| **Signature** | ✅ Has Width/Height/Pen Color/Background/Clearable/Legal Text |

### B7. Payment Widget Settings (✅ mostly matches, minor issues)

The payment widget settingsSchema already has:
- ✅ Payment Connection (gateway_picker)
- ✅ Payment Type (select: Products/Subscriptions/Single/Donation)
- ✅ Currency (currency_search)
- ✅ Payment Methods (multi_checkbox)
- ✅ Billing Address (segmented: Required/Optional/Hidden)
- ✅ Pay Later Message
- ✅ PayPal Smart Buttons
- ✅ Integration Mode (segmented: Managed/BYOK)
- ✅ Publishable Key / Secret Key (conditional)
- ✅ Charge Mode / Amount
- ✅ Sandbox Test Mode

**Issue:** The "Options" tab is labeled "payment Settings" instead of "Payment Properties" like JotForm.

### B8. Widget Settings (image_upload_with_notes) — ✅ matches JotForm

Already has:
- ✅ Note Field Title, Note Placeholder, Require Note toggle
- ✅ Limit Number of Photos toggle, Min/Max Photos
- ✅ Allowed Image Types (multi_checkbox: JPG/PNG/HEIC/WebP)
- ✅ Max file size

---

## PART C — Fix Plan

### Phase G1: Fix Tab Naming + Basic Field Type Alignment (1 commit)

1. **Fix tab naming** in `widget-settings-renderer.tsx`:
   - Change `{definition.category} Settings` → field-type-specific label:
     - Choice fields → "Options"
     - Payment fields → "Payment Properties"
     - Other fields → "Field Settings"

2. **Fix `dropdown` in BASIC_FIELDS** (field-registry.ts):
   - Change `boolean` → `toggle_with_description` for allowOther, multiSelect, searchEnabled, randomize
   - Add: **Default Value** (select populated from options)
   - Add: **Calculation Values** (toggle_with_description)
   - Add: **Show Text in Empty Option** (toggle_with_description)

3. **Fix `single_choice` + `multiple_choice`** in BASIC_FIELDS:
   - Same `boolean` → `toggle_with_description` fix
   - Add: **Default Value** (select from options)
   - Add: **Spread / Columns** (segmented: 1/2/3/Inline)

4. **Fix `date_picker`** in BASIC_FIELDS:
   - Add: **Default Value** (date)
   - Add: **Disable Specific Dates** (textarea — one date per line)

5. **Fix `file_upload`** in BASIC_FIELDS:
   - Change allowedExtensions from text → `multi_checkbox`
   - Add: **Default Value** (file URL text)

### Phase G2: Add Missing Field-Specific Settings (1 commit)

Add the JotForm-missing settings to each basic field type's settingsSchema:
- Short Text: already complete ✅
- Long Text: already complete ✅
- Number: already complete ✅
- Email: already complete ✅
- Phone: already complete ✅
- Date Picker: add Default Value + Disable Specific Dates
- Single Choice: add Default Value + Spread
- Multiple Choice: add Default Value + Spread
- Dropdown: add Default Value + Calculation Values + Show Text in Empty Option
- File Upload: change to multi_checkbox + add Default Value
- Star Rating: add Default Value
- Hidden: add Auto-Capture options (UTM/Referrer/IP/User Agent) — already has ✅

### Phase G3: Add `options_textarea` Control Type (1 commit)

JotForm uses a TEXTAREA for dropdown options (one per line), not a sortable list. Add a new control type `options_textarea` that renders as a textarea where each line is an option. This matches JotForm's exact UX.

---

## PART D — Summary

| Phase | What | Effort | Commits |
|---|---|---|---|
| **G1** | Fix tab naming + align basic fields with JotForm (boolean→toggle, add missing settings) | 1-2 hours | 1 |
| **G2** | Add Default Value + Disable Specific Dates to all relevant fields | 1 hour | 1 |
| **G3** | Add options_textarea control type (JotForm textarea style) | 30 min | 1 |
| **TOTAL** | | ~3 hours | 3 commits |

All changes are to existing files — no new components needed.
