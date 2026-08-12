/**
 * BrandMark — the Fieseros logo mark, rendered from the canonical uploaded PNG.
 *
 * Uses /brand-icon.png (the user-uploaded squircle icon) for pixel-perfect
 * fidelity to the approved brand design. The wordmark "Fieseros" is rendered
 * as crisp browser text (theme-aware) so it stays sharp on every screen.
 *
 * Used in: landing header/footer, marketplace header/footer, CRM sidebar,
 * employee portal sidebar, auth pages.
 *
 * @example <BrandMark size={32} />                      // mark only
 * @example <BrandLogo size={32} />                      // mark + "Fieseros"
 * @example <BrandLogo size={32} textVariant="light" />  // white text (dark bg)
 */
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface BrandMarkProps {
  /** Pixel size for both width & height. Default 32. */
  size?: number;
  className?: string;
  /** Alt text for screen readers. */
  alt?: string;
  /** Disable Next.js Image optimization (use plain img). Default false. */
  unoptimized?: boolean;
}

export function BrandMark({
  size = 32,
  className,
  alt = 'Fieseros',
  unoptimized = false,
}: BrandMarkProps) {
  return (
    <Image
      src="/brand-icon.png"
      alt={alt}
      width={size}
      height={size}
      unoptimized={unoptimized}
      priority={false}
      className={cn('shrink-0 rounded-[22%] shadow-sm', className)}
      style={{ width: size, height: size }}
    />
  );
}

export interface BrandLogoProps {
  size?: number;
  className?: string;
  textClassName?: string;
  /** "default" = dark text (light bg) · "light" = white text (dark bg) */
  textVariant?: 'default' | 'light';
  showWord?: boolean;
  /** Font size scale for the wordmark. Default = size * 0.6. */
  textScale?: number;
}

export function BrandLogo({
  size = 32,
  className,
  textClassName,
  textVariant = 'default',
  showWord = true,
  textScale,
}: BrandLogoProps) {
  const fontSize = textScale ?? size * 0.6;
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark size={size} />
      {showWord && (
        <span
          className={cn(
            'font-bold tracking-tight leading-none',
            textVariant === 'light' ? 'text-background' : 'text-foreground',
            textClassName
          )}
          style={{ fontSize }}
        >
          Fieseros
        </span>
      )}
    </span>
  );
}

export default BrandMark;
