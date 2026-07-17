const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

// replace 50000 default to 15000
content = content.replace("highValueThreshold: 50000", "highValueThreshold: 15000");

// replace the hardcoded 15000 in claim creation
content = content.replace(
  "flagged_high_value: itemsToCreate.some(item => item.amount > 15000)",
  "flagged_high_value: itemsToCreate.some(item => item.amount > systemSettings.highValueThreshold)"
);

content = content.replace(
  "claim.flagged_high_value = itemsToCreate.some(item => item.amount > 15000);",
  "claim.flagged_high_value = itemsToCreate.some(item => item.amount > systemSettings.highValueThreshold);"
);

content = content.replace(
  "flagged_high_value: l.varianceAmount > 15000",
  "flagged_high_value: l.varianceAmount > systemSettings.highValueThreshold"
);

fs.writeFileSync(file, content);
