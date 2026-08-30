'use client';

/**
 * DealDetailSheet — Phase 5C extraction from sales-pipeline-view.tsx.
 *
 * The "Opportunity Brief" slide-out Sheet shown when the user clicks a deal
 * card. Renders:
 *   - Header (title + customer name + stage badge)
 *   - Quick stats grid (value / probability / created / days-in-stage)
 *   - Tabs (Details / Activity / Tasks / Notes)
 *     - Details: assignee, expected close, closed/loss info, contact card,
 *       converted/archived/job-cancelled banners, action buttons
 *       (Edit / View Lead / Convert to Job / Archive / Delete)
 *     - Activity: stage-history timeline
 *     - Tasks: TasksTab
 *     - Notes: NotesTab
 *   - Footer: "Move to" Select + "Mark as Lost" button
 *
 * Pure presentational — all state (selectedDeal, panelTab, loading) and
 * all mutations (move stage, mark lost, delete, archive, edit, convert)
 * live in the parent sales-pipeline-view. Bound helper functions
 * (`formatMoneyFn`, `assigneeNameFn`, `isWonDealFn`, etc.) are passed in
 * so this file doesn't need to know about the parent's currency hook or
 * stage-key memos.
 *
 * Extracted from src/components/views/sales-pipeline-view.tsx (Phase 5C).
 */

