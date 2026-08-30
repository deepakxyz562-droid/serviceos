'use client';

/**
 * WhatsApp Tab — conversation volume + intent + response analytics.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * Receives the whatsapp_analytics query as a prop and computes its own
 * derived data via useMemo. Does NOT re-fetch.
 */

import { useMemo } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import {
  Clock, MessageSquare, Bot, Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { StatCard } from '@/components/shared/stat-card';
import { ChartSkeleton, KpiSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/error-state';
import { formatNumber } from '@/lib/format-utils';
import type {
  WhatsAppAnalyticsResponse, IntentDatum, WhatsAppVolumeDatum,
} from '../../types';
import {
  whatsappVolumeConfig, intentConfig, INTENT_COLOR_PALETTE, humanizeKey,
} from '../../utils/report-helpers';
import { EmptyHint } from '../report-shared';

interface WhatsAppTabProps {
  dateRange: string;
  whatsappQuery: UseQueryResult<WhatsAppAnalyticsResponse>;
}

export function WhatsAppTab({ dateRange, whatsappQuery }: WhatsAppTabProps) {
  const whatsapp = whatsappQuery.data;

  // ─── Derived ─────────────────────────────────────────────────────
  const intentDistData = useMemo<IntentDatum[]>(() => {
    if (!whatsapp?.intentDistribution) return [];
    return Object.entries(whatsapp.intentDistribution)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v], i) => ({
        intent: humanizeKey(k),
        count: v as number,
        fill: INTENT_COLOR_PALETTE[i % INTENT_COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [whatsapp]);

  const whatsappVolumeData = useMemo<WhatsAppVolumeDatum[]>(() => {
    if (!whatsapp?.conversations || whatsapp.conversations.length === 0) return [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Map<string, number>();
    for (const c of whatsapp.conversations) {
      const d = new Date(c.createdAt);
      if (isNaN(d.getTime())) continue;
      const day = dayNames[d.getDay()];
      counts.set(day, (counts.get(day) || 0) + 1);
    }
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return order.map(day => ({ day, conversations: counts.get(day) ?? 0 }));
  }, [whatsapp]);

  return (
    <div className="space-y-6">
      {/* WhatsApp stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {whatsappQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Avg Response Time"
              value={`${whatsapp?.avgResponseTimeMin ?? 0} min`}
              icon={Clock}
              iconBg="bg-emerald-50"
              color="text-emerald-600"
              sub="WhatsApp channel"
            />
            <StatCard
              label="Active Chats"
              value={formatNumber(whatsapp?.activeConversations ?? 0)}
              icon={MessageSquare}
              iconBg="bg-teal-50"
              color="text-teal-600"
              sub="Currently active conversations"
            />
            <StatCard
              label="Button Response"
              value={`${whatsapp?.buttonResponseRate ?? 0}%`}
              icon={Bot}
              iconBg="bg-cyan-50"
              color="text-cyan-600"
              sub="Quick reply engagement"
            />
            <StatCard
              label="Total Conversations"
              value={formatNumber(whatsapp?.totalConversations ?? 0)}
              icon={Phone}
              iconBg="bg-amber-50"
              color="text-amber-600"
              sub={`Last ${dateRange}`}
            />
          </>
        )}
      </div>

      {/* Conversation Volume + Intent Distribution row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversation Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversation Volume</CardTitle>
            <CardDescription>WhatsApp conversations by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            {whatsappQuery.isLoading ? (
              <ChartSkeleton />
            ) : whatsappQuery.isError ? (
              <ErrorState onRetry={() => whatsappQuery.refetch()} />
            ) : whatsappVolumeData.length === 0 || whatsappVolumeData.every(d => d.conversations === 0) ? (
              <EmptyHint message="No WhatsApp conversations in this period" />
            ) : (
              <ChartContainer config={whatsappVolumeConfig} className="h-[280px] w-full aspect-auto">
                <LineChart data={whatsappVolumeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value: number) => [`${value} conversations`, 'Volume']} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversations"
                    stroke="var(--color-conversations)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-conversations)', r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Intent Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Intent Distribution</CardTitle>
            <CardDescription>Detected intents from WhatsApp conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {whatsappQuery.isLoading ? (
              <ChartSkeleton />
            ) : whatsappQuery.isError ? (
              <ErrorState onRetry={() => whatsappQuery.refetch()} />
            ) : intentDistData.length === 0 ? (
              <EmptyHint message="No intent data in this period" />
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ChartContainer config={intentConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                  <PieChart>
                    <Pie
                      data={intentDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="intent"
                      strokeWidth={0}
                    >
                      {intentDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: number, name: string) => [`${value} requests`, name]} />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col gap-2.5 w-full sm:w-1/2">
                  {intentDistData.map(item => {
                    const total = intentDistData.reduce((s, d) => s + d.count, 0);
                    return (
                      <div key={item.intent} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                          <span className="text-sm">{item.intent}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{item.count}</span>
                          <span className="text-xs text-muted-foreground">
                            {total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Response Time Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp Response Analytics</CardTitle>
          <CardDescription>Average first-response time across the WhatsApp channel</CardDescription>
        </CardHeader>
        <CardContent>
          {whatsappQuery.isLoading ? (
            <ChartSkeleton />
          ) : whatsappQuery.isError ? (
            <ErrorState onRetry={() => whatsappQuery.refetch()} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Response Time</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{whatsapp?.avgResponseTimeMin ?? 0} min</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="size-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 font-medium">Target: &lt; 3 min</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-teal-50/60 border border-teal-100">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Button Response Rate</p>
                <p className="text-2xl font-bold text-teal-700 mt-1">{whatsapp?.buttonResponseRate ?? 0}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <Bot className="size-3 text-teal-500" />
                  <span className="text-[10px] text-teal-600 font-medium">Quick reply engagement</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-100">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Conversations</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{whatsapp?.activeConversations ?? 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  <MessageSquare className="size-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600 font-medium">{whatsapp?.totalConversations ?? 0} total</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Button Response Rates — per-button breakdown not exposed by API → summary only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interactive Button Response Rates</CardTitle>
          <CardDescription>Overall WhatsApp quick reply engagement</CardDescription>
        </CardHeader>
        <CardContent>
          {whatsappQuery.isLoading ? (
            <ChartSkeleton />
          ) : whatsappQuery.isError ? (
            <ErrorState onRetry={() => whatsappQuery.refetch()} />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium shrink-0">Overall Response</div>
                <div className="flex-1">
                  <div className="relative h-8 rounded-lg bg-muted/30 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg flex items-center pl-3 transition-all duration-500"
                      style={{
                        width: `${whatsapp?.buttonResponseRate ?? 0}%`,
                        backgroundColor: '#10b981',
                      }}
                    >
                      <span className="text-xs font-bold text-white">{whatsapp?.buttonResponseRate ?? 0}%</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
                  {whatsapp?.activeConversations ?? 0} active chats
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Per-button response breakdowns are not yet exposed by the analytics API. Overall engagement is shown above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
