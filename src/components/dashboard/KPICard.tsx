import React from 'react';
import { TrendIndicator } from './TrendIndicator';
import { Icon, ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export type CardVariant = 'action' | 'success' | 'warning' | 'info' | 'default' | 'danger';

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
  // Border utilities use the Tailwind `!` (important) prefix because the
  // plain-CSS `.corp-card` rule in index.css declares its own `border: 1px
  // solid ...` further down the stylesheet than Tailwind's generated utility
  // layer — at equal specificity, source order wins, so `.corp-card`'s grey
  // border was silently overriding every variant's colored border here.
  // Forcing !important is the surgical fix scoped to this component only.
  const variantStyles = {
    action: {
      card: 'corp-card-glass tint-brand !border-2 !border-brand shadow-sm hover:shadow-md transition-shadow',
      iconContainer: 'bg-brand text-white shadow-sm',
      title: 'text-slate-900 font-extrabold',
      value: 'text-brand',
      description: 'text-slate-700',
      context: 'text-brand font-bold',
      btn: 'bg-brand hover:bg-brand-hover text-white',
      topBar: 'bg-brand'
    },
    success: {
      card: 'corp-card-glass tint-emerald !border-2 !border-emerald-400 hover:!border-emerald-500 transition-colors shadow-sm',
      iconContainer: 'bg-emerald-600 text-white shadow-sm',
      title: 'text-emerald-950 font-bold',
      value: 'text-emerald-800',
      description: 'text-emerald-700',
      context: 'text-emerald-700 font-bold',
      btn: 'bg-emerald-600 text-white hover:bg-emerald-700',
      topBar: 'bg-emerald-500'
    },
    warning: {
      card: 'corp-card-glass tint-amber !border-2 !border-amber-400 hover:!border-amber-500 transition-colors shadow-sm',
      iconContainer: 'bg-amber-500 text-white shadow-sm',
      title: 'text-amber-950 font-bold',
      value: 'text-amber-800',
      description: 'text-amber-700',
      context: 'text-amber-700 font-bold',
      btn: 'bg-amber-500 text-white hover:bg-amber-600',
      topBar: 'bg-amber-400'
    },
    info: {
      card: 'corp-card-glass tint-neutral !border !border-slate-300 hover:!border-brand/50 transition-colors',
      iconContainer: 'bg-slate-700 text-white',
      title: 'text-slate-800 font-bold',
      value: 'text-slate-900',
      description: 'text-slate-600',
      context: 'text-slate-500 font-semibold',
      btn: 'bg-slate-700 text-white hover:bg-slate-800',
      topBar: 'bg-slate-400'
    },
    danger: {
      card: 'corp-card-glass tint-red !border-2 !border-red-400 hover:!border-red-500 transition-colors shadow-sm',
      iconContainer: 'bg-red-600 text-white shadow-sm',
      title: 'text-red-950 font-bold',
      value: 'text-red-800',
      description: 'text-red-700',
      context: 'text-red-700 font-bold',
      btn: 'bg-red-600 text-white hover:bg-red-700',
      topBar: 'bg-red-500'
    },
    default: {
      card: `corp-card-glass tint-neutral !border !border-slate-300 hover:!border-brand/50 transition-colors ${colorClass}`,
      iconContainer: 'bg-brand text-white',
      title: 'text-slate-800 font-bold',
      value: 'text-brand',
      description: 'text-slate-600',
      context: 'text-slate-500 font-semibold',
      btn: 'bg-brand text-white hover:bg-brand-hover',
      topBar: 'bg-brand'
    }
  };

  const styles = variantStyles[variant];
  const isClickableCard = !!onClick && !actionPath;

  const content = (
    <>
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[11px] overflow-hidden">
        <div className={`w-full h-full ${styles.topBar}`} />
      </div>
      
      <div className="flex items-start justify-between mb-4 mt-1 min-w-0">
        <div className="flex gap-3 items-center min-w-0">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${styles.iconContainer}`}>
            <IconComponent size={24} weight="duotone" />
          </div>
          <div className="min-w-0">
            <h3 className={`text-xs uppercase tracking-wide leading-normal truncate ${styles.title}`}>{title}</h3>
            {description && <p className={`text-xs mt-1 leading-snug ${styles.description}`}>{description}</p>}
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
        className={`corp-card relative p-5 sm:p-6 cursor-pointer h-full flex flex-col ${styles.card}`}
        onClick={onClick}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`corp-card relative p-5 sm:p-6 h-full flex flex-col ${styles.card}`}>
      {content}
    </div>
  );
};
