sed -i '/<div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">/i \
      {/* Spend Insights Widget */}\
      {deptData.length > 0 && (\
        <div className="bg-white border border-gray-200 rounded p-5 shadow-sm space-y-4">\
          <div>\
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Approved Spend by Department</h3>\
            <p className="text-[10px] text-gray-500">Total approved reimbursements from your reports</p>\
          </div>\
          <div className="h-48 w-full">\
            <ResponsiveContainer width="100%" height="100%">\
              <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>\
                <XAxis type="number" hide />\
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} width={90} />\
                <Tooltip \
                  cursor={{ fill: "#F3F4F6" }} \
                  formatter={(value: number) => formatPHP(value)}\
                  contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}\
                />\
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>\
                  {deptData.map((entry, index) => (\
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#10B981" : "#34D399"} />\
                  ))}\
                </Bar>\
              </BarChart>\
            </ResponsiveContainer>\
          </div>\
        </div>\
      )}\
' src/pages/ApprovalQueue.tsx
