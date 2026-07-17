const fs = require('fs');
const file = 'src/pages/SubmitClaim.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('AUTOSAVE_KEY')) {
  const autosaveLogic = `
  const AUTOSAVE_KEY = 'reimbursement_draft_v1';
  
  // Unsaved changes & autosave
  useEffect(() => {
    if (isResubmit) return; // Don't autosave/load on resubmission
    
    // Load draft on mount
    try {
      const draftStr = localStorage.getItem(AUTOSAVE_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.requestType) setRequestType(draft.requestType);
        if (draft.selectedMomId) setSelectedMomId(draft.selectedMomId);
        if (draft.remarks) setRemarks(draft.remarks);
        if (draft.meetingDate) setMeetingDate(draft.meetingDate);
        if (draft.meetingTime) setMeetingTime(draft.meetingTime);
        if (draft.lineItems && draft.lineItems.length > 0) setLineItems(draft.lineItems);
        if (draft.advanceAmount) setAdvanceAmount(draft.advanceAmount);
        if (draft.advancePurpose) setAdvancePurpose(draft.advancePurpose);
        toast.info('Loaded your unsaved draft.');
      }
    } catch (e) {
      console.error('Failed to parse draft', e);
    }
  }, []);

  useEffect(() => {
    if (isResubmit || loading) return;
    
    const draft = {
      requestType, selectedMomId, remarks, meetingDate, meetingTime, lineItems, advanceAmount, advancePurpose
    };
    const hasData = remarks || advancePurpose || (lineItems.length > 0 && lineItems[0].amount);
    
    if (hasData) {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
    }
    
    // Before unload warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasData) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [requestType, selectedMomId, remarks, meetingDate, meetingTime, lineItems, advanceAmount, advancePurpose, isResubmit, loading]);
  `;
  
  content = content.replace(
    "const hasMeetingConflict = !!meetingDate && !!meetingTime && approverSlots.some(",
    autosaveLogic + "\n  const hasMeetingConflict = !!meetingDate && !!meetingTime && approverSlots.some("
  );
  
  // Clear draft on successful submit
  content = content.replace(
    "toast.success('Reimbursement claim submitted successfully');",
    "localStorage.removeItem(AUTOSAVE_KEY);\n      toast.success('Reimbursement claim submitted successfully');"
  );
  content = content.replace(
    "toast.success('Cash advance submitted successfully');",
    "localStorage.removeItem(AUTOSAVE_KEY);\n      toast.success('Cash advance submitted successfully');"
  );
  
  fs.writeFileSync(file, content);
}
