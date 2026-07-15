sed -i '/const handleQuickFill = () => {/i \
  const handleSimulateDuplicate = () => {\
    if (moms.length === 0) {\
      toast.error('\''You must have at least one Completed MOM to use this demo.'\'');\
      return;\
    }\
    setSelectedMomId(moms[0].id);\
    setLineItems([\
      { id: Math.random().toString(), category: '\''Client Meals'\'', amount: '\''1500.00'\'', receiptName: '\''Sample_Receipt.pdf'\'' }\
    ]);\
  };\
' src/pages/SubmitClaim.tsx
