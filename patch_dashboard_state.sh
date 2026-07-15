sed -i '/const \[loading, setLoading\] = useState(true);/a \
  const [activeClaimPrompt, setActiveClaimPrompt] = useState<string | null>(null);\
  const [claimCodeInput, setClaimCodeInput] = useState("");\
' src/pages/Dashboard.tsx
