sed -i '/const \[loading, setLoading\] = useState(true);/a \
  const [showClaimPrompt, setShowClaimPrompt] = useState(false);\
  const [claimCodeInput, setClaimCodeInput] = useState("");\
' src/pages/ClaimDetail.tsx
