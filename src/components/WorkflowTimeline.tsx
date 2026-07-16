import React from 'react';

interface WorkflowStep {
  key: string;
  label: string;
}

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentIndex: number;
  variant?: 'default' | 'error' | 'warning';
  variantLabel?: string;
  title?: string;
}

// Generic horizontal progress stepper. Extracted from what used to be ~100
// lines of claim-specific inline JSX in ClaimDetail - the step list, current
// index, and terminal-state styling (rejected/returned, etc.) are now all
// caller-supplied so any workflow with a linear status progression can reuse
// this instead of re-deriving statusIndex switch statements per page.
export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ steps, currentIndex, variant = 'default', variantLabel, title = 'Workflow Progress' }) => {
  const variantColors = {
    default: { circle: 'bg-brand text-white border-brand', ring: 'ring-brand/10', label: 'text-brand font-bold', line: 'bg-brand', badge: '' },
    error: { circle: 'bg-red-600 text-white border-red-600', ring: 'ring-red-100', label: 'text-red-600 font-bold', line: 'bg-red-600', badge: 'bg-red-100 text-red-800' },
    warning: { circle: 'bg-orange-500 text-white border-orange-500', ring: 'ring-orange-100', label: 'text-orange-600 font-bold', line: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800' },
  }[variant];

  const progressPct = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-4 block">{title}</span>
        {variantLabel && (
          <span className={`px-3 py-1 text-[11px] font-bold rounded-full mb-4 ${variantColors.badge}`}>
            {variantLabel}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-between w-full mt-4 px-4">
        <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 z-0" />
        <div
          className={`absolute top-4 left-4 h-1 -translate-y-1/2 z-0 transition-all duration-300 ${variantColors.line}`}
          style={{ width: `calc(${progressPct}% - 2rem)` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;

          let circleBg = 'bg-slate-100 text-slate-400 border-slate-200 border-2';
          let labelColor = 'text-slate-400 font-medium';

          if (isCompleted) {
            circleBg = 'bg-brand text-white border-brand border-2';
            labelColor = 'text-slate-900 font-semibold';
          } else if (isActive) {
            circleBg = `bg-white border-2 ${variant === 'default' ? 'border-brand text-brand ring-4 ring-brand/20' : variantColors.circle + ' ring-4 ' + variantColors.ring}`;
            labelColor = variantColors.label;
          }

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10 w-1/5">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${circleBg} transition-all duration-300`}>
                {isCompleted ? <span className="font-bold text-[10px]">✓</span> : <span>{idx + 1}</span>}
              </div>
              <span className={`text-[11px] uppercase tracking-wide mt-3 whitespace-nowrap text-center ${labelColor}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
