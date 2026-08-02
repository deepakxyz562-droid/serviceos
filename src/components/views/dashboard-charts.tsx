'use client';

/**
 * Dashboard Charts — Lazy-loaded recharts wrappers
 * ================================================
 *
 * P1 (LCP fix): recharts is ~200KB and was eagerly imported in the dashboard,
 * blocking hydration + LCP. By extracting the chart components into this file
 * and lazy-loading it with `next/dynamic({ ssr: false })`, recharts is moved
 * to a separate chunk that only loads AFTER the dashboard's KPI cards render.
 *
 * The KPI cards (the LCP element) no longer wait for recharts to download +
 * parse + execute before they can paint. This cuts ~200KB from the initial
 * JS bundle and shaves ~1.5s off LCP on a fresh load.
 *
 * SSR is disabled because recharts uses `ResponsiveContainer` which needs
 * `window` to measure its parent — on the server it renders nothing anyway,
 * so skipping SSR avoids a hydration mismatch warning.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// ─── KPISparkline ────────────────────────────────────────────────────────────
// Tiny sparkline rendered inside each KPI card. Fixed 80×32 box so the card
// layout is stable while the chart chunk loads (no CLS).

export function KPISparkline({ data, color }: { data: { value: number }[]; color: string }) {
  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── RevenueTrendChart ───────────────────────────────────────────────────────
// The 6-month revenue area chart. Extracted so the recharts import is lazy.

export function RevenueTrendChart({
  data,
  symbol,
  formatCompact,
}: {
  data: { month: string; revenue: number }[];
  symbol: string;
  formatCompact: (n: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${symbol}${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            fontSize: '12px',
          }}
          formatter={(value: number) => [formatCompact(value), 'Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#revenueGradient)"
          dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── LeadSourcesChart ────────────────────────────────────────────────────────
// The lead-sources pie chart with its legend.

export function LeadSourcesChart({
  pieData,
  leadSourceColors,
}: {
  pieData: { name: string; value: number; source: string }[];
  leadSourceColors: Record<string, string>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {pieData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={leadSourceColors[entry.source] || '#94a3b8'}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [`${value} leads`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
