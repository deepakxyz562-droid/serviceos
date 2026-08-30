'use client';

/**
 * ConversationDetailPanel — Phase 6D extraction from omnichannel-view.tsx.
 *
 * Replaces the inline right-pane "Details Panel" closure that lived inside
 * the parent OmnichannelView component. This is the right column of the
 * omnichannel inbox — a customer-context sidebar that opens when a
 * conversation is selected. Renders:
 *
 *   1. Customer Info Card — channel-brand gradient cover banner, avatar,
 *      name, phone, email, status badge, assignee row + quick toggle button.
 *   2. Lead Details Card — name, status, source, value, created-at (only
 *      shown when the conversation has an attached lead).
 *   3. Stats Grid — Reviews / Jobs / Contacts counts (loaded from the
 *      customer-context API).
 *   4. Survey Results accordion — list of customer reviews (5-star rating,
 *      comment, source, date).
 *   5. Case History accordion — list of past jobs (title, status, job
 *      number, date, quoted amount).
 *   6. Channel Info Card — channel badge + auto-lead-created indicator.
 *   7. Quick Actions Card — placeholder for action shortcuts.
 *
 * Pure presentational — all state and handlers live in the parent
 * OmnichannelView and are threaded through as props. Same JSX, same handler
 * wiring — moved to its own file so omnichannel-view.tsx shrinks by ~315
 * lines.
 *
 * Extracted from src/components/views/omnichannel-view.tsx (Phase 6D refactor).
 */

import type { MouseEvent } from 'react';
import {
  Phone, Globe, UserCheck, Sparkles, Star, Briefcase,
  Contact as ContactIcon, ChevronRight, MessageSquare, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  ChannelBadge,
  getChannelMeta,
  getInitials,
} from '@/features/omnichannel/utils/omnichannel-helpers';
import type {
  Conversation,
  CustomerContext,
} from '@/features/omnichannel/types';

// ─── Props contract ──────────────────────────────────────────────────────────

export interface ConversationDetailPanelProps {
  /** The currently-selected conversation (parent has already checked non-null). */
  conversation: Conversation;
  /** Customer context (stats + reviews + jobs) loaded from the API. */
  customerContext: CustomerContext | null;
  /** True while the customer-context API request is in-flight. */
  contextLoading: boolean;
  /** Whether the "Survey Results" (reviews) accordion is expanded. */
  showSurveyResults: boolean;
  /** Toggle the "Survey Results" accordion. */
  onShowSurveyResultsChange: (open: boolean) => void;
  /** Whether the "Case History" (jobs) accordion is expanded. */
  showCaseHistory: boolean;
  /** Toggle the "Case History" accordion. */
  onShowCaseHistoryChange: (open: boolean) => void;
  /**
   * Toggle the conversation's assignee. The parent owns the optimistic
   * update + API call; this component just forwards the click.
   */
  onToggleAssign: (conv: Conversation, e: MouseEvent) => void;
  /** ID of the conversation currently being assigned/unassigned (disables
   *  the toggle button while the request is in-flight). */
  assignBusy: string | null;
}

/**
 * Right-pane customer-context panel for the omnichannel inbox. Pure
 * presentational — see props above. The parent OmnichannelView owns all
 * state and handlers.
 */
