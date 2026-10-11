/**
 * cn — className merge utility (tiny clsx + tailwind-merge substitute)
 * Joins class names and filters falsy values.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
