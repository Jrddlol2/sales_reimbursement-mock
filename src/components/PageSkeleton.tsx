import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';

export const PageSkeleton: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="h-6 w-48 bg-slate-200 rounded"></div>
      </div>
      
      {/* Header Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-between items-start">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-slate-200 rounded"></div>
          <div className="flex gap-4">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
          </div>
        </div>
        <div className="h-10 w-24 bg-slate-200 rounded"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-64"></div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-96"></div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-48"></div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-64"></div>
        </div>
      </div>
    </div>
  );
};
