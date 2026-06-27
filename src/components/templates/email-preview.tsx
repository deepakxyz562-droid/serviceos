'use client'

/**
 * EmailPreview
 * ------------
 * Renders an email HTML body in an isolated iframe so the email's own styles
 * cannot leak into the host app (and vice versa). Supports three device widths
 * (desktop / tablet / mobile) and an email-client-style header showing the
 * sender and subject.
 *
 * The iframe auto-heights to its content (with a sane minimum/maximum).
 */

import * as React from 'react'
import { Monitor, Tablet, Smartphone, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type EmailPreviewDevice = 'desktop' | 'tablet' | 'mobile'

export interface EmailPreviewProps {
  /** The HTML body of the email. */
  htmlContent: string
  /** Optional subject line shown above the iframe. */
  subject?: string
  /** Optional "From" name shown in the header (defaults to "Your Company"). */
  fromName?: string
  /** Controlled device; if omitted, internal state is used. */
  device?: EmailPreviewDevice
  /** Show the desktop/tablet/mobile toggle at the top. */
  showDeviceToggle?: boolean
  /** Optional className for the outer wrapper. */
  className?: string
}

/** Per-device iframe max widths. */
const DEVICE_WIDTH: Record<EmailPreviewDevice, string> = {
  desktop: 'max-w-2xl',
  tablet: 'max-w-md',
  mobile: 'max-w-[375px]',
}

const DEVICE_LABEL: Record<EmailPreviewDevice, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

const DEVICE_ICON: Record<EmailPreviewDevice, LucideIcon> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
}

export function EmailPreview({
  htmlContent,
  subject,
  fromName = 'Your Company',
  device: deviceProp,
  showDeviceToggle = false,
  className,
}: EmailPreviewProps) {
  const [internalDevice, setInternalDevice] =
    React.useState<EmailPreviewDevice>('desktop')
  const device = deviceProp ?? internalDevice

  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = React.useState<number>(500)

  const handleLoad = React.useCallback(() => {
    try {
      const doc = iframeRef.current?.contentWindow?.document
      const h = doc?.body?.scrollHeight
      if (h && h > 0) {
        setHeight(Math.min(Math.max(h + 40, 200), 1200))
      }
    } catch {
      // Cross-origin or not-yet-ready; keep current height.
    }
  }, [])

  // Re-measure whenever content or device changes (the iframe reloads via key).
  React.useEffect(() => {
    handleLoad()
  }, [handleLoad, htmlContent, device])

  // Wrap the user's HTML in a full document with sensible defaults so
  // standalone snippets also render correctly inside the iframe.
  const srcDoc = React.useMemo(
    () => buildIframeDoc(htmlContent),
    [htmlContent]
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-background shadow-sm',
        className
      )}
      role="region"
      aria-label="Email preview"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">
            From: <span className="font-medium text-foreground">{fromName}</span>
          </div>
          {subject && (
            <div className="truncate text-sm font-medium text-foreground">
              {subject}
            </div>
          )}
        </div>

        {showDeviceToggle && !deviceProp && (
          <div
            role="radiogroup"
            aria-label="Preview device"
            className="inline-flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
          >
            {(Object.keys(DEVICE_LABEL) as EmailPreviewDevice[]).map((d) => {
              const Icon = DEVICE_ICON[d]
              const active = device === d
              return (
                <Tooltip key={d}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={DEVICE_LABEL[d]}
                      variant={active ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setInternalDevice(d)}
                    >
                      <Icon className="size-4" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {DEVICE_LABEL[d]}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}
      </div>

      {/* Iframe stage */}
      <div className="flex justify-center bg-muted/30 p-4">
        <div
          className={cn(
            'w-full overflow-hidden rounded-md border bg-white shadow-sm transition-[max-width] duration-200',
            DEVICE_WIDTH[device]
          )}
        >
          <iframe
            // Keyed by device so the iframe reloads cleanly when switching.
            key={device}
            ref={iframeRef}
            title="Email preview"
            srcDoc={srcDoc}
            onLoad={handleLoad}
            sandbox="allow-same-origin"
            className="block w-full border-0 bg-white"
            style={{ height: `${height}px` }}
            aria-label="Rendered email content"
          />
        </div>
      </div>
    </div>
  )
}

/** Build a complete HTML document wrapping the user's email HTML. */
function buildIframeDoc(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" />
  <style>
    /* Reset so email HTML renders consistently. */
    html, body { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      word-wrap: break-word;
    }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; border-collapse: collapse; }
    a { color: #0d9488; }
    /* Many email clients use these inline-friendly fallbacks. */
    .body { padding: 16px; }
  </style>
</head>
<body>
${body || '<p style="color:#6b7280;padding:16px;">No content</p>'}
</body>
</html>`
}

export default EmailPreview
