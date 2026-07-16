import React from 'react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

interface TrendIndicatorProps {
  value: number;
  label: string;
  positive: boolean;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ value, label, positive }) => {
  return (
    <div className="flex items-center space-x-1.5">
      <span className="flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
        {positive ? <TrendUp size={12} className="mr-1" /> : <TrendDown size={12} className="mr-1" />}
        {Math.abs(value)}%
      </span>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  );
};