import { type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import {
  User, Phone, Mail, Calendar, Clock, History, Pencil, Trash2,
  Briefcase as JobIcon, ArrowRight, XCircle, AlertCircle,
  Archive, ArchiveRestore, Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ViewType } from '@/types/workflow';
import type {
  Assignee, Deal, DropAction, PipelineStage,
} from '@/features/pipeline/types';
import { NotesTab } from '@/features/pipeline/components/notes-tab';
import { TasksTab } from '@/features/pipeline/components/tasks-tab';

export interface DealDetailSheetProps {
  selectedDeal: Deal | null;
  onOpenChange: (open: boolean) => void;
  panelTab: string;
  onPanelTabChange: (tab: string) => void;
  loadingDetail: boolean;
  // Bound helpers (parent owns the underlying state)
  stageLabel: (key: string) => string;
  stageByKey: (key: string) => PipelineStage | undefined;
  formatMoneyFn: (amount: number, sourceCurrency?: string) => string;
  assigneeNameFn: (deal: Deal) => string;
  daysInCurrentStageFn: (deal: Deal) => number;
  isConvertedFn: (deal: Deal | null) => boolean;
  isWonDealFn: (deal: Deal) => boolean;
  isLostDealFn: (deal: Deal) => boolean;
  isClosedDealFn: (deal: Deal) => boolean;
  // Stage keys / lists
  wonStageKey: string;
  lostStageKey: string;
  activeStages: PipelineStage[];
  closedStages: PipelineStage[];
  assignees: Assignee[];
  saving: boolean;
  // Event handlers
  onOpenEditDialog: (deal: Deal) => void;
  onSetDealToDelete: (deal: Deal) => void;
  onSetDealToConvert: (deal: Deal) => void;
  onSetCurrentView: (view: ViewType) => void;
  onAddNote: (text: string) => void;
  onDeleteNote: (createdAt: string) => void;
  onMoveStage: (dealId: string, newStage: string) => Promise<void>;
  onSetMarkLostDeal: (deal: Deal) => void;
  onSetLostReason: (reason: string) => void;
  onSetLostNotes: (notes: string) => void;
  onSetDropAction: (action: DropAction) => void;
  onArchiveToggle: (deal: Deal) => Promise<void>;
  onTaskCountChange: (openCount: number) => void;
}

export function DealDetailSheet({
  selectedDeal,
  onOpenChange,
  panelTab,
  onPanelTabChange,
  loadingDetail,
  stageLabel,
  stageByKey,
  formatMoneyFn,
  assigneeNameFn,
  daysInCurrentStageFn,
  isConvertedFn,
  isWonDealFn,
  isLostDealFn,
  isClosedDealFn,
  wonStageKey,
  lostStageKey,
  activeStages,
  closedStages,
  assignees,
  saving,
  onOpenEditDialog,
  onSetDealToDelete,
  onSetDealToConvert,
  onSetCurrentView,
  onAddNote,
  onDeleteNote,
  onMoveStage,
  onSetMarkLostDeal,
  onSetLostReason,
  onSetLostNotes,
  onSetDropAction,
  onArchiveToggle,
  onTaskCountChange,
}: DealDetailSheetProps) {
  return (
    <Sheet open={!!selectedDeal} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[40vw] sm:max-w-none p-0 flex flex-col"
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-base line-clamp-2 pr-6">
            {selectedDeal?.title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Deal details panel
          </SheetDescription>
          {selectedDeal && (
            <div className="flex items-center gap-2 mt-1">
              <User className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {selectedDeal.lead?.name || selectedDeal.customerName || '—'}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1.5 ml-1"
                style={
                  stageByKey(selectedDeal.stage)?.color
                    ? {
                        borderColor: stageByKey(selectedDeal.stage)!.color!,
                        color: stageByKey(selectedDeal.stage)!.color!,
                      }
                    : undefined
                }
              >
                {stageLabel(selectedDeal.stage)}
              </Badge>
            </div>
          )}
        </SheetHeader>

        {selectedDeal && (
          <>
            {/* Quick stats row */}
            <div className="grid grid-cols-2 gap-2 p-4 border-b bg-muted/30">
              <div>
                <p className="text-[10px] text-muted-foreground">Value</p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatMoneyFn(selectedDeal.value, selectedDeal.currency)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Probability</p>
                <p className="text-sm font-medium">{selectedDeal.probability}%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Created</p>
                <p className="text-xs font-medium">
                  {format(parseISO(selectedDeal.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Days in stage</p>
                <p className="text-xs font-medium flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" />
                  {daysInCurrentStageFn(selectedDeal)}d
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs
                value={panelTab}
                onValueChange={onPanelTabChange}
                className="w-full flex-1 flex flex-col overflow-hidden"
              >
                <TabsList className="grid grid-cols-4 w-full rounded-none border-b bg-transparent h-auto p-0">
                  <TabsTrigger value="details" className="text-xs py-2">Details</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs py-2">Activity</TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs py-2">Tasks</TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs py-2">Notes</TabsTrigger>
                </TabsList>

                {/* Details tab */}
                <TabsContent value="details" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2 flex items-center gap-1">
                      <User className="size-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Assignee:</span>{' '}
                      <span className="font-medium">{assigneeNameFn(selectedDeal)}</span>
                    </div>
                    {selectedDeal.expectedCloseDate && (
                      <div className="col-span-2 flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Expected Close:</span>{' '}
                        <span className="font-medium">
                          {format(parseISO(selectedDeal.expectedCloseDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {selectedDeal.closedAt && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Closed:</span>{' '}
                        <span className="font-medium">
                          {format(parseISO(selectedDeal.closedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {selectedDeal.lossReason && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Loss Reason:</span>{' '}
                        <span className="font-medium">{selectedDeal.lossReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Contact section */}
                  <Separator />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Contact</Label>
                      {(selectedDeal.lead?.source || selectedDeal.source) && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
                          {selectedDeal.lead?.source || selectedDeal.source}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {selectedDeal.lead?.name || selectedDeal.customerName || '—'}
                      </span>
                    </div>
                    {(selectedDeal.lead?.phone || selectedDeal.customerPhone) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="size-3.5 text-muted-foreground shrink-0" />
                        <a
                          href={`tel:${selectedDeal.lead?.phone || selectedDeal.customerPhone}`}
                          className="font-medium text-emerald-600 hover:underline"
                        >
                          {selectedDeal.lead?.phone || selectedDeal.customerPhone}
                        </a>
                      </div>
                    )}
                    {(selectedDeal.lead?.email || selectedDeal.customerEmail) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <a
                          href={`mailto:${selectedDeal.lead?.email || selectedDeal.customerEmail}`}
                          className="font-medium text-emerald-600 hover:underline truncate"
                        >
                          {selectedDeal.lead?.email || selectedDeal.customerEmail}
                        </a>
                      </div>
                    )}
                    {selectedDeal.lead && (
                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        Linked to Lead · status: {selectedDeal.lead.status || '—'}
                      </p>
                    )}
                  </div>

                  {isConvertedFn(selectedDeal) && (
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
                      ✓ This deal has been converted to a job.
                    </div>
                  )}

                  {/* ── Pipeline Redesign (Phase 1): Job Cancelled warning ── */}
                  {selectedDeal.jobCancelledAt && (
                    <div className="rounded-md bg-red-50 border border-red-300 p-2.5 text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Job was cancelled</p>
                        <p className="text-[11px] mt-0.5 text-red-600">
                          The job linked to this won deal was cancelled. Review and decide:
                          reopen as Lost, or acknowledge and leave as Won.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Pipeline Redesign (Phase 1): Archived indicator ── */}
                  {selectedDeal.archivedAt && (
                    <div className="rounded-md bg-muted border border-muted-foreground/20 p-2 text-xs text-muted-foreground flex items-center gap-2">
                      <Archive className="size-3.5 shrink-0" />
                      <span>This deal is archived. Unarchive to return it to the active pipeline.</span>
                    </div>
                  )}

                  <Separator />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => onOpenEditDialog(selectedDeal)}>
                      <Pencil className="size-3.5 mr-1" /> Edit
                    </Button>
                    {selectedDeal.leadId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSetCurrentView('leads')}
                        className="gap-2"
                      >
                        <User className="size-4" />
                        View Lead
                      </Button>
                    )}
                    {(isWonDealFn(selectedDeal) || selectedDeal.closedAt) && !isConvertedFn(selectedDeal) && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => onSetDealToConvert(selectedDeal)}
                      >
                        <JobIcon className="size-3.5 mr-1" /> Convert to Job
                      </Button>
                    )}
                    {/* ── Pipeline Redesign (Phase 1): Archive / Unarchive ── */}
                    {isClosedDealFn(selectedDeal) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onArchiveToggle(selectedDeal)}
                      >
                        {selectedDeal.archivedAt ? (
                          <>
                            <ArchiveRestore className="size-3.5 mr-1" /> Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="size-3.5 mr-1" /> Archive
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                      onClick={() => onSetDealToDelete(selectedDeal)}
                    >
                      <Trash2 className="size-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </TabsContent>

                {/* Activity tab */}
                <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 space-y-2 mt-0">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (selectedDeal.stageHistory?.length ?? 0) === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <History className="size-6 mx-auto mb-2 opacity-40" />
                      No activity yet
                    </div>
                  ) : (
                    <ol className="relative border-l border-muted ml-2 space-y-3 pl-4">
                      {selectedDeal.stageHistory?.map((entry) => (
                        <li key={entry.id} className="text-xs">
                          <span className="absolute -left-1.5 mt-1 size-3 rounded-full bg-emerald-500 border-2 border-background" />
                          <div className="font-medium">
                            {entry.fromStage
                              ? `${stageLabel(entry.fromStage)} → ${stageLabel(entry.toStage)}`
                              : `Created as ${stageLabel(entry.toStage)}`}
                          </div>
                          {entry.note && (
                            <div className="text-muted-foreground">{entry.note}</div>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            {format(parseISO(entry.createdAt), 'MMM d, yyyy HH:mm')}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </TabsContent>

                {/* Tasks tab — full task UI (Phase-5) */}
                <TabsContent value="tasks" className="flex-1 overflow-y-auto p-4 mt-0">
                  <TasksTab
                    deal={selectedDeal}
                    assignees={assignees}
                    onTaskCountChange={onTaskCountChange}
                  />
                </TabsContent>

                {/* Notes tab */}
                <TabsContent value="notes" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
                  <NotesTab
                    deal={selectedDeal}
                    onAddNote={onAddNote}
                    onDeleteNote={onDeleteNote}
                    saving={saving}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer: Move to + Mark as Lost */}
            {!isLostDealFn(selectedDeal) && (
              <div className="border-t p-4 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                  <Label className="text-xs text-muted-foreground shrink-0">Move to:</Label>
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (v && v !== selectedDeal.stage) {
                        if (v === lostStageKey) {
                          onSetMarkLostDeal(selectedDeal);
                          onSetLostReason('');
                          onSetLostNotes('');
                        } else if (v === wonStageKey) {
                          onSetDropAction({ deal: selectedDeal, newStageKey: v });
                        } else {
                          onMoveStage(selectedDeal.id, v);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...activeStages, ...closedStages].map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.key}
                          disabled={s.key === selectedDeal.stage}
                        >
                          {s.label}
                          {s.key === selectedDeal.stage && ' (current)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isWonDealFn(selectedDeal) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => {
                      onSetMarkLostDeal(selectedDeal);
                      onSetLostReason('');
                      onSetLostNotes('');
                    }}
                  >
                    <XCircle className="size-3.5 mr-1.5" /> Mark as Lost
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
