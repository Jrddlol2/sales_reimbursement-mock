const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// CashAdvance uses neither createdAt nor created_at. It doesn't have a creation date property, or maybe it does? 
// Let's remove the createdAt property. Wait, let's look at the CashAdvance interface again.
// actually it seems CashAdvance doesn't have a createdAt property, but it has releaseDate

content = content.replace(
  "minutes_source: MinutesSource.WEB_FORM,",
  "minutes_source: MinutesSource.TEMPLATE,"
);

content = content.replace(
  "        createdAt: rDate(days),\n",
  ""
);
content = content.replace(
  /        approvedAt: .*\n/g,
  ""
);
content = content.replace(
  /        releasedAt: .*\n/g,
  ""
);

fs.writeFileSync('server.ts', content);
