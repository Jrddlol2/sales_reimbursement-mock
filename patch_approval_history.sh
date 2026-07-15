sed -i '/      <\/div>/!b;n;/      {selectedClaimId && (/!b;i \
      ) : (\
        <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">\
          <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">\
            <h3 className="font-medium text-gray-800 text-sm">Decision History</h3>\
          </div>\
          <div className="overflow-x-auto">\
            <table className="min-w-full divide-y divide-gray-200">\
              <thead className="bg-[#F8F9FA] border-y border-gray-200">\
                <tr>\
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Requestor</th>\
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>\
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>\
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Decision</th>\
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Comment</th>\
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Action</th>\
                </tr>\
              </thead>\
              <tbody className="bg-white divide-y divide-gray-100">\
                {decisionHistoryItems.length === 0 ? (\
                  <tr>\
                    <td colSpan={6} className="px-4 py-12 text-center">\
                      <p className="text-sm text-gray-500">No decisions made yet.</p>\
                    </td>\
                  </tr>\
                ) : (\
                  decisionHistoryItems.map((item, idx) => {\
                    const claimNumber = getClaimNumber(item.claim);\
                    return (\
                      <tr key={`${item.claim.id}-${idx}`} className="hover:bg-gray-50 transition-colors">\
                        <td className="px-4 py-2.5 whitespace-nowrap">\
                          <div className="text-sm font-bold text-gray-950">{item.claim.requestor?.name}</div>\
                          <div className="text-[10px] text-gray-500">{claimNumber}</div>\
                        </td>\
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">\
                          {new Date(item.date).toLocaleDateString()}\
                        </td>\
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-bold text-gray-900">\
                          {formatPHP(item.claim.total_amount)}\
                        </td>\
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">\
                          <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full ${getStatusColor(item.decision)}`}>\
                            {item.decision}\
                          </span>\
                        </td>\
                        <td className="px-4 py-2.5 text-xs text-gray-600 italic truncate max-w-[200px]">\
                          {item.comment ? `"${item.comment}"` : "-"}\
                        </td>\
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">\
                          <button onClick={() => setSelectedClaimId(item.claim.id)} className="text-brand hover:text-brand-hover">View Claim</button>\
                        </td>\
                      </tr>\
                    );\
                  })\
                )}\
              </tbody>\
            </table>\
          </div>\
        </div>\
      )}\
' src/pages/ApprovalQueue.tsx
