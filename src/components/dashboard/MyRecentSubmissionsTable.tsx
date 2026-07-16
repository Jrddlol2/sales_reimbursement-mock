import React from 'react';
import { Claim, CashAdvance, Liquidation, User } from '../../types';
import { RecentActivityTable } from './RecentActivityTable';

export const MyRecentSubmissionsTable: React.FC<{ user: User; claims: Claim[]; cadvs: CashAdvance[]; liqs: Liquidation[] }> = ({ user, claims, cadvs, liqs }) => {
  const myRecentItems = [
    ...claims.filter(c => c.requestor_id === user.id).map(c => ({
      id: c.id,
      reference: `REIM-${c.id.substring(0, 6)}`,
      type: 'Reimbursement',
      status: c.status,
      amount: c.total_amount,
      date: c.created_at,
      path: `/claims/${c.id}`
    })),
    ...cadvs.filter(c => c.requestorId === user.id).map(c => ({
      id: c.id,
      reference: `CADV-${c.id.substring(0, 6)}`,
      type: 'Cash Advance',
      status: c.status,
      amount: c.requestedAmount,
      date: c.createdAt,
      path: `/cash-advances/${c.id}`
    })),
    ...liqs.filter(l => l.requestorId === user.id).map(l => ({
      id: l.id,
      reference: `LIQ-${l.id.substring(0, 6)}`,
      type: 'Liquidation',
      status: l.status,
      amount: l.totalExpenses,
      date: l.createdAt,
      path: `/liquidations/${l.id}`
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="mb-8">
      <RecentActivityTable title="My Recent Submissions" items={myRecentItems} emptyMessage="You haven't submitted any requests recently." />
    </div>
  );
};
