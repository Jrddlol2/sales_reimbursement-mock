import React from 'react';

// A claim auto-created from a Liquidation shortfall carries this tag wherever
// it's listed. Single implementation — was previously duplicated verbatim in
// ApprovalQueue.tsx and ProcessingQueue.tsx.
export const SourceLiquidationTag: React.FC = () => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
    Auto-generated from Cash Advance Shortfall
  </span>
);
