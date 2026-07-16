const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/AdminDashboard.tsx', 'utf8');

// 1. Remove the middle components
content = content.replace(
  /      <MyRequestsCards user=\{user\} claims=\{claims\} cadvs=\{cadvs\} liqs=\{liqs\} outstandingActionsCount=\{todayHistory\.length\} \/>\n      <MyRecentSubmissionsTable user=\{user\} claims=\{claims\} cadvs=\{cadvs\} liqs=\{liqs\} \/>\n/g,
  ''
);

// 2. Add the executive banner
content = content.replace(
  "{view === 'executive' ? (\n        <>",
  `{view === 'executive' ? (
        <>
          <div className="bg-brand text-white p-6 rounded-xl mb-8 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ChartBar className="w-6 h-6" /> Executive Overview
              </h2>
              <p className="text-blue-100 mt-1">Enterprise performance, financial summaries, and claim analytics</p>
            </div>
            <Briefcase className="w-24 h-24 text-white opacity-10 absolute -right-2 -bottom-4 transform -rotate-12" weight="fill" />
          </div>`
);

fs.writeFileSync('src/components/dashboard/AdminDashboard.tsx', content);
