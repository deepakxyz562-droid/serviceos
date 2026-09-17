'use client';

import React, { useState } from 'react';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Pill, Bandage, HeartPulse, Plus, Trash2 } from 'lucide-react';

interface MedicalHistoryValue {
  conditions: string[];
  medications: string[];
  allergies: string[];
  notes?: string;
}

const COMMON_CONDITIONS = ['Hypertension', 'Diabetes (Type 2)', 'Asthma', 'Coronary artery disease', 'Anxiety', 'Depression', 'Thyroid disorder', 'Migraine'];
const COMMON_ALLERGIES = ['Penicillin', 'Peanuts', 'Latex', 'Aspirin', 'Iodine', 'Sulfa drugs', 'Shellfish', 'Pollen'];

export function MedicalHistory({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Medical history');
  const showNotes = config.showNotes !== false;

  const v: MedicalHistoryValue = value && typeof value === 'object'
    ? (value as MedicalHistoryValue)
    : { conditions: [], medications: [], allergies: [] };
  const conditions: string[] = Array.isArray(v.conditions) ? v.conditions : [];
  const medications: string[] = Array.isArray(v.medications) ? v.medications : [];
  const allergies: string[] = Array.isArray(v.allergies) ? v.allergies : [];
  const notes = str(v.notes, '');

  const [medDraft, setMedDraft] = useState('');
  const [condDraft, setCondDraft] = useState('');
  const [allergyDraft, setAllergyDraft] = useState('');

  const patch = (p: Partial<MedicalHistoryValue>) =>
    onChange({ conditions, medications, allergies, notes, ...p });

  const toggleListItem = (list: string[], item: string, key: string) => {
    if (disabled) return;
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    patch({ [key]: next } as Partial<MedicalHistoryValue>);
  };

  const addItem = (list: string[], item: string, key: string) => {
    const trimmed = item.trim();
    if (!trimmed || disabled) return;
    if (list.includes(trimmed)) return;
    patch({ [key]: [...list, trimmed] } as Partial<MedicalHistoryValue>);
  };

  const removeItem = (list: string[], item: string, key: string) => {
    if (disabled) return;
    patch({ [key]: list.filter((x) => x !== item) } as Partial<MedicalHistoryValue>);
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Lock className="size-3 text-amber-600" />
        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">
          Encrypted PHI · medical history
        </span>
      </div>

      <ChipSection
        title="Known conditions"
        icon={<HeartPulse className="size-3" />}
        items={conditions}
        common={COMMON_CONDITIONS}
        draft={condDraft}
        setDraft={setCondDraft}
        onAdd={() => {
          addItem(conditions, condDraft, 'conditions');
          setCondDraft('');
        }}
        onToggle={(item) => toggleListItem(conditions, item, 'conditions')}
        onRemove={(item) => removeItem(conditions, item, 'conditions')}
        disabled={disabled}
        inputPlaceholder="Add a condition…"
      />

      <ChipSection
        title="Current medications"
        icon={<Pill className="size-3" />}
        items={medications}
        common={[]}
        draft={medDraft}
        setDraft={setMedDraft}
        onAdd={() => {
          addItem(medications, medDraft, 'medications');
          setMedDraft('');
        }}
        onToggle={() => undefined}
        onRemove={(item) => removeItem(medications, item, 'medications')}
        disabled={disabled}
        inputPlaceholder="e.g. Lisinopril 10mg"
      />

      <ChipSection
        title="Allergies"
        icon={<Bandage className="size-3" />}
        items={allergies}
        common={COMMON_ALLERGIES}
        draft={allergyDraft}
        setDraft={setAllergyDraft}
        onAdd={() => {
          addItem(allergies, allergyDraft, 'allergies');
          setAllergyDraft('');
        }}
        onToggle={(item) => toggleListItem(allergies, item, 'allergies')}
        onRemove={(item) => removeItem(allergies, item, 'allergies')}
        disabled={disabled}
        inputPlaceholder="Add an allergy…"
      />

      {showNotes && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Additional notes</label>
          <Input
            value={notes}
            disabled={disabled}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Surgical history, family history, etc."
            className="text-xs h-8"
            aria-label="Additional notes"
          />
        </div>
      )}
    </div>
  );
}

interface ChipSectionProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  common: string[];
  draft: string;
  setDraft: (s: string) => void;
  onAdd: () => void;
  onToggle: (item: string) => void;
  onRemove: (item: string) => void;
  disabled?: boolean;
  inputPlaceholder?: string;
}

function ChipSection({ title, icon, items, common, draft, setDraft, onAdd, onToggle, onRemove, disabled, inputPlaceholder }: ChipSectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-semibold text-foreground">{title}</span>
        {items.length > 0 && (
          <Badge variant="secondary" className="text-[9px] h-4">{items.length}</Badge>
        )}
      </div>

      {common.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {common.map((c) => {
            const sel = items.includes(c);
            return (
              <button
                key={c}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(c)}
                aria-pressed={sel}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors',
                  sel ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-1">
        <Input
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={inputPlaceholder}
          className="text-xs h-7 flex-1"
          aria-label={`Add ${title.toLowerCase()}`}
        />
        <button
          type="button"
          disabled={disabled || !draft.trim()}
          onClick={onAdd}
          aria-label={`Add ${title.toLowerCase()}`}
          className="size-7 shrink-0 rounded-md border border-border bg-card hover:bg-muted disabled:opacity-50 flex items-center justify-center"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {items
            .filter((i) => !common.includes(i))
            .map((item) => (
              <Badge key={item} variant="outline" className="text-[10px] gap-1 pr-1 pl-2 py-0">
                {item}
                {!disabled && (
                  <button type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item}`} className="hover:text-destructive">
                    <Trash2 className="size-2.5" />
                  </button>
                )}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}

export default MedicalHistory;
