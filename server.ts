import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { v4 as uuidv4 } from 'uuid';
import {
  User, UserRole, Mom, MomStatus, MinutesSource, Claim, ClaimStatus,
  ExpenseLineItem, Approval, StatusHistory, Email,
  CashAdvance, CashAdvanceStatus, Liquidation, LiquidationStatus,
  LiquidationVarianceType, LiquidationLineItem,
  ReviewMeeting, ReviewMeetingStatus
} from './src/types';

const LIQUIDATION_DEADLINE_DAYS = 7;

let moms: Mom[] = [];
let claims: Claim[] = [];
let expenses: ExpenseLineItem[] = [];
let approvals: Approval[] = [];
let statusHistories: StatusHistory[] = [];
let emails: Email[] = [];
let lastSeenStore: Record<string, Record<string, string>> = {};
let cashAdvances: CashAdvance[] = [];
let liquidations: Liquidation[] = [];
let liquidationLineItems: LiquidationLineItem[] = [];
let reviewMeetings: ReviewMeeting[] = [];

let claimCounter = 123;

// The standard demo org chart: two full approval chains (Bob<-Alice,Eve and
// Grace<-Frank,Henry) so Admin Reassignment always has a second Approver to
// offer and segregation-of-duties can be demoed across two independent
// chains. Shared by both /api/admin/seed and /api/admin/reset so the two
// never drift apart.
const buildDefaultUsers = (): User[] => [
  { id: 'u1', name: 'Alice Requestor', email: 'alice@example.com', role: UserRole.REQUESTOR, department: 'Sales', job_title: 'Sales Executive', reports_to: 'u2' },
  { id: 'u2', name: 'Bob Approver', email: 'bob@example.com', role: UserRole.APPROVER, department: 'Sales', job_title: 'Sales Director', reports_to: 'u9' },
  { id: 'u3', name: 'Carol Custodian', email: 'carol@example.com', role: UserRole.CUSTODIAN, department: 'Finance', job_title: 'Reimbursement Processor', reports_to: null },
  { id: 'u4', name: 'Dave Admin', email: 'dave@example.com', role: UserRole.ADMIN, department: 'IT', job_title: 'System Admin', reports_to: null },
  { id: 'u5', name: 'Eve Requestor', email: 'eve@example.com', role: UserRole.REQUESTOR, department: 'Sales', job_title: 'Sales Executive', reports_to: 'u2' },
  { id: 'u6', name: 'Frank Requestor', email: 'frank@example.com', role: UserRole.REQUESTOR, department: 'Sales', job_title: 'Sales Executive', reports_to: 'u2' },
  { id: 'u7', name: 'Grace Approver', email: 'grace@example.com', role: UserRole.APPROVER, department: 'Sales', job_title: 'Sales Director', reports_to: 'u9' },
  { id: 'u8', name: 'Henry Approver', email: 'henry@example.com', role: UserRole.APPROVER, department: 'Sales', job_title: 'Sales Director', reports_to: 'u9' },
  { id: 'u9', name: 'Ivy Senior Approver', email: 'ivy@example.com', role: UserRole.APPROVER, department: 'Sales', job_title: 'VP of Sales', reports_to: null },
  { id: 'u10', name: 'Jack Mid-Level Approver', email: 'jack@example.com', role: UserRole.APPROVER, department: 'Sales', job_title: 'Regional Sales Manager', reports_to: 'u9' },
  { id: 'u11', name: 'Kyle Requestor', email: 'kyle@example.com', role: UserRole.REQUESTOR, department: 'Sales', job_title: 'Sales Executive', reports_to: 'u10' },
  { id: 'u12', name: 'Liam Requestor', email: 'liam@example.com', role: UserRole.REQUESTOR, department: 'Sales', job_title: 'Sales Executive', reports_to: 'u10' }
];

