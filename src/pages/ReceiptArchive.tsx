import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { UserRole } from '../types';
import { apiFetch } from '../lib/api';
import { ReceiptThumbnail } from '../components/ReceiptThumbnail';
import { formatPHP } from '../utils';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Archive, 
  MagnifyingGlass, 
  Funnel, 
  Calendar, 
  Tag, 
  Building, 
  User, 
  Hash, 
  X, 
  List, 
  SquaresFour, 
  ArrowLeft, 
  ArrowRight,
  Receipt,
  FileText,
  Clock
} from '@phosphor-icons/react';
import Papa from 'papaparse';
import { DownloadSimple } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

interface ReceiptRecord {
  id: string;
  sourceId: string;
  parentId: string;
  parentType: 'Claim' | 'Liquidation';
  parentNumber: string;
  receipt_url: string;
  or_number: string;
  vendor: string;
  amount: number;
  expense_date: string;
  category: string;
  business_purpose: string;
  requestor_name: string;
  requestor_department: string;
}

export const Receipts: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [vendorSearch, setVendorSearch] = useState<string>('');
  const [orSearch, setOrSearch] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [generalSearch, setGeneralSearch] = useState<string>('');

  // UI States
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 50;

  // Active Receipt Preview modal state
  const [previewItem, setPreviewItem] = useState<ReceiptRecord | null>(null);

  const handleExport = () => {
    if (filteredReceipts.length === 0) return;
    const csv = Papa.unparse(filteredReceipts.map(r => ({
      'Receipt URL': r.receipt_url,
      'OR Number': r.or_number,
      'Vendor': r.vendor,
      'Amount': r.amount,
      'Date': r.expense_date,
      'Category': r.category,
      'Purpose': r.business_purpose,
      'Requestor': r.requestor_name,
      'Department': r.requestor_department,
      'Parent Type': r.parentType,
      'Parent Number': r.parentNumber
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'receipt_archive.csv';
    link.click();
  };


  useEffect(() => {
    // Only Admin can access
    if (user && user.role !== UserRole.ADMIN) {
      navigate('/');
      return;
    }

    setLoading(true);
    apiFetch('/api/receipts')
      .then((data: any) => {
        setReceipts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load receipts:', err);
        setError('Failed to retrieve the receipt archive. Please try again.');
        setLoading(false);
      });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-7 w-48 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 h-24 animate-pulse flex items-center justify-between">
          <div className="flex gap-4 w-full">
            <div className="h-10 bg-slate-100 rounded flex-1"></div>
            <div className="h-10 bg-slate-100 rounded flex-1"></div>
            <div className="h-10 bg-slate-100 rounded flex-1"></div>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white border border-slate-200 rounded-xl">
          <div className="h-8 bg-slate-100 rounded-md w-full"></div>
          <div className="h-12 bg-slate-50 rounded-md w-full"></div>
          <div className="h-12 bg-slate-50 rounded-md w-full"></div>
          <div className="h-12 bg-slate-50 rounded-md w-full"></div>
        </div>
      </div>
    );
  }

  // Derive unique departments for filtering
  const departments = Array.from(new Set(receipts.map(r => r.requestor_department))).sort();

  // Filter receipt logs
  const filteredReceipts = receipts.filter(item => {
    const matchesGeneral = !generalSearch || 
      item.requestor_name.toLowerCase().includes(generalSearch.toLowerCase()) ||
      item.parentNumber.toLowerCase().includes(generalSearch.toLowerCase()) ||
      item.business_purpose.toLowerCase().includes(generalSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(generalSearch.toLowerCase());

    const matchesVendor = !vendorSearch || item.vendor.toLowerCase().includes(vendorSearch.toLowerCase());
    const matchesOr = !orSearch || item.or_number.toLowerCase().includes(orSearch.toLowerCase());
    const matchesDept = selectedDepartment === 'All' || item.requestor_department === selectedDepartment;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && item.expense_date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && item.expense_date <= endDate;
    }

    return matchesGeneral && matchesVendor && matchesOr && matchesDept && matchesDate;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReceipts = filteredReceipts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setGeneralSearch('');
    setVendorSearch('');
    setOrSearch('');
    setSelectedDepartment('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Archive className="w-5 h-5 text-brand" /> Receipt Archive
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Comprehensive system-wide receipt audit and compliance repository for all claims and liquidations.
          </p>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto shadow-2xs">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-bold transition-all ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grid View"
          >
            <SquaresFour className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {/* Audit/Filter Control Suite */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        {/* Row 1: Search Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* General Query */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <MagnifyingGlass className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search submitter, reference, purpose..."
              value={generalSearch}
              onChange={e => { setGeneralSearch(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:border-brand focus:ring-brand focus:outline-none bg-white text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Vendor Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Building className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Filter by vendor..."
              value={vendorSearch}
              onChange={e => { setVendorSearch(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:border-brand focus:ring-brand focus:outline-none bg-white text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* OR Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Hash className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Filter by Official Receipt No..."
              value={orSearch}
              onChange={e => { setOrSearch(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:border-brand focus:ring-brand focus:outline-none bg-white text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Row 2: Advanced filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-3.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Department Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Department:</span>
              <select
                value={selectedDepartment}
                onChange={e => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
                className="border border-slate-300 rounded px-2.5 py-1 text-xs focus:border-brand focus:ring-brand focus:outline-none bg-white text-slate-700"
              >
                <option value="All">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="border border-slate-300 rounded px-2 py-1 text-xs focus:border-brand focus:outline-none bg-white text-slate-700"
              />
            </div>

            {/* Date Range End */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="border border-slate-300 rounded px-2 py-1 text-xs focus:border-brand focus:outline-none bg-white text-slate-700"
              />
            </div>
          </div>

          {/* Reset Filters / Stats */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-4 shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Found <strong className="text-slate-900">{filteredReceipts.length}</strong> matching records
            </span>
            
            {(generalSearch || vendorSearch || orSearch || selectedDepartment !== 'All' || startDate || endDate) && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={filteredReceipts.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <DownloadSimple className="w-4 h-4" />
              Export CSV
            </button>

          </div>
        </div>
      </div>

      {/* Content Renderers */}
      {filteredReceipts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3.5" />
          <h3 className="font-bold text-slate-800 text-sm">No Matching Receipts found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Try revising your search terms or clearing current filters to view the complete archive.
          </p>
          {(generalSearch || vendorSearch || orSearch || selectedDepartment !== 'All' || startDate || endDate) && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold shadow-xs transition-all"
            >
              Show All Receipts
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (TABULAR SCANNABLE AUDIT LOG) */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display">Receipt Thumbnail</th>
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display">OR Number</th>
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display">Vendor & Category</th>
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display">Requestor</th>
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display">Reference Doc</th>
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display">Expense Date</th>
                  <th className="px-4 py-3 text-right text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedReceipts.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3.5">
                      <ReceiptThumbnail
                        url={rec.receipt_url}
                        orNumber={rec.or_number}
                        vendor={rec.vendor}
                        onClick={() => setPreviewItem(rec)}
                        size="sm"
                        className="cursor-zoom-in"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      {rec.or_number ? (
                        <span className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold">
                          {rec.or_number}
                        </span>
                      ) : (
                        rec.receipt_url === 'No Official Receipt' ? (
                          <span className="text-[9px] text-amber-700 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                            Exception
                          </span>
                        ) : (
                          <span className="text-[9px] text-rose-700 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                            Missing OR
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{rec.vendor}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{rec.category}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{rec.requestor_name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{rec.requestor_department}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={rec.parentType === 'Claim' ? `/claims/${rec.parentId}` : `/liquidations/${rec.parentId}`}
                        className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover font-bold hover:underline"
                      >
                        <FileText className="w-3.5 h-3.5" /> {rec.parentNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-600">{rec.expense_date}</td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-950 font-display">{formatPHP(rec.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* BENTO-STYLE GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedReceipts.map(rec => (
            <div 
              key={rec.id} 
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col group relative"
            >
              {/* Receipt Visual Header */}
              <div className="bg-slate-100 h-36 flex items-center justify-center relative border-b border-slate-100 overflow-hidden">
                <ReceiptThumbnail
                  url={rec.receipt_url}
                  orNumber={rec.or_number}
                  vendor={rec.vendor}
                  onClick={() => setPreviewItem(rec)}
                  size="lg"
                  className="w-full h-full rounded-none"
                />
                
                {/* Overlay details icon on hover */}
                <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="bg-white/90 text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-auto cursor-pointer" onClick={() => setPreviewItem(rec)}>
                    View Full Screen
                  </span>
                </div>

                {/* Parent Doc Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <Link 
                    to={rec.parentType === 'Claim' ? `/claims/${rec.parentId}` : `/liquidations/${rec.parentId}`}
                    className="bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-extrabold px-2 py-0.5 rounded shadow-sm hover:bg-brand hover:underline flex items-center gap-1"
                  >
                    {rec.parentNumber}
                  </Link>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">
                      {rec.category}
                    </span>
                    {rec.or_number ? (
                      <span className="text-[9px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                        OR: {rec.or_number}
                      </span>
                    ) : (
                      rec.receipt_url === 'No Official Receipt' ? (
                        <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase font-bold shrink-0">
                          Exception
                        </span>
                      ) : (
                        <span className="text-[9px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase font-bold shrink-0">
                          No OR
                        </span>
                      )
                    )}
                  </div>

                  <h4 className="font-extrabold text-slate-950 text-sm line-clamp-1 mb-1 leading-tight group-hover:text-brand transition-colors">
                    {rec.vendor}
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{rec.requestor_name} ({rec.requestor_department})</span>
                  </div>
                </div>

                {/* Footer specs */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {rec.expense_date}
                  </span>
                  <span className="text-sm font-black text-slate-950 font-display">
                    {formatPHP(rec.amount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">
            Showing <strong className="text-slate-900">{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredReceipts.length)}</strong> of <strong className="text-slate-900">{filteredReceipts.length}</strong> records
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center text-xs font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Overlay Modal */}
      <AnimatePresence>
        {previewItem && previewItem.receipt_url && previewItem.receipt_url !== 'No Official Receipt' && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" id="archive_preview_modal">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewItem(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-lg shadow-2xl overflow-hidden max-w-4xl w-full h-[80vh] flex flex-col md:flex-row relative z-10 border border-slate-200"
            >
              {/* Image Section */}
              <div className="flex-1 bg-slate-900 flex items-center justify-center p-0 relative group overflow-hidden border-b md:border-b-0 md:border-r border-slate-200">
                {previewItem.receipt_url.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={previewItem.receipt_url} className="w-full h-full border-0" title="PDF Document" />
                ) : (
                  <img
                    src={previewItem.receipt_url}
                    alt={previewItem.vendor || 'Receipt'}
                    className="max-w-full max-h-full object-contain rounded shadow-lg transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                )}
              </div>

              {/* Sidebar Info Section */}
              <div className="w-full md:w-[320px] bg-slate-50 flex flex-col p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Receipt Details</span>
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5 flex-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display">Vendor / Establishment</span>
                    <h3 className="font-extrabold text-slate-950 text-base leading-snug mt-0.5">{previewItem.vendor || 'Unknown Vendor'}</h3>
                  </div>

                  <div className="bg-white border border-slate-200 rounded p-4 space-y-3 shadow-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Amount</span>
                      <span className="text-base font-black text-brand font-display">{formatPHP(previewItem.amount)}</span>
                    </div>

                    {previewItem.or_number && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Official Receipt (OR) No.</span>
                        <span className="inline-block mt-1 text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                          {previewItem.or_number}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Date of Expense</span>
                        <span className="text-slate-700 font-semibold">{previewItem.expense_date}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Expense Category</span>
                        <span className="text-slate-700 font-semibold">{previewItem.category}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Submitted By</span>
                        <span className="text-slate-700 font-semibold">{previewItem.requestor_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium block">{previewItem.requestor_department}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Associated Document</span>
                        <Link 
                          to={previewItem.parentType === 'Claim' ? `/claims/${previewItem.parentId}` : `/liquidations/${previewItem.parentId}`}
                          className="text-brand hover:text-brand-hover font-bold hover:underline block mt-0.5"
                        >
                          {previewItem.parentNumber} ({previewItem.parentType})
                        </Link>
                      </div>
                    </div>

                    {previewItem.business_purpose && (
                      <div className="flex items-start gap-2">
                        <Archive className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Purpose / Remarks</span>
                          <span className="text-slate-600 font-medium leading-relaxed block mt-0.5">{previewItem.business_purpose}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 mt-6 flex gap-2">
                  <a
                    href={previewItem.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-center text-xs font-bold transition-colors font-display"
                  >
                    Open Original
                  </a>
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-colors font-display"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
