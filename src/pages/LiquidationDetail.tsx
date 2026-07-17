import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import { Liquidation, LiquidationStatus, User, UserRole } from '../types';
import { formatPHP } from '../utils';
import { ClaimLineItems } from '../components/ClaimLineItems';
import { ClaimActivityTimeline } from '../components/ClaimActivityTimeline';
import { ArrowLeft, CurrencyDollar, Calendar, FileText, User as UserIcon, Question, Lifebuoy } from '@phosphor-icons/react';
import { StatusBadge } from '../components/StatusBadge';
import { DetailHeader } from '../components/DetailHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { SummaryCard } from '../components/SummaryCard';
import { Comments, CommentEntry } from '../components/Comments';

const historyToComments = (history: any[]): CommentEntry[] =>
  (history || [])
    .filter(h => h.reason)
    .map(h => ({
      id: h.id,
      author: h.changedBy?.name || h.changed_by,
      role: h.changedBy?.role,
      body: h.reason,
      timestamp: h.timestamp,
      decision: h.new_status,
    }));

interface LiquidationDetailProps {
  id?: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

export const LiquidationDetail: React.FC<LiquidationDetailProps> = ({ id: propId, onClose, onUpdate }) => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId || routeId || '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [liq, setLiq] = useState<any | null>(null);
  const [cashAdvances, setCashAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleClose = onClose || (() => navigate(-1));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [liqData, caData] = await Promise.all([
        apiFetch(`/api/liquidations/${id}`),
        apiFetch('/api/cash-advances')
      ]);
      setLiq(liqData);
      setCashAdvances(caData);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load Liquidation details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) return <PageSkeleton onBack={handleClose} />;

  if (!liq) {
    return (
      <div className="p-8 text-center text-red-500 font-medium italic">
        Liquidation Report not found or unauthorized access.
      </div>
    );
  }

  const linkedCa = cashAdvances.find(ca => ca.id === liq.cashAdvanceId);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Back navigation */}
      <button
        onClick={handleClose}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider font-display transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to list
      </button>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <DetailHeader
          eyebrow="Liquidation Report"
          title={`LIQ-${liq.id.substring(0, 6).toUpperCase()}`}
          status={<StatusBadge status={liq.status} label={liq.status === LiquidationStatus.RETURNED_FOR_REVISION ? 'Returned' : undefined} />}
          actions={
             <Link to={`/support?new=true&entityType=Liquidation&entityId=${liq.id}`} className="px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                <Lifebuoy className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                Request Help
             </Link>
          }
        />

        <div className="p-6 space-y-6">
          {/* SUMMARY */}
          <SummaryCard title="Summary">
            <div>
              <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Submitted By</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800">{liq.requestor?.name || 'Loading...'}</span>
              </div>
            </div>
          </SummaryCard>

          {/* FINANCIAL INFORMATION */}
          <SummaryCard title="Financial Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Total Spent Listed</span>
                <span className="text-slate-800 text-xl font-extrabold font-display block mt-1">{formatPHP(liq.totalSpent)}</span>
              </div>

              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Variance Result</span>
                <span className={`text-xl font-extrabold font-display block mt-1 ${liq.varianceAmount === 0 ? 'text-green-600' : liq.varianceAmount < 0 ? 'text-amber-600' : 'text-indigo-600'}`}>
                  {liq.varianceAmount === 0
                    ? 'Settled (₱0.00)'
                    : liq.varianceAmount < 0
                      ? `Refund Due: ${formatPHP(Math.abs(liq.varianceAmount))}`
                      : `Reimbursement Due: ${formatPHP(liq.varianceAmount)}`}
                </span>
              </div>
            </div>
          </SummaryCard>

          {/* ATTACHMENTS */}
          {liq.lineItems && liq.lineItems.length > 0 && (
            <SummaryCard title="Attachments" bodyClassName="p-0">
              <ClaimLineItems expenses={liq.lineItems} totalAmount={liq.totalSpent} />
            </SummaryCard>
          )}

          {/* Cross Navigation Link */}
          {liq.cashAdvanceId && (
            <SummaryCard title="Source Cash Advance">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-700 font-bold">
                  CADV-{liq.cashAdvanceId.substring(0,6).toUpperCase()} requested for: "{linkedCa?.purpose || 'Business Expense'}"
                </p>
                <Link
                  to={`/cash-advances/${liq.cashAdvanceId}`}
                  className="bg-brand text-white text-[10px] font-bold px-4 py-2 rounded uppercase tracking-wider font-display hover:bg-brand-hover shadow-sm transition-all text-center inline-block shrink-0"
                >
                  View Cash Advance
                </Link>
              </div>
            </SummaryCard>
          )}

          {/* COMMENTS */}
          <SummaryCard title="Comments">
            <Comments
              comments={historyToComments(liq.history)}
              emptyText="No reviewer remarks have been recorded on this liquidation yet."
            />
          </SummaryCard>

          {/* AUDIT HISTORY */}
          <SummaryCard title="Audit History">
            <ClaimActivityTimeline history={liq.history} />
          </SummaryCard>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleClose}
            className="bg-white border border-slate-300 text-slate-700 text-xs px-4 py-2 rounded font-bold hover:bg-slate-100 uppercase tracking-wider font-display shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
