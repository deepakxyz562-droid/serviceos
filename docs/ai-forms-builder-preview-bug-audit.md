# AI Forms — Builder + Preview Bug Audit & Fix Plan

> **Status:** Research + Plan only. **NO code has been written.** Awaiting your approval.
> **Scope:** Fix the broken canvas + preview so they work exactly like JotForm.
> **Key insight:** The properties panel (Phase R1–R4) is now JotForm-style, BUT the canvas + preview are still broken — they don't reflect the settings, and several critical bugs exist.

---

## PART A — Critical Bugs Found (BROKEN functionality)

### Bug 1: Canvas onClick references removed `'widget_settings'` mode (SILENT BREAKAGE)

**Location:** `form-studio-builder.tsx` line 1050

```tsx
if (inspectorMode === 'ai_builder') {
  setInspectorMode(field.widgetType ? 'widget_settings' : 'properties');
}
```

**Problem:** Phase R1 removed `'widget_settings'` from the `inspectorMode` union (now only `'properties' | 'ai_builder'`). Calling `setInspectorMode('widget_settings')` is a **TypeScript error** AND a **runtime bug** — clicking a field while in AI Builder mode does nothing (the inspector stays in AI Builder mode instead of switching to Properties).

**Impact:** When a user is using the AI Builder and clicks a field on the canvas, the inspector doesn't switch to Properties. The user has to manually click the Properties tab.

---

### Bug 2: `runtimeSchema` memo drops `width: 'third'` + `width: 'quarter'`

**Location:** `form-studio-builder.tsx` line 165

```tsx
width: f.width === 'half' ? 'half' : 'full',
```

**Problem:** Phase R2 added `'third'` and `'quarter'` to the `width` union. But the `runtimeSchema` memo (which builds the preview schema) only passes `'half'` or `'full'` — it drops `'third'` and `'quarter'` entirely. So setting a field to "Third width" in Properties has NO effect on the preview.

**Impact:** The new Width settings (350 PX, etc.) don't work in preview.

---

### Bug 3: `runtimeSchema` memo doesn't pass Phase R2 universal settings

**Location:** `form-studio-builder.tsx` lines 157–169

**Problem:** The memo only passes: `id, type, label, placeholder, helpText, required, stepId, width, options, widgetType, widgetConfig`. It does NOT pass:
- `labelEnabled` (label show/hide toggle)
- `widthPx` / `heightPx` (dimension in PX)
- `align` (input alignment: left/center/right)
- `labelAlign` (label position: top/left/right/hidden)
- `description` (sub-label / helper text)
- `defaultValue`
- `validation` (min/max/pattern)

**Impact:** All Phase R2 universal General settings (Width 350 PX, Height 100 PX, Label Align, Align, etc.) have NO effect in the preview.

---

### Bug 4: `labelEnabled` has no FormField type backing

**Location:** `src/features/forms/types/index.ts` + `src/lib/forms/form-schema-types.ts`

**Problem:** Phase R2 added `labelEnabled` to `UNIVERSAL_GENERAL_SETTINGS` as a `label_with_toggle` setting, but the `FormField` interface does NOT have a `labelEnabled?: boolean` field. The setting gets saved to the field object as an unknown key, but TypeScript doesn't know about it, so the runtime renderer can't read it.

**Impact:** The "Field Label" enable/disable toggle in Properties doesn't actually hide the label in the preview.

---

### Bug 5: Runtime renderer doesn't apply Phase R2 universal settings

**Location:** `form-runtime-renderer.tsx` lines 444–460

**Problem:** The renderer only checks `field.width === 'half' | 'third' | 'quarter'` for column layout. It does NOT apply:
- `labelEnabled === false` → should hide the `<Label>` element
- `widthPx` → should set the field container width in PX
- `heightPx` → should set the input height in PX
- `align` → should set `text-align` on the input
- `labelAlign` → should position the label (top/left/right)

**Impact:** Even if Bug 3 is fixed (settings passed through), the renderer still ignores them.

---

