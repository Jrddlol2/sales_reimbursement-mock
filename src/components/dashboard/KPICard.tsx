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
  const variantStyles = {
    action: {
      card: 'corp-card-glass tint-indigo border-2 border-indigo-500 shadow-sm hover:shadow-md transition-shadow',
      iconContainer: 'bg-indigo-100 text-indigo-700',
      title: 'text-indigo-900 font-extrabold',
      value: 'text-indigo-700',
      description: 'text-indigo-600',
      context: 'text-indigo-500 font-medium',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      topBar: 'bg-indigo-500'
    },
    success: {
      card: 'corp-card-glass tint-emerald border border-emerald-200/70 hover:border-emerald-300 transition-colors',
      iconContainer: 'bg-emerald-50 text-emerald-600',
      title: 'text-slate-700 font-semibold',
      value: 'text-slate-800',
      description: 'text-slate-600',
      context: 'text-slate-500',
      btn: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      topBar: 'bg-emerald-500'
    },
    warning: {
      card: 'corp-card-glass tint-amber border border-amber-200/70 hover:border-amber-300 transition-colors',
      iconContainer: 'bg-amber-50 text-amber-600',
      title: 'text-slate-700 font-semibold',
      value: 'text-amber-700',
      description: 'text-slate-600',
      context: 'text-amber-700/80',
      btn: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
      topBar: 'bg-amber-400'
    },
    info: {
      card: 'corp-card-glass tint-neutral border border-slate-200/70 hover:border-slate-300 transition-colors',
      iconContainer: 'bg-slate-100 text-slate-500',
      title: 'text-slate-700 font-semibold',
      value: 'text-slate-800',
      description: 'text-slate-600',
      context: 'text-slate-500',
      btn: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
      topBar: 'bg-slate-300'
    },
    danger: {
      card: 'corp-card-glass tint-red border border-red-200/70 hover:border-red-300 transition-colors',
      iconContainer: 'bg-red-100 text-red-600',
      title: 'text-red-800 font-semibold',
      value: 'text-red-700',
      description: 'text-red-700',
      context: 'text-red-600/80',
      btn: 'bg-red-100 text-red-800 hover:bg-red-200',
      topBar: 'bg-red-500'
    },
    default: {
      card: `corp-card-glass tint-neutral border border-slate-200/70 hover:border-brand/40 transition-colors ${colorClass}`,
      iconContainer: 'bg-brand/10 text-brand',
      title: 'text-slate-700 font-semibold',
      value: 'text-brand',
      description: 'text-slate-600',
      context: 'text-slate-500',
      btn: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
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
      
      <div className="flex items-start justify-between mb-4 mt-1">
        <div className="flex gap-3 items-center">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${styles.iconContainer}`}>
            <IconComponent size={24} weight="duotone" />
          </div>
          <div>
            <h3 className={`text-xs uppercase tracking-wide leading-normal ${styles.title}`}>{title}</h3>
            {description && <p className={`text-xs mt-1 leading-snug ${styles.description}`}>{description}</p>}
          </div>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <div className={`font-extrabold tracking-tight tabular-nums truncate ${styles.value} ${
            String(value).length > 12 ? 'text-2xl sm:text-3xl' :
            String(value).length > 8 ? 'text-3xl sm:text-4xl' :
            'text-4xl'
          }`}>
            {value}
          </div>
          {additionalContext && (
            <div className={`text-[11px] font-medium mt-1.5 leading-normal ${styles.context}`}>
              {additionalContext}
            </div>
          )}
        </div>
        
        {trend && (
          <div className="mb-1">
            <TrendIndicator value={trend.value} label={trend.label} positive={trend.positive} />
          </div>
        )}
      </div>

      {(actionLabel && actionPath) && (
        <div className="mt-5 pt-4 border-t border-slate-100/50">
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
        <div className="mt-5 pt-4 border-t border-slate-100/50">
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
        className={`corp-card relative p-5 sm:p-6 cursor-pointer ${styles.card}`}
        onClick={onClick}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`corp-card relative p-5 sm:p-6 ${styles.card}`}>
      {content}
    </div>
  );
};
