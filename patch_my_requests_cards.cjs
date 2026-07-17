const fs = require('fs');
const file = 'src/components/dashboard/MyRequestsCards.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add actionPath properties to KPICards
content = content.replace(
  /title="Pending"\s+value=\{pending\}\s+icon=\{Tray\}\s+variant="warning"\s+description="Awaiting approval"/,
  'title="Pending"\n          value={pending}\n          icon={Tray}\n          variant="warning"\n          description="Awaiting approval"\n          actionLabel="View Pending"\n          actionPath="/history?status=Pending Approval"'
);

content = content.replace(
  /title="Approved"\s+value=\{approved\}\s+icon=\{CheckCircle\}\s+variant="success"\s+description="In processing"/,
  'title="Approved"\n          value={approved}\n          icon={CheckCircle}\n          variant="success"\n          description="In processing"\n          actionLabel="View Processing"\n          actionPath="/history?status=Processing"'
);

content = content.replace(
  /title="Completed"\s+value=\{completed\}\s+icon=\{Receipt\}\s+variant="success"\s+description="Finalized"/,
  'title="Completed"\n          value={completed}\n          icon={Receipt}\n          variant="success"\n          description="Finalized"\n          actionLabel="View Completed"\n          actionPath="/history?status=Completed"'
);

content = content.replace(
  /title="Rejected"\s+value=\{rejected - returned\}\s+icon=\{ReceiptX\}\s+variant="danger"\s+description="Declined requests"/,
  'title="Rejected"\n          value={rejected - returned}\n          icon={ReceiptX}\n          variant="danger"\n          description="Declined requests"\n          actionLabel="View Rejected"\n          actionPath="/history?status=Rejected"'
);

fs.writeFileSync(file, content);
