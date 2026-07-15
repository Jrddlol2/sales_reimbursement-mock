sed -i 's/import { getStatusColor } from '\''..\/utils'\'';/import { getStatusColor, getClaimNumber } from '\''..\/utils'\'';/' src/pages/AuditLog.tsx
sed -i 's/{log.claim_id.substring(0,8)}/{log.claim ? getClaimNumber(log.claim) : log.claim_id.substring(0,8)}/' src/pages/AuditLog.tsx
