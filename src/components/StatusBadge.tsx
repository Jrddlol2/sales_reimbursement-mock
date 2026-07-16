import React from 'react';
import { getStatusColor } from '../utils';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

// Single source of truth for rendering a status pill. Wraps the existing
// getStatusColor() color lookup in consistent markup so every detail page
// stops hand-rolling its own <span> + switch statement for the same thing.
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md', className = '' }) => {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold tracking-wide uppercase border border-transparent transition-colors duration-200 ${sizeClasses} ${getStatusColor(status)} ${className}`}>
      {label || status.replace(/_/g, ' ')}
    </span>
  );
};
