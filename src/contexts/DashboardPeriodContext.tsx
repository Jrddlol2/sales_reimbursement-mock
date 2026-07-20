import React, { createContext, useContext, useState, useMemo } from 'react';
import { TimeScope, DateRange, resolveScope } from '../metrics/timeScope';
import { MetricDefinition } from '../metrics/registry';

interface DashboardPeriodContextType {
  /** The globally-selected period. Only applied to metrics where realtime === false. */
  period: TimeScope;
  setPeriod: (p: TimeScope) => void;
  customRange: DateRange;
  setCustomRange: (r: DateRange) => void;
  /**
   * The scope actually in effect for a given metric right now: its own fixed
   * scope if realtime, otherwise the global filter's current period. This is
   * the single place that decision is made — cards never special-case it.
   */
  effectiveScope: (metric: MetricDefinition) => TimeScope;
  resolveMetricRange: (metric: MetricDefinition) => DateRange;
}

const DashboardPeriodContext = createContext<DashboardPeriodContextType | undefined>(undefined);

export const DashboardPeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [period, setPeriodState] = useState<TimeScope>('this_month');
  // Never null once "Custom Range" is selectable — resolveScope('custom', ...)
  // requires a range, so start with a sensible default (last 30 days) rather
  // than crashing the dashboard the instant the option is picked.
  const [customRange, setCustomRange] = useState<DateRange>(() => resolveScope('last_30_days'));
  // Until the user actively touches the filter, every metric shows its own
  // registry-declared default scope untouched — "This Month" is only the
  // filter widget's initial *displayed* value, not a silent override of
  // metrics whose correct default is This Year (e.g. Amount Reimbursed).
  // Only once the user picks something does the global override kick in.
  const [userHasSetPeriod, setUserHasSetPeriod] = useState(false);

  const setPeriod = (p: TimeScope) => {
    setUserHasSetPeriod(true);
    setPeriodState(p);
  };

  const value = useMemo<DashboardPeriodContextType>(() => {
    // The global filter only makes sense as a swap between calendar periods
    // (This Month <-> Last Month <-> This Quarter <-> This Year <-> Last Year).
    // Metrics whose correctness depends on a fixed rolling window (last_30_days)
    // or an explicit lifetime total (all_time) keep their own scope always —
    // "Average Approval Time (Last 30 Days)" must stay a 30-day window even if
    // the user is looking at "Last Year" everywhere else on the page.
    const CALENDAR_PERIOD_SCOPES: TimeScope[] = ['this_month', 'this_year'];
    const effectiveScope = (metric: MetricDefinition): TimeScope =>
      metric.realtime || !userHasSetPeriod || !CALENDAR_PERIOD_SCOPES.includes(metric.scope) ? metric.scope : period;
    const resolveMetricRange = (metric: MetricDefinition): DateRange => {
      const scope = effectiveScope(metric);
      return resolveScope(scope, new Date(), scope === 'custom' ? customRange : undefined);
    };
    return { period, setPeriod, customRange, setCustomRange, effectiveScope, resolveMetricRange };
  }, [period, customRange, userHasSetPeriod]);

  return <DashboardPeriodContext.Provider value={value}>{children}</DashboardPeriodContext.Provider>;
};

export const useDashboardPeriod = (): DashboardPeriodContextType => {
  const ctx = useContext(DashboardPeriodContext);
  if (!ctx) throw new Error('useDashboardPeriod must be used within a DashboardPeriodProvider');
  return ctx;
};
