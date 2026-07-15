sed -i '/const \[isUpdating, setIsUpdating\] = useState(false);/a \
  const [showClaimPrompt, setShowClaimPrompt] = useState(false);\
  const [claimCodeInput, setClaimCodeInput] = useState("");\
' src/pages/ClaimDetail.tsx
