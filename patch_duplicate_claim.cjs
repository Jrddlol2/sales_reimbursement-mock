const fs = require('fs');
const file = 'src/pages/SubmitClaim.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('duplicateData')) {
  content = content.replace(
    "import { useNavigate, useParams, Link } from 'react-router-dom';",
    "import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';"
  );
  
  const setupCode = `  const { id: resubmitClaimId } = useParams();
  const location = useLocation();
  const duplicateData = location.state?.duplicateData as any;
  const isResubmit = !!resubmitClaimId;`;
  
  content = content.replace(
    "  const { id: resubmitClaimId } = useParams();\n  const isResubmit = !!resubmitClaimId;",
    setupCode
  );
  
  // Update the draft effect
  const draftEffect = `
  // Unsaved changes & autosave & duplicate
  useEffect(() => {
    if (isResubmit) return; // Don't autosave/load on resubmission
    
    // Load duplicate data if available
    if (duplicateData) {
      if (duplicateData.mom_id) setSelectedMomId(duplicateData.mom_id);
      if (duplicateData.remarks) setRemarks(duplicateData.remarks + ' (Copy)');
      if (duplicateData.expenses) {
        setLineItems(duplicateData.expenses.map((e: any) => ({
          id: Math.random().toString(),
          category: e.category,
          amount: String(e.amount),
          receiptName: '',
          or_number: e.or_number || ''
        })));
      }
      toast.info('Claim details duplicated.');
      // Clear history state to avoid re-duplicating on reload
      window.history.replaceState({}, document.title);
      return;
    }
    
    // Load draft on mount`;
    
  content = content.replace(
    "  // Unsaved changes & autosave\n  useEffect(() => {\n    if (isResubmit) return; // Don't autosave/load on resubmission\n    \n    // Load draft on mount",
    draftEffect
  );
  
  fs.writeFileSync(file, content);
}