### Bug 6: "Card-by-Card Swipe" mode doesn't actually do card-by-card

**Location:** `form-runtime-renderer.tsx` lines 356–560

**Problem:** The preview has 3 format buttons: "📄 Classic Paper Form", "🃏 Card-by-Card Swipe", "💬 AI Voice/Chat Agent". But when you click "Card-by-Card Swipe", it renders the **exact same form as Classic Paper** — just with the "Card Swipe" button highlighted. There's no actual card-by-card (one question per screen with swipe animation) behavior.

**Impact:** The "Card-by-Card Swipe" preview is fake — it doesn't show what JotForm's Card Form actually looks like.

---

## PART B — JotForm Parity Gaps (MISSING functionality)

### Gap 7: Canvas shows hardcoded HTML mockups (NOT WYSIWYG)

**Location:** `form-studio-builder.tsx` lines 1144–1370

**Problem:** The canvas (builder view) has hardcoded if/else HTML mockups for ~5 widget types:
- `image_upload_with_notes` → hardcoded "Upload Photos with Descriptions" HTML
- `nearest_location_finder` → hardcoded "Nearest Location Finder" HTML
- `route_planner_map` → hardcoded "Interactive Route Planner" HTML
- `form_calculation` → hardcoded "Formula Result Total" HTML
- `payment_*` → hardcoded payment gateway HTML

The other **372 widgets** show a generic placeholder (just an `<Input>` or nothing).

**JotForm behavior:** The canvas IS a live WYSIWYG preview — every field renders as the actual widget (dropdown renders as a real dropdown, signature renders as a real signature pad, etc.). Clicking a field selects it. Properties changes update the canvas instantly.

**Impact:** The builder canvas looks nothing like the actual form. Users can't see what their form looks like while building.

---

### Gap 8: Properties changes don't update the canvas

**Problem:** When you change a setting in Properties (e.g. Width from 350 to 500, or Required from off to on), the canvas shows the SAME hardcoded mockup — it doesn't reflect the change. You have to switch to Preview Mode to see the effect.

**JotForm behavior:** Changes apply instantly to the canvas.

---

### Gap 9: No "Preview in new tab" button

**Problem:** The only way to preview is the "Preview Mode" toggle in the studio header. There's no "Open in new tab" button that opens the live form URL.

**JotForm behavior:** Prominent "Preview" button in the top-right that opens the live form in a new browser tab.

---

### Gap 10: `runtimeSchema` memo hardcodes `stepId: 'step_1'` + empty `rules: []`

**Location:** `form-studio-builder.tsx` lines 164, 177

**Problem:**
- `stepId: 'step_1'` — all fields are forced into step 1, so multi-step forms don't work in preview
- `rules: []` — conditional logic rules are always empty, so show/hide conditions don't work in preview

**Impact:** Multi-step forms + conditional logic can't be tested in preview.

---

## PART C — Fix Plan (3 phases)

### Phase F1 — Fix Critical Bugs (1-2 days, 1 commit)

**Goal:** Fix the 6 critical bugs so the builder + preview actually work.

1. **Fix Bug 1:** Change line 1050 from `setInspectorMode(field.widgetType ? 'widget_settings' : 'properties')` → `setInspectorMode('properties')`.
2. **Fix Bug 4:** Add `labelEnabled?: boolean` to `FormField` interface in both `types/index.ts` + `form-schema-types.ts`.
3. **Fix Bug 2 + 3:** Rewrite the `runtimeSchema` memo to pass ALL fields through:
   ```tsx
   fields: formData.fields.map((f) => ({
     ...f,  // pass everything: labelEnabled, widthPx, heightPx, align, labelAlign, etc.
     type: f.widgetType ? 'control_widget' : f.type,
     stepId: f.stepId || 'step_1',  // respect actual stepId
     width: f.width,  // pass 'third' + 'quarter' too
     options: f.options?.map(...),
   })),
   rules: formData.rules || [],  // pass actual conditional rules
   ```
