const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/AdminDashboard.tsx', 'utf8');

content = content.replace(
  "      )}\n    </div>\n  );\n};",
  `      )}

      <MyRequestsCards user={user} claims={claims} cadvs={cadvs} liqs={liqs} outstandingActionsCount={todayHistory.length} />
      <MyRecentSubmissionsTable user={user} claims={claims} cadvs={cadvs} liqs={liqs} />
    </div>
  );
};`
);

fs.writeFileSync('src/components/dashboard/AdminDashboard.tsx', content);
