import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { apiFetch } from '../lib/api';
import { Claim, ImportBatch, UserRole } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';
import { UploadSimple, FileCsv, CheckCircle, Warning, CaretDown, CaretUp, Plus, Trash } from '@phosphor-icons/react';
import { format } from 'date-fns';

export const HistoricalImport: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [existingClaims, setExistingClaims] = useState<Claim[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const [showBatches, setShowBatches] = useState(false);
  
  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      apiFetch('/api/claims').then(data => setExistingClaims(data)).catch(console.error);
      apiFetch('/api/imports').then(data => setImportBatches(data)).catch(console.error);
    }
  }, [user]);

  const handleDownloadTemplate = () => {
    const csvContent = "claim_number,requestor_id,total_amount,expense_category,expense_date,vendor,remarks\nREIM-2023-001,user-id-here,150.00,Travel,2023-01-15,Delta Airlines,Flight to NYC\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'historical_claims_template.csv';
    link.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParsedRows([]);
    }
  };

  const processFile = () => {
    if (!file) return;
    setParsing(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row: any) => {
          const errors: string[] = [];
          
          if (!row.requestor_id) errors.push("Missing requestor_id");
          if (!row.total_amount || isNaN(Number(row.total_amount)) || Number(row.total_amount) <= 0) {
            errors.push("Invalid or missing total_amount");
          }
          if (!row.expense_date || isNaN(Date.parse(row.expense_date))) {
            errors.push("Invalid or missing expense_date (use YYYY-MM-DD)");
          }
          
          // Check for duplicates
          let isDuplicate = false;
          if (row.claim_number) {
            isDuplicate = existingClaims.some(c => c.claim_number === row.claim_number);
          } else {
             // Heuristic: requestor + amount
             isDuplicate = existingClaims.some(c => c.requestor_id === row.requestor_id && c.total_amount === Number(row.total_amount));
          }
          
          if (isDuplicate) {
             errors.push("Likely duplicate (matching claim_number or requestor+amount found)");
          }
          
          return {
            ...row,
            isValid: errors.length === 0,
            errors
          };
        });
        
        setParsedRows(rows);
        setParsing(false);
      },
      error: (error) => {
        toast.error(`Error parsing file: ${error.message}`);
        setParsing(false);
      }
    });
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }
    
    setUploading(true);
    
    // Transform rows to expected backend format
    const records = validRows.map(row => ({
       claim_number: row.claim_number || undefined,
       requestor_id: row.requestor_id,
       total_amount: Number(row.total_amount),
       expense_category: row.expense_category || 'Other',
       remarks: row.remarks || '',
       created_at: new Date(row.expense_date).toISOString(), // Use expense date for created_at approximation
       lineItems: [
         {
           expense_date: row.expense_date,
           vendor: row.vendor || 'Historical Vendor',
           category: row.expense_category || 'Other',
           amount: Number(row.total_amount),
           business_purpose: row.remarks || 'Historical record'
         }
       ]
    }));
    
    try {
      const result = await apiFetch('/api/imports', {
        method: 'POST',
        body: JSON.stringify({
          filename: file?.name,
          records
        })
      });
      
      toast.success(`Successfully imported ${records.length} historical claims.`);
      setFile(null);
      setParsedRows([]);
      setImportBatches(prev => [...prev, result]);
      
      // Refresh claims list
      apiFetch('/api/claims').then(data => setExistingClaims(data)).catch(console.error);
    } catch (err: any) {
      toast.error(err.message || 'Failed to import data');
    } finally {
      setUploading(false);
    }
  };

  if (user?.role !== UserRole.ADMIN) return null;

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h4 className="text-sm font-extrabold text-slate-900 font-display mb-2 uppercase tracking-wider">Historical Data Import</h4>
      <p className="text-xs text-slate-600 mb-4">
        Import past claims from external systems. Imported records will be marked as Completed and added to historical logs without triggering new approval workflows.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button onClick={handleDownloadTemplate} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2">
           <FileCsv className="w-4 h-4 text-green-600" />
           Download CSV Template
        </button>
        
        <div className="flex-1 flex items-center gap-2">
           <input 
             type="file" 
             accept=".csv" 
             onChange={handleFileChange}
             className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer border border-slate-200 rounded p-1"
           />
           <button 
             onClick={processFile} 
             disabled={!file || parsing}
             className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-800 disabled:opacity-50 shadow-sm"
           >
             {parsing ? 'Parsing...' : 'Analyze'}
           </button>
        </div>
      </div>
      
      {parsedRows.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-6">
           <div className="flex justify-between items-center mb-4">
              <h5 className="text-xs font-bold text-slate-800 uppercase">Preview & Validation</h5>
              <div className="flex gap-4 text-xs font-bold">
                 <span className="text-green-600">{validCount} Valid</span>
                 <span className="text-red-500">{invalidCount} Invalid</span>
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-xs mb-4 border-collapse">
               <thead>
                 <tr className="border-b border-slate-300">
                   <th className="p-2">Status</th>
                   <th className="p-2">Requestor ID</th>
                   <th className="p-2">Date</th>
                   <th className="p-2">Amount</th>
                   <th className="p-2">Claim #</th>
                   <th className="p-2">Remarks/Issues</th>
                 </tr>
               </thead>
               <tbody>
                 {parsedRows.slice(0, 20).map((row, idx) => (
                   <tr key={idx} className={`border-b border-slate-200 ${!row.isValid ? 'bg-red-50' : ''}`}>
                     <td className="p-2">
                       {row.isValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Warning className="w-4 h-4 text-red-500" />}
                     </td>
                     <td className="p-2 font-mono">{row.requestor_id}</td>
                     <td className="p-2">{row.expense_date}</td>
                     <td className="p-2">{row.total_amount}</td>
                     <td className="p-2">{row.claim_number}</td>
                     <td className="p-2">
                       {!row.isValid ? (
                         <ul className="list-disc pl-4 text-red-600">
                           {row.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                         </ul>
                       ) : <span className="text-slate-400">OK</span>}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             {parsedRows.length > 20 && (
                <div className="text-center text-xs text-slate-500 italic mt-2">Showing 20 of {parsedRows.length} rows...</div>
             )}
           </div>
           
           <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
             <button onClick={() => { setFile(null); setParsedRows([]); }} className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50">Cancel</button>
             <button 
               onClick={handleConfirmImport} 
               disabled={validCount === 0 || uploading}
               className="px-4 py-2 bg-brand text-white text-xs font-bold rounded hover:bg-brand-hover disabled:opacity-50 shadow-sm flex items-center gap-2 uppercase tracking-wider"
             >
               <UploadSimple className="w-4 h-4" /> 
               {uploading ? 'Importing...' : `Import ${validCount} Valid Records`}
             </button>
           </div>
        </div>
      )}
      
      {importBatches.length > 0 && (
         <div className="mt-8">
            <button onClick={() => setShowBatches(!showBatches)} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wider">
               {showBatches ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
               Past Import Batches ({importBatches.length})
            </button>
            
            {showBatches && (
               <div className="mt-3 bg-white border border-slate-200 rounded overflow-hidden">
                 <table className="w-full text-left text-xs border-collapse">
                   <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                       <th className="p-3 font-semibold text-slate-600 uppercase">Batch ID</th>
                       <th className="p-3 font-semibold text-slate-600 uppercase">File</th>
                       <th className="p-3 font-semibold text-slate-600 uppercase">Records</th>
                       <th className="p-3 font-semibold text-slate-600 uppercase">Date</th>
                     </tr>
                   </thead>
                   <tbody>
                     {importBatches.map(batch => (
                        <tr key={batch.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-500">{batch.id.substring(0, 8)}</td>
                          <td className="p-3">{batch.filename}</td>
                          <td className="p-3">{batch.total_records}</td>
                          <td className="p-3">{format(new Date(batch.imported_at), 'MMM d, yyyy HH:mm')}</td>
                        </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            )}
         </div>
      )}
    </div>
  );
};
