sed -i '/const totalReimbursed =/i \
  const spendByCategory = claims\
    .filter(c => [ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(c.status))\
    .reduce((acc, c) => {\
      const cat = c.expense_category || "Meals";\
      acc[cat] = (acc[cat] || 0) + c.total_amount;\
      return acc;\
    }, {} as Record<string, number>);\
  const categoryData = Object.entries(spendByCategory).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);\
' src/pages/Dashboard.tsx
