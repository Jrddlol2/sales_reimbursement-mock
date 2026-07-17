const fs = require('fs');
const file = 'src/components/dashboard/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Calculate new metrics
if (!content.includes('average approval time')) {
  content = content.replace(
    "const totalReimbursed = completedClaims.reduce((acc, c) => acc + c.total_amount, 0);",
    "const totalReimbursed = completedClaims.reduce((acc, c) => acc + c.total_amount, 0);\n  const approvedClaims = claims.filter(c => [ClaimStatus.COMPLETED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM].includes(c.status) && c.history && c.history.some(h => h.new_status === ClaimStatus.PROCESSING));\n  const avgApprovalTimeHours = approvedClaims.length ? Math.round(approvedClaims.reduce((acc, c) => {\n    const submittedDate = new Date(c.created_at);\n    const approvedEvent = c.history?.find(h => h.new_status === ClaimStatus.PROCESSING);\n    const approvedDate = approvedEvent ? new Date(approvedEvent.timestamp) : new Date();\n    return acc + Math.max(0, (approvedDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60));\n  }, 0) / approvedClaims.length) : 0;\n  const submittedTodayCount = claims.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length;"
  );

  content = content.replace(
    "const departmentData = () => {",
    "const topExpenseCategoriesData = () => {\n    const categories: Record<string, number> = {};\n    completedClaims.forEach(c => {\n      categories[c.category] = (categories[c.category] || 0) + c.total_amount;\n    });\n    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);\n  };\n\n  const departmentData = () => {"
  );
  
  content = content.replace(
    '<KPICard title="Total Reimbursements" value={formatPHP(totalReimbursed)} icon={FileText} colorClass="text-indigo-600 bg-white" />',
    '<KPICard title="Total Reimbursements" value={formatPHP(totalReimbursed)} icon={FileText} colorClass="text-indigo-600 bg-white" />\n            <KPICard title="Avg Approval Time" value={`${avgApprovalTimeHours}h`} description="average approval time" icon={Clock} colorClass="text-purple-600 bg-white" />\n            <KPICard title="Submitted Today" value={submittedTodayCount} description="requests submitted today" icon={FileText} colorClass="text-emerald-600 bg-white" />'
  );
  
  content = content.replace(
    '<AnalyticsCard title="Requests by Department">',
    '<AnalyticsCard title="Top Expense Categories">\n              <DonutChart data={topExpenseCategoriesData()} centerCaption="Spend" />\n            </AnalyticsCard>\n            <AnalyticsCard title="Requests by Department">'
  );
  
  // Make the grid 3 columns to accommodate
  content = content.replace(
    '<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">',
    '<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">'
  );
  
  fs.writeFileSync(file, content);
}
