const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "      const mom = {\n        id: momId,\n        requestor_id: reqId,\n        client_name: 'Internal / Partner',\n        contact_person: 'Partner Contact',\n        date: rDate(daysAgo).toISOString(),\n        meeting_type: 'In-person',\n        purpose: 'Departmental sync',\n        discussion: 'Regular departmental meeting.',\n        action_items: 'None',\n        status: MomStatus.APPROVED,\n        created_at: rDate(daysAgo).toISOString()\n      };",
  `      const mom = {
        id: momId,
        requestor_id: reqId,
        client_name: 'Internal / Partner',
        contact_person: 'Partner Contact',
        meeting_date: rDate(daysAgo).toISOString(),
        minutes_source: MinutesSource.MANUAL,
        meeting_type: 'In-person',
        purpose: 'Departmental sync',
        discussion: 'Regular departmental meeting.',
        action_items: 'None',
        status: MomStatus.APPROVED,
        created_at: rDate(daysAgo).toISOString()
      };`
);

content = content.replace(
  "        createdAt: rDate(days).toISOString(),",
  "        created_at: rDate(days).toISOString(),"
);

content = content.replace(
  /rDate\((.*?)\)\.toISOString\(\)/g,
  "rDate($1)"
);

content = content.replace(
  /MomStatus\.APPROVED/g,
  "MomStatus.COMPLETED"
);

fs.writeFileSync('server.ts', content);
