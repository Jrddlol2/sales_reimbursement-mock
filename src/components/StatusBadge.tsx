import React from 'react';
import { getStatusConfig, getStatusBadgeClass } from '../statusConfig';

interface StatusBadgeProps {
  status: string;
  /** Override the centralized label — only for cases with no status meaning of their own (e.g. an approval decision). Leave unset to use the canonical label from statusConfig. */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  /** Hide the leading icon. Off by default — status should never be color-only. */
  hideIcon?: boolean;
}

// Single source of truth for rendering a status pill. Every status's
// label/color/icon comes from statusConfig.ts — no component should
// hand-roll its own status -> className/label switch statement.
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md', className = '', hideIcon = false }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold tracking-wide uppercase border border-transparent transition-colors duration-200 ${sizeClasses} ${getStatusBadgeClass(status)} ${className}`}>
      {!hideIcon && <Icon size={iconSize} weight="bold" className="shrink-0" />}
      {label || config.label}
    </span>
  );
};
