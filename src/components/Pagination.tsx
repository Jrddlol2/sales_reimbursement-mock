import React, { useState, useMemo } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

// One shared pagination control + a hook to drive it, so every list page
// slices its data and renders page controls the same way instead of each
// hand-rolling its own (previously: 4 different implementations, 3 pages
// with none at all, and one with a decorative pager that didn't actually
// do anything).

export function usePagination<T>(items: T[], itemsPerPage: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  // Clamp instead of getting stuck on a page that no longer exists once a
  // filter shrinks the list.
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = useMemo(
    () => items.slice(startIndex, startIndex + itemsPerPage),
    [items, startIndex, itemsPerPage]
  );

  return { currentPage, setPage, totalPages, startIndex, paginatedItems, totalItems: items.length };
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  /** Plural noun for the summary line, e.g. "users", "transactions". Defaults to "results". */
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage, totalPages, onPageChange, totalItems, itemsPerPage, itemLabel = 'results', className = '',
}) => {
  if (totalPages <= 1) return null;
  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-white px-6 py-4 rounded-b-xl ${className}`}>
      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to{' '}
        <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span>{' '}
        of <span className="font-semibold text-slate-700">{totalItems}</span> {itemLabel}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-xs font-semibold rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
        >
          <CaretLeft className="w-3 h-3" /> Previous
        </button>
        {Array.from({ length: totalPages }).map((_, i) => {
          const pageNum = i + 1;
          if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
            if (pageNum === 2 || pageNum === totalPages - 1) {
              return <span key={pageNum} className="text-xs text-slate-400 px-1">...</span>;
            }
            return null;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              aria-current={currentPage === pageNum ? 'page' : undefined}
              className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-md transition-all ${
                currentPage === pageNum
                  ? 'bg-brand text-white border border-brand'
                  : 'border border-gray-200 text-gray-600 hover:bg-slate-50'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-xs font-semibold rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
        >
          Next <CaretRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
