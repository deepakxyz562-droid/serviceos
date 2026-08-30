'use client';

/**
 * CheckSquare — small wrapper around the shadcn Checkbox so it can be used as
 * a drop-in lucide-style icon in the FIELD_TYPES catalog.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import { Checkbox } from '@/components/ui/checkbox';

export function CheckSquare({ className }: { className?: string }) {
  return <Checkbox className={className} />;
}
