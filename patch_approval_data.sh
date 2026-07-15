sed -i '/const totalAmountPending = pendingApprovals.reduce/i \
  const approverClaims = allClaims.filter(c => c.current_approver_id === user?.id || c.original_approver_id === user?.id);\
  const spendByDept = approverClaims\
    .filter(c => [ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(c.status))\
    .reduce((acc, c) => {\
      const dept = c.requestor?.department || "General";\
      acc[dept] = (acc[dept] || 0) + c.total_amount;\
      return acc;\
    }, {} as Record<string, number>);\
  const deptData = Object.entries(spendByDept).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);\
' src/pages/ApprovalQueue.tsx
