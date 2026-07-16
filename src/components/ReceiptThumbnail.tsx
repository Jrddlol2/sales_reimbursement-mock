import React from 'react';
import { Paperclip, Warning, FileImage, FilePdf } from '@phosphor-icons/react';

export interface ReceiptThumbnailProps {
  url?: string;
  orNumber?: string;
  vendor?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ReceiptThumbnail: React.FC<ReceiptThumbnailProps> = ({
  url,
  orNumber,
  vendor,
  onClick,
  size = 'sm',
  className = '',
}) => {
  const isNoReceipt = !url || url === 'No Official Receipt' || url.trim() === '';
  const isMissing = !url || url.trim() === '';
  const isNoReceiptPolicy = url === 'No Official Receipt';

  const sizeClasses = {
    sm: 'w-12 h-12 text-[10px]',
    md: 'w-16 h-16 text-xs',
    lg: 'w-24 h-24 text-xs',
    xl: 'w-32 h-32 text-sm',
  }[size];

  const contentClass = `relative flex items-center justify-center rounded overflow-hidden select-none border transition-all ${
    onClick ? 'cursor-pointer hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]' : ''
  } ${className} ${sizeClasses}`;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  // 1. Missing Receipt Status
  if (isMissing) {
    return (
      <div
        onClick={handleClick}
        className={`${contentClass} bg-rose-50 border-rose-200 text-rose-700 flex flex-col items-center justify-center p-1 text-center font-semibold`}
        title="Genuinely missing receipt"
      >
        <Warning className={`${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} mb-0.5 text-rose-500`} />
        <span className="leading-tight text-[10px]">Missing Receipt</span>
      </div>
    );
  }

  // 2. "No Official Receipt" Policy Exception Status
  if (isNoReceiptPolicy) {
    return (
      <div
        onClick={handleClick}
        className={`${contentClass} bg-amber-50 border-amber-200 text-amber-700 flex flex-col items-center justify-center p-1 text-center font-semibold`}
        title="No Official Receipt (Policy Exception)"
      >
        <Warning className={`${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} mb-0.5 text-amber-500`} />
        <span className="leading-tight text-[9px]">No Official Receipt</span>
      </div>
    );
  }

  // 3. Normal Receipt Attachment
  const isPdf = url.toLowerCase().endsWith('.pdf');

  return (
    <div
      onClick={handleClick}
      className={`${contentClass} bg-slate-50 border-slate-200 text-slate-600`}
      title={vendor ? `Receipt from ${vendor}` : 'View Receipt'}
    >
      {isPdf ? (
        <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full bg-red-50 text-red-700">
          <FilePdf className={`${size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'} mb-0.5 text-red-500`} />
          <span className="leading-tight text-[9px] font-mono truncate max-w-full">PDF</span>
        </div>
      ) : (
        <img
          src={url}
          alt={vendor ? `Receipt from ${vendor}` : 'Receipt'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as any).style.display = 'none';
            const sib = (e.target as any).nextElementSibling;
            if (sib) sib.style.display = 'flex';
          }}
        />
      )}
      {/* Fallback helper when img error triggers */}
      {!isPdf && (
        <div className="hidden absolute inset-0 flex-col items-center justify-center bg-slate-100 text-slate-500 p-1 text-center font-medium">
          <FileImage className="w-5 h-5 mb-0.5 text-slate-400" />
          <span className="text-[9px]">Receipt</span>
        </div>
      )}
    </div>
  );
};
