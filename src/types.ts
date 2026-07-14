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
  reports_to: string | null; // ID of the Approver they report to
  delegation?: {
    delegate_id: string;
    start_date: string;
    end_date: string;
  };
}

export enum MomStatus {
  SCHEDULED = 'Scheduled',
  UPLOADED = 'Uploaded',
}

export interface Mom {
  id: string;
  claim_id?: string;
  meeting_date: string;
  attendees: string;
  summary: string;
  file_url?: string;
  status: MomStatus;
  created_at: string;
}

export enum ClaimStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  MEETING_SCHEDULED = 'Meeting Scheduled',
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  FOR_PROCESSING = 'For Processing',
  PROCESSED = 'Processed',
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
  requestor_id: string;
  current_approver_id: string;
  original_approver_id?: string;
  mom_id: string;
  status: ClaimStatus;
  total_amount: number;
  payment_reference?: string;
  payment_method?: string;
  release_code?: string;
  client_meeting_details?: ClientMeetingDetails;
  approved_at?: string;
  processed_by?: string;
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

export interface StatusHistory {
  id: string;
  claim_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  reason?: string;
  timestamp: string;
}

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
