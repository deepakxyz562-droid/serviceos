/**
 * GooglePlayBadge — styled CSS badge linking to the Fieseros mobile app on
 * Google Play.
 *
 * No image asset required — the badge is rendered with Tailwind + an inline
 * SVG of the Google Play triangle logo. Matches the official "GET IT ON
 * Google Play" badge design language (dark background, white text, colored
 * triangle).
 *
 * The badge links to https://play.google.com/store/apps/details?id=com.fieseros.app
 * — the app serves BOTH employees (technicians) and customers; role routing
 * happens at first launch, so a single badge is sufficient.
 *
 * Usage:
 *   <GooglePlayBadge />                  // standard size
 *   <GooglePlayBadge size="sm" />        // compact (footer)
 *   <GooglePlayBadge className="..." />  // custom wrapper styles
 */

interface GooglePlayBadgeProps {
  /** Size variant. "md" = standard (hero/landing), "sm" = compact (footer). */
  size?: 'sm' | 'md';
  /** Optional extra classes on the <a> wrapper. */
  className?: string;
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fieseros.app';

export function GooglePlayBadge({ size = 'md', className }: GooglePlayBadgeProps) {
  const isSmall = size === 'sm';
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get the Fieseros app on Google Play"
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-lg bg-black hover:bg-neutral-900 border border-white/10 px-3 transition-all hover:scale-[1.02] hover:shadow-lg',
        isSmall ? 'py-1.5' : 'py-2.5 px-4',
        className,
      )}
    >
      {/* Google Play triangle logo (inline SVG — no image asset needed) */}
      <svg
        viewBox="0 0 512 512"
        className={isSmall ? 'h-4 w-4' : 'h-6 w-6'}
        aria-hidden="true"
      >
        <path fill="#00D3FF" d="M48 32.5C38.6 38.2 32 48.6 32 61v390c0 12.4 6.6 22.8 16 28.5l247-219.5L48 32.5z" />
        <path fill="#00EE6F" d="M351.5 263.7l-81.5-72.5L48 495.5c3.6 2.1 7.7 3.5 12 3.5 3.7 0 7.2-1 10.4-2.7l281.1-158.1-0.0-74.5z" />
        <path fill="#FFCE00" d="M462 231.4l-110.5-62.7-81.5 72.5 81.5 72.5 110.5-62.7c12-6.8 12-25.1 0-29.6z" />
        <path fill="#FF3A44" d="M60.4 18.2C57.2 16.5 53.7 15.5 50 15.5c-4.3 0-8.4 1.4-12 3.5l222 222 81.5-72.5L60.4 18.2z" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={cn('text-white/70 font-normal', isSmall ? 'text-[8px]' : 'text-[10px]')}>
          GET IT ON
        </span>
        <span className={cn('text-white font-semibold', isSmall ? 'text-xs' : 'text-base')}>
          Google Play
        </span>
      </span>
    </a>
  );
}

// Local cn import to avoid a circular dependency when this component is
// imported into landing-solutions.tsx (which already imports cn itself).
import { cn } from '@/lib/utils';
