import React from 'react';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus } from '../../types';
import { KPICard } from './KPICard';
import { Tray, CheckCircle, Receipt, ReceiptX, WarningCircle } from '@phosphor-icons/react';

interface Props {
  user: User;
  claims: Claim[];
  cadvs: CashAdvance[];
  liqs: Liquidation[];
  outstandingActionsCount?: number;
}

export const MyRequestsCards: React.FC<Props> = ({ user, claims, cadvs, liqs, outstandingActionsCount }) => {
  const myClaims = claims.filter(c => c.requestor_id === user.id);
  const myCadvs = cadvs.filter(c => c.requestorId === user.id);
  const myLiqs = liqs.filter(l => l.requestorId === user.id);

  const pending = myClaims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL).length 
                + myCadvs.filter(c => c.status === CashAdvanceStatus.SUBMITTED).length
                + myLiqs.filter(l => l.status === LiquidationStatus.SUBMITTED).length;
                
  const approved = myClaims.filter(c => [ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM].includes(c.status)).length
                 + myCadvs.filter(c => [CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED].includes(c.status)).length
                 + myLiqs.filter(l => l.status === LiquidationStatus.REVIEWED).length;

  const completed = myClaims.filter(c => c.status === ClaimStatus.COMPLETED).length
                  + myCadvs.filter(c => c.status === CashAdvanceStatus.LIQUIDATED).length
                  + myLiqs.filter(l => l.status === LiquidationStatus.CLOSED).length;

  const rejected = myClaims.filter(c => [ClaimStatus.REJECTED, ClaimStatus.RETURNED].includes(c.status)).length
                 + myCadvs.filter(c => [CashAdvanceStatus.REJECTED].includes(c.status)).length
                 + myLiqs.filter(l => l.status === LiquidationStatus.RETURNED_FOR_REVISION).length;

  // Let's accurately calculate actions required by the requestor
  const returned = myClaims.filter(c => c.status === ClaimStatus.RETURNED).length
                 + myLiqs.filter(l => l.status === LiquidationStatus.RETURNED_FOR_REVISION).length;

  const totalVisibleCards = (returned > 0 ? 1 : 0) + 4;
  const gridColsClass = totalVisibleCards === 5
    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-slate-800 mb-1">My Requests</h2>
      <p className="text-sm text-slate-500 mb-4">Track the status of your submitted requests</p>
      <div className={`grid ${gridColsClass} gap-4`}>
        {returned > 0 && (
          <KPICard 
            title="Needs Correction" 
            value={returned} 
            icon={WarningCircle} 
            variant="warning" 
            description="Returned requests"
            additionalContext="Requires your action"
          />
        )}
        <KPICard
          title="Pending"
          value={pending}
          icon={Tray}
          variant="warning"
          description="Awaiting approval"
          actionLabel="View Pending"
          actionPath="/history?status=Pending Approval"
        />
        <KPICard
          title="Approved"
          value={approved}
          icon={CheckCircle}
          variant="success"
          description="In processing"
          actionLabel="View Processing"
          actionPath="/history?status=Processing"
        />
        <KPICard
          title="Completed"
          value={completed}
          icon={Receipt}
          variant="success"
          description="Finalized"
          actionLabel="View Completed"
          actionPath="/history?status=Completed"
        />
        <KPICard 
          title="Rejected"
          value={rejected - returned}
          icon={ReceiptX}
          variant="danger"
          description="Declined requests"
          actionLabel="View Rejected"
          actionPath="/history?status=Rejected"
        />
      </div>
    </div>
  );
};