export function ConversationDetailPanel({
  conversation: conv,
  customerContext,
  contextLoading,
  showSurveyResults,
  onShowSurveyResultsChange,
  showCaseHistory,
  onShowCaseHistoryChange,
  onToggleAssign,
  assignBusy,
}: ConversationDetailPanelProps) {
  const channelMeta = getChannelMeta(conv.channel);

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-4 space-y-4">
        {/* Customer Info Card with cover image */}
        <Card className="shadow-none overflow-hidden">
          {/* Cover banner — gradient using the channel brand color */}
          <div
            className="h-20 relative"
            style={{
              background: `linear-gradient(135deg, ${channelMeta._brandColor}40, ${channelMeta._brandColor}80)`,
            }}
          >
            <div className="absolute top-2 right-2">
              <ChannelBadge channel={conv.channel} compact />
            </div>
          </div>
          <CardHeader className="pb-3 pt-0 px-4 -mt-8">
            <Avatar className="size-16 border-4 border-background">
              <AvatarFallback className="text-lg font-medium bg-slate-100 dark:bg-slate-800">
                {getInitials(conv.customerName)}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-base font-semibold mt-2 truncate">{conv.customerName}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2 overflow-hidden">
            {conv.customerPhone && (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <Phone className="size-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{conv.customerPhone}</span>
              </div>
            )}
            {conv.customerEmail && (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <Globe className="size-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{conv.customerEmail}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className={cn(
                'text-xs',
                conv.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                conv.status === 'closed' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              )}>
                {conv.status}
              </Badge>
            </div>
            {/* Assignee row — shows who is handling this conversation.
                Includes a quick toggle button to assign/unassign. */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Assignee:</span>
              {conv.assigneeId ? (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                  <UserCheck className="size-3 mr-1" />
                  {conv.assigneeName || 'Assigned'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                  Unassigned
                </Badge>
              )}
              <button
                type="button"
                onClick={(e) => onToggleAssign(conv, e)}
                disabled={assignBusy === conv.id}
                className="ml-auto text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium disabled:opacity-50"
              >
                {conv.assigneeId ? 'Unassign' : 'Assign to me'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Lead Details Card */}
        {conv.lead && (
          <Card className="shadow-none border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-emerald-500" />
                Lead Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{conv.lead.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    {conv.lead.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <Badge variant="outline" className="text-xs">
                    {conv.lead.source}
                  </Badge>
                </div>
              </div>
              {conv.lead.value !== undefined && conv.lead.value > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="text-sm font-semibold">₹{conv.lead.value.toLocaleString('en-IN')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-xs">{new Date(conv.lead.createdAt).toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Stats Grid (Reviews / Jobs / Contacts) ──
            Reference design maps social stats (Tweets/Followers/
            Following) to our CRM data: Reviews, Jobs, Contacts. */}
        <Card className="shadow-none">
          <CardContent className="px-4 py-3">
            {contextLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <Star className="size-3.5 text-amber-500 mb-0.5" />
                  <span className="text-lg font-bold text-foreground">
                    {customerContext?.stats.reviews ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Reviews</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 py-1 border-x">
                  <Briefcase className="size-3.5 text-emerald-500 mb-0.5" />
                  <span className="text-lg font-bold text-foreground">
                    {customerContext?.stats.jobs ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Jobs</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <ContactIcon className="size-3.5 text-sky-500 mb-0.5" />
                  <span className="text-lg font-bold text-foreground">
                    {customerContext?.stats.contacts ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Contacts</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Survey Results Accordion (→ customer Reviews) ── */}
        <Card className="shadow-none">
          <button
            type="button"
            onClick={() => onShowSurveyResultsChange(!showSurveyResults)}
            className="w-full flex items-center justify-between px-4 pt-4 pb-2 text-left"
          >
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Star className="size-3.5 text-amber-500" />
              Survey Results
              {customerContext && customerContext.reviews.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                  {customerContext.reviews.length}
                </Badge>
              )}
            </CardTitle>
            <ChevronRight className={cn(
              'size-4 text-muted-foreground transition-transform',
              showSurveyResults && 'rotate-90'
            )} />
          </button>
          {showSurveyResults && (
            <CardContent className="px-4 pb-4 space-y-2">
              {!customerContext || customerContext.reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No reviews yet
                </p>
              ) : (
                customerContext.reviews.map(r => (
                  <div key={r.id} className="rounded-md border p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {r.authorName || 'Verified Customer'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'size-2.5',
                              i < r.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {r.comment}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {r.source !== 'internal' && <span className="ml-1">· via {r.source}</span>}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Case History Accordion (→ past Jobs) ── */}
        <Card className="shadow-none">
          <button
            type="button"
            onClick={() => onShowCaseHistoryChange(!showCaseHistory)}
            className="w-full flex items-center justify-between px-4 pt-4 pb-2 text-left"
          >
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Briefcase className="size-3.5 text-emerald-500" />
              Case History
              {customerContext && customerContext.jobs.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                  {customerContext.jobs.length}
                </Badge>
              )}
            </CardTitle>
            <ChevronRight className={cn(
              'size-4 text-muted-foreground transition-transform',
              showCaseHistory && 'rotate-90'
            )} />
          </button>
          {showCaseHistory && (
            <CardContent className="px-4 pb-4 space-y-2">
              {!customerContext || customerContext.jobs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No job history
                </p>
              ) : (
                customerContext.jobs.map(j => (
                  <div key={j.id} className="rounded-md border p-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground truncate flex-1">
                        {j.title}
                      </span>
                      <Badge variant="outline" className={cn(
                        'text-[9px] px-1.5 h-4 whitespace-nowrap',
                        j.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400' :
                        j.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400'
                      )}>
                        {j.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {j.jobNumber ? `#${j.jobNumber} · ` : ''}
                        {new Date(j.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                      {j.quotedAmount != null && j.quotedAmount > 0 && (
                        <span className="font-medium text-foreground">
                          ₹{j.quotedAmount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          )}
        </Card>

        {/* Channel Info Card */}
        <Card className="shadow-none">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Channel Info</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <ChannelBadge channel={conv.channel} />
            </div>
            {conv.autoLeadCreated && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-3" />
                <span>Lead auto-created from this channel</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-none">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <MessageSquare className="size-3.5" />
              Send WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export default ConversationDetailPanel;
