'use client';

/**
 * TimelineTab — wraps the shared `<TimelineSection>` for a single customer.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 * This is the thinnest tab in the view (originally ~17 lines) — it just
 * passes the selected customer id to the shared component and renders an
 * empty state when no customer is selected.
 */

import { Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimelineSection } from '@/components/customer/timeline-section';

interface TimelineTabProps {
  customerId?: string;
}

export function TimelineTab({ customerId }: TimelineTabProps) {
  return (
    <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
      <div className="p-5">
        {customerId ? (
          <TimelineSection customerId={customerId} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="size-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a customer to view their unified timeline.
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
