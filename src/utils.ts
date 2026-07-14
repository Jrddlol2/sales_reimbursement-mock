import { ClaimStatus } from './types';

export const getStatusColor = (status: ClaimStatus | string) => {
  switch (status) {
    case ClaimStatus.DRAFT: 
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case ClaimStatus.SUBMITTED:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case ClaimStatus.MEETING_SCHEDULED:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case ClaimStatus.PENDING_APPROVAL: 
      return 'bg-[#0095D5] bg-opacity-10 text-[#0095D5] border-[#0095D5] border-opacity-20';
    case ClaimStatus.APPROVED:
    case ClaimStatus.PROCESSED: 
      return 'bg-green-100 text-green-800 border-green-200';
    case ClaimStatus.REJECTED: 
      return 'bg-red-100 text-red-800 border-red-200';
    case ClaimStatus.RETURNED: 
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
