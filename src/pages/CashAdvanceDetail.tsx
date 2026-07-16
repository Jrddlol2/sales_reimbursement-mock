import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import { CashAdvance, Mom, User, UserRole } from '../types';
import { formatPHP } from '../utils';
import { ClaimActivityTimeline } from '../components/ClaimActivityTimeline';
import { ArrowLeft, Clock, Calendar, FileText, User as UserIcon, Link as LinkIcon } from '@phosphor-icons/react';
import { StatusBadge } from '../components/StatusBadge';
import { DetailHeader } from '../components/DetailHeader';
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

interface CashAdvanceDetailProps {
  id?: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

export const CashAdvanceDetail: React.FC<CashAdvanceDetailProps> = ({ id: propId, onClose, onUpdate }) => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId || routeId || '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [ca, setCa] = useState<any | null>(null);
  const [moms, setMoms] = useState<Mom[]>([]);
  const [loading, setLoading] = useState(true);
  const [liquidations, setLiquidations] = useState<any[]>([]);

  const handleClose = onClose || (() => navigate(-1));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [caData, momsData, liqsData] = await Promise.all([
        apiFetch(`/api/cash-advances/${id}`),
        apiFetch('/api/moms'),
        apiFetch('/api/liquidations')
      ]);
      setCa(caData);
      setMoms(momsData);
      setLiquidations(liqsData);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load Cash Advance details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium italic">
        Reading cash advance database...
      </div>
    );
  }

  if (!ca) {
    return (
      <div className="p-8 text-center text-red-500 font-medium italic">
        Cash Advance not found or unauthorized access.
      </div>
    );
  }

  const linkedLiq = liquidations.find(l => l.cashAdvanceId === ca.id);
  const linkedMom = ca.momId ? moms.find(m => m.id === ca.momId) : null;

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
          eyebrow="Cash Advance Request"
          title={`CADV-${ca.id.substring(0, 6).toUpperCase()}`}
          status={<StatusBadge status={ca.status} />}
        />

        <div className="p-6 space-y-6">
          {/* SUMMARY */}
          <SummaryCard title="Summary">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Requestor</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800">{ca.requestor?.name || 'Loading...'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Assigned Approver</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800">{ca.approver?.name || 'Loading...'}</span>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Linked Meeting</span>
                {linkedMom ? (
                  <Link
                    to={`/moms/${linkedMom.id}`}
                    className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline mt-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {linkedMom.client} - {linkedMom.purpose}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-500 block mt-1">None</span>
                )}
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display mb-1">Business Purpose</span>
                <p className="text-slate-700 font-medium bg-slate-50 border border-brand/10 rounded p-3 leading-relaxed whitespace-pre-wrap">
                  {ca.purpose}
                </p>
              </div>
            </div>
          </SummaryCard>

          {/* FINANCIAL INFORMATION */}
          <SummaryCard title="Financial Information">
            <div>
              <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Amount Requested</span>
              <span className="text-slate-900 text-2xl font-black font-display">{formatPHP(ca.amount)}</span>
            </div>
          </SummaryCard>

          {/* Cross Navigation Link */}
          <SummaryCard title="Linked Liquidation">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-700 font-bold">
                {linkedLiq
                  ? `Liquidation report (LIQ-${linkedLiq.id.substring(0,6).toUpperCase()}) is currently in ${linkedLiq.status} stage.`
                  : 'No liquidation report has been filed yet for this released advance.'}
              </p>
              {linkedLiq && (
                <Link
                  to={`/liquidations/${linkedLiq.id}`}
                  className="bg-brand text-white text-[10px] font-bold px-4 py-2 rounded uppercase tracking-wider font-display hover:bg-brand-hover shadow-sm transition-all text-center inline-block shrink-0"
                >
                  Open Liquidation
                </Link>
              )}
            </div>
          </SummaryCard>

          {/* COMMENTS */}
          <SummaryCard title="Comments">
            <Comments
              comments={historyToComments(ca.history)}
              emptyText="No approver or custodian remarks have been recorded on this cash advance yet."
            />
          </SummaryCard>

          {/* AUDIT HISTORY */}
          <SummaryCard title="Audit History">
            <ClaimActivityTimeline history={ca.history} />
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
