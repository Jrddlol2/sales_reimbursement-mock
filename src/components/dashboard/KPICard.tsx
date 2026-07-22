import React from 'react';
import { TrendIndicator } from './TrendIndicator';
import { Icon, ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

// 'info'/'default' both read as brand blue, same as 'action' — fine for a
// lone stat card, but a row of 4-6 cards needs more distinct hues than
// blue/emerald/amber/red to actually look different from each other at a
// glance. 'indigo'/'violet'/'teal'/'fuchsia'/'cyan'/'orange' are
// neutral-leaning analytical colors (no status meaning of their own) for
// exactly that case — status still only ever reads as blue/emerald/amber
// /red/violet/teal/slate per the app's semantic color rules.
export type CardVariant = 'action' | 'success' | 'warning' | 'info' | 'default' | 'danger' | 'indigo' | 'violet' | 'teal' | 'fuchsia' | 'cyan' | 'orange';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: Icon;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  colorClass?: string;
  onClick?: () => void;
  variant?: CardVariant;
  description?: string;
  additionalContext?: string;
  actionLabel?: string;
  actionPath?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  icon: IconComponent, 
  trend, 
  colorClass = "", 
  onClick,
  variant = 'default',
  description,
  additionalContext,
  actionLabel,
  actionPath
}) => {
  // No border color per variant anymore — a colored border plus a colored
  // top bar plus a colored icon chip was three signals doing one job. The
  // top bar + icon chip alone are enough to tell variants apart; the border
  // is now always the same neutral hairline every card shares, so nothing
  // outlines the card in a status color.
  const variantStyles = {
    action: {
      iconContainer: 'bg-brand text-white shadow-sm',
      title: 'text-slate-900 font-extrabold',
      value: 'text-brand',
      description: 'text-slate-600',
      context: 'text-brand font-bold',
      btn: 'bg-brand hover:bg-brand-hover text-white',
      topBar: 'bg-brand'
    },
    success: {
      iconContainer: 'bg-emerald-600 text-white shadow-sm',
      title: 'text-slate-900 font-bold',
      value: 'text-emerald-700',
      description: 'text-slate-600',
      context: 'text-emerald-700 font-bold',
      btn: 'bg-emerald-600 text-white hover:bg-emerald-700',
      topBar: 'bg-emerald-500'
    },
    warning: {
      iconContainer: 'bg-amber-500 text-white shadow-sm',
      title: 'text-slate-900 font-bold',
      value: 'text-amber-700',
      description: 'text-slate-600',
      context: 'text-amber-700 font-bold',
      btn: 'bg-amber-500 text-white hover:bg-amber-600',
      topBar: 'bg-amber-400'
    },
    info: {
      iconContainer: 'bg-brand text-white',
      title: 'text-slate-800 font-bold',
      value: 'text-slate-900',
      description: 'text-slate-600',
      context: 'text-slate-500 font-semibold',
      btn: 'bg-brand text-white hover:bg-brand-hover',
      topBar: 'bg-brand'
    },
    danger: {
      iconContainer: 'bg-red-600 text-white shadow-sm',
      title: 'text-slate-900 font-bold',
      value: 'text-red-700',
      description: 'text-slate-600',
      context: 'text-red-700 font-bold',
      btn: 'bg-red-600 text-white hover:bg-red-700',
      topBar: 'bg-red-500'
    },
    default: {
      iconContainer: 'bg-brand text-white',
      title: 'text-slate-800 font-bold',
      value: 'text-brand',
      description: 'text-slate-600',
      context: 'text-slate-500 font-semibold',
      btn: 'bg-brand text-white hover:bg-brand-hover',
      topBar: 'bg-brand'
    },
    indigo: {
      iconContainer: 'bg-indigo-500 text-white shadow-sm',
      title: 'text-slate-800 font-bold',
      value: 'text-indigo-700',
      description: 'text-slate-600',
      context: 'text-indigo-600 font-semibold',
      btn: 'bg-indigo-500 text-white hover:bg-indigo-600',
      topBar: 'bg-indigo-500'
    },
    violet: {
      iconContainer: 'bg-violet-500 text-white shadow-sm',
      title: 'text-slate-800 font-bold',
      value: 'text-violet-700',
      description: 'text-slate-600',
      context: 'text-violet-600 font-semibold',
      btn: 'bg-violet-500 text-white hover:bg-violet-600',
      topBar: 'bg-violet-500'
    },
    teal: {
      iconContainer: 'bg-teal-600 text-white shadow-sm',
      title: 'text-slate-800 font-bold',
      value: 'text-teal-700',
      description: 'text-slate-600',
      context: 'text-teal-600 font-semibold',
      btn: 'bg-teal-600 text-white hover:bg-teal-700',
      topBar: 'bg-teal-500'
    },
    fuchsia: {
      iconContainer: 'bg-fuchsia-500 text-white shadow-sm',
      title: 'text-slate-800 font-bold',
      value: 'text-fuchsia-700',
      description: 'text-slate-600',
      context: 'text-fuchsia-600 font-semibold',
      btn: 'bg-fuchsia-500 text-white hover:bg-fuchsia-600',
      topBar: 'bg-fuchsia-500'
    },
    cyan: {
      iconContainer: 'bg-cyan-600 text-white shadow-sm',
      title: 'text-slate-800 font-bold',
      value: 'text-cyan-700',
      description: 'text-slate-600',
      context: 'text-cyan-600 font-semibold',
      btn: 'bg-cyan-600 text-white hover:bg-cyan-700',
      topBar: 'bg-cyan-500'
    },
    orange: {
      iconContainer: 'bg-orange-500 text-white shadow-sm',
      title: 'text-slate-800 font-bold',
      value: 'text-orange-700',
      description: 'text-slate-600',
      context: 'text-orange-600 font-semibold',
      btn: 'bg-orange-500 text-white hover:bg-orange-600',
      topBar: 'bg-orange-500'
    }
  };

  const styles = variantStyles[variant];
  const cardClass = `bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm transition-all ${colorClass}`;
  const isClickableCard = !!onClick && !actionPath;

  const content = (
    <>
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${styles.topBar}`} />

      <div className="flex items-start justify-between mb-4 mt-2 min-w-0">
        <div className="flex gap-3 items-start min-w-0">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${styles.iconContainer}`}>
            <IconComponent size={22} weight="duotone" />
          </div>
          <div className="min-w-0 pt-0.5">
            {/* Both title and description reserve 2 lines' worth of height
                regardless of actual line count — without this, a longer
                title/description that wraps in one card (e.g. "Amount
                Reimbursed" vs "Approved") pushes that card's value number to
                a different vertical position than its row siblings. */}
            <h3 className={`text-xs uppercase tracking-wide leading-normal line-clamp-2 min-h-[2.25rem] ${styles.title}`} title={title}>{title}</h3>
            {description && <p className={`text-xs mt-1 leading-snug line-clamp-2 min-h-[1.875rem] ${styles.description}`}>{description}</p>}
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between min-w-0">
        <div className="flex flex-col min-w-0 w-full">
          <div
            title={String(value)}
            className={`font-extrabold tracking-tight tabular-nums truncate ${styles.value} ${
              String(value).length > 14 ? 'text-sm sm:text-base' :
              String(value).length > 11 ? 'text-base sm:text-lg' :
              String(value).length > 8 ? 'text-lg sm:text-xl' :
              'text-2xl sm:text-4xl'
            }`}
          >
            {value}
          </div>
          {additionalContext && (
            <div className={`text-[11px] font-medium mt-1.5 leading-normal truncate ${styles.context}`}>
              {additionalContext}
            </div>
          )}
        </div>

        {trend && (
          <div className="mb-1 shrink-0">
            <TrendIndicator value={trend.value} label={trend.label} positive={trend.positive} />
          </div>
        )}
      </div>

      {(actionLabel && actionPath) && (
        <div className="mt-auto pt-4 border-t border-slate-100/50">
          <Link
            to={actionPath}
            className={`flex items-center justify-between w-full px-3 py-2 text-xs font-bold rounded-lg transition-colors group ${styles.btn}`}
          >
            {actionLabel}
            <ArrowRight size={14} weight="bold" className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
      {(actionLabel && onClick && !actionPath) && (
        <div className="mt-auto pt-4 border-t border-slate-100/50">
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`flex items-center justify-between w-full px-3 py-2 text-xs font-bold rounded-lg transition-colors group ${styles.btn}`}
          >
            {actionLabel}
            <ArrowRight size={14} weight="bold" className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </>
  );

  if (isClickableCard) {
    return (
      <div
        className={`corp-card relative overflow-hidden p-5 sm:p-6 cursor-pointer h-full flex flex-col ${cardClass}`}
        onClick={onClick}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`corp-card relative overflow-hidden p-5 sm:p-6 h-full flex flex-col ${cardClass}`}>
      {content}
    </div>
  );
};
