'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, List } from 'lucide-react';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

/**
 * Minimal rich-text editor built on a contentEditable div. Outputs HTML.
 * Uses document.execCommand for portability (no extra deps).
 */
export function RichText({ value, onChange, config, disabled, field }: WidgetProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const placeholder = str(config.placeholder, 'Write something...');
  const rows = Math.max(2, Math.min(20, num(config.rows, 5)));
  const showToolbar = bool(config.showToolbar, true);
  const ariaLabel = str(field?.label, 'Rich text');

  // Sync external value -> innerHTML only on first mount or when value differs
  // from current DOM (prevents caret jump while typing).
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = typeof value === 'string' ? value : '';
    if (incoming !== el.innerHTML) el.innerHTML = incoming;
  }, []);

  const emit = () => {
    const el = ref.current;
    if (el) onChange(el.innerHTML);
  };

  const exec = (cmd: string) => {
    if (disabled) return;
    ref.current?.focus();
    document.execCommand(cmd, false);
    emit();
  };

  const btns: { cmd: string; icon: React.ReactNode; label: string }[] = [
    { cmd: 'bold', icon: <Bold className="size-4" />, label: 'Bold' },
    { cmd: 'italic', icon: <Italic className="size-4" />, label: 'Italic' },
    { cmd: 'underline', icon: <Underline className="size-4" />, label: 'Underline' },
    { cmd: 'insertUnorderedList', icon: <List className="size-4" />, label: 'Bullet list' },
  ];

  return (
    <div className="rounded-md border border-input bg-background shadow-xs overflow-hidden">
      {showToolbar && (
        <div className="flex items-center gap-0.5 border-b bg-muted/40 p-1">
          {btns.map((b) => (
            <Button
              key={b.cmd}
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              disabled={disabled}
              onClick={() => exec(b.cmd)}
              aria-label={b.label}
              title={b.label}
            >
              {b.icon}
            </Button>
          ))}
        </div>
      )}
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        aria-label={ariaLabel}
        role="textbox"
        aria-multiline="true"
        className={cn(
          'prose prose-sm max-w-none px-3 py-2 focus:outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]',
          disabled && 'opacity-50',
        )}
        style={{ minHeight: `${rows * 1.6}rem` }}
      />
    </div>
  );
}

export default RichText;
