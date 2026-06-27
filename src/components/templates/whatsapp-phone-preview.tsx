'use client'

/**
 * WhatsAppPhonePreview
 * --------------------
 * Realistic WhatsApp message preview rendered inside a phone frame.
 *
 * Supports two device styles:
 *   - "android"  — light beige chat (#e5ddd5), white received bubble, gray top bar.
 *   - "iphone"   — dark chat (#0b141a), dark bubble (#202c33), dark top bar, notch.
 *
 * The bubble shows an optional header (text / image / document / video), the
 * body text (with {{variables}} highlighted in a different color), an optional
 * footer, a timestamp, and a list of full-width tappable buttons below the
 * bubble. A non-functional input bar lives at the bottom of the phone for
 * visual realism.
 *
 * The phone frame itself is pure divs + Tailwind (no shadcn primitives).
 */

import * as React from 'react'
import {
  Phone,
  ExternalLink,
  Copy,
  Send,
  CheckCheck,
  FileText,
  Video,
  ImageIcon,
  MoreVertical,
  ChevronLeft,
  Camera,
  Mic,
  Plus,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

export type WhatsAppTemplateType = 'text' | 'image' | 'document' | 'video'

export type WhatsAppButtonType =
  | 'quick_reply'
  | 'call'
  | 'website'
  | 'copy_coupon'

export interface WhatsAppButton {
  type: WhatsAppButtonType
  text: string
  /** Optional payload (URL, phone, coupon code) depending on the type. */
  value?: string
}

export interface WhatsAppPhonePreviewProps {
  templateType: WhatsAppTemplateType
  headerText?: string
  headerMediaUrl?: string
  /** Body text — may contain {{variables}}; they render in a slightly different color. */
  content: string
  footerText?: string
  buttons?: WhatsAppButton[]
  /** Controlled device; if omitted, internal state is used. */
  device?: 'android' | 'iphone'
  /** Show Android/iPhone toggle at the top. */
  showDeviceToggle?: boolean
  /** Optional className for the outer wrapper. */
  className?: string
}

/** WhatsApp brand green. */
const WA_GREEN = '#25D366'

export function WhatsAppPhonePreview({
  templateType,
  headerText,
  headerMediaUrl,
  content,
  footerText,
  buttons = [],
  device: deviceProp,
  showDeviceToggle = false,
  className,
}: WhatsAppPhonePreviewProps) {
  const [internalDevice, setInternalDevice] = React.useState<'android' | 'iphone'>(
    'android'
  )
  const device = deviceProp ?? internalDevice
  const isIphone = device === 'iphone'

  return (
    <div
      className={cn('flex flex-col items-center gap-3', className)}
      role="region"
      aria-label={`WhatsApp preview — ${device}`}
    >
      {showDeviceToggle && !deviceProp && (
        <DeviceToggle value={device} onChange={setInternalDevice} />
      )}

      {/* Phone frame */}
      <div
        className={cn(
          'relative w-[320px] overflow-hidden rounded-[2.5rem] border-[6px] shadow-2xl',
          isIphone
            ? 'border-neutral-900 bg-neutral-900'
            : 'border-neutral-800 bg-neutral-800'
        )}
        style={{ height: 600 }}
      >
        {/* Notch (iPhone only) */}
        {isIphone && (
          <div className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-neutral-900" />
        )}

        {/* Screen */}
        <div
          className="relative flex h-full w-full flex-col"
          style={{
            backgroundColor: isIphone ? '#0b141a' : '#e5ddd5',
          }}
        >
          {/* Top bar */}
          <header
            className={cn(
              'flex h-12 shrink-0 items-center gap-2 px-2 shadow-sm',
              isIphone ? 'bg-[#202c33]' : 'bg-[#075e54]/95'
            )}
          >
            <ChevronLeft className="size-4 text-white/80" aria-hidden />
            <div
              className="flex size-8 items-center justify-center rounded-full"
              style={{ backgroundColor: WA_GREEN }}
              aria-hidden
            >
              <WhatsAppGlyph className="size-5 text-white" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-white">
                Business Account
              </span>
              <span className="truncate text-[10px] text-white/60">
                online
              </span>
            </div>
            <MoreVertical className="size-4 text-white/80" aria-hidden />
          </header>

          {/* Chat area */}
          <div className="relative flex-1 overflow-y-auto px-3 py-3">
            {/* Subtle pattern overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              aria-hidden
              style={{
                backgroundImage:
                  'radial-gradient(circle at 25% 25%, currentColor 1px, transparent 1px), radial-gradient(circle at 75% 75%, currentColor 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                color: isIphone ? '#ffffff' : '#000000',
              }}
            />

            <div className="relative flex flex-col gap-1">
              {/* Received bubble */}
              <div className="flex">
                <MessageBubble
                  templateType={templateType}
                  headerText={headerText}
                  headerMediaUrl={headerMediaUrl}
                  content={content}
                  footerText={footerText}
                  isIphone={isIphone}
                />
              </div>

              {/* Buttons (below the bubble, full-width rows) */}
              {buttons.length > 0 && (
                <ButtonList buttons={buttons} isIphone={isIphone} />
              )}
            </div>
          </div>

          {/* Input bar */}
          <InputBar isIphone={isIphone} />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Bubble                                                                     */
/* -------------------------------------------------------------------------- */

interface MessageBubbleProps {
  templateType: WhatsAppTemplateType
  headerText?: string
  headerMediaUrl?: string
  content: string
  footerText?: string
  isIphone: boolean
}

function MessageBubble({
  templateType,
  headerText,
  headerMediaUrl,
  content,
  footerText,
  isIphone,
}: MessageBubbleProps) {
  const bubbleBg = isIphone ? '#202c33' : '#ffffff'
  const bubbleText = isIphone ? '#e9edef' : '#111b21'

  return (
    <div
      className="relative max-w-[88%] rounded-lg rounded-tl-none px-2 py-1.5 shadow-sm"
      style={{ backgroundColor: bubbleBg, color: bubbleText }}
    >
      {/* Header media */}
      {templateType === 'image' && (
        <HeaderImage url={headerMediaUrl} isIphone={isIphone} />
      )}
      {templateType === 'document' && (
        <HeaderDocument url={headerMediaUrl} isIphone={isIphone} />
      )}
      {templateType === 'video' && (
        <HeaderVideo url={headerMediaUrl} isIphone={isIphone} />
      )}

      {/* Header text (bold) */}
      {headerText && (
        <div className="mb-1 text-sm font-bold leading-snug">{headerText}</div>
      )}

      {/* Body */}
      <div className="whitespace-pre-wrap break-words text-[13px] leading-snug">
        <RichBody text={content} isIphone={isIphone} />
      </div>

      {/* Footer */}
      {footerText && (
        <div className="mt-1 text-[11px] text-[#667781]">{footerText}</div>
      )}

      {/* Timestamp + ticks */}
      <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
        <span>{formatNow()}</span>
        <CheckCheck className="size-3.5" style={{ color: '#53bdeb' }} aria-label="Read" />
      </div>
    </div>
  )
}

/** Render the body text, highlighting {{variables}} in a teal accent. */
function RichBody({ text, isIphone }: { text: string; isIphone: boolean }) {
  if (!text) return null
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return (
    <>
      {parts.map((part, i) => {
        const isVar = /^\{\{[^}]+\}\}$/.test(part)
        if (!isVar) return <span key={i}>{part}</span>
        return (
          <span
            key={i}
            className="rounded px-0.5 font-mono"
            style={{
              color: isIphone ? '#7dd3a3' : '#0d9488',
              backgroundColor: isIphone ? 'rgba(125,211,163,0.12)' : 'rgba(13,148,136,0.10)',
            }}
          >
            {part}
          </span>
        )
      })}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Header media                                                               */
/* -------------------------------------------------------------------------- */

function HeaderImage({
  url,
  isIphone,
}: {
  url?: string
  isIphone: boolean
}) {
  if (url) {
    return (
      <div className="mb-1.5 overflow-hidden rounded-md">
        <img
          src={url}
          alt="Template header"
          className="block max-h-40 w-full object-cover"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>
    )
  }
  return (
    <div
      className="mb-1.5 flex h-32 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[11px]"
      style={{
        borderColor: isIphone ? '#374249' : '#e5e5e5',
        color: '#667781',
      }}
    >
      <ImageIcon className="size-6" aria-hidden />
      <span>Image not set</span>
    </div>
  )
}

function HeaderDocument({
  url,
  isIphone,
}: {
  url?: string
  isIphone: boolean
}) {
  const filename = url ? url.split('/').pop() || 'document.pdf' : 'document.pdf'
  return (
    <div
      className="mb-1.5 flex items-center gap-2 rounded-md p-2"
      style={{
        backgroundColor: isIphone ? 'rgba(255,255,255,0.04)' : '#f1f3f4',
      }}
    >
      <div
        className="flex size-9 items-center justify-center rounded-md text-white"
        style={{ backgroundColor: '#ea580c' }}
      >
        <FileText className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{filename}</div>
        <div className="text-[10px] text-[#667781]">PDF document</div>
      </div>
    </div>
  )
}

function HeaderVideo({
  url,
  isIphone,
}: {
  url?: string
  isIphone: boolean
}) {
  return (
    <div
      className="relative mb-1.5 flex h-32 items-center justify-center overflow-hidden rounded-md"
      style={{
        backgroundColor: isIphone ? '#0b141a' : '#111b21',
      }}
    >
      <div className="flex flex-col items-center gap-1 text-white/70">
        <Video className="size-8" aria-hidden />
        <span className="text-[10px]">{url ? 'Tap to play' : 'Video not set'}</span>
      </div>
      {url && (
        <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 text-[9px] text-white">
          0:30
        </div>
      )}
      {/* Suppress unused-variable warning when isIphone isn't read in this render path */}
      <span className="sr-only">{isIphone ? 'dark' : 'light'}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

function ButtonList({
  buttons,
  isIphone,
}: {
  buttons: WhatsAppButton[]
  isIphone: boolean
}) {
  return (
    <div
      className="mt-1 max-w-[88%] overflow-hidden rounded-lg shadow-sm"
      style={{ backgroundColor: isIphone ? '#202c33' : '#ffffff' }}
    >
      {buttons.map((btn, i) => (
        <div key={i}>
          {i > 0 && (
            <div
              className="h-px w-full"
              style={{ backgroundColor: isIphone ? '#374249' : '#e5e5e5' }}
            />
          )}
          <ButtonRow button={btn} />
        </div>
      ))}
    </div>
  )
}

function ButtonRow({ button }: { button: WhatsAppButton }) {
  const Icon: LucideIcon | null =
    button.type === 'call'
      ? Phone
      : button.type === 'website'
      ? ExternalLink
      : button.type === 'copy_coupon'
      ? Copy
      : null

  return (
    <div
      className="flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-[13px] font-medium"
      style={{ color: WA_GREEN }}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      <span className="truncate">{button.text}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Input bar                                                                  */
/* -------------------------------------------------------------------------- */

function InputBar({ isIphone }: { isIphone: boolean }) {
  const inputBg = isIphone ? '#202c33' : '#ffffff'
  const placeholder = isIphone ? 'rgba(233,237,239,0.5)' : '#8696a0'
  return (
    <div
      className="flex h-12 shrink-0 items-center gap-2 px-2 py-1.5"
      style={{ backgroundColor: isIphone ? '#0b141a' : '#f0f0f0' }}
    >
      <Plus className="size-5 shrink-0 text-[#8696a0]" aria-hidden />
      <div
        className="flex flex-1 items-center rounded-full px-3 py-1.5"
        style={{ backgroundColor: inputBg }}
      >
        <span
          className="flex-1 text-xs"
          style={{ color: placeholder }}
        >
          Message
        </span>
        <Camera className="size-4 text-[#8696a0]" aria-hidden />
      </div>
      <Mic className="size-5 shrink-0 text-[#8696a0]" aria-hidden />
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: WA_GREEN }}
        aria-hidden
      >
        <Send className="size-4" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Device toggle                                                              */
/* -------------------------------------------------------------------------- */

function DeviceToggle({
  value,
  onChange,
}: {
  value: 'android' | 'iphone'
  onChange: (v: 'android' | 'iphone') => void
}) {
  const base =
    'px-3 py-1 text-xs font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <div
      role="radiogroup"
      aria-label="Preview device"
      className="inline-flex items-center gap-1 rounded-md border bg-background p-0.5"
    >
      {(['android', 'iphone'] as const).map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={value === d}
          onClick={() => onChange(d)}
          className={cn(
            base,
            value === d
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          {d === 'android' ? 'Android' : 'iPhone'}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Render a simple WhatsApp glyph (speech bubble with phone). */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function formatNow(): string {
  const d = new Date()
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

export default WhatsAppPhonePreview
