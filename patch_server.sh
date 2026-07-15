sed -i '167,174c\
    let relevantMoms = [];\
    if (user.role === UserRole.REQUESTOR) {\
      relevantMoms = moms.filter(m => m.requestor_id === user.id);\
    } else if (user.role === UserRole.APPROVER) {\
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);\
      relevantMoms = moms.filter(m => m.requestor_id === user.id || (m.requestor_id && reporteeIds.includes(m.requestor_id)));\
    }\
' server.ts
sed -i '293,301c\
    let filtered: Claim[] = [];\
    if (user.role === UserRole.REQUESTOR) {\
      filtered = claims.filter(c => c.requestor_id === user.id);\
    } else if (user.role === UserRole.APPROVER) {\
      filtered = claims.filter(c => c.current_approver_id === user.id || c.original_approver_id === user.id || c.requestor_id === user.id);\
    } else if (user.role === UserRole.CUSTODIAN) {\
      filtered = claims.filter(c => [ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(c.status));\
    } else if (user.role === UserRole.ADMIN) {\
      filtered = claims; // Admin sees all\
    }\
' server.ts