4. **Fix Bug 5:** Update `FormRuntimeRenderer` to apply universal settings:
   - `labelEnabled === false` → hide `<Label>`
   - `widthPx` → `style={{ width: field.widthPx + 'px' }}` on container
   - `heightPx` → `style={{ height: field.heightPx + 'px' }}` on input
   - `align` → `style={{ textAlign: field.align }}` on input
   - `labelAlign` → conditional label positioning (top = default, left = inline, right = inline reversed, hidden = no label)
5. **Fix Bug 6:** Implement actual card-by-card mode in `FormRuntimeRenderer`:
   - When `activeMode === 'card'`, render ONE field at a time (not all fields)
   - Add swipe-left/swipe-right navigation (Next/Prev buttons)
   - Progress indicator ("Question 2 of 5")
   - Swipe animation (CSS transform + transition)

### Phase F2 — WYSIWYG Canvas (2-3 days, 1 commit)

**Goal:** Make the canvas render actual widgets (like JotForm) instead of hardcoded HTML mockups.

1. **Replace hardcoded mockups with `WidgetRuntimeDispatcher`:** The canvas field rendering (lines 1144–1370) should render the actual `WidgetRuntimeDispatcher` in a disabled/preview state — same as the preview. Delete the 200+ lines of hardcoded HTML.
2. **Make canvas fields interactive:** Clicking a field selects it (existing behavior). The field renders as the actual widget but in "disabled" mode (no actual submission).
3. **Live update:** Since the canvas now renders the actual `WidgetRuntimeDispatcher`, Properties changes instantly reflect in the canvas (because `formData` changes trigger re-render).
4. **Selection overlay:** When a field is selected, show a colored border + the action toolbar (duplicate/delete/properties). The widget itself renders normally underneath.

### Phase F3 — Preview Polish (1 day, 1 commit)

**Goal:** Add the missing JotForm preview features.

1. **"Preview in new tab" button:** Add a prominent button in the studio header that opens the live form URL (`/form/{formId}`) in a new tab.
2. **Multi-step support:** Pass actual `stepId` values through `runtimeSchema` so multi-step forms work in preview.
3. **Conditional logic support:** Pass actual `rules` through `runtimeSchema` so show/hide conditions work in preview.
4. **Theme application:** Apply `formData.primaryColor`, `formData.borderRadius`, `formData.submitButtonText` to the preview (currently only `primaryColor` + `borderRadius` are passed; `submitButtonText` is passed but `successMessage` etc. are hardcoded).

---

## PART D — Effort & Sequencing

| Phase | Effort | Deliverable | Commits |
|---|---|---|---|
| **F1 — Fix Critical Bugs** | 1-2 days | 6 bugs fixed. Properties settings actually work in preview. Card-by-card mode works. | 1 |
| **F2 — WYSIWYG Canvas** | 2-3 days | Canvas renders actual widgets (like JotForm). Live update on Properties change. | 1 |
| **F3 — Preview Polish** | 1 day | "Preview in new tab" button. Multi-step + conditional logic in preview. Theme application. | 1 |
| **TOTAL** | **~4-6 days** | **Full JotForm builder + preview parity** | **3 commits** |

### Sequencing rules

1. **F1 is mandatory prerequisite** — the bugs make the current builder unusable for real form design.
2. **F2 depends on F1** — the WYSIWYG canvas needs the universal settings to be applied first.
3. **F3 is independent** — can be done in parallel with F2.

---

## PART E — What I need from you before coding

1. **Approve this plan** (or request changes).
2. **Confirm F1 bug fixes** — especially the card-by-card mode implementation. Want the swipe animation, or just Next/Prev buttons?
3. **Confirm F2 WYSIWYG canvas** — replace the hardcoded mockups with actual `WidgetRuntimeDispatcher` in disabled mode? This is a big visual change.
4. **Confirm F3 "Preview in new tab"** — should it open `/form/{formId}` (the existing public form route)?

Once you say **go**, I'll start Phase F1 immediately.

---

*End of plan. No code has been written.*
