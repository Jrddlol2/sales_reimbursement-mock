import React from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

// Keeps Y-axis tick labels compact regardless of magnitude (100000 -> "100K",
// 1500000 -> "1.5M") so wide currency-scale values never get clipped.
const formatCompactNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

// Shared categorical palette for any multi-series chart (per-requestor bars,
// donut slices, etc.) — cycle through these instead of a page-local color
// array so "requestor #3" and "expense category #3" land on the same hue
// everywhere. Deliberately skips emerald/red/amber since those already carry
// fixed status meaning (success/error/pending) elsewhere in the app and
// would misread as status here.
export const CHART_COLORS = ['#2563eb', '#6366f1', '#7c3aed', '#0d9488', '#c026d3', '#0891b2', '#ea580c', '#f59e0b'];

export const SimpleLineChart = ({ data, dataKey, name }: { data: any[], dataKey: string, name?: string }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatCompactNumber} width={44} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
        />
        <Line type="monotone" dataKey={dataKey} name={name || dataKey} stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// `colors` cycles a distinct hue per bar (for categorical data where each
// bar is its own "thing" — departments, categories); pass a plain `color`
// instead when every bar shares one meaning (e.g. a single metric over
// time). Per-entry `color` on the data itself wins over both, for callers
// that need bar colors tied to real semantics (e.g. status colors).
export const SimpleBarChart = ({ data, dataKey, color = "#2563eb", colors, name }: { data: any[], dataKey: string, color?: string, colors?: string[], name?: string }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatCompactNumber} width={44} />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
        />
        <Bar
          dataKey={dataKey}
          name={name || dataKey}
          fill={color}
          radius={[4, 4, 0, 0]}
          // Recharts 3's grow-in animation never completes in this
          // environment, leaving every bar stuck at its pre-animation
          // (invisible) state indefinitely — disabling it is what actually
          // makes bars render at all, not just a preference.
          isAnimationActive={false}
          shape={(props: any) => {
            const entry = data[props.index];
            const fill = colors ? (entry?.color || colors[props.index % colors.length]) : color;
            return <Rectangle {...props} fill={fill} />;
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const DonutChart = ({ data, colors, centerCaption = "Total Claims", valueFormatter }: { data: any[], colors?: string[], centerCaption?: string, valueFormatter?: (value: number) => string }) => {
  const total = data.reduce((sum, entry) => sum + (entry.value || 0), 0);
  const format = valueFormatter || ((v: number) => String(v));
  // A legend beyond ~3 items reliably wraps to a second row at this chart's
  // width — reserve the extra row's height up front instead of letting the
  // wrapped row overlap the center total (recharts doesn't clip Legend
  // content to its `height` prop, it just uses that as a layout hint).
  const legendHeight = data.length > 3 ? 56 : 36;

  return (
    <div className="relative" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => {
              const fill = entry.color || (colors && colors[index % colors.length]) || '#cbd5e1';
              return <Cell key={`cell-${index}`} fill={fill} stroke="transparent" />;
            })}
          </Pie>
          <Tooltip
            formatter={(value: number) => format(value)}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={legendHeight} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
        </PieChart>
      </ResponsiveContainer>
      <div
        className="absolute inset-x-0 top-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ height: 300 - legendHeight }}
      >
        <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{format(total)}</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{centerCaption}</span>
      </div>
    </div>
  );
};
