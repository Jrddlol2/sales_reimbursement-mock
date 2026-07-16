const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/RequestorDashboard.tsx', 'utf8');

content = content.replace(
  `      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <AnalyticsCard title="Reimbursement Trend">
            <SimpleLineChart data={monthlyData()} dataKey="Amount" />
          </AnalyticsCard>
        </div>
        <div>
          <QuickActionsCard actions={quickActions} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RecentActivityTable title="Recent Requests" items={recentItems} />
        </div>
        <div>
          <AnalyticsCard title="Claim Status Distribution">
            {statusDistribution.length > 0 ? (
              <DonutChart data={statusDistribution} colors={['#cbd5e1', '#94a3b8', '#2563eb', '#64748b', '#475569']} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
            )}
          </AnalyticsCard>
        </div>
      </div>`,
  `      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RecentActivityTable title="Recent Requests" items={recentItems} />
        </div>
        <div>
          <QuickActionsCard actions={quickActions} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <AnalyticsCard title="Reimbursement Trend">
            <SimpleLineChart data={monthlyData()} dataKey="Amount" />
          </AnalyticsCard>
        </div>
        <div>
          <AnalyticsCard title="Claim Status Distribution">
            {statusDistribution.length > 0 ? (
              <DonutChart data={statusDistribution} colors={['#cbd5e1', '#94a3b8', '#2563eb', '#64748b', '#475569']} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
            )}
          </AnalyticsCard>
        </div>
      </div>`
);

fs.writeFileSync('src/components/dashboard/RequestorDashboard.tsx', content);
