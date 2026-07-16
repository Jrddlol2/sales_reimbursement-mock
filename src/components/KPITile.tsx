import React from 'react';
import { Icon } from '@phosphor-icons/react';

interface KPITileProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  description: string;
  icon: Icon;
  onClick?: () => void;
  isActive?: boolean;
}

export const KPITile: React.FC<KPITileProps> = ({ 
  label, value, subValue, description, icon: Icon, onClick, isActive 
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border rounded p-5 shadow-sm flex flex-col relative group transition-all ${
        onClick ? 'cursor-pointer hover:shadow hover:border-brand' : ''
      } ${
        isActive ? 'border-brand ring-1 ring-brand' : 'border-slate-200'
      }`}
    >
      <Icon className={`w-4 h-4 absolute top-5 right-5 ${isActive ? 'text-brand' : 'text-slate-400'}`} />
      
      <div className="text-2xl font-extrabold text-slate-900 mb-2 mt-1 tracking-tight font-display">
        {value}
      </div>
      {subValue && (
        <div className="text-xs font-bold text-brand mb-1.5 -mt-1">
          {subValue}
        </div>
      )}
      
      <span className={`text-[10px] uppercase tracking-wider font-extrabold mb-1 font-display ${isActive ? 'text-brand' : 'text-slate-500'}`}>
        {label}
      </span>
      <p className="text-[10px] text-slate-400">
        {description}
      </p>
    </div>
  );
};
