import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import { CashAdvance, CashAdvanceStatus, Mom, User, UserRole } from '../types';
import { formatPHP } from '../utils';
import { ClaimActivityTimeline } from '../components/ClaimActivityTimeline';
import { ArrowLeft, Clock, Calendar, FileText, User as UserIcon, Link as LinkIcon } from 'lucide-react';

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
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase font-display tracking-wider">Cash Advance Request</span>
            <h2 className="text-lg font-extrabold text-slate-950 font-mono tracking-wider uppercase mt-0.5">CADV-{ca.id.substring(0, 6).toUpperCase()}</h2>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              ca.status === CashAdvanceStatus.DRAFT ? 'bg-gray-100 text-gray-700' :
              ca.status === CashAdvanceStatus.SUBMITTED ? 'bg-blue-100 text-blue-700' :
              ca.status === CashAdvanceStatus.APPROVED ? 'bg-indigo-100 text-indigo-700' :
              ca.status === CashAdvanceStatus.REJECTED ? 'bg-rose-100 text-rose-700' :
              ca.status === CashAdvanceStatus.RELEASED ? 'bg-green-100 text-green-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              {ca.status}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Amount Requested</span>
                <span className="text-slate-900 text-2xl font-black font-display">{formatPHP(ca.amount)}</span>
              </div>
              
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Requestor</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">{ca.requestor?.name || 'Loading...'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Linked Meeting (MOM)</span>
                {linkedMom ? (
                  <Link
                    to="/moms"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline mt-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {linkedMom.client} - {linkedMom.purpose}
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-slate-500 block mt-1">None</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display">Assigned Approver</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">{ca.approver?.name || 'Loading...'}</span>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <span className="text-slate-400 block uppercase text-[10px] tracking-wider font-extrabold font-display mb-1">Business Purpose</span>
              <p className="text-slate-700 text-xs font-medium bg-slate-50 border border-slate-100 rounded p-3 leading-relaxed whitespace-pre-wrap">
                {ca.purpose}
              </p>
            </div>
          </div>

          {/* Cross Navigation Link */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Linked Liquidation</span>
              <p className="text-xs text-slate-700 font-bold">
                {linkedLiq 
                  ? `Liquidation report (LIQ-${linkedLiq.id.substring(0,6).toUpperCase()}) is currently in ${linkedLiq.status} stage.`
                  : 'No liquidation report has been filed yet for this released advance.'}
              </p>
            </div>
            {linkedLiq && (
              <Link
                to={`/liquidations/${linkedLiq.id}`}
                className="bg-brand text-white text-[10px] font-bold px-4 py-2 rounded uppercase tracking-wider font-display hover:bg-brand-hover shadow-sm transition-all text-center inline-block shrink-0"
              >
                Open Liquidation
              </Link>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider font-display border-b border-slate-100 pb-2">Activity History Timeline</h4>
            <ClaimActivityTimeline history={ca.history} />
          </div>
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
