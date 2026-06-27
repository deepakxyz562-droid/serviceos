'use client'

/**
 * RichTextEditor
 * --------------
 * A dependency-free WYSIWYG editor built on top of a contentEditable div.
 *
 * Uses document.execCommand (deprecated but reliable across browsers) for the
 * formatting primitives and the Selection/Range API for custom insertions.
 *
 * Sync model:
 *   - `value` is the source-of-truth HTML coming from the parent.
 *   - We DO NOT write it back into the DOM on every keystroke — that would
 *     reset the caret. Instead we track the last HTML we emitted and only
 *     re-render when the parent passes a value that differs from what the
 *     editor currently contains (i.e. an external change such as a variable
 *     insertion by the parent).
 */

import * as React from 'react'
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Pilcrow,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  CurlyBraces,
  RemoveFormatting,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface RichTextEditorProps {
  /** HTML content to display. */
  value: string
  /** Called with the new HTML whenever the user edits. */
  onChange: (html: string) => void
  /** Placeholder shown when the editor is empty. */
  placeholder?: string
  /** If provided, a "Insert Variable" toolbar button is shown that calls this. */
  onInsertVariable?: () => void
  /** Optional className for the outer wrapper. */
  className?: string
  /** Aria label for the editable region. */
  ariaLabel?: string
}

/** Preset text colors (NO indigo/blue per project rules). */
const TEXT_COLORS: { name: string; value: string }[] = [
  { name: 'Default', value: '' },
  { name: 'Slate', value: '#475569' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Fuchsia', value: '#c026d3' },
]

interface ToolButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}

