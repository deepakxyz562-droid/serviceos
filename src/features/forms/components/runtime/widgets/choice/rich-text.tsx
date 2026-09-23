'use client';

/**
 * Rich Text Editor — modern contentEditable editor using Selection API.
 *
 * Replaces the deprecated document.execCommand approach with direct DOM
 * manipulation using the Selection + Range API. This is future-proof
 * against browser removal of execCommand.
 *
 * Supported formatting:
 *  - Bold: wraps selection in <strong>
 *  - Italic: wraps selection in <em>
 *  - Underline: wraps selection in <u>
 *  - Bullet list: wraps line(s) in <ul><li>
 *
 * Outputs HTML string via onChange.
 */
import React, { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, List } from 'lucide-react';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

export function RichText({ value, onChange, config, disabled, field }: WidgetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const placeholder = str(config.placeholder, 'Write something...');
  const rows = Math.max(2, Math.min(20, num(config.rows, 5)));
  const showToolbar = bool(config.showToolbar, true);
  const ariaLabel = str(field?.label, 'Rich text');

  // Sync external value → innerHTML only on first mount.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = typeof value === 'string' ? value : '';
    if (incoming !== el.innerHTML) el.innerHTML = incoming;
  }, []);

  const emit = useCallback(() => {
    const el = ref.current;
    if (el) onChange(el.innerHTML);
  }, [onChange]);

  /**
   * Wrap the current selection in an inline tag (<strong>, <em>, <u>).
   * If the selection is already inside the tag, unwrap it (toggle behavior).
   */
  const toggleInline = useCallback((tagName: string) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    el.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // No text selected — nothing to format

    // Check if selection is already inside the target tag
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const existingWrap = (node as Element | null)?.closest(tagName);

    if (existingWrap) {
      // Unwrap: move children out of the tag
      const parent = existingWrap.parentNode;
      if (parent) {
        while (existingWrap.firstChild) {
          parent.insertBefore(existingWrap.firstChild, existingWrap);
        }
        parent.removeChild(existingWrap);
      }
    } else {
      // Wrap: extract selected content and insert into new element
      try {
        const wrapper = document.createElement(tagName);
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
        // Restore selection to the wrapped content
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch {
        // Range spans partial elements — fall back to execCommand
        const cmd = tagName === 'strong' ? 'bold' : tagName === 'em' ? 'italic' : 'underline';
        try { document.execCommand(cmd, false); } catch { /* noop */ }
      }
    }

    emit();
  }, [disabled, emit]);

  /**
   * Toggle a bullet list on the current line(s).
   * If the current line is already in a <li>, unwrap it. Otherwise wrap it.
   */
  const toggleBulletList = useCallback(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    el.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    const existingLi = (node as Element | null)?.closest('li');
    if (existingLi) {
      // Unwrap: move the li content out of the list
      const ul = existingLi.parentNode;
      const parent = ul?.parentNode;
      if (parent && ul) {
        // Move li content to a text node before the ul
        const fragment = document.createDocumentFragment();
        while (existingLi.firstChild) {
          fragment.appendChild(existingLi.firstChild);
        }
        parent.insertBefore(fragment, ul);
        ul.removeChild(existingLi);
        // Remove empty ul
        if (ul.childNodes.length === 0) {
          parent.removeChild(ul);
        }
      }
    } else {
      // Wrap the current block in <ul><li>
      const blockEl = (node as Element | null)?.closest('div, p') || null;
      const text = selection.toString() || (blockEl?.textContent ?? '');

      const ul = document.createElement('ul');
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);

      if (blockEl && blockEl !== el) {
        blockEl.replaceWith(ul);
      } else {
        // Insert at cursor position
        range.deleteContents();
        range.insertNode(ul);
      }
    }

    emit();
  }, [disabled, emit]);

  return (
    <div className="rounded-md border border-input bg-background shadow-xs overflow-hidden">
      {showToolbar && (
        <div className="flex items-center gap-0.5 border-b bg-muted/40 p-1">
          <Button type="button" variant="ghost" size="sm" className="size-7 p-0" disabled={disabled} onClick={() => toggleInline('strong')} aria-label="Bold" title="Bold">
            <Bold className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="size-7 p-0" disabled={disabled} onClick={() => toggleInline('em')} aria-label="Italic" title="Italic">
            <Italic className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="size-7 p-0" disabled={disabled} onClick={() => toggleInline('u')} aria-label="Underline" title="Underline">
            <Underline className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="size-7 p-0" disabled={disabled} onClick={() => toggleBulletList()} aria-label="Bullet list" title="Bullet list">
            <List className="size-4" />
          </Button>
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
