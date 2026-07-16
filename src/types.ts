export enum UserRole {
  REQUESTOR = 'Requestor',
  APPROVER = 'Approver',
  CUSTODIAN = 'Custodian',
  ADMIN = 'Admin',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  job_title?: string;
  reports_to: string | null; // ID of the Approver they report to
  delegation?: {
    delegate_id: string;
    start_date: string;
    end_date: string;
  };
}

export enum MomStatus {
  DRAFT = 'Draft',
  COMPLETED = 'Completed',
}

export enum MinutesSource {
  TEMPLATE = 'Template',
  UPLOADED = 'Uploaded',
}

export interface Mom {
  id: string;
  claim_id?: string;
  requestor_id?: string;
  client?: string;
  contact_person?: string;
  contact_person_email?: string;
  meeting_date: string;
  meeting_time?: string;
  location?: string;
  purpose?: string;
  discussion?: string;
  agreements?: string;
  action_items?: string;
  prepared_by?: string;
  prepared_by_department?: string;
  prepared_by_job_title?: string;
  summary?: string;
  file_url?: string;
  file_name?: string;
  status: MomStatus;
  created_at: string;
  minutes_source: MinutesSource;
  meeting_type?: string;
  participants_internal?: string;
  participants_external?: string;
}

export enum ReviewMeetingStatus {
  SCHEDULED = 'Scheduled',
  COMPLETED = 'Completed',
}

export interface ReviewMeeting {
  id: string;
  claim_id: string;
  requestor_id: string;
  approver_id: string;
  meeting_date: string;
  meeting_time: string;
  status: ReviewMeetingStatus;
  created_at: string;
}

export enum ClaimStatus {
  DRAFT = 'Draft',
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  PROCESSING = 'Processing',
  READY_FOR_CLAIM = 'Ready for Claim',
  COMPLETED = 'Completed',
  REJECTED = 'Rejected',
  RETURNED = 'Returned',
}

export interface ExpenseLineItem {
  id: string;
  claim_id: string;
  expense_date: string;
  vendor: string;
  category: string;
  amount: number;
  payment_method: string;
  business_purpose: string;
  receipt_url?: string;
  or_number?: string;
}

export interface ClientMeetingDetails {
  type_of_account: string;
  company_name: string;
  purpose_of_meeting: string;
  category: string;
  location: string;
  contact_person: string;
  contact_person_designation: string;
  contact_person_email: string;
  description: string;
}

export interface Claim {
  id: string;
  claim_number?: string; // REIM-2026-000123
  requestor_id: string;
  current_approver_id: string;
  original_approver_id?: string;
  mom_id: string;
  status: ClaimStatus;
  total_amount: number;
  expense_category?: string;
  receipt_url?: string;
  remarks?: string;
  supporting_documents?: string;
  payment_reference?: string;
  payment_method?: string;
  release_code?: string;
  flagged_high_value?: boolean;
  client_meeting_details?: ClientMeetingDetails;
  approved_at?: string;
  processed_by?: string;
  processing_date?: string;
  sourceLiquidationId?: string;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  claim_id: string;
  approver_id: string;
  decision: 'Approved' | 'Rejected' | 'Returned';
  comment: string;
  timestamp: string;
}

export interface StatusHistory {  id: string;  claim_id: string;  cash_advance_id?: string;  liquidation_id?: string;  old_status: string;  new_status: string;  changed_by: string;  changedBy?: User;  reason?: string;  timestamp: string;}

export interface Email {
  id: string;
  recipient_id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  read: boolean;
  timestamp: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  claim_id: string;
  type: string;
  read: boolean;
  timestamp: string;
}

export enum CashAdvanceStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  RELEASED = 'Released',
  LIQUIDATED = 'Liquidated',
}

export interface CashAdvance {
  id: string;
  requestorId: string;
  amount: number;
  purpose: string;
  momId?: string;
  approverId: string;
  releasedBy?: string;
  releaseDate?: string;
  releaseReference?: string;
  status: CashAdvanceStatus;
}

export enum LiquidationVarianceType {
  SETTLED = 'Settled',
  REFUND_DUE = 'RefundDue',
  REIMBURSEMENT_DUE = 'ReimbursementDue',
}

export enum LiquidationStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  RETURNED_FOR_REVISION = 'ReturnedForRevision',
  REVIEWED = 'Reviewed',
  CLOSED = 'Closed',
}

export interface Liquidation {
  id: string;
  cashAdvanceId: string;
  requestorId: string;
  totalSpent: number;
  varianceAmount: number;
  varianceType: LiquidationVarianceType;
  status: LiquidationStatus;
}

export interface LiquidationLineItem {
  id: string;
  liquidationId: string;
  expense_date: string;
  vendor: string;
  category: string;
  amount: number;
  payment_method: string;
  business_purpose: string;
  receipt_url?: string;
  attachment_type?: string;
  or_number?: string;
}
