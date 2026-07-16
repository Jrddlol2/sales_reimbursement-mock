const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "minutes_source: MinutesSource.MANUAL,",
  "minutes_source: MinutesSource.WEB_FORM,"
);

content = content.replace(
  "created_at: rDate(days),",
  "createdAt: rDate(days),"
);

fs.writeFileSync('server.ts', content);
