// Single source of truth for all dashboard date-boundary math. Nothing else in
// the codebase should compute "start of month" / "last 30 days" / etc. directly —
// call resolveScope() instead so every metric and chart agrees on the same
// definition of a period, in the same timezone.
//
// Asia/Manila is a fixed UTC+8 offset with no DST, so we can compute boundaries
// by shifting into a "Manila wall-clock" Date, doing calendar math in UTC-field
// terms on that shifted value, then shifting back — no timezone library needed.

export type TimeScope =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_30_days'
  | 'this_year'
  | 'last_year'
  | 'last_12_months'
  | 'all_time'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export type ScopeGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no DST

// Real UTC instant -> a Date whose UTC-getter fields read as Manila wall-clock time.
const toManilaWall = (d: Date): Date => new Date(d.getTime() + MANILA_OFFSET_MS);
// Manila wall-clock Date (as produced above) -> the real UTC instant it represents.
const fromManilaWall = (wall: Date): Date => new Date(wall.getTime() - MANILA_OFFSET_MS);

const startOfManilaDayWall = (wall: Date): Date =>
  new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()));

const startOfManilaMonthWall = (wall: Date): Date =>
  new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), 1));

const startOfManilaYearWall = (wall: Date): Date =>
  new Date(Date.UTC(wall.getUTCFullYear(), 0, 1));

/** Start of the current Manila day, as a real Date/instant. */
export const startOfTodayManila = (now: Date = new Date()): Date =>
  fromManilaWall(startOfManilaDayWall(toManilaWall(now)));

/** Start of the current Manila month, as a real Date/instant. */
export const startOfThisMonthManila = (now: Date = new Date()): Date =>
  fromManilaWall(startOfManilaMonthWall(toManilaWall(now)));

/** Start of the current Manila year, as a real Date/instant. */
export const startOfThisYearManila = (now: Date = new Date()): Date =>
  fromManilaWall(startOfManilaYearWall(toManilaWall(now)));

const addMonthsManila = (wall: Date, months: number): Date =>
  new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth() + months, 1));

/**
 * Resolves a named scope to a concrete {start, end} instant range.
 * `end` is always "now" unless the scope is a fully-closed historical period
 * (last_month, last_year), in which case it's the end of that period.
 * Adding a new scope means adding exactly one case here.
 */
export function resolveScope(scope: TimeScope, now: Date = new Date(), customRange?: DateRange): DateRange {
  const wallNow = toManilaWall(now);

  switch (scope) {
    case 'today':
      return { start: startOfTodayManila(now), end: now };

    case 'this_week': {
      // Monday-start week, matching PH business-week convention.
      const dayOfWeek = wallNow.getUTCDay(); // 0=Sun..6=Sat
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const mondayWall = new Date(startOfManilaDayWall(wallNow).getTime() - diffToMonday * 24 * 60 * 60 * 1000);
      return { start: fromManilaWall(mondayWall), end: now };
    }

    case 'this_month':
      return { start: startOfThisMonthManila(now), end: now };

    case 'last_month': {
      const startWall = addMonthsManila(wallNow, -1);
      const endWall = startOfManilaMonthWall(wallNow); // exclusive end = start of this month
      return { start: fromManilaWall(startWall), end: fromManilaWall(endWall) };
    }

    case 'this_quarter': {
      const quarterStartMonth = Math.floor(wallNow.getUTCMonth() / 3) * 3;
      const startWall = new Date(Date.UTC(wallNow.getUTCFullYear(), quarterStartMonth, 1));
      return { start: fromManilaWall(startWall), end: now };
    }

    case 'last_30_days':
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };

    case 'this_year':
      return { start: startOfThisYearManila(now), end: now };

    case 'last_year': {
      const startWall = new Date(Date.UTC(wallNow.getUTCFullYear() - 1, 0, 1));
      const endWall = startOfManilaYearWall(wallNow); // exclusive end = start of this year
      return { start: fromManilaWall(startWall), end: fromManilaWall(endWall) };
    }

    case 'last_12_months': {
      // Rolling 12 calendar months ending with the current (partial) month.
      const startWall = addMonthsManila(wallNow, -11);
      return { start: fromManilaWall(startWall), end: now };
    }

    case 'all_time':
      return { start: new Date(0), end: now };

    case 'custom':
      if (!customRange) throw new Error('resolveScope("custom") requires a customRange argument.');
      return customRange;

    default: {
      const _exhaustive: never = scope;
      throw new Error(`Unhandled TimeScope: ${_exhaustive}`);
    }
  }
}

/** Human-readable label for a scope, used as the sub-label on every metric card. */
export function scopeLabel(scope: TimeScope): string {
  switch (scope) {
    case 'today': return 'Today';
    case 'this_week': return 'This Week';
    case 'this_month': return 'This Month';
    case 'last_month': return 'Last Month';
    case 'this_quarter': return 'This Quarter';
    case 'last_30_days': return 'Last 30 Days';
    case 'this_year': return 'This Year';
    case 'last_year': return 'Last Year';
    case 'last_12_months': return 'Last 12 Months';
    case 'all_time': return 'All Time';
    case 'custom': return 'Custom Range';
    default: return scope;
  }
}

/**
 * Chart x-axis granularity as a pure function of scope. New charts inherit the
 * right bucket size automatically instead of deciding it per-chart.
 */
export function granularityForScope(scope: TimeScope): ScopeGranularity {
  switch (scope) {
    case 'today':
    case 'this_week':
    case 'this_month':
    case 'last_month':
    case 'last_30_days':
      return 'daily';
    case 'this_quarter':
      return 'weekly';
    case 'this_year':
    case 'last_year':
    case 'last_12_months':
    case 'custom':
      return 'monthly';
    case 'all_time':
      return 'yearly';
    default:
      return 'monthly';
  }
}

/** The subset of scopes exposed as presets in the global "Dashboard Period" filter. */
export const DASHBOARD_PERIOD_OPTIONS: { value: TimeScope; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

export const isWithinRange = (dateStr: string | undefined, range: DateRange): boolean => {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
};
