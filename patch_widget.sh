sed -i '/{ claims.some(c => c.status === ClaimStatus.READY_FOR_CLAIM) && (/i \
      {/* Spend Insights Widget */}\
      {categoryData.length > 0 && (\
        <div className="bg-white border border-gray-200 rounded p-5 shadow-sm space-y-4">\
          <div>\
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Spend by Category</h3>\
            <p className="text-[10px] text-gray-500">Approved and completed reimbursements</p>\
          </div>\
          <div className="h-48 w-full">\
            <ResponsiveContainer width="100%" height="100%">\
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>\
                <XAxis type="number" hide />\
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} width={80} />\
                <Tooltip \
                  cursor={{ fill: "#F3F4F6" }} \
                  formatter={(value: number) => formatPHP(value)}\
                  contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}\
                />\
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>\
                  {categoryData.map((entry, index) => (\
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#0EA5E9" : "#38BDF8"} />\
                  ))}\
                </Bar>\
              </BarChart>\
            </ResponsiveContainer>\
          </div>\
        </div>\
      )}\
' src/pages/Dashboard.tsx