// Email Transport Mock
// opts.plain sends an unstyled personal-message email (no SharePoint header/footer) -
// used for the MOM email to an external client contact, which must read as a personal
// message, not a system notification. Every other notification keeps the full
// enterprise template by omitting opts.
const sendEmail = (toOrId: string, subject: string, body: string, ccId?: string, opts?: { plain?: boolean; recipientName?: string; fromLabel?: string }) => {
  const recipient = users.find(u => u.id === toOrId);
  const toEmail = recipient ? recipient.email : toOrId;
  const recipientId = recipient ? recipient.id : 'external';
  const recipientName = opts?.recipientName || (recipient ? recipient.name : toOrId.split('@')[0]);
  const fromLine = opts?.plain ? (opts.fromLabel || 'system@reimbursement.local') : "SharePoint Online <no-reply@company.com>";

  const finalBody = opts?.plain
    ? `Dear ${recipientName},


${body}`
    : `From:
${fromLine}

Sent:
${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}

To:
${toEmail}${ccId ? `\nCC:\n${users.find(u => u.id === ccId)?.email || ccId}` : ''}

Subject:
${subject}


Dear ${recipientName},


${body}


This is an automatically generated email.
Please do not reply.


Sales Reimbursement System
Business Support Management Assistant`;

  const email: Email = {
    id: uuidv4(),
    recipient_id: recipientId,
    from: fromLine,
    to: toEmail,
    subject,
    body: finalBody,
    read: false,
    timestamp: new Date().toISOString()
  };
  emails.push(email);

  if (ccId) {
    const ccRecipient = users.find(u => u.id === ccId);
    if (ccRecipient) {
      emails.push({
        id: uuidv4(),
        recipient_id: ccRecipient.id,
        from: fromLine,
        to: ccRecipient.email,
        subject: `[CC] ${subject}`,
        body: finalBody,
        read: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  console.log(`\n--- MOCK EMAIL TRANSPORT ---`);
  console.log(`To: ${email.to}`);
  if (ccId) console.log(`CC: ${users.find(u => u.id === ccId)?.email}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Body:\n${email.body}`);
  console.log(`----------------------------\n`);
};

const users: User[] = buildDefaultUsers();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json());

  // Helper to get current user from header (mock auth)
  const getUser = (req: express.Request) => {
    const userId = req.header('X-User-Id');
    return users.find(u => u.id === userId);
  };

  const addHistory = (claimId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string) => {
    statusHistories.push({
      id: uuidv4(),
      claim_id: claimId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason,
      timestamp: new Date().toISOString()
    });
  };

  const addCaHistory = (caId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string) => {
    statusHistories.push({
      id: uuidv4(),
      claim_id: '',
      cash_advance_id: caId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason,
      timestamp: new Date().toISOString()
    });
  };

  const addLiqHistory = (liqId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string) => {
    statusHistories.push({
      id: uuidv4(),
      claim_id: '',
      liquidation_id: liqId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason,
      timestamp: new Date().toISOString()
    });
  };

  // Auth endpoints (Mock)
  app.get('/api/users', (req, res) => res.json(users));
  app.post('/api/login', (req, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'User not found' });
    }
  });

  app.get('/api/me', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json(user);
  });

  // MOM endpoints (accessed for managing meeting notes)
  app.get('/api/moms', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    let relevantMoms = [];
    if (user.role === UserRole.REQUESTOR) {
      relevantMoms = moms.filter(m => m.requestor_id === user.id);
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      relevantMoms = moms.filter(m => m.requestor_id === user.id || (m.requestor_id && reporteeIds.includes(m.requestor_id)));
    }

    // Enrich with requestor name
    const enriched = relevantMoms.map(m => {
      const requestor = users.find(u => u.id === m.requestor_id);
      return { 
        ...m, 
        prepared_by: requestor ? requestor.name : (m.prepared_by || 'Unknown'),
        client_name: m.client || m.summary || 'Unknown Client' // for calendar/retro-compatibility
      };
    });
    
    res.json(enriched);
  });

  app.post('/api/moms', (req, res) => {
    const user = getUser(req);
    if (!user || !user.reports_to) return res.status(403).json({ error: 'Forbidden: You must have a designated manager (reports_to) to submit.' });

    const mom: Mom = {
      id: uuidv4(),
      requestor_id: user.id,
      client: req.body.client || '',
      contact_person: req.body.contact_person || '',
      contact_person_email: req.body.contact_person_email || '',
      meeting_date: req.body.meeting_date || new Date().toISOString().split('T')[0],
      meeting_time: req.body.meeting_time || '',
      location: req.body.location || '',
      purpose: req.body.purpose || '',
      discussion: req.body.discussion || '',
      agreements: req.body.agreements || '',
      action_items: req.body.action_items || '',
      prepared_by: user.name,
      file_url: req.body.file_url,
      file_name: req.body.file_name,
      status: req.body.status || MomStatus.DRAFT,
      created_at: new Date().toISOString(),
      minutes_source: req.body.minutes_source || MinutesSource.TEMPLATE,
      meeting_type: req.body.meeting_type || '',
      participants_internal: req.body.participants_internal || '',
      participants_external: req.body.participants_external || ''
    };

    moms.push(mom);
    res.json(mom);
  });

  app.put('/api/moms/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const mom = moms.find(m => m.id === req.params.id);
    if (!mom) return res.status(404).json({ error: 'MOM not found' });

    if (user.role === UserRole.REQUESTOR && mom.requestor_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (user.role === UserRole.APPROVER && mom.requestor_id !== user.id) {
      const momOwner = users.find(u => u.id === mom.requestor_id);
      let authorized = !!momOwner && momOwner.reports_to === user.id;
      if (!authorized && momOwner?.reports_to) {
        const sup = users.find(u => u.id === momOwner.reports_to);
        if (sup?.delegation) {
          const now = new Date();
          const start = new Date(sup.delegation.start_date);
          const end = new Date(sup.delegation.end_date);
          end.setHours(23, 59, 59, 999);
          authorized = now >= start && now <= end && sup.delegation.delegate_id === user.id;
        }
      }
      if (!authorized) {
        return res.status(403).json({ error: 'Forbidden: not your direct report' });
      }
    }

    mom.client = req.body.client ?? mom.client;
    mom.contact_person = req.body.contact_person ?? mom.contact_person;
    mom.contact_person_email = req.body.contact_person_email ?? mom.contact_person_email;
    mom.meeting_date = req.body.meeting_date ?? mom.meeting_date;
    mom.meeting_time = req.body.meeting_time ?? mom.meeting_time;
    mom.location = req.body.location ?? mom.location;
    mom.purpose = req.body.purpose ?? mom.purpose;
    mom.discussion = req.body.discussion ?? mom.discussion;
    mom.agreements = req.body.agreements ?? mom.agreements;
    mom.action_items = req.body.action_items ?? mom.action_items;
    mom.status = req.body.status ?? mom.status;
    mom.file_url = req.body.file_url ?? mom.file_url;
    mom.file_name = req.body.file_name ?? mom.file_name;
    mom.meeting_type = req.body.meeting_type ?? mom.meeting_type;
    mom.participants_internal = req.body.participants_internal ?? mom.participants_internal;
    mom.participants_external = req.body.participants_external ?? mom.participants_external;

    res.json(mom);
  });

  app.post('/api/moms/:id/send', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const mom = moms.find(m => m.id === req.params.id && m.requestor_id === user.id);
    if (!mom) return res.status(404).json({ error: 'MOM not found' });

    mom.status = MomStatus.COMPLETED;

    // Send MOM email - 1. MOM Email (To: Contact Person, CC: Approver)
    const approverId = user.reports_to || '';
    const subject = `Meeting Summary - ${mom.client || 'Client'}`;
    const body = `Thank you for meeting with us on ${mom.meeting_date} regarding ${mom.purpose || 'our business discussion'}.

Discussion:
${mom.discussion || 'No discussion points added.'}

Agreements:
${mom.agreements || 'No agreements listed.'}

Action Items:
${mom.action_items || 'No action items listed.'}

Best regards,
${user.name}`;

    sendEmail(
      mom.contact_person_email || 'client@example.com',
      subject,
      body,
      approverId || undefined,
      { plain: true, recipientName: mom.contact_person || 'Valued Client', fromLabel: `${user.name} <${user.email}>` }
    );

    res.json(mom);
  });

  // Claim endpoints
  app.get('/api/claims', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    let filtered: Claim[] = [];
    if (user.role === UserRole.REQUESTOR) {
      filtered = claims.filter(c => c.requestor_id === user.id);
    } else if (user.role === UserRole.APPROVER) {
      filtered = claims.filter(c => c.current_approver_id === user.id || c.original_approver_id === user.id || c.requestor_id === user.id);
    } else if (user.role === UserRole.CUSTODIAN) {
      filtered = claims.filter(c => [ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(c.status));
    } else if (user.role === UserRole.ADMIN) {
      filtered = claims; // Admin sees all
    }

    const enriched = filtered.map(c => {
      const mom = moms.find(m => m.id === c.mom_id);
      const reqUser = users.find(u => u.id === c.requestor_id);
      const claimExpenses = expenses.filter(e => e.claim_id === c.id);
      const claimApprovals = approvals.filter(a => a.claim_id === c.id);
      const claimHistory = statusHistories.filter(h => h.claim_id === c.id).map(h => ({
        ...h,
        changedBy: users.find(u => u.id === h.changed_by)
      })).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { ...c, mom, requestor: reqUser, expenses: claimExpenses, approvals: claimApprovals, history: claimHistory };
    });

    res.json(enriched);
  });

  app.get('/api/claims/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Not found' });
    
    const claimExpenses = expenses.filter(e => e.claim_id === claim.id);
    const claimApprovals = approvals.filter(a => a.claim_id === claim.id);
    const claimHistory = statusHistories.filter(h => h.claim_id === claim.id).map(h => ({      ...h,      changedBy: users.find(u => u.id === h.changed_by)    })).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const mom = moms.find(m => m.id === claim.mom_id);
    const requestor = users.find(u => u.id === claim.requestor_id);

    res.json({
      ...claim,
      expenses: claimExpenses,
      approvals: claimApprovals,
      history: claimHistory,
      mom,
      requestor
    });
  });

  app.post('/api/claims', (req, res) => {
    const user = getUser(req);
    if (!user || !user.reports_to) return res.status(403).json({ error: 'Forbidden: You must have a designated manager (reports_to) to submit.' });
    
    const { mom_id, expense_category, total_amount, receipt_url, remarks, supporting_documents, line_items, meeting_date, meeting_time } = req.body;

    if (!mom_id) return res.status(400).json({ error: 'Minutes of Meeting (MOM) is required.' });
    const mom = moms.find(m => m.id === mom_id);
    if (!mom) return res.status(400).json({ error: 'Minutes of Meeting (MOM) not found.' });

    if (mom.status !== MomStatus.COMPLETED) {
      return res.status(400).json({ error: 'Cannot attach an incomplete or draft Minutes of Meeting.' });
    }
    if (mom.claim_id) {
      return res.status(400).json({ error: 'This Minutes of Meeting is already linked to another claim and cannot be reused.' });
    }

    if (!meeting_date || !meeting_time) {
      return res.status(400).json({ error: 'A Review Meeting date and time must be scheduled with your Approver.' });
    }

    let itemsToCreate: any[] = [];
    let claimTotal = 0;
    let mainCategory = expense_category || 'Multiple Categories';
    let mainReceipt = receipt_url || '';

    if (line_items && Array.isArray(line_items) && line_items.length > 0) {
      for (const item of line_items) {
        if (!item.category) return res.status(400).json({ error: 'Each expense must have a category.' });
        const numericAmount = Number(item.amount);
        if (isNaN(numericAmount) || numericAmount <= 0) return res.status(400).json({ error: 'Each expense amount must be a valid number greater than zero.' });
        if (!item.receipt_url) return res.status(400).json({ error: 'Each expense must have a receipt.' });
        
        itemsToCreate.push({
          category: item.category,
          amount: numericAmount,
          receipt_url: item.receipt_url,
          business_purpose: remarks || `Sales reimbursement for meeting with ${mom.client}`
        });
        claimTotal += numericAmount;
      }
      mainCategory = itemsToCreate.length === 1 ? itemsToCreate[0].category : 'Multiple Categories';
      mainReceipt = itemsToCreate[0].receipt_url;
    } else {
      if (!expense_category) return res.status(400).json({ error: 'Expense Category is required.' });
      if (total_amount === undefined || total_amount === null || total_amount === '') {
        return res.status(400).json({ error: 'Expense amount is required.' });
      }
      const numericAmount = Number(total_amount);
      if (isNaN(numericAmount)) {
        return res.status(400).json({ error: 'Expense amount must be a valid number.' });
      }
      if (numericAmount <= 0) {
        return res.status(400).json({ error: 'Expense amount must be greater than zero.' });
      }
      if (!receipt_url) return res.status(400).json({ error: 'Receipt image or PDF is required.' });
      
      itemsToCreate.push({
        category: expense_category,
        amount: numericAmount,
        receipt_url: receipt_url,
        business_purpose: remarks || `Sales reimbursement for meeting with ${mom.client}`
      });
      claimTotal = numericAmount;
      mainCategory = expense_category;
      mainReceipt = receipt_url;
    }

    const claimId = uuidv4();
    
    // Generate Philippine format Claim Number (e.g. REIM-2026-000123)
    const year = new Date().getFullYear();
    const numStr = String(claimCounter++).padStart(6, '0');
    const claimNumber = `REIM-${year}-${numStr}`;

    // Create compatible expense items
    for (const item of itemsToCreate) {
      expenses.push({
        id: uuidv4(),
        claim_id: claimId,
        expense_date: mom.meeting_date,
        vendor: mom.client || 'Client Meeting',
        category: item.category,
        amount: item.amount,
        payment_method: 'Cash',
        business_purpose: item.business_purpose,
        receipt_url: item.receipt_url
      });
    }

    let originalApproverId: string | undefined = undefined;
    let currentApproverId = user.reports_to || '';
    
    if (user.reports_to) {
      const sup = users.find(u => u.id === user.reports_to);
      if (sup?.delegation) {
        const now = new Date();
        const start = new Date(sup.delegation.start_date);
        const end = new Date(sup.delegation.end_date);
        end.setHours(23, 59, 59, 999);
        if (now >= start && now <= end) {
          originalApproverId = sup.id;
          currentApproverId = sup.delegation.delegate_id;
        }
      }
    }

    const hasConflict = reviewMeetings.some(rm =>
      rm.approver_id === currentApproverId &&
      rm.status === ReviewMeetingStatus.SCHEDULED &&
      rm.meeting_date === meeting_date &&
      rm.meeting_time === meeting_time
    );
    if (hasConflict) {
      return res.status(409).json({ error: 'Your Approver already has a Review Meeting scheduled at that date and time. Please choose another slot.' });
    }

    const claim: Claim = {
      id: claimId,
      claim_number: claimNumber,
      requestor_id: user.id,
      current_approver_id: currentApproverId,
      original_approver_id: originalApproverId,
      mom_id: mom_id,
      status: ClaimStatus.PENDING_APPROVAL,
      total_amount: claimTotal,
      expense_category: mainCategory,
      receipt_url: mainReceipt,
      remarks,
      supporting_documents,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      flagged_high_value: itemsToCreate.some(item => item.amount > 15000)
    };

    claims.push(claim);
    mom.claim_id = claimId; // link MOM to claim

    reviewMeetings.push({
      id: uuidv4(),
      claim_id: claim.id,
      requestor_id: user.id,
      approver_id: currentApproverId,
      meeting_date,
      meeting_time,
      status: ReviewMeetingStatus.SCHEDULED,
      created_at: new Date().toISOString()
    });

    addHistory(claim.id, ClaimStatus.DRAFT, ClaimStatus.PENDING_APPROVAL, user.id);
    
    if (originalApproverId && currentApproverId !== originalApproverId) {
      const origName = users.find(u => u.id === originalApproverId)?.name || originalApproverId;
      const delegateName = users.find(u => u.id === currentApproverId)?.name || currentApproverId;
      
      statusHistories.push({
        id: uuidv4(),
        claim_id: claim.id,
        old_status: ClaimStatus.DRAFT,
        new_status: ClaimStatus.PENDING_APPROVAL,
        changed_by: user.id,
        reason: `Auto-routed to delegate ${delegateName} (on behalf of ${origName})`,
        timestamp: new Date().toISOString()
      });
    }
    
    if (currentApproverId) {
      const approver = users.find(u => u.id === currentApproverId);
      const approverName = approver ? approver.name : 'Approver';
      
      const emailSubject = `Reimbursement Submitted - ${claimNumber}`;
      const emailBody = `A new reimbursement request ${claimNumber} by ${user.name} has been submitted and is awaiting your review and approval.

Reference:
${claimNumber}

Required Action:
Please log in to the system and navigate to the Approval Queue to approve or reject this claim.`;

      sendEmail(currentApproverId, emailSubject, emailBody);
    }
    
    res.json(claim);
  });

  // Review Meetings: internal review calls the Requestor schedules with their
  // Approver at submission time. Separate from the MOM's client meeting date -
  // filtered the same way /api/moms is (Requestor: own; Approver: own + direct
  // reports') so the Calendar can plot both without conflating them.
  app.get('/api/review-meetings', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    let relevant: ReviewMeeting[] = [];
    if (user.role === UserRole.REQUESTOR) {
      relevant = reviewMeetings.filter(rm => rm.requestor_id === user.id);
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      relevant = reviewMeetings.filter(rm => rm.requestor_id === user.id || reporteeIds.includes(rm.requestor_id));
    }

    const enriched = relevant.map(rm => {
      const requestor = users.find(u => u.id === rm.requestor_id);
      const approver = users.find(u => u.id === rm.approver_id);
      const claim = claims.find(c => c.id === rm.claim_id);
      return {
        ...rm,
        requestor_name: requestor?.name || 'Unknown',
        approver_name: approver?.name || 'Unknown',
        claim_number: claim?.claim_number
      };
    });

    res.json(enriched);
  });

  // Revise & Resubmit: a Requestor reopens their own Returned claim, edits
  // it, and sends it back to Pending Approval with a fresh Approval record.
  // The prior "Returned" decision and status-history entry are never
  // touched - this only ever appends new rows.
  app.put('/api/claims/:id/resubmit', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const claim = claims.find(c => c.id === req.params.id && c.requestor_id === user.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== ClaimStatus.RETURNED) {
      return res.status(400).json({ error: 'Only a claim that has been Returned can be revised and resubmitted.' });
    }

    const { mom_id, expense_category, total_amount, receipt_url, remarks, supporting_documents, line_items } = req.body;

    if (!mom_id) return res.status(400).json({ error: 'Minutes of Meeting (MOM) is required.' });
    const mom = moms.find(m => m.id === mom_id);
    if (!mom) return res.status(400).json({ error: 'Minutes of Meeting (MOM) not found.' });
    if (mom.status !== MomStatus.COMPLETED) {
      return res.status(400).json({ error: 'Cannot attach an incomplete or draft Minutes of Meeting.' });
    }
    if (mom.claim_id && mom.claim_id !== claim.id) {
      const linkedClaim = claims.find(c => c.id === mom.claim_id);
      const linkedNumber = linkedClaim?.claim_number || (mom.claim_id ? `REIM-${mom.claim_id.substring(0, 6)}` : 'another claim');
      return res.status(400).json({ error: `This MOM is already linked to claim ${linkedNumber}.` });
    }

    let itemsToCreate: any[] = [];
    let claimTotal = 0;
    let mainCategory = expense_category || 'Multiple Categories';
    let mainReceipt = receipt_url || '';

    if (line_items && Array.isArray(line_items) && line_items.length > 0) {
      for (const item of line_items) {
        if (!item.category) return res.status(400).json({ error: 'Each expense must have a category.' });
        const numericAmount = Number(item.amount);
        if (isNaN(numericAmount) || numericAmount <= 0) return res.status(400).json({ error: 'Each expense amount must be a valid number greater than zero.' });
        if (!item.receipt_url) return res.status(400).json({ error: 'Each expense must have a receipt.' });
        
        itemsToCreate.push({
          category: item.category,
          amount: numericAmount,
          receipt_url: item.receipt_url,
          business_purpose: remarks || `Sales reimbursement for meeting with ${mom.client}`
        });
        claimTotal += numericAmount;
      }
      mainCategory = itemsToCreate.length === 1 ? itemsToCreate[0].category : 'Multiple Categories';
      mainReceipt = itemsToCreate[0].receipt_url;
    } else {
      if (!expense_category) return res.status(400).json({ error: 'Expense Category is required.' });
      if (total_amount === undefined || total_amount === null || total_amount === '') {
        return res.status(400).json({ error: 'Expense amount is required.' });
      }
      const numericAmount = Number(total_amount);
      if (isNaN(numericAmount)) {
        return res.status(400).json({ error: 'Expense amount must be a valid number.' });
      }
      if (numericAmount <= 0) {
        return res.status(400).json({ error: 'Expense amount must be greater than zero.' });
      }
      if (!receipt_url) return res.status(400).json({ error: 'Receipt image or PDF is required.' });
      
      itemsToCreate.push({
        category: expense_category,
        amount: numericAmount,
        receipt_url: receipt_url,
        business_purpose: remarks || `Sales reimbursement for meeting with ${mom.client}`
      });
      claimTotal = numericAmount;
      mainCategory = expense_category;
      mainReceipt = receipt_url;
    }

    // Re-link the MOM if the requestor swapped it out for a different one.
    if (claim.mom_id !== mom_id) {
      const oldMom = moms.find(m => m.id === claim.mom_id);
      if (oldMom) oldMom.claim_id = undefined;
    }
    mom.claim_id = claim.id;

    // Remove old expenses and add new ones
    for (let i = expenses.length - 1; i >= 0; i--) {
      if (expenses[i].claim_id === claim.id) {
        expenses.splice(i, 1);
      }
    }
    for (const item of itemsToCreate) {
      expenses.push({
        id: uuidv4(),
        claim_id: claim.id,
        expense_date: mom.meeting_date,
        vendor: mom.client || 'Client Meeting',
        category: item.category,
        amount: item.amount,
        payment_method: 'Cash',
        business_purpose: item.business_purpose,
        receipt_url: item.receipt_url
      });
    }

    const oldStatus = claim.status;
    claim.mom_id = mom_id;
    claim.expense_category = mainCategory;
    claim.total_amount = claimTotal;
    claim.receipt_url = mainReceipt;
    claim.remarks = remarks;
    claim.supporting_documents = supporting_documents;
    claim.status = ClaimStatus.PENDING_APPROVAL;
    claim.updated_at = new Date().toISOString();
    claim.flagged_high_value = itemsToCreate.some(item => item.amount > 15000);

    addHistory(claim.id, oldStatus, ClaimStatus.PENDING_APPROVAL, user.id, 'Revised and resubmitted by requestor after being returned');

    const claimNumber = claim.claim_number || `REIM-${claim.id.substring(0, 6)}`;

    if (claim.current_approver_id) {
      const emailSubject = `Reimbursement Resubmitted - ${claimNumber}`;
      const emailBody = `A previously returned reimbursement request ${claimNumber} by ${user.name} has been revised and resubmitted, and is awaiting your review and approval.

Reference:
${claimNumber}

Required Action:
Please log in to the system and navigate to the Approval Queue to approve or reject this claim.`;
      sendEmail(claim.current_approver_id, emailSubject, emailBody);
    }

    res.json(claim);
  });

  app.get('/api/approver/schedule', (req, res) => {
    const user = getUser(req);
    if (!user || !user.reports_to) return res.json([]);
    
    // Resolve who the actual approver is right now based on delegation
    let currentApproverId = user.reports_to;
    const sup = users.find(u => u.id === user.reports_to);
    if (sup?.delegation) {
      const now = new Date();
      const start = new Date(sup.delegation.start_date);
      const end = new Date(sup.delegation.end_date);
      end.setHours(23, 59, 59, 999);
      if (now >= start && now <= end) {
        currentApproverId = sup.delegation.delegate_id;
      }
    }
    
    // Find claims currently assigned to that approver
    const relevantClaims = claims.filter(c => c.current_approver_id === currentApproverId);
    const relevantClaimIds = relevantClaims.map(c => c.id);
    const relevantMoms = moms.filter(m => m.claim_id && relevantClaimIds.includes(m.claim_id));

    res.json(relevantMoms);
  });

  // Lets a Requestor check their resolved Approver's existing Review Meeting
  // slots (date/time only, not full detail) before picking a time in the
  // Submit Claim wizard, so a conflict can be flagged client-side pre-submit.
  app.get('/api/approver/review-meetings', (req, res) => {
    const user = getUser(req);
    if (!user || !user.reports_to) return res.json([]);

    let currentApproverId = user.reports_to;
    const sup = users.find(u => u.id === user.reports_to);
    if (sup?.delegation) {
      const now = new Date();
      const start = new Date(sup.delegation.start_date);
      const end = new Date(sup.delegation.end_date);
      end.setHours(23, 59, 59, 999);
      if (now >= start && now <= end) {
        currentApproverId = sup.delegation.delegate_id;
      }
    }

    const relevant = reviewMeetings.filter(rm => rm.approver_id === currentApproverId && rm.status === ReviewMeetingStatus.SCHEDULED);
    res.json(relevant.map(rm => ({ meeting_date: rm.meeting_date, meeting_time: rm.meeting_time })));
  });

  app.post('/api/claims/:id/approve', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.APPROVER) return res.status(403).json({ error: 'Forbidden' });
    
    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Not found' });
    
    // Segregation of duties: Requestors cannot approve their own claims
    if (claim.requestor_id === user.id) {
      return res.status(403).json({ error: 'Segregation of Duties: You cannot approve your own reimbursement claim.' });
    }

    const requestor = users.find(u => u.id === claim.requestor_id);
    if (claim.current_approver_id !== user.id && claim.original_approver_id !== user.id) {
      return res.status(403).json({ error: 'Not your direct report' });
    }
    
    const { decision, comment } = req.body; // Approved, Rejected, Returned
    if (!['Approved', 'Rejected', 'Returned'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });
    if ((decision === 'Rejected' || decision === 'Returned') && !comment) {
      return res.status(400).json({ error: 'Comment required' });
    }
    
    const oldStatus = claim.status;
    let newStatus = claim.status;
    
    if (decision === 'Approved') newStatus = ClaimStatus.PROCESSING;
    else if (decision === 'Rejected') newStatus = ClaimStatus.REJECTED;
    else if (decision === 'Returned') newStatus = ClaimStatus.RETURNED;
    
    claim.status = newStatus;
    claim.updated_at = new Date().toISOString();
    
    
    approvals.push({
      id: uuidv4(),
      claim_id: claim.id,
      approver_id: user.id,
      decision,
      comment: comment || '',
      timestamp: new Date().toISOString()
    });
    
    addHistory(claim.id, oldStatus, newStatus, user.id);
    
    const claimNumber = claim.claim_number || `REIM-${claim.id.substring(0,6)}`;

    if (decision === 'Approved') {
      claim.approved_at = new Date().toISOString();

      // Email Notification 3: Approved (Recipient: Requestor)
      const approvedSubject = `Approved - ${claimNumber}`;
      const approvedBody = `Your reimbursement request ${claimNumber} has been approved by ${user.name}. It has been forwarded to the Custodian for processing and payment release.

Reference:
${claimNumber}`;
      sendEmail(claim.requestor_id, approvedSubject, approvedBody);

      // Email Notification 5: Processing (Recipient: Custodian)
      const custodians = users.filter(u => u.role === UserRole.CUSTODIAN);
      custodians.forEach(c => {
        const custodianSubject = `Reimbursement Processing Required - ${claimNumber}`;
        const custodianBody = `Reimbursement request ${claimNumber} submitted by ${requestor?.name || 'Requestor'} and approved by ${user.name} is now in your processing queue.

Reference:
${claimNumber}

Required Action:
Please generate the Claim Code, release the payment, and mark it as Ready for Claim.`;
        sendEmail(c.id, custodianSubject, custodianBody);
      });
    } else {
      const actionText = decision === 'Returned' ? 'Please revise and resubmit your claim.' : 'No action required.';
      const emailSubject = `Reimbursement ${decision} - ${claimNumber}`;
      const emailBody = `Your reimbursement request ${claimNumber} has been ${decision.toLowerCase()} by ${user.name}.

Reason:
${comment}

Reference:
${claimNumber}

Required Action:
${actionText}`;
      sendEmail(claim.requestor_id, emailSubject, emailBody);
    }
    
    res.json(claim);
  });

  // Generate, Edit or Regenerate Claim Code (Release Code) - Custodian
  app.put('/api/claims/:id/claim-code', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.CUSTODIAN) return res.status(403).json({ error: 'Forbidden' });

    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const { code } = req.body;
    const isRegen = !!claim.release_code;
    claim.release_code = code || Math.random().toString(36).substring(2, 8).toUpperCase();
    
    addHistory(claim.id, claim.status, claim.status, user.id, isRegen ? `Regenerated Claim Code to ${claim.release_code}` : `Generated Claim Code ${claim.release_code}`);
    
    res.json(claim);
  });

  // Mark Ready for Claim - Custodian
  app.post('/api/claims/:id/ready-for-claim', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.CUSTODIAN) return res.status(403).json({ error: 'Forbidden' });

    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    if (!claim.release_code) {
      claim.release_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const { payment_method } = req.body;
    claim.payment_method = payment_method || 'Cash';
    claim.processed_by = user.id;

    const oldStatus = claim.status;
    claim.status = ClaimStatus.READY_FOR_CLAIM;
    claim.processing_date = new Date().toISOString();
    claim.updated_at = new Date().toISOString();
    

    addHistory(claim.id, oldStatus, ClaimStatus.READY_FOR_CLAIM, user.id);

    // Email Notification 4: Ready for Claim (Recipient: Requestor)
    const requestor = users.find(u => u.id === claim.requestor_id);
    const claimNumber = claim.claim_number || `REIM-${claim.id.substring(0,6)}`;

    const emailSubject = `Reimbursement - For Release`;
    const emailBody = `This request ${claimNumber} by ${requestor?.name || 'Requestor'} has been approved and ready for release.

Enter code ${claim.release_code} for releasing of cash.
_________________________________________
This is an automatically generated email, please do not reply.
${requestor?.name || 'Requestor'}
BSM Assistant | BSD - IT Security Business`;

    sendEmail(claim.requestor_id, emailSubject, emailBody, undefined, { 
      plain: true,
      fromLabel: "SharePoint Online <no-reply@sharepointonline.com>"
    });

    res.json(claim);
  });

  // Complete Claim - Requestor confirming they received payment
  app.post('/api/claims/:id/claim', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const claim = claims.find(c => c.id === req.params.id && c.requestor_id === user.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    if (claim.status !== ClaimStatus.READY_FOR_CLAIM) {
      return res.status(400).json({ error: 'Claim is not ready for claiming.' });
    }

    const { code } = req.body;
    if (!code || code !== claim.release_code) {
      return res.status(400).json({ error: 'Incorrect Claim Code' });
    }

    const oldStatus = claim.status;
    claim.status = ClaimStatus.COMPLETED;
    claim.updated_at = new Date().toISOString();
    

    addHistory(claim.id, oldStatus, ClaimStatus.COMPLETED, user.id);

    if (claim.sourceLiquidationId) {
      addLiqHistory(claim.sourceLiquidationId, LiquidationStatus.CLOSED, LiquidationStatus.CLOSED, user.id, 'Reimbursement Processed');
    }

    res.json(claim);
  });

  // Outbox API
  app.get('/api/outbox', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    if (user.role === UserRole.ADMIN) {
      res.json(emails.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } else {
      res.json(emails.filter(e => e.recipient_id === user.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }
  });

  app.put('/api/outbox/read', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { ids } = req.body;
    if (Array.isArray(ids)) {
      emails.forEach(e => {
        if (ids.includes(e.id) && (e.recipient_id === user.id || user.role === UserRole.ADMIN)) {
          e.read = true;
        }
      });
    }
    res.json({ success: true });
  });

  // Activity Status & Seen endpoints
  app.get('/api/activity/status', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const userSeen = lastSeenStore[user.id] || {};
    const lastSeenCalendar = userSeen.calendar || '1970-01-01T00:00:00.000Z';
    const lastSeenInbox = userSeen.inbox || '1970-01-01T00:00:00.000Z';
    const lastSeenProcessing = userSeen.processing || '1970-01-01T00:00:00.000Z';
    const lastSeenDashboard = userSeen.dashboard || '1970-01-01T00:00:00.000Z';

    // calendar: visible MOMs (own if Requestor, own + direct reports if Approver) has created_at > lastSeenCalendar
    let calendarActivity = false;
    let relevantMoms: Mom[] = [];
    if (user.role === UserRole.REQUESTOR) {
      relevantMoms = moms.filter(m => m.requestor_id === user.id);
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      relevantMoms = moms.filter(m => m.requestor_id === user.id || (m.requestor_id && reporteeIds.includes(m.requestor_id)));
    }
    calendarActivity = relevantMoms.some(m => m.created_at && m.created_at > lastSeenCalendar);

    // emails: true if user has any unread email in emails array where recipient_id === user.id
    const emailsActivity = emails.some(e => e.recipient_id === user.id && !e.read);

    // inbox: (Approver only) true if any claim in their Pending Approval queue or their own Returned claims has an updated_at newer than their last-seen "inbox" timestamp.
    let inboxActivity = false;
    if (user.role === UserRole.APPROVER) {
      const pendingClaims = claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL && c.current_approver_id === user.id);
      const returnedClaims = claims.filter(c => c.status === ClaimStatus.RETURNED && c.requestor_id === user.id);
      const inboxClaims = [...pendingClaims, ...returnedClaims];
      inboxActivity = inboxClaims.some(c => c.updated_at && c.updated_at > lastSeenInbox);
    }

    // processing: (Custodian only) true if any claim newly entered Processing status with an updated_at newer than their last-seen "processing" timestamp.
    let processingActivity = false;
    if (user.role === UserRole.CUSTODIAN) {
      const processingClaims = claims.filter(c => c.status === ClaimStatus.PROCESSING);
      processingActivity = processingClaims.some(c => c.updated_at && c.updated_at > lastSeenProcessing);
    }

    // dashboard: (Requestor only) true if any of the user's own claims changed status (updated_at newer than their last-seen "dashboard" timestamp) since they last looked.
    let dashboardActivity = false;
    if (user.role === UserRole.REQUESTOR) {
      const ownClaims = claims.filter(c => c.requestor_id === user.id);
      dashboardActivity = ownClaims.some(c => c.updated_at && c.updated_at > lastSeenDashboard);
    }

    res.json({
      calendar: calendarActivity,
      emails: emailsActivity,
      inbox: inboxActivity,
      processing: processingActivity,
      dashboard: dashboardActivity
    });
  });

  app.post('/api/activity/seen', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { section } = req.body;
    if (!section) return res.status(400).json({ error: 'Section is required' });

    if (!lastSeenStore[user.id]) {
      lastSeenStore[user.id] = {};
    }
    lastSeenStore[user.id][section] = new Date().toISOString();

    res.json({ success: true, timestamp: lastSeenStore[user.id][section] });
  });
  
  // All history for admin
  app.get('/api/history', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });
    
    const enriched = statusHistories.map(h => {
      const claim = claims.find(c => c.id === h.claim_id);
      const changedBy = users.find(u => u.id === h.changed_by);
      return { ...h, claim, changedBy };
    }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json(enriched);
  });

  // --- CASH ADVANCE & LIQUIDATION ENDPOINTS ---

  const recalculateLiquidation = (liquidationId: string) => {
    const liq = liquidations.find(l => l.id === liquidationId);
    if (!liq) return;
    const ca = cashAdvances.find(c => c.id === liq.cashAdvanceId);
    if (!ca) return;

    const items = liquidationLineItems.filter(item => item.liquidationId === liquidationId);
    const totalSpent = items.reduce((sum, item) => sum + item.amount, 0);
    const varianceAmount = totalSpent - ca.amount;

    liq.totalSpent = totalSpent;
    liq.varianceAmount = varianceAmount;
    if (varianceAmount === 0) {
      liq.varianceType = LiquidationVarianceType.SETTLED;
    } else if (varianceAmount < 0) {
      liq.varianceType = LiquidationVarianceType.REFUND_DUE;
    } else {
      liq.varianceType = LiquidationVarianceType.REIMBURSEMENT_DUE;
    }
  };

  // 1. Get all cash advances
  app.get('/api/cash-advances', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    let filtered: CashAdvance[] = [];
    if (user.role === UserRole.REQUESTOR) {
      filtered = cashAdvances.filter(ca => ca.requestorId === user.id);
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      filtered = cashAdvances.filter(ca => ca.approverId === user.id || ca.requestorId === user.id || reporteeIds.includes(ca.requestorId));
    } else {
      filtered = cashAdvances; // Custodian and Admin see all
    }

    const enriched = filtered.map(ca => {
      const requestor = users.find(u => u.id === ca.requestorId);
      const approver = users.find(u => u.id === ca.approverId);
      const mom = ca.momId ? moms.find(m => m.id === ca.momId) : undefined;
      return { ...ca, requestor, approver, mom };
    });
    res.json(enriched);
  });

  // 2. Get single cash advance
  app.get('/api/cash-advances/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const ca = cashAdvances.find(c => c.id === req.params.id);
    if (!ca) return res.status(404).json({ error: 'Cash Advance not found' });

    const requestor = users.find(u => u.id === ca.requestorId);
    const approver = users.find(u => u.id === ca.approverId);
    const mom = ca.momId ? moms.find(m => m.id === ca.momId) : undefined;

    const history = statusHistories
      .filter(h => h.cash_advance_id === ca.id)
      .map(h => ({
        ...h,
        changedBy: users.find(u => u.id === h.changed_by)
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ ...ca, requestor, approver, mom, history });
  });

  // 3. Create a cash advance request
  app.post('/api/cash-advances', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!user.reports_to) return res.status(403).json({ error: 'Forbidden: You must have a designated manager (reports_to) to submit.' });

    // Rule 4: A Requestor may only have ONE active (unliquidated) CashAdvance at a time — block creation of a new one with a friendly message if one is already open.
    const hasActive = cashAdvances.some(ca => ca.requestorId === user.id && ca.status !== CashAdvanceStatus.LIQUIDATED && ca.status !== CashAdvanceStatus.REJECTED);
    if (hasActive) {
      return res.status(400).json({ error: 'A requestor may only have one active (unliquidated) Cash Advance at a time. Please liquidate or resolve your current open Cash Advance before requesting a new one.' });
    }

    const { amount, purpose, momId } = req.body;
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ error: 'Amount is required.' });
    }
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number.' });
    }
    if (!purpose) {
      return res.status(400).json({ error: 'Purpose is required.' });
    }

    if (momId) {
      const mom = moms.find(m => m.id === momId);
      if (!mom) return res.status(400).json({ error: 'Minutes of Meeting (MOM) not found.' });
      if (mom.status !== MomStatus.COMPLETED) {
        return res.status(400).json({ error: 'Cannot attach an incomplete or draft Minutes of Meeting.' });
      }
    }

    const caId = uuidv4();
    const cashAdvance: CashAdvance = {
      id: caId,
      requestorId: user.id,
      amount: numericAmount,
      purpose,
      momId,
      approverId: user.reports_to,
      status: CashAdvanceStatus.DRAFT
    };

    cashAdvances.push(cashAdvance);
    addCaHistory(caId, '', CashAdvanceStatus.DRAFT, user.id, 'Cash Advance Draft Created');
    res.json(cashAdvance);
  });

  // 4. Update cash advance in Draft or Rejected status
  app.put('/api/cash-advances/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const ca = cashAdvances.find(c => c.id === req.params.id);
    if (!ca) return res.status(404).json({ error: 'Cash Advance not found' });

    const { amount, purpose, momId } = req.body;

    // Rule 3: Once a CashAdvance reaches Released: amount, purpose, and linked MOM become locked. Only Admin can override.
    if ([CashAdvanceStatus.RELEASED, CashAdvanceStatus.LIQUIDATED].includes(ca.status)) {
      if (user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'This Cash Advance has already been released/liquidated. Its amount, purpose, and MOM are locked and can only be modified by an Admin.' });
      }
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a valid positive number.' });
      }
      ca.amount = numericAmount;
    }

    if (purpose !== undefined) {
      if (!purpose) return res.status(400).json({ error: 'Purpose cannot be empty.' });
      ca.purpose = purpose;
    }

    if (momId !== undefined) {
      if (momId) {
        const mom = moms.find(m => m.id === momId);
        if (!mom) return res.status(400).json({ error: 'Minutes of Meeting (MOM) not found.' });
        if (mom.status !== MomStatus.COMPLETED) {
          return res.status(400).json({ error: 'Cannot attach an incomplete or draft Minutes of Meeting.' });
        }
      }
      ca.momId = momId || undefined;
    }

    res.json(ca);
  });

  // 5. Submit Cash Advance
  app.post('/api/cash-advances/:id/submit', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const ca = cashAdvances.find(c => c.id === req.params.id && c.requestorId === user.id);
    if (!ca) return res.status(404).json({ error: 'Cash Advance not found' });

    if (ca.status !== CashAdvanceStatus.DRAFT && ca.status !== CashAdvanceStatus.REJECTED) {
      return res.status(400).json({ error: 'Only Cash Advances in Draft or Rejected status can be submitted.' });
    }

    const oldStatus = ca.status;
    ca.status = CashAdvanceStatus.SUBMITTED;
    addCaHistory(ca.id, oldStatus, CashAdvanceStatus.SUBMITTED, user.id, 'Cash Advance Submitted for Approval');
    
    // Delegation logic matching claims
    if (user.reports_to) {
      const sup = users.find(u => u.id === user.reports_to);
      if (sup?.delegation) {
        const now = new Date();
        const start = new Date(sup.delegation.start_date);
        const end = new Date(sup.delegation.end_date);
        end.setHours(23, 59, 59, 999);
        if (now >= start && now <= end) {
          ca.approverId = sup.delegation.delegate_id;
        } else {
          ca.approverId = user.reports_to;
        }
      } else {
        ca.approverId = user.reports_to;
      }
    }

    const approver = users.find(u => u.id === ca.approverId);
    if (approver) {
      sendEmail(
        ca.approverId,
        `Cash Advance Request Submitted - CADV-${ca.id.substring(0,6)}`,
        `A Cash Advance request for PHP ${ca.amount} has been submitted by ${user.name} for your approval.\n\nPurpose: ${ca.purpose}`
      );
    }

    res.json(ca);
  });

  // 6. Approve or Reject Cash Advance
  app.post('/api/cash-advances/:id/approve', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.APPROVER) return res.status(403).json({ error: 'Forbidden' });

    const ca = cashAdvances.find(c => c.id === req.params.id);
    if (!ca) return res.status(404).json({ error: 'Cash Advance not found' });

    if (ca.approverId !== user.id) {
      return res.status(403).json({ error: 'You are not the designated approver for this Cash Advance.' });
    }

    if (ca.status !== CashAdvanceStatus.SUBMITTED) {
      return res.status(400).json({ error: 'Only Submitted Cash Advances can be approved or rejected.' });
    }

    const { decision, comment } = req.body;
    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision. Must be Approved or Rejected.' });
    }

    if (decision === 'Rejected' && !comment) {
      return res.status(400).json({ error: 'A comment is required when rejecting a Cash Advance.' });
    }

    const oldStatus = ca.status;
    const newStatus = decision === 'Approved' ? CashAdvanceStatus.APPROVED : CashAdvanceStatus.REJECTED;
    ca.status = newStatus;
    addCaHistory(ca.id, oldStatus, newStatus, user.id, comment || `Cash Advance ${decision}`);

    sendEmail(
      ca.requestorId,
      `Cash Advance Request ${decision} - CADV-${ca.id.substring(0,6)}`,
      `Your Cash Advance request for PHP ${ca.amount} has been ${decision} by ${user.name}.${comment ? `\n\nComment: ${comment}` : ''}`
    );

    res.json(ca);
  });

  // 7. Release Cash Advance (Custodian only)
  app.post('/api/cash-advances/:id/release', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.CUSTODIAN) return res.status(403).json({ error: 'Forbidden: Only Custodians can release Cash Advances.' });

    const ca = cashAdvances.find(c => c.id === req.params.id);
    if (!ca) return res.status(404).json({ error: 'Cash Advance not found' });

    if (ca.status !== CashAdvanceStatus.APPROVED) {
      return res.status(400).json({ error: 'Only Approved Cash Advances can be released.' });
    }

    const { releaseReference } = req.body;
    if (!releaseReference) {
      return res.status(400).json({ error: 'Release Reference/Voucher is required.' });
    }

    const oldStatus = ca.status;
    ca.status = CashAdvanceStatus.RELEASED;
    ca.releasedBy = user.id;
    ca.releaseDate = new Date().toISOString();
    ca.releaseReference = releaseReference;
    addCaHistory(ca.id, oldStatus, CashAdvanceStatus.RELEASED, user.id, `Released with Voucher Reference: ${releaseReference}`);

    sendEmail(
      ca.requestorId,
      `Cash Advance Released - CADV-${ca.id.substring(0,6)}`,
      `Your Cash Advance for PHP ${ca.amount} has been released by ${user.name}.\n\nRelease Reference: ${releaseReference}\n\nPlease file your liquidation within ${LIQUIDATION_DEADLINE_DAYS} days.`
    );

    res.json(ca);
  });

  // 8. Get all liquidations
  app.get('/api/liquidations', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    let filtered: Liquidation[] = [];
    if (user.role === UserRole.REQUESTOR) {
      filtered = liquidations.filter(l => l.requestorId === user.id);
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      filtered = liquidations.filter(l => {
        const ca = cashAdvances.find(ca => ca.id === l.cashAdvanceId);
        const approverId = ca?.approverId;
        return l.requestorId === user.id || approverId === user.id || reporteeIds.includes(l.requestorId);
      });
    } else {
      filtered = liquidations; // Custodian and Admin see all
    }

    const enriched = filtered.map(l => {
      const requestor = users.find(u => u.id === l.requestorId);
      const cashAdvance = cashAdvances.find(c => c.id === l.cashAdvanceId);
      const items = liquidationLineItems.filter(item => item.liquidationId === l.id);
      return { ...l, requestor, cashAdvance, lineItems: items };
    });
    res.json(enriched);
  });

  // 9. Get single liquidation
  app.get('/api/liquidations/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const l = liquidations.find(liq => liq.id === req.params.id);
    if (!l) return res.status(404).json({ error: 'Liquidation not found' });

    const requestor = users.find(u => u.id === l.requestorId);
    const cashAdvance = cashAdvances.find(c => c.id === l.cashAdvanceId);
    const items = liquidationLineItems.filter(item => item.liquidationId === l.id);

    const history = statusHistories
      .filter(h => h.liquidation_id === l.id)
      .map(h => ({
        ...h,
        changedBy: users.find(u => u.id === h.changed_by)
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ ...l, requestor, cashAdvance, lineItems: items, history });
  });

  // 10. Initiate liquidation for a Released Cash Advance
  app.post('/api/liquidations', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { cashAdvanceId } = req.body;
    if (!cashAdvanceId) return res.status(400).json({ error: 'Cash Advance ID is required.' });

    const ca = cashAdvances.find(c => c.id === cashAdvanceId);
    if (!ca) return res.status(404).json({ error: 'Cash Advance not found' });

    if (ca.requestorId !== user.id) {
      return res.status(403).json({ error: 'You can only liquidate your own Cash Advances.' });
    }

    if (ca.status !== CashAdvanceStatus.RELEASED) {
      return res.status(400).json({ error: 'You can only liquidate Cash Advances that have been Released.' });
    }

    const existing = liquidations.find(l => l.cashAdvanceId === cashAdvanceId);
    if (existing) {
      return res.status(400).json({ error: 'A Liquidation already exists for this Cash Advance.' });
    }

    const liquidationId = uuidv4();
    const liquidation: Liquidation = {
      id: liquidationId,
      cashAdvanceId,
      requestorId: user.id,
      totalSpent: 0,
      varianceAmount: -ca.amount,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.DRAFT
    };

    liquidations.push(liquidation);
    addLiqHistory(liquidationId, '', LiquidationStatus.DRAFT, user.id, 'Liquidation Draft Started');
    addCaHistory(ca.id, ca.status, ca.status, user.id, 'Liquidation Started');
    res.json(liquidation);
  });

  // 11. Add a line item to a Liquidation (editable only in Draft or ReturnedForRevision)
  app.post('/api/liquidations/:id/line-items', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const l = liquidations.find(liq => liq.id === req.params.id);
    if (!l) return res.status(404).json({ error: 'Liquidation not found' });

    if (l.requestorId !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this Liquidation.' });
    }

    // Rule 2: Editable only in Draft or ReturnedForRevision; read-only otherwise
    if (l.status !== LiquidationStatus.DRAFT && l.status !== LiquidationStatus.RETURNED_FOR_REVISION) {
      return res.status(400).json({ error: 'This Liquidation is read-only because it has been submitted.' });
    }

    const { expense_date, vendor, category, amount, payment_method, business_purpose, receipt_url, attachment_type } = req.body;
    if (!expense_date || !vendor || !category || amount === undefined || !payment_method || !business_purpose || !receipt_url) {
      return res.status(400).json({ error: 'Missing required expense fields.' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid number greater than zero.' });
    }

    const itemId = uuidv4();
    const newItem: LiquidationLineItem = {
      id: itemId,
      liquidationId: l.id,
      expense_date,
      vendor,
      category,
      amount: numericAmount,
      payment_method,
      business_purpose,
      receipt_url,
      attachment_type: attachment_type || 'Official Receipt'
    };

    liquidationLineItems.push(newItem);
    recalculateLiquidation(l.id);

    res.json(newItem);
  });

  // 12. Update a line item in a Liquidation
  app.put('/api/liquidations/:id/line-items/:itemId', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const l = liquidations.find(liq => liq.id === req.params.id);
    if (!l) return res.status(404).json({ error: 'Liquidation not found' });

    if (l.requestorId !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this Liquidation.' });
    }

    // Rule 2: Editable only in Draft or ReturnedForRevision; read-only otherwise
    if (l.status !== LiquidationStatus.DRAFT && l.status !== LiquidationStatus.RETURNED_FOR_REVISION) {
      return res.status(400).json({ error: 'This Liquidation is read-only because it has been submitted.' });
    }

    const item = liquidationLineItems.find(i => i.id === req.params.itemId && i.liquidationId === l.id);
    if (!item) return res.status(404).json({ error: 'Line item not found' });

    const { expense_date, vendor, category, amount, payment_method, business_purpose, receipt_url, attachment_type } = req.body;

    if (expense_date !== undefined) item.expense_date = expense_date;
    if (vendor !== undefined) item.vendor = vendor;
    if (category !== undefined) item.category = category;
    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a valid number greater than zero.' });
      }
      item.amount = numericAmount;
    }
    if (payment_method !== undefined) item.payment_method = payment_method;
    if (business_purpose !== undefined) item.business_purpose = business_purpose;
    if (receipt_url !== undefined) item.receipt_url = receipt_url;
    if (attachment_type !== undefined) item.attachment_type = attachment_type;

    recalculateLiquidation(l.id);
    res.json(item);
  });

  // 13. Delete a line item from a Liquidation
  app.delete('/api/liquidations/:id/line-items/:itemId', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const l = liquidations.find(liq => liq.id === req.params.id);
    if (!l) return res.status(404).json({ error: 'Liquidation not found' });

    if (l.requestorId !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this Liquidation.' });
    }

    // Rule 2: Editable only in Draft or ReturnedForRevision; read-only otherwise
    if (l.status !== LiquidationStatus.DRAFT && l.status !== LiquidationStatus.RETURNED_FOR_REVISION) {
      return res.status(400).json({ error: 'This Liquidation is read-only because it has been submitted.' });
    }

    const index = liquidationLineItems.findIndex(i => i.id === req.params.itemId && i.liquidationId === l.id);
    if (index === -1) return res.status(404).json({ error: 'Line item not found' });

    liquidationLineItems.splice(index, 1);
    recalculateLiquidation(l.id);

    res.json({ success: true });
  });

  // 14. Submit a Liquidation report
  app.post('/api/liquidations/:id/submit', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const l = liquidations.find(liq => liq.id === req.params.id && liq.requestorId === user.id);
    if (!l) return res.status(404).json({ error: 'Liquidation not found' });

    if (l.status !== LiquidationStatus.DRAFT && l.status !== LiquidationStatus.RETURNED_FOR_REVISION) {
      return res.status(400).json({ error: 'Only Liquidations in Draft or ReturnedForRevision status can be submitted.' });
    }

    recalculateLiquidation(l.id);

    const oldStatus = l.status;
    l.status = LiquidationStatus.SUBMITTED;
    addLiqHistory(l.id, oldStatus, LiquidationStatus.SUBMITTED, user.id, 'Liquidation Submitted for Review');

    const ca = cashAdvances.find(c => c.id === l.cashAdvanceId);
    if (ca) {
      addCaHistory(ca.id, ca.status, ca.status, user.id, 'Liquidation Submitted');
      sendEmail(
        ca.approverId,
        `Liquidation Submitted - LIQ-${l.id.substring(0,6)}`,
        `A Liquidation report has been submitted by ${user.name} for Cash Advance CADV-${ca.id.substring(0,6)}.\n\nTotal Spent: PHP ${l.totalSpent}\nVariance: PHP ${l.varianceAmount} (${l.varianceType})`
      );
    }

    res.json(l);
  });

  // 15. Approve/Reviewed or Return a Liquidation report (Approver only)
  app.post('/api/liquidations/:id/review', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.APPROVER) return res.status(403).json({ error: 'Forbidden' });

    const l = liquidations.find(liq => liq.id === req.params.id);
    if (!l) return res.status(404).json({ error: 'Liquidation not found' });

    const ca = cashAdvances.find(c => c.id === l.cashAdvanceId);
    if (!ca || ca.approverId !== user.id) {
      return res.status(403).json({ error: 'You are not the designated approver/reviewer for this Liquidation.' });
    }

    if (l.status !== LiquidationStatus.SUBMITTED) {
      return res.status(400).json({ error: 'Only Submitted Liquidations can be reviewed.' });
    }

    const { decision, comment } = req.body;
    if (!['Approved', 'Returned'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision. Must be Approved or Returned.' });
    }

    if (decision === 'Returned' && !comment) {
      return res.status(400).json({ error: 'A comment is required when returning a Liquidation for revision.' });
    }

    if (decision === 'Returned') {
      const oldStatus = l.status;
      l.status = LiquidationStatus.RETURNED_FOR_REVISION;
      addLiqHistory(l.id, oldStatus, LiquidationStatus.RETURNED_FOR_REVISION, user.id, comment || 'Returned for revision');
      addCaHistory(ca.id, ca.status, ca.status, user.id, `Liquidation Returned for Revision: ${comment}`);
      sendEmail(
        l.requestorId,
        `Liquidation Returned - LIQ-${l.id.substring(0,6)}`,
        `Your Liquidation report has been returned for revision by ${user.name}.\n\nReason: ${comment}`
      );
    } else {
      recalculateLiquidation(l.id);

      if (l.varianceType === LiquidationVarianceType.SETTLED) {
        const oldStatus = l.status;
        const oldCaStatus = ca.status;
        l.status = LiquidationStatus.CLOSED;
        ca.status = CashAdvanceStatus.LIQUIDATED;
        addLiqHistory(l.id, oldStatus, LiquidationStatus.CLOSED, user.id, 'Liquidation Approved & Closed (Settled with zero variance)');
        addCaHistory(ca.id, oldCaStatus, CashAdvanceStatus.LIQUIDATED, user.id, 'Liquidation Closed');

        sendEmail(
          l.requestorId,
          `Liquidation Approved & Closed - LIQ-${l.id.substring(0,6)}`,
          `Your Liquidation report has been approved and closed by ${user.name}. Since it is settled with zero variance, no further action is required.`
        );
      } else if (l.varianceType === LiquidationVarianceType.REIMBURSEMENT_DUE) {
        const oldStatus = l.status;
        const oldCaStatus = ca.status;
        l.status = LiquidationStatus.CLOSED;
        ca.status = CashAdvanceStatus.LIQUIDATED;

        const claimId = uuidv4();
        const year = new Date().getFullYear();
        const numStr = String(claimCounter++).padStart(6, '0');
        const claimNumber = `REIM-${year}-${numStr}`;

        const shortFallClaim: Claim = {
          id: claimId,
          claim_number: claimNumber,
          requestor_id: l.requestorId,
          current_approver_id: ca.approverId,
          mom_id: ca.momId || '',
          status: ClaimStatus.PROCESSING,
          total_amount: l.varianceAmount,
          expense_category: 'Cash Advance Shortfall',
          receipt_url: liquidationLineItems.find(item => item.liquidationId === l.id)?.receipt_url || '',
          remarks: `Automatic shortfall reimbursement from Liquidation of CADV-${ca.id.substring(0,6)}`,
          sourceLiquidationId: l.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          flagged_high_value: l.varianceAmount > 15000
        };

        claims.push(shortFallClaim);

        expenses.push({
          id: uuidv4(),
          claim_id: claimId,
          expense_date: new Date().toISOString().split('T')[0],
          vendor: 'Shortfall Payout',
          category: 'Cash Advance Shortfall',
          amount: l.varianceAmount,
          payment_method: 'Cash',
          business_purpose: `Shortfall payout for CADV-${ca.id.substring(0,6)} liquidation`,
          receipt_url: shortFallClaim.receipt_url
        });

        addHistory(claimId, ClaimStatus.DRAFT, ClaimStatus.PROCESSING, user.id, 'Automatic creation from Cash Advance Liquidation Shortfall');
        addLiqHistory(l.id, oldStatus, LiquidationStatus.CLOSED, user.id, `Liquidation Approved & Closed. Shortfall reimbursement claim created: ${claimNumber}`);
        addCaHistory(ca.id, oldCaStatus, CashAdvanceStatus.LIQUIDATED, user.id, 'Liquidation Closed (Reimbursement Payout Queued)');

        sendEmail(
          l.requestorId,
          `Liquidation Approved & Reimbursement Payout Queued - LIQ-${l.id.substring(0,6)}`,
          `Your Liquidation has been approved. A shortfall reimbursement claim ${claimNumber} for PHP ${l.varianceAmount} has been automatically created and routed directly to the Custodian's disbursement preparation queue.`
        );
      } else {
        const oldStatus = l.status;
        l.status = LiquidationStatus.REVIEWED;
        addLiqHistory(l.id, oldStatus, LiquidationStatus.REVIEWED, user.id, `Liquidation Approved & Reviewed. Pending refund of PHP ${Math.abs(l.varianceAmount)}`);
        addCaHistory(ca.id, ca.status, ca.status, user.id, 'Liquidation Reviewed (Pending Refund)');

        sendEmail(
          l.requestorId,
          `Liquidation Reviewed & Approved - LIQ-${l.id.substring(0,6)}`,
          `Your Liquidation has been approved and is awaiting Custodian refund collection of PHP ${Math.abs(l.varianceAmount)}.`
        );
      }
    }

    res.json(l);
  });

  // 16. Collect refund and close Liquidation (Custodian only)
  app.post('/api/liquidations/:id/collect-refund', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.CUSTODIAN) return res.status(403).json({ error: 'Forbidden: Only Custodians can collect refunds.' });

    const l = liquidations.find(liq => liq.id === req.params.id);
    if (!l) return res.status(404).json({ error: 'Liquidation not found' });

    if (l.status !== LiquidationStatus.REVIEWED) {
      return res.status(400).json({ error: 'Only Reviewed Liquidations with pending refunds can be marked collected.' });
    }

    if (l.varianceType !== LiquidationVarianceType.REFUND_DUE) {
      return res.status(400).json({ error: 'No refund is due for this Liquidation.' });
    }

    const { referenceNote } = req.body;

    const oldStatus = l.status;
    l.status = LiquidationStatus.CLOSED;
    
    const ca = cashAdvances.find(c => c.id === l.cashAdvanceId);
    let oldCaStatus = '';
    if (ca) {
      oldCaStatus = ca.status;
      ca.status = CashAdvanceStatus.LIQUIDATED;
    }

    addLiqHistory(l.id, oldStatus, LiquidationStatus.CLOSED, user.id, `Closed (Refund Collected). Note: ${referenceNote || 'Collected by Custodian'}`);
    if (ca) {
      addCaHistory(ca.id, oldCaStatus, CashAdvanceStatus.LIQUIDATED, user.id, 'Closed (Refund Collected)');
    }

    (l as any).refundReference = referenceNote || 'Collected by Custodian';
    (l as any).refundCollectedAt = new Date().toISOString();

    sendEmail(
      l.requestorId,
      `Liquidation Closed (Refund Collected) - LIQ-${l.id.substring(0,6)}`,
      `Your Liquidation has been marked as Closed. Custodian ${user.name} has verified collection of your refund of PHP ${Math.abs(l.varianceAmount)}.${referenceNote ? `\n\nReference: ${referenceNote}` : ''}`
    );

    res.json(l);
  });

  // Settings: Delegation
  app.put('/api/settings/delegation', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.APPROVER) return res.status(403).json({ error: 'Forbidden' });
    
    const { delegate_id, start_date, end_date } = req.body;
    const targetUser = users.find(u => u.id === user.id);
    
    if (targetUser) {
      if (!delegate_id) {
        targetUser.delegation = undefined;
      } else {
        targetUser.delegation = { delegate_id, start_date, end_date };
      }
    }
    res.json(targetUser);
  });

  // Admin: Reassign Approver
  app.put('/api/claims/:id/reassign', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });
    
    const { new_approver_id, reason } = req.body;
    if (!new_approver_id || !reason) return res.status(400).json({ error: 'Missing required fields' });
    
    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    
    const oldApproverId = claim.current_approver_id;
    const oldApproverName = users.find(u => u.id === oldApproverId)?.name || oldApproverId;
    const newApproverName = users.find(u => u.id === new_approver_id)?.name || new_approver_id;
    
    claim.current_approver_id = new_approver_id;
    claim.updated_at = new Date().toISOString();
    
    
    statusHistories.push({
      id: uuidv4(),
      claim_id: claim.id,
      old_status: claim.status,
      new_status: claim.status,
      changed_by: user.id,
      reason: `Admin reassigned from ${oldApproverName} to ${newApproverName}. Reason: ${reason}`,
      timestamp: new Date().toISOString()
    });
    
    res.json(claim);
  });

  // Admin: Seed Data
  app.post('/api/admin/seed', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });

    moms = [];
    claims = [];
    expenses = [];
    approvals = [];
    statusHistories = [];
    emails = [];
    lastSeenStore = {};
    cashAdvances = [];
    liquidations = [];
    liquidationLineItems = [];
    reviewMeetings = [];

    users.length = 0;
    users.push(...buildDefaultUsers());

    const rDate = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString();
    };

    // Bob has an active delegation to Grace (covers "today", so auto-routing is
    // demoable live). 
    const activeDelegationStart = rDate(2).split('T')[0];
    const activeDelegationEnd = rDate(-5).split('T')[0];
    users[1].delegation = { delegate_id: 'u7', start_date: activeDelegationStart, end_date: activeDelegationEnd };
    
    // Henry has an expired delegation to Bob (ended 2 days ago).
    const expiredStart = rDate(10).split('T')[0];
    const expiredEnd = rDate(2).split('T')[0];
    users[7].delegation = { delegate_id: 'u2', start_date: expiredStart, end_date: expiredEnd };

    let seedCounter = 123;
    const nextClaimNumber = () => `REIM-${new Date().getFullYear()}-${String(seedCounter++).padStart(6, '0')}`;

    // Rotation pools so no two MOMs read as copy-pasted from one another.
    const CONTACTS = ['Maria Santos', 'Carlos Dela Cruz', 'Angela Reyes', 'Ramon Villanueva', 'Patricia Lim'];
    const PURPOSES = ['Sales and Partnership Discussion', 'Contract Renewal Discussion', 'Pilot Program Scoping', 'Marketing Collaboration Discussion', 'Accounts Receivable Follow-up'];
    const DISCUSSIONS = [
      (c: string) => `Reviewed Q3 procurement goals with ${c}. Presented our updated product catalog and volume-based discount tiers.`,
      (c: string) => `Discussed renewal terms for ${c}'s existing service contract and walked through proposed SLA improvements.`,
      (c: string) => `Conducted a needs-assessment session with ${c} to scope a potential pilot rollout across their Metro Manila branches.`,
      (c: string) => `Presented Q4 marketing collaboration opportunities to ${c} and gathered feedback on co-branded campaign concepts.`,
      (c: string) => `Followed up with ${c} on outstanding invoices and negotiated a revised payment schedule for the current quarter.`,
    ];
    const AGREEMENTS = [
      'Client agreed to a trial order of 100 units; we agreed to draft a custom pricing proposal within the week.',
      'Both parties agreed to a 6-month contract extension at current rates, pending legal review.',
      'Client approved a 2-branch pilot starting next month; we agreed to provide onsite training support.',
      'Client agreed to feature our product in their Q4 campaign in exchange for co-marketing budget support.',
      'Client committed to settling 50% of the balance by month-end, with the remainder due in 30 days.',
    ];
    const ACTION_ITEMS = [
      '1. Send pricing proposal\n2. Send trial contract guidelines',
      '1. Draft renewal contract addendum\n2. Schedule legal review',
      '1. Confirm pilot branch list\n2. Schedule onsite training dates',
      '1. Share co-marketing budget breakdown\n2. Draft campaign brief',
      '1. Send revised payment schedule\n2. Confirm receipt of partial payment',
    ];
    const LOCATIONS = ['Quezon City, Philippines', 'Makati City, Philippines', 'BGC, Taguig, Philippines', 'Cebu City, Philippines', 'Pasig City, Philippines'];
    const TIMES = ['09:00', '10:30', '13:00', '14:00', '15:30'];

    let momCursor = 0;
    const mkMom = (requestorId: string, client: string, status: MomStatus, daysAgo: number): Mom => {
      const idx = momCursor % 5;
      momCursor++;
      const reqUser = users.find(u => u.id === requestorId);
      const contact = CONTACTS[idx];
      const [first, ...rest] = contact.split(' ');
      const last = rest[rest.length - 1] || first;
      const momDate = rDate(daysAgo);
      const mom: Mom = {
        id: uuidv4(),
        requestor_id: requestorId,
        client,
        contact_person: contact,
        contact_person_email: `${first.toLowerCase()}.${last.toLowerCase()}@${client.replace(/[^a-zA-Z]/g, '').toLowerCase()}.com`,
        meeting_date: momDate.split('T')[0],
        meeting_time: TIMES[idx],
        location: LOCATIONS[idx],
        purpose: PURPOSES[idx],
        discussion: DISCUSSIONS[idx](client),
        agreements: AGREEMENTS[idx],
        action_items: ACTION_ITEMS[idx],
        prepared_by: reqUser?.name || 'Requestor',
        status,
        created_at: momDate,
        minutes_source: MinutesSource.TEMPLATE
      };
      moms.push(mom);
      return mom;
    };

    interface SeedClaimOpts {
      requestorId: string;
      approverId: string;
      mom: Mom;
      status: ClaimStatus;
      category: string;
      amount: number;
      createdDaysAgo: number;
      approvedDaysAgo?: number;
      processedDaysAgo?: number;
      releaseCode?: string;
      paymentMethod?: string;
      decisionOverride?: 'Approved' | 'Rejected' | 'Returned';
      approvalComment?: string;
      lineItems?: { vendor: string; category: string; amount: number; businessPurpose: string }[];
    }

    const mkClaim = (opts: SeedClaimOpts): Claim => {
      const claimId = uuidv4();
      const claimNumber = nextClaimNumber();
      const createdAt = rDate(opts.createdDaysAgo);

      // Link the MOM to this claim - this is what the MOM-reuse guard checks
      // to keep it out of the picker for any *other* claim from now on.
      opts.mom.claim_id = claimId;

      const items = opts.lineItems && opts.lineItems.length > 0
        ? opts.lineItems
        : [{ vendor: 'Max Restaurant', category: opts.category, amount: opts.amount, businessPurpose: `Reimbursement for client meeting with ${opts.mom.client}` }];

      items.forEach(item => {
        expenses.push({
          id: uuidv4(),
          claim_id: claimId,
          expense_date: opts.mom.meeting_date,
          vendor: item.vendor,
          category: item.category,
          amount: item.amount,
          payment_method: 'Cash',
          business_purpose: item.businessPurpose,
          receipt_url: '/receipt_placeholder.png'
        });
      });

      const decision: 'Approved' | 'Rejected' | 'Returned' | undefined = opts.decisionOverride
        || ([ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(opts.status) ? 'Approved'
          : opts.status === ClaimStatus.REJECTED ? 'Rejected'
          : opts.status === ClaimStatus.RETURNED ? 'Returned'
          : undefined);

      const approvedAt = opts.approvedDaysAgo !== undefined ? rDate(opts.approvedDaysAgo) : undefined;

      // Handle delegation for current_approver_id
      let currentApproverId = opts.approverId;
      const originalApprover = users.find(u => u.id === opts.approverId);
      if (originalApprover?.delegation) {
        const start = new Date(originalApprover.delegation.start_date).getTime();
        const end = new Date(originalApprover.delegation.end_date).getTime();
        const claimTime = new Date(createdAt).getTime();
        if (claimTime >= start && claimTime <= end) {
          currentApproverId = originalApprover.delegation.delegate_id;
        }
      }

      if (decision) {
        approvals.push({
          id: uuidv4(),
          claim_id: claimId,
          approver_id: currentApproverId,
          decision,
          comment: opts.approvalComment || (
            decision === 'Approved' ? 'Approved. Valid receipt attached and MOM summary completed.'
            : decision === 'Rejected' ? 'Rejected: Out-of-policy amount exceeded without pre-approval.'
            : 'Returned for Revision: Please upload a clearer receipt image showing the tax breakdown.'
          ),
          timestamp: approvedAt || createdAt
        });
      }

      const isReleaseStage = [ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(opts.status);
      const updatedAt = opts.processedDaysAgo !== undefined ? rDate(opts.processedDaysAgo) : (approvedAt || createdAt);

      const claim: Claim = {
        id: claimId,
        claim_number: claimNumber,
        requestor_id: opts.requestorId,
        current_approver_id: currentApproverId,
        original_approver_id: opts.approverId,
        mom_id: opts.mom.id,
        status: opts.status,
        total_amount: opts.amount,
        expense_category: opts.category,
        receipt_url: '/receipt_placeholder.png',
        remarks: `Reimbursement for sales meeting with ${opts.mom.client} team.`,
        supporting_documents: 'Proposal_Draft_v1.pdf',
        release_code: isReleaseStage ? (opts.releaseCode || Math.random().toString(36).substring(2, 8).toUpperCase()) : undefined,
        payment_method: isReleaseStage ? (opts.paymentMethod || 'GCash') : undefined,
        processed_by: isReleaseStage ? 'u3' : undefined,
        processing_date: isReleaseStage ? updatedAt : undefined,
        approved_at: decision === 'Approved' ? approvedAt : undefined,
        created_at: createdAt,
        updated_at: updatedAt
      };

      claims.push(claim);

      statusHistories.push({
        id: uuidv4(),
        claim_id: claimId,
        old_status: ClaimStatus.DRAFT,
        new_status: opts.status,
        changed_by: opts.requestorId,
        reason: 'Seeded realistic dataset',
        timestamp: createdAt
      });

      return claim;
    };

    // ---- The 8 required ClaimStatus values, one real example each ----

    // 1. Draft - Alice/Bob chain, SM Prime Holdings
    mkClaim({
      requestorId: 'u1', approverId: 'u2',
      mom: mkMom('u1', 'SM Prime Holdings', MomStatus.DRAFT, 1),
      status: ClaimStatus.DRAFT, category: 'Client Meals', amount: 1500.00,
      createdDaysAgo: 1
    });

    // 2. Pending Approval - Eve/Bob chain, PLDT Inc
    mkClaim({
      requestorId: 'u5', approverId: 'u2',
      mom: mkMom('u5', 'PLDT Inc', MomStatus.COMPLETED, 3),
      status: ClaimStatus.PENDING_APPROVAL, category: 'Travel', amount: 4500.00,
      createdDaysAgo: 3
    });

    // 3. Approved - fabricated directly (live Approve always jumps straight to
    // Processing, so this is the only way to see this status in the UI at all).
    // Frank/Bob chain, Jollibee Foods Corp.
    mkClaim({
      requestorId: 'u6', approverId: 'u2',
      mom: mkMom('u6', 'Jollibee Foods Corp', MomStatus.COMPLETED, 4),
      status: ClaimStatus.APPROVED, category: 'Client Meals', amount: 1850.50,
      createdDaysAgo: 4, approvedDaysAgo: 3
    });

    // 4. Processing - Henry/Grace chain, Bank of the Philippine Islands.
    // Also the multi-line-item example: the schema (ExpenseLineItem, keyed by
    // claim_id) still supports many rows per claim even though the current
    // single-expense submission UI only ever writes one - this proves that
    // path still renders correctly wherever it's read.
    mkClaim({
      requestorId: 'u8', approverId: 'u7',
      mom: mkMom('u8', 'Bank of the Philippine Islands', MomStatus.COMPLETED, 6),
      status: ClaimStatus.PROCESSING, category: 'Accommodation', amount: 5200.00,
      createdDaysAgo: 6, approvedDaysAgo: 5,
      lineItems: [
        { vendor: 'Makati Diamond Residences', category: 'Accommodation', amount: 3200.00, businessPurpose: '2-night stay for BPI account review' },
        { vendor: 'Grab', category: 'Transportation', amount: 2000.00, businessPurpose: 'Airport transfers for BPI meetings' }
      ]
    });

    // 5. Ready for Claim - Eve/Bob chain, Globe Telecom
    mkClaim({
      requestorId: 'u5', approverId: 'u2',
      mom: mkMom('u5', 'Globe Telecom', MomStatus.COMPLETED, 8),
      status: ClaimStatus.READY_FOR_CLAIM, category: 'Travel', amount: 2400.00,
      createdDaysAgo: 8, approvedDaysAgo: 7, processedDaysAgo: 6,
      releaseCode: 'T8QXM4', paymentMethod: 'GCash'
    });

    // 6. Completed - Frank/Bob chain, San Miguel Corporation. This is the
    // flagship example for "Claim Number + Claim Code both in real format":
    // claim_number REIM-2026-0001xx, release_code K7QXN2.
    mkClaim({
      requestorId: 'u6', approverId: 'u2',
      mom: mkMom('u6', 'San Miguel Corporation', MomStatus.COMPLETED, 12),
      status: ClaimStatus.COMPLETED, category: 'Client Meals', amount: 3150.00,
      createdDaysAgo: 12, approvedDaysAgo: 11, processedDaysAgo: 9,
      releaseCode: 'K7QXN2', paymentMethod: 'Bank Transfer'
    });

    // 7. Rejected - Alice/Bob chain, Meralco
    mkClaim({
      requestorId: 'u1', approverId: 'u2',
      mom: mkMom('u1', 'Meralco', MomStatus.COMPLETED, 15),
      status: ClaimStatus.REJECTED, category: 'Client Meals', amount: 12000.00,
      createdDaysAgo: 15, approvedDaysAgo: 14
    });

    // 8. Returned - Henry/Grace chain, BDO Unibank
    mkClaim({
      requestorId: 'u8', approverId: 'u7',
      mom: mkMom('u8', 'BDO Unibank', MomStatus.COMPLETED, 18),
      status: ClaimStatus.RETURNED, category: 'Travel', amount: 2800.00,
      createdDaysAgo: 18, approvedDaysAgo: 17
    });

    // ---- Amount boundary cases ----

    // Deliberately large amount - no server-side ceiling exists yet to reject
    // this, so it's expected to submit successfully today; it's the fixture
    // to re-test once a soft ceiling is added. Eve/Bob chain, Robinsons Land Corp.
    mkClaim({
      requestorId: 'u5', approverId: 'u2',
      mom: mkMom('u5', 'Robinsons Land Corp', MomStatus.COMPLETED, 2),
      status: ClaimStatus.PENDING_APPROVAL, category: 'Accommodation', amount: 185000.00,
      createdDaysAgo: 2
    });

    // Smallest amount greater than zero - confirms the ">0" check isn't off-by-one.
    // Frank/Bob chain, Cebu Pacific Air.
    mkClaim({
      requestorId: 'u6', approverId: 'u2',
      mom: mkMom('u6', 'Cebu Pacific Air', MomStatus.COMPLETED, 1),
      status: ClaimStatus.PENDING_APPROVAL, category: 'Transportation', amount: 0.01,
      createdDaysAgo: 1
    });

    // 3-tier chain tests: Mid-Level Approver (u10) files a claim that routes to VP (u9)
    mkClaim({
      requestorId: 'u10', approverId: 'u9',
      mom: mkMom('u10', 'Ayala Land Inc', MomStatus.COMPLETED, 2),
      status: ClaimStatus.PENDING_APPROVAL, category: 'Client Meals', amount: 4500.00,
      createdDaysAgo: 2
    });

    // 3-tier chain tests: Mid-Level Approver (u10) draft claim
    mkClaim({
      requestorId: 'u10', approverId: 'u9',
      mom: mkMom('u10', 'Google Philippines', MomStatus.DRAFT, 1),
      status: ClaimStatus.DRAFT, category: 'Transportation', amount: 1500.00,
      createdDaysAgo: 1
    });

    // ---- Standalone MOMs, not linked to any claim ----

    // Draft and not yet eligible - proves the "must be Completed" gate actually blocks it.
    mkMom('u1', 'Ayala Land Inc', MomStatus.DRAFT, 2);

    // Completed and unlinked - the one MOM left genuinely pickable in the
    // SubmitClaim dropdown for a live "create a new claim" demo.
    mkMom('u5', 'Metrobank', MomStatus.COMPLETED, 1);

    // ---- Cash Advance & Liquidation Seed Records ----

    // 1. Standalone Cash Advances
    const ca1Id = uuidv4();
    cashAdvances.push({
      id: ca1Id,
      requestorId: 'u1',
      amount: 3500.00,
      purpose: 'Client Lunch - Rockwell',
      approverId: 'u2',
      status: CashAdvanceStatus.DRAFT
    });
    addCaHistory(ca1Id, '', CashAdvanceStatus.DRAFT, 'u1', 'Draft created');

    const ca2Id = uuidv4();
    cashAdvances.push({
      id: ca2Id,
      requestorId: 'u5',
      amount: 5000.00,
      purpose: 'Travel to Cebu',
      approverId: 'u2',
      status: CashAdvanceStatus.SUBMITTED
    });
    addCaHistory(ca2Id, '', CashAdvanceStatus.SUBMITTED, 'u5', 'Submitted for Approval');

    const ca3Id = uuidv4();
    cashAdvances.push({
      id: ca3Id,
      requestorId: 'u6',
      amount: 7500.00,
      purpose: 'Client Entertainment - BGC',
      approverId: 'u2',
      status: CashAdvanceStatus.APPROVED
    });
    addCaHistory(ca3Id, '', CashAdvanceStatus.APPROVED, 'u2', 'Approved');

    const ca4Id = uuidv4();
    cashAdvances.push({
      id: ca4Id,
      requestorId: 'u11',
      amount: 12000.00,
      purpose: 'Team Building Advance',
      approverId: 'u10',
      status: CashAdvanceStatus.REJECTED
    });
    addCaHistory(ca4Id, '', CashAdvanceStatus.REJECTED, 'u10', 'Rejected due to budget constraints');

    const ca5Id = uuidv4();
    cashAdvances.push({
      id: ca5Id,
      requestorId: 'u12',
      amount: 6000.00,
      purpose: 'Field surveys',
      approverId: 'u10',
      status: CashAdvanceStatus.RELEASED,
      releasedBy: 'u3',
      releaseDate: rDate(2),
      releaseReference: 'REF-LIAM-CA'
    });
    addCaHistory(ca5Id, '', CashAdvanceStatus.RELEASED, 'u3', 'Funds released');

    // 2. Cash Advances with Liquidations in different stages

    // Draft Liquidation
    const ca6Id = uuidv4();
    const ca6 = {
      id: ca6Id,
      requestorId: 'u12',
      amount: 6000.00,
      purpose: 'Field survey Liam',
      approverId: 'u10',
      status: CashAdvanceStatus.RELEASED,
      releasedBy: 'u3',
      releaseDate: rDate(3),
      releaseReference: 'REF-LIAM-SURVEY'
    };
    cashAdvances.push(ca6);
    addCaHistory(ca6Id, '', CashAdvanceStatus.RELEASED, 'u3', 'Funds released');

    const liq1Id = uuidv4();
    liquidations.push({
      id: liq1Id,
      cashAdvanceId: ca6Id,
      requestorId: 'u12',
      totalSpent: 0,
      varianceAmount: -6000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.DRAFT
    });
    addLiqHistory(liq1Id, '', LiquidationStatus.DRAFT, 'u12', 'Draft Liquidation started');

    // Submitted Liquidation - SETTLED (Spent exactly PHP 5,000 of PHP 5,000)
    const ca7Id = uuidv4();
    const ca7Mom = mkMom('u1', 'Maxs Restaurant Corp', MomStatus.COMPLETED, 4);
    const ca7 = {
      id: ca7Id,
      requestorId: 'u1',
      amount: 5000.00,
      purpose: "Max's Group Lunch",
      momId: ca7Mom.id,
      approverId: 'u2',
      status: CashAdvanceStatus.RELEASED,
      releasedBy: 'u3',
      releaseDate: rDate(4),
      releaseReference: 'REF-ALICE-MAXS'
    };
    cashAdvances.push(ca7);
    addCaHistory(ca7Id, '', CashAdvanceStatus.RELEASED, 'u3', 'Funds released');

    const liq2Id = uuidv4();
    liquidations.push({
      id: liq2Id,
      cashAdvanceId: ca7Id,
      requestorId: 'u1',
      totalSpent: 5000.00,
      varianceAmount: 0.00,
      varianceType: LiquidationVarianceType.SETTLED,
      status: LiquidationStatus.SUBMITTED
    });
    liquidationLineItems.push({
      id: uuidv4(),
      liquidationId: liq2Id,
      expense_date: ca7Mom.meeting_date,
      vendor: "Max's Restaurant",
      category: 'Client Meals',
      amount: 5000.00,
      payment_method: 'Cash',
      business_purpose: 'Lunch meeting with Maxs executive team',
      receipt_url: '/receipt_placeholder.png'
    });
    addLiqHistory(liq2Id, '', LiquidationStatus.SUBMITTED, 'u1', 'Liquidation submitted for review');

    // Returned for Revision Liquidation - REFUND_DUE (Spent PHP 6,000 of PHP 8,000)
    const ca8Id = uuidv4();
    const ca8 = {
      id: ca8Id,
      requestorId: 'u5',
      amount: 8000.00,
      purpose: 'Cebu Client Visit',
      approverId: 'u2',
      status: CashAdvanceStatus.RELEASED,
      releasedBy: 'u3',
      releaseDate: rDate(6),
      releaseReference: 'REF-EVE-CEBU'
    };
    cashAdvances.push(ca8);
    addCaHistory(ca8Id, '', CashAdvanceStatus.RELEASED, 'u3', 'Funds released');

    const liq3Id = uuidv4();
    liquidations.push({
      id: liq3Id,
      cashAdvanceId: ca8Id,
      requestorId: 'u5',
      totalSpent: 6000.00,
      varianceAmount: -2000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.RETURNED_FOR_REVISION
    });
    liquidationLineItems.push({
      id: uuidv4(),
      liquidationId: liq3Id,
      expense_date: rDate(5).split('T')[0],
      vendor: 'Grab Cebu',
      category: 'Transportation',
      amount: 6000.00,
      payment_method: 'Cash',
      business_purpose: 'Site transfers in Cebu',
      receipt_url: '/receipt_placeholder.png'
    });
    addLiqHistory(liq3Id, '', LiquidationStatus.RETURNED_FOR_REVISION, 'u2', 'Returned: Please attach official receipts instead of booking screenshots');

    // Reviewed Liquidation - REFUND_DUE (Spent PHP 7,000 of PHP 10,000)
    const ca9Id = uuidv4();
    const ca9 = {
      id: ca9Id,
      requestorId: 'u6',
      amount: 10000.00,
      purpose: 'BGC Accounts',
      approverId: 'u2',
      status: CashAdvanceStatus.RELEASED,
      releasedBy: 'u3',
      releaseDate: rDate(8),
      releaseReference: 'REF-FRANK-BGC'
    };
    cashAdvances.push(ca9);
    addCaHistory(ca9Id, '', CashAdvanceStatus.RELEASED, 'u3', 'Funds released');

    const liq4Id = uuidv4();
    liquidations.push({
      id: liq4Id,
      cashAdvanceId: ca9Id,
      requestorId: 'u6',
      totalSpent: 7000.00,
      varianceAmount: -3000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.REVIEWED
    });
    liquidationLineItems.push({
      id: uuidv4(),
      liquidationId: liq4Id,
      expense_date: rDate(7).split('T')[0],
      vendor: 'F1 Hotel',
      category: 'Accommodation',
      amount: 7000.00,
      payment_method: 'Cash',
      business_purpose: 'Stay for BGC client account manager',
      receipt_url: '/receipt_placeholder.png'
    });
    addLiqHistory(liq4Id, '', LiquidationStatus.REVIEWED, 'u2', 'Approved and Reviewed. Pending refund of PHP 3,000');

    // Closed (Refund Collected) Liquidation - REFUND_DUE (Spent PHP 3,000 of PHP 4,000)
    const ca10Id = uuidv4();
    const ca10 = {
      id: ca10Id,
      requestorId: 'u1',
      amount: 4000.00,
      purpose: 'Client Sync Taguig',
      approverId: 'u2',
      status: CashAdvanceStatus.LIQUIDATED
    };
    cashAdvances.push(ca10);
    addCaHistory(ca10Id, '', CashAdvanceStatus.LIQUIDATED, 'u3', 'Closed (Refund Collected)');

    const liq5Id = uuidv4();
    liquidations.push({
      id: liq5Id,
      cashAdvanceId: ca10Id,
      requestorId: 'u1',
      totalSpent: 3000.00,
      varianceAmount: -1000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.CLOSED
    });
    liquidationLineItems.push({
      id: uuidv4(),
      liquidationId: liq5Id,
      expense_date: rDate(9).split('T')[0],
      vendor: 'Mary Grace Cafe',
      category: 'Client Meals',
      amount: 3000.00,
      payment_method: 'Cash',
      business_purpose: 'Taguig client breakfast meeting',
      receipt_url: '/receipt_placeholder.png'
    });
    addLiqHistory(liq5Id, '', LiquidationStatus.CLOSED, 'u3', 'Closed (Refund Collected). Note: Cash returned to Carol');

    // ---- SHORTFALL CASE: Closed with ReimbursementDue (Spent PHP 6,200 of PHP 5,000) ----
    const ca11Id = uuidv4();
    const ca11Mom = mkMom('u1', 'SM Prime Holdings', MomStatus.COMPLETED, 5);
    const ca11 = {
      id: ca11Id,
      requestorId: 'u1',
      amount: 5000.00,
      purpose: 'SM Prime Partnership',
      momId: ca11Mom.id,
      approverId: 'u2',
      status: CashAdvanceStatus.LIQUIDATED
    };
    cashAdvances.push(ca11);
    addCaHistory(ca11Id, '', CashAdvanceStatus.LIQUIDATED, 'u3', 'Closed (Shortfall Reimbursement Payout Queued)');

    const liq6Id = uuidv4();
    liquidations.push({
      id: liq6Id,
      cashAdvanceId: ca11Id,
      requestorId: 'u1',
      totalSpent: 6200.00,
      varianceAmount: 1200.00,
      varianceType: LiquidationVarianceType.REIMBURSEMENT_DUE,
      status: LiquidationStatus.CLOSED
    });
    liquidationLineItems.push({
      id: uuidv4(),
      liquidationId: liq6Id,
      expense_date: ca11Mom.meeting_date,
      vendor: 'Gloria Maris Greenhills',
      category: 'Client Meals',
      amount: 6200.00,
      payment_method: 'Cash',
      business_purpose: 'Dinner meeting with SM Prime partners',
      receipt_url: '/receipt_placeholder.png'
    });
    addLiqHistory(liq6Id, '', LiquidationStatus.CLOSED, 'u2', 'Approved & Closed. Shortfall reimbursement claim created.');

    // Auto shortfall claim in Custodian's queue (PROCESSING)
    const claimShortfallId = uuidv4();
    const shortfallClaimNo = `REIM-${new Date().getFullYear()}-${String(seedCounter++).padStart(6, '0')}`;
    
    claims.push({
      id: claimShortfallId,
      claim_number: shortfallClaimNo,
      requestor_id: 'u1',
      current_approver_id: 'u2',
      mom_id: ca11Mom.id,
      status: ClaimStatus.PROCESSING,
      total_amount: 1200.00,
      expense_category: 'Cash Advance Shortfall',
      receipt_url: '/receipt_placeholder.png',
      remarks: `Automatic shortfall reimbursement from Liquidation of CADV-${ca11Id.substring(0, 6)}`,
      sourceLiquidationId: liq6Id,
      created_at: rDate(5),
      updated_at: rDate(5)
    });
    
    expenses.push({
      id: uuidv4(),
      claim_id: claimShortfallId,
      expense_date: ca11Mom.meeting_date,
      vendor: 'Shortfall Payout',
      category: 'Cash Advance Shortfall',
      amount: 1200.00,
      payment_method: 'Cash',
      business_purpose: `Shortfall payout for CADV-${ca11Id.substring(0, 6)} liquidation`,
      receipt_url: '/receipt_placeholder.png'
    });

    addHistory(claimShortfallId, ClaimStatus.DRAFT, ClaimStatus.PROCESSING, 'u2', 'Automatic creation from Cash Advance Liquidation Shortfall');

    claimCounter = seedCounter;

    res.json({ success: true });
  });

  // Admin: Reset Simulation - wipes every claim/MOM/history/email/notification
  // and any delegations or reassignments made during a demo, but keeps the
  // standard org chart in place, so the next thing anyone does is create
  // something from scratch rather than looking at a random empty app.
  app.post('/api/admin/reset', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });

    moms = [];
    claims = [];
    expenses = [];
    approvals = [];
    statusHistories = [];
    emails = [];
    lastSeenStore = {};
    cashAdvances = [];
    liquidations = [];
    liquidationLineItems = [];
    reviewMeetings = [];

    users.length = 0;
    users.push(...buildDefaultUsers());

    claimCounter = 123;

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
