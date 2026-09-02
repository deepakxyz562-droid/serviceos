'use client';

/**
 * DispatchInspectorDrawer — Slide-over Inspector Overlay
 * --------------------------------------------------------
 * Opens on demand when a technician or job is inspected without
 * permanently consuming desktop map screen real estate.
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  InspectorTechnician,
  InspectorJob,
} from './inspector-panel';
import type { Employee, Job, CandidateScore } from '../types';

export interface DispatchInspectorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectTarget: { type: 'technician'; data: Employee } | { type: 'job'; data: Job } | null;
  activeJobsByEmployee: Map<string, Job[]>;
  smartMatchCandidates: CandidateScore[];
  isSearchingSmartMatch: boolean;
  onRecenterOnTech: (techId: string) => void;
  onViewJob: (job: Job) => void;
  onViewTech: (tech: Employee) => void;
  onRefreshMarkers: () => void;
  onAssignTech: (jobId: string, tech: Employee) => void;
  onStartJob: (job: Job) => void;
}

export function DispatchInspectorDrawer({
  open,
  onOpenChange,
  inspectTarget,
  activeJobsByEmployee,
  smartMatchCandidates,
  isSearchingSmartMatch,
  onRecenterOnTech,
  onViewJob,
  onViewTech,
  onRefreshMarkers,
  onAssignTech,
  onStartJob,
}: DispatchInspectorDrawerProps) {
  if (!inspectTarget) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border shadow-xl">
        <SheetHeader className="px-4 py-3 border-b border-border bg-muted/20">
          <SheetTitle className="text-sm font-bold text-foreground">
            {inspectTarget.type === 'technician' ? 'Technician Details' : 'Job Details'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0">
          {inspectTarget.type === 'technician' ? (
            <InspectorTechnician
              employee={inspectTarget.data}
              activeJobs={activeJobsByEmployee.get(inspectTarget.data.id) || []}
              onRecenterOnTech={onRecenterOnTech}
              onViewJob={onViewJob}
              onDeselect={() => onOpenChange(false)}
              onRefreshMarkers={onRefreshMarkers}
            />
          ) : (
            <InspectorJob
              job={inspectTarget.data}
              smartMatchCandidates={smartMatchCandidates}
              isSearchingSmartMatch={isSearchingSmartMatch}
              onAssignTech={onAssignTech}
              onStartJob={onStartJob}
              onViewTech={onViewTech}
              onDeselect={() => onOpenChange(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
