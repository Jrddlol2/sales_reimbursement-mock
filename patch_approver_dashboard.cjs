const fs = require('fs');
const file = 'src/components/dashboard/ApproverDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'actionPath={pendingTotal > 0 ? "/approvals" : undefined}',
  'actionPath={pendingTotal > 0 ? "/approvals?tab=inbox" : undefined}'
);

content = content.replace(
  'description="Reimbursement claims"\n            additionalContext={pendingClaims.length > 0 ? "Needs approval" : "No pending reimbursements"}',
  'description="Reimbursement claims"\n            additionalContext={pendingClaims.length > 0 ? "Needs approval" : "No pending reimbursements"}\n            actionLabel={pendingClaims.length > 0 ? "View Claims" : undefined}\n            actionPath={pendingClaims.length > 0 ? "/approvals?tab=inbox" : undefined}'
);

content = content.replace(
  'description="Cash advance requests"\n            additionalContext={pendingCadvs.length > 0 ? "Needs approval" : "No pending cash advances"}',
  'description="Cash advance requests"\n            additionalContext={pendingCadvs.length > 0 ? "Needs approval" : "No pending cash advances"}\n            actionLabel={pendingCadvs.length > 0 ? "View CADVs" : undefined}\n            actionPath={pendingCadvs.length > 0 ? "/approvals?tab=cadv" : undefined}'
);

content = content.replace(
  'description="Liquidation reviews"\n            additionalContext={pendingLiqs.length > 0 ? "Needs approval" : "No pending liquidations"}',
  'description="Liquidation reviews"\n            additionalContext={pendingLiqs.length > 0 ? "Needs approval" : "No pending liquidations"}\n            actionLabel={pendingLiqs.length > 0 ? "View Liquidations" : undefined}\n            actionPath={pendingLiqs.length > 0 ? "/approvals?tab=inbox" : undefined}' // assuming inbox shows both claims and liqs, or is it cadv? Let's use inbox.
);

fs.writeFileSync(file, content);