function ToolButton({ icon: Icon, label, onClick, disabled }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          <Icon className="size-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  onInsertVariable,
  className,
  ariaLabel = 'Rich text editor',
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  // The last HTML we emitted to the parent. Used to detect external changes.
  const lastEmittedRef = React.useRef<string>(value)
  const [colorOpen, setColorOpen] = React.useState(false)

  /**
   * Sync external value into the DOM only when it actually differs from what
   * we last emitted — prevents caret jumps while typing.
   */
  React.useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (value !== lastEmittedRef.current) {
      el.innerHTML = value || ''
      lastEmittedRef.current = value
    }
  }, [value])

  /** Initialize the DOM once on mount. */
  React.useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = value || ''
    lastEmittedRef.current = value || ''
  }, [])

  /** Run an execCommand and propagate the resulting HTML up. */
  const exec = React.useCallback(
    (command: string, val?: string) => {
      // Refocus so the command applies to the editor's selection.
      editorRef.current?.focus()
      document.execCommand(command, false, val)
      const html = editorRef.current?.innerHTML || ''
      lastEmittedRef.current = html
      onChange(html)
    },
    [onChange]
  )

  /** Insert arbitrary HTML at the current selection, then emit. */
  const insertHtml = React.useCallback(
    (html: string) => {
      const el = editorRef.current
      if (!el) return
      el.focus()
      document.execCommand('insertHTML', false, html)
      const out = el.innerHTML
      lastEmittedRef.current = out
      onChange(out)
    },
    [onChange]
  )

  const handleInput = React.useCallback(() => {
    const html = editorRef.current?.innerHTML || ''
    lastEmittedRef.current = html
    onChange(html)
  }, [onChange])

  /** Prevent the browser from opening pasted images as files; just emit. */
  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      // Allow default paste; just emit afterwards.
      setTimeout(() => {
        const html = editorRef.current?.innerHTML || ''
        lastEmittedRef.current = html
        onChange(html)
      }, 0)
    },
    [onChange]
  )

  // -- Toolbar action handlers ---------------------------------------------

  const onBold = () => exec('bold')
  const onItalic = () => exec('italic')
  const onUnderline = () => exec('underline')
  const onH1 = () => exec('formatBlock', '<h1>')
  const onH2 = () => exec('formatBlock', '<h2>')
  const onParagraph = () => exec('formatBlock', '<p>')
  const onBullet = () => exec('insertUnorderedList')
  const onNumbered = () => exec('insertOrderedList')
  const onAlignLeft = () => exec('justifyLeft')
  const onAlignCenter = () => exec('justifyCenter')
  const onAlignRight = () => exec('justifyRight')
  const onClearFormat = () => exec('removeFormat')
  const onDivider = () => insertHtml('<hr/>')

  const onColor = (color: string) => {
    if (color === '') {
      exec('foreColor', 'inherit')
    } else {
      exec('foreColor', color)
    }
    setColorOpen(false)
  }

  const onLink = () => {
    const url = window.prompt('Enter the URL:')
    if (!url) return
    // Wrap selection in an anchor if there is one, else insert the URL as text.
    const sel = window.getSelection()
    const hasSelection = sel && sel.toString().length > 0
    if (hasSelection) {
      exec('createLink', url)
    } else {
      insertHtml(
        `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
      )
    }
  }

  const onImage = () => {
    const url = window.prompt('Enter the image URL:')
    if (!url) return
    insertHtml(
      `<img src="${escapeAttr(url)}" alt="" style="max-width:100%;height:auto;border-radius:6px;" />`
    )
  }

  const onTable = () => {
    const raw = window.prompt(
      'Table size (rows x cols), e.g. "3x3":',
      '2x2'
    )
    if (!raw) return
    const m = raw.trim().toLowerCase().match(/^(\d+)\s*[x×]\s*(\d+)$/)
    if (!m) {
      window.alert('Please use the format ROWSxCOLS, e.g. 3x3.')
      return
    }
    const rows = Math.min(Math.max(parseInt(m[1], 10), 1), 20)
    const cols = Math.min(Math.max(parseInt(m[2], 10), 1), 10)
    const html = buildTable(rows, cols)
    insertHtml(html)
  }

  const onVariable = () => {
    onInsertVariable?.()
  }

  // -- Render ---------------------------------------------------------------

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border bg-background overflow-hidden',
        'focus-within:ring-2 focus-within:ring-ring/40',
        className
      )}
    >
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Formatting toolbar"
        className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1.5"
      >
        <ToolButton icon={Bold} label="Bold (Ctrl+B)" onClick={onBold} />
        <ToolButton icon={Italic} label="Italic (Ctrl+I)" onClick={onItalic} />
        <ToolButton icon={Underline} label="Underline (Ctrl+U)" onClick={onUnderline} />

        <Sep />

        <ToolButton icon={Heading1} label="Heading 1" onClick={onH1} />
        <ToolButton icon={Heading2} label="Heading 2" onClick={onH2} />
        <ToolButton icon={Pilcrow} label="Paragraph" onClick={onParagraph} />

        <Sep />

        <ToolButton icon={List} label="Bullet list" onClick={onBullet} />
        <ToolButton icon={ListOrdered} label="Numbered list" onClick={onNumbered} />

        <Sep />

        <ToolButton icon={AlignLeft} label="Align left" onClick={onAlignLeft} />
        <ToolButton icon={AlignCenter} label="Align center" onClick={onAlignCenter} />
        <ToolButton icon={AlignRight} label="Align right" onClick={onAlignRight} />

        <Sep />

        {/* Text color */}
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  aria-label="Text color"
                >
                  <Palette className="size-4" aria-hidden />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Text color</TooltipContent>
          </Tooltip>
          <PopoverContent
            align="start"
            className="w-auto p-2"
          >
            <div className="grid grid-cols-3 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onColor(c.value)}
                  title={c.name}
                  aria-label={`Apply color ${c.name}`}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
                    'hover:scale-110 hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                  style={{
                    backgroundColor: c.value || 'transparent',
                    backgroundImage: c.value
                      ? undefined
                      : 'linear-gradient(135deg, transparent 45%, #dc2626 45%, #dc2626 55%, transparent 55%)',
                  }}
                >
                  {c.value === '' && (
                    <span className="text-[9px] font-bold text-muted-foreground">A</span>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <ToolButton icon={LinkIcon} label="Insert link" onClick={onLink} />
        <ToolButton icon={ImageIcon} label="Insert image" onClick={onImage} />
        <ToolButton icon={TableIcon} label="Insert table" onClick={onTable} />
        <ToolButton icon={Minus} label="Insert divider" onClick={onDivider} />

        {onInsertVariable && (
          <>
            <Sep />
            <ToolButton
              icon={CurlyBraces}
              label="Insert variable"
              onClick={onVariable}
            />
          </>
        )}

        <Sep />

        <ToolButton
          icon={RemoveFormatting}
          label="Clear formatting"
          onClick={onClearFormat}
        />
      </div>

      {/* Editor */}
      <div className="relative min-h-[200px] flex-1">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          data-placeholder={placeholder}
          onInput={handleInput}
          onBlur={handleInput}
          onPaste={handlePaste}
          className={cn(
            'rte-content min-h-[200px] w-full px-4 py-3 outline-none',
            'text-sm leading-relaxed text-foreground',
            'prose-sm max-w-none',
            '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
            '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
            '[&_img]:max-w-full [&_img]:rounded-md',
            '[&_table]:w-full [&_table]:border-collapse',
            '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
            '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
            '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-2',
            '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2',
            '[&_p]:my-1.5',
            '[&_hr]:my-3 [&_hr]:border-border',
            "before:text-muted-foreground/70 before:content-[attr(data-placeholder)]",
            'before:absolute before:px-4 before:py-3 before:pointer-events-none',
            'before:hidden rte-empty:before:flex',
            '[&_span[data-variable]]:rounded [&_span[data-variable]]:bg-muted [&_span[data-variable]]:px-1 [&_span[data-variable]]:py-0.5 [&_span[data-variable]]:font-mono [&_span[data-variable]]:text-xs [&_span[data-variable]]:text-foreground'
          )}
          // Inline style to show/hide placeholder based on emptiness.
          // We add the .rte-empty class via a tiny JS listener below.
        />
      </div>

      {/* Tiny style tag — keeps the placeholder behavior self-contained. */}
      <style>{`
        .rte-content:not(:empty):before { content: '' !important; display: none !important; }
      `}</style>

      <EmptyTracker editorRef={editorRef} />
    </div>
  )
}

/**
 * Tracks whether the contentEditable is empty and toggles the `rte-empty`
 * class so the placeholder shows/hides correctly. Uses a MutationObserver
 * because React's onInput doesn't fire for some programmatic edits.
 */
function EmptyTracker({
  editorRef,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>
}) {
  React.useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const update = () => {
      const isEmpty =
        el.innerHTML === '' ||
        el.innerHTML === '<br>' ||
        el.textContent?.trim() === ''
      el.classList.toggle('rte-empty', isEmpty)
    }
    update()
    const obs = new MutationObserver(update)
    obs.observe(el, { childList: true, characterData: true, subtree: true })
    return () => obs.disconnect()
  }, [editorRef])
  return null
}

function Sep() {
  return <Separator orientation="vertical" className="mx-1 h-6" />
}

/** Build an HTML table string of the given dimensions. */
function buildTable(rows: number, cols: number): string {
  let html = '<table><thead><tr>'
  for (let c = 0; c < cols; c++) {
    html += `<th>Header ${c + 1}</th>`
  }
  html += '</tr></thead><tbody>'
  for (let r = 0; r < rows; r++) {
    html += '<tr>'
    for (let c = 0; c < cols; c++) {
      html += '<td>&nbsp;</td>'
    }
    html += '</tr>'
  }
  html += '</tbody></table><p></p>'
  return html
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}

export default RichTextEditor
