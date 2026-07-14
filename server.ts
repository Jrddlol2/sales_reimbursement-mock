import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { v4 as uuidv4 } from 'uuid';
import {
  User, UserRole, Mom, MomStatus, Claim, ClaimStatus,
  ExpenseLineItem, Approval, StatusHistory, Notification, Email
} from './src/types';

let moms: Mom[] = [];
let claims: Claim[] = [];
let expenses: ExpenseLineItem[] = [];
let approvals: Approval[] = [];
let statusHistories: StatusHistory[] = [];
let notifications: Notification[] = [];
let emails: Email[] = [];

// Email Transport Mock
const sendEmail = (toId: string, subject: string, body: string) => {
  const recipient = users.find(u => u.id === toId);
  if (!recipient) return;
  
  const email: Email = {
    id: uuidv4(),
    recipient_id: recipient.id,
    from: "system@reimbursement.local",
    to: recipient.email,
    subject,
    body: body + "\n\nThis is an automatically generated email, please do not reply.",
    read: false,
    timestamp: new Date().toISOString()
  };
  emails.push(email);
  
  console.log(`\n--- MOCK EMAIL TRANSPORT ---`);
  console.log(`To: ${email.to}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Body:\n${email.body}`);
  console.log(`----------------------------\n`);
};

const users: User[] = [
  { id: 'u1', name: 'Alice Requestor', email: 'alice@example.com', role: UserRole.REQUESTOR, department: 'Sales', reports_to: 'u2' },
  { id: 'u2', name: 'Bob Approver', email: 'bob@example.com', role: UserRole.APPROVER, department: 'Sales', reports_to: null },
  { id: 'u3', name: 'Charlie Custodian', email: 'charlie@example.com', role: UserRole.CUSTODIAN, department: 'Finance', reports_to: null },
  { id: 'u4', name: 'Dave Admin', email: 'dave@example.com', role: UserRole.ADMIN, department: 'IT', reports_to: null },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to get current user from header (mock auth)
  const getUser = (req: express.Request) => {
    const userId = req.header('X-User-Id');
    return users.find(u => u.id === userId);
  };

  const addHistory = (claimId: string, oldStatus: string, newStatus: string, changedBy: string) => {
    statusHistories.push({
      id: uuidv4(),
      claim_id: claimId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      timestamp: new Date().toISOString()
    });
  };

  const addNotification = (recipientId: string, claimId: string, type: string) => {
    // We'll keep basic notifications for the bell icon
    const notif: Notification = {
      id: uuidv4(),
      recipient_id: recipientId,
      claim_id: claimId,
      type,
      read: false,
      timestamp: new Date().toISOString()
    };
    notifications.push(notif);
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

  // MOM endpoints (accessed for calendar view)
  app.get('/api/moms', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    // Find claims that belong to the user or their team
    let relevantClaims = claims;
    if (user.role === UserRole.REQUESTOR) {
      relevantClaims = claims.filter(c => c.requestor_id === user.id);
    } else if (user.role === UserRole.APPROVER) {
      relevantClaims = claims.filter(c => c.current_approver_id === user.id || c.original_approver_id === user.id);
    } else if (user.role === UserRole.ADMIN) {
      relevantClaims = claims;
    }
    const relevantClaimIds = relevantClaims.map(c => c.id);
    const relevantMoms = moms.filter(m => m.claim_id && relevantClaimIds.includes(m.claim_id));
    
    // Enrich with requestor name for calendar
    const enriched = relevantMoms.map(m => {
      const claim = claims.find(c => c.id === m.claim_id);
      const requestor = claim ? users.find(u => u.id === claim.requestor_id) : null;
      return { ...m, client_name: requestor ? requestor.name : 'Unknown' }; // reuse client_name field in UI for simplicity, or just name
    });
    
    res.json(enriched);
  });

  // Claim endpoints
  app.get('/api/claims', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    let filtered = claims;
    if (user.role === UserRole.REQUESTOR) {
      filtered = claims.filter(c => c.requestor_id === user.id);
    } else if (user.role === UserRole.APPROVER) {
      filtered = claims.filter(c => c.current_approver_id === user.id || c.original_approver_id === user.id);
    } else if (user.role === UserRole.ADMIN) {
      filtered = claims; // Admin sees all
    }
    
    const enriched = filtered.map(c => {
      const mom = moms.find(m => m.id === c.mom_id);
      const reqUser = users.find(u => u.id === c.requestor_id);
      const claimExpenses = expenses.filter(e => e.claim_id === c.id);
      const claimApprovals = approvals.filter(a => a.claim_id === c.id);
      return { ...c, mom, requestor: reqUser, expenses: claimExpenses, approvals: claimApprovals };
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
    const claimHistory = statusHistories.filter(h => h.claim_id === claim.id);
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
    if (!user || user.role !== UserRole.REQUESTOR) return res.status(403).json({ error: 'Forbidden' });
    
    const { expenses: newExpenses, meeting_date, attendees, client_meeting_details } = req.body;
    if (!meeting_date || !attendees) return res.status(400).json({ error: 'Meeting details required' });
    
    let total = 0;
    const claimId = uuidv4();
    
    const createdExpenses = newExpenses.map((e: any) => {
      total += Number(e.amount);
      return {
        id: uuidv4(),
        claim_id: claimId,
        expense_date: e.expense_date,
        vendor: e.vendor,
        category: e.category,
        amount: Number(e.amount),
        payment_method: e.payment_method,
        business_purpose: e.business_purpose,
        receipt_url: e.receipt_url
      };
    });
    
    const newMom: Mom = {
      id: uuidv4(),
      claim_id: claimId,
      meeting_date,
      attendees,
      summary: '',
      status: MomStatus.SCHEDULED,
      created_at: new Date().toISOString()
    };
    
    moms.push(newMom);

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

    const claim: Claim = {
      id: claimId,
      requestor_id: user.id,
      current_approver_id: currentApproverId,
      original_approver_id: originalApproverId,
      mom_id: newMom.id,
      status: ClaimStatus.MEETING_SCHEDULED,
      total_amount: total,
      client_meeting_details,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    claims.push(claim);
    expenses.push(...createdExpenses);
    
    addHistory(claim.id, ClaimStatus.DRAFT, ClaimStatus.SUBMITTED, user.id);
    
    if (originalApproverId && currentApproverId !== originalApproverId) {
      const origName = users.find(u => u.id === originalApproverId)?.name || originalApproverId;
      const delegateName = users.find(u => u.id === currentApproverId)?.name || currentApproverId;
      
      statusHistories.push({
        id: uuidv4(),
        claim_id: claim.id,
        old_status: ClaimStatus.DRAFT,
        new_status: ClaimStatus.MEETING_SCHEDULED,
        changed_by: user.id,
        reason: `Auto-routed to delegate ${delegateName} (on behalf of ${origName})`,
        timestamp: new Date().toISOString()
      });
    } else {
      addHistory(claim.id, ClaimStatus.DRAFT, ClaimStatus.MEETING_SCHEDULED, user.id);
    }
    
    if (currentApproverId) {
      addNotification(currentApproverId, claim.id, 'Meeting Scheduled');
      const approverName = users.find(u => u.id === currentApproverId)?.name || 'Approver';
      sendEmail(
        currentApproverId, 
        "Reimbursement - Pending Approval", 
        `Dear ${approverName}, A new reimbursement request ${claim.id.substring(0,8)} by ${user.name} has been submitted. A review meeting will be scheduled shortly.`
      );
      sendEmail(
        currentApproverId, 
        "Reimbursement - Review Meeting Scheduled", 
        `Dear ${approverName}, ${user.name} has scheduled a review meeting for request ${claim.id.substring(0,8)} on ${meeting_date.split(' ')[0]} at ${meeting_date.split(' ')[1] || 'TBD'}.`
      );
    }
    
    res.json(claim);
  });

  app.get('/api/approver/schedule', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.REQUESTOR || !user.reports_to) return res.json([]);
    
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

  app.put('/api/claims/:id/reschedule', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.REQUESTOR) return res.status(403).json({ error: 'Forbidden' });
    
    const claim = claims.find(c => c.id === req.params.id && c.requestor_id === user.id);
    if (!claim || claim.status !== ClaimStatus.MEETING_SCHEDULED) return res.status(400).json({ error: 'Invalid claim state' });
    
    const mom = moms.find(m => m.id === claim.mom_id);
    if (!mom) return res.status(404).json({ error: 'MOM not found' });
    
    mom.meeting_date = req.body.meeting_date;
    
    if (user.reports_to) {
      addNotification(user.reports_to, claim.id, 'Meeting Rescheduled');
    }
    
    res.json(claim);
  });


  app.post('/api/claims/:id/mom', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.REQUESTOR) return res.status(403).json({ error: 'Forbidden' });
    
    const claim = claims.find(c => c.id === req.params.id && c.requestor_id === user.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== ClaimStatus.MEETING_SCHEDULED) return res.status(400).json({ error: 'Claim must be MEETING_SCHEDULED' });
    
    const mom = moms.find(m => m.id === claim.mom_id);
    if (!mom) return res.status(404).json({ error: 'MOM not found' });
    
    mom.summary = req.body.summary;
    mom.file_url = req.body.file_url;
    mom.status = MomStatus.UPLOADED;
    
    const oldStatus = claim.status;
    claim.status = ClaimStatus.PENDING_APPROVAL;
    claim.updated_at = new Date().toISOString();
    
    addHistory(claim.id, oldStatus, ClaimStatus.PENDING_APPROVAL, user.id);
    
    // Notify approver it's ready for approval
    if (user.reports_to) {
      addNotification(user.reports_to, claim.id, 'MOM Uploaded - Ready for Approval');
      const approverName = users.find(u => u.id === user.reports_to)?.name || 'Approver';
      sendEmail(
        user.reports_to,
        "Reimbursement - Ready for Your Approval",
        `Dear ${approverName}, Request ${claim.id.substring(0,8)} by ${user.name} is ready for your review and approval.`
      );
    }
    
    res.json(claim);
  });

  app.post('/api/claims/:id/approve', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.APPROVER) return res.status(403).json({ error: 'Forbidden' });
    
    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Not found' });
    
    const requestor = users.find(u => u.id === claim.requestor_id);
    if (requestor?.reports_to !== user.id) return res.status(403).json({ error: 'Not your direct report' });
    
    const { decision, comment } = req.body; // Approved, Rejected, Returned
    if (!['Approved', 'Rejected', 'Returned'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });
    if ((decision === 'Rejected' || decision === 'Returned') && !comment) {
      return res.status(400).json({ error: 'Comment required' });
    }
    
    const oldStatus = claim.status;
    let newStatus = claim.status;
    
    if (decision === 'Approved') newStatus = ClaimStatus.FOR_PROCESSING;
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
    
    if (decision === 'Approved') {
      claim.release_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      claim.approved_at = new Date().toISOString();
      const custodians = users.filter(u => u.role === UserRole.CUSTODIAN);
      custodians.forEach(c => {
        addNotification(c.id, claim.id, 'Approved');
        sendEmail(
          c.id,
          "Reimbursement - For Release",
          `Dear ${c.name}, This request ${claim.id.substring(0,8)} by ${requestor?.name || 'Unknown'} has been approved and ready for release. Enter code ${claim.release_code} for releasing of cash.`
        );
      });
      sendEmail(
        claim.requestor_id,
        "Reimbursement - Approved",
        `Dear ${requestor?.name || 'Unknown'}, Your reimbursement request ${claim.id.substring(0,8)} has been approved by ${user.name} and will proceed to processing.`
      );
    } else {
      addNotification(claim.requestor_id, claim.id, decision);
      sendEmail(
        claim.requestor_id,
        `Reimbursement - ${decision === 'Rejected' ? 'Rejected' : 'Returned for Revision'}`,
        `Dear ${requestor?.name || 'Unknown'}, Your reimbursement request ${claim.id.substring(0,8)} was ${decision.toLowerCase()}. Reason: ${comment}.`
      );
    }
    
    res.json(claim);
  });

  app.post('/api/claims/:id/process', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.CUSTODIAN) return res.status(403).json({ error: 'Forbidden' });
    
    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Not found' });
    
    if (claim.status !== ClaimStatus.FOR_PROCESSING) return res.status(400).json({ error: 'Invalid status' });

    const { payment_reference, release_code, payment_method } = req.body;
    if (!payment_reference) return res.status(400).json({ error: 'Payment reference required' });
    if (!payment_method) return res.status(400).json({ error: 'Payment method required' });
    if (claim.release_code && release_code !== claim.release_code) return res.status(400).json({ error: 'Invalid release code' });

    const oldStatus = claim.status;
    claim.status = ClaimStatus.PROCESSED;
    claim.payment_reference = payment_reference;
    claim.payment_method = payment_method;
    claim.processed_by = user.id;
    claim.updated_at = new Date().toISOString();
    
    addHistory(claim.id, oldStatus, ClaimStatus.PROCESSED, user.id);
    addNotification(claim.requestor_id, claim.id, 'Processed');
    
    const requestor = users.find(u => u.id === claim.requestor_id);
    sendEmail(
      claim.requestor_id,
      "Reimbursement - Payment Released",
      `Dear ${requestor?.name || 'Unknown'}, Your reimbursement request ${claim.id.substring(0,8)} has been processed and payment released.`
    );
    
    res.json(claim);
  });

  app.put('/api/claims/:id/resend-code', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.CUSTODIAN) return res.status(403).json({ error: 'Forbidden' });

    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Not found' });
    if (claim.status !== ClaimStatus.FOR_PROCESSING) return res.status(400).json({ error: 'Claim is not awaiting processing' });

    claim.release_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const requestor = users.find(u => u.id === claim.requestor_id);
    const custodians = users.filter(u => u.role === UserRole.CUSTODIAN);
    custodians.forEach(c => {
      sendEmail(
        c.id,
        "Reimbursement - Release Code Resent",
        `Dear ${c.name}, The release code for request ${claim.id.substring(0,8)} by ${requestor?.name || 'Unknown'} was regenerated by ${user.name}. Enter code ${claim.release_code} for releasing of cash.`
      );
    });

    statusHistories.push({
      id: uuidv4(),
      claim_id: claim.id,
      old_status: claim.status,
      new_status: claim.status,
      changed_by: user.id,
      reason: `Release code resent by ${user.name}`,
      timestamp: new Date().toISOString()
    });

    res.json(claim);
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    res.json(notifications.filter(n => n.recipient_id === user.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const notif = notifications.find(n => n.id === req.params.id && n.recipient_id === user.id);
    if (notif) {
      notif.read = true;
      res.json(notif);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
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
    notifications = [];
    emails = [];

    // The core 4 users from earlier + 2 more requestors
    users.length = 0;
    users.push(
      { id: 'u1', name: 'Alice Requestor', email: 'alice@example.com', role: UserRole.REQUESTOR, department: 'Sales', reports_to: 'u2' },
      { id: 'u2', name: 'Bob Approver', email: 'bob@example.com', role: UserRole.APPROVER, department: 'Sales', reports_to: null },
      { id: 'u3', name: 'Carol Custodian', email: 'carol@example.com', role: UserRole.CUSTODIAN, department: 'Finance', reports_to: null },
      { id: 'u4', name: 'Dave Admin', email: 'dave@example.com', role: UserRole.ADMIN, department: 'IT', reports_to: null },
      { id: 'u5', name: 'Eve Requestor', email: 'eve@example.com', role: UserRole.REQUESTOR, department: 'Sales', reports_to: 'u2' },
      { id: 'u6', name: 'Frank Requestor', email: 'frank@example.com', role: UserRole.REQUESTOR, department: 'Sales', reports_to: 'u2' }
    );

    const rDate = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString();
    };

    const createClaim = (requestorId: string, status: ClaimStatus, title: string, amount: number, clientName: string, daysAgo: number) => {
      const claimId = uuidv4();
      const momId = uuidv4();
      const momDate = rDate(daysAgo + 1);
      const claimDate = rDate(daysAgo);
      
      const mom: Mom = {
        id: momId,
        claim_id: claimId,
        meeting_date: momDate.split('T')[0],
        attendees: 'Me, ' + clientName + ' Rep',
        summary: `Discussed sales opportunities with ${clientName}.`,
        status: status === ClaimStatus.DRAFT || status === ClaimStatus.MEETING_SCHEDULED ? MomStatus.SCHEDULED : MomStatus.UPLOADED,
        created_at: momDate,
      };
      moms.push(mom);

      const expenseId = uuidv4();
      expenses.push({
        id: expenseId,
        claim_id: claimId,
        expense_date: momDate.split('T')[0],
        vendor: 'Local Restaurant',
        category: 'Client Meals',
        amount: amount,
        payment_method: 'Corporate Card',
        business_purpose: 'Lunch meeting',
      });

      const isPastApproval = status === ClaimStatus.FOR_PROCESSING || status === ClaimStatus.PROCESSED;
      if (isPastApproval) {
        approvals.push({
          id: uuidv4(),
          claim_id: claimId,
          approver_id: 'u2',
          decision: 'Approved',
          comment: 'Looks good, expenses are within policy and well documented.',
          timestamp: claimDate
        });
      }

      const claim: Claim = {
        id: claimId,
        requestor_id: requestorId,
        current_approver_id: 'u2',
        original_approver_id: 'u2',
        mom_id: momId,
        status: status,
        total_amount: amount,
        release_code: status === ClaimStatus.FOR_PROCESSING ? 'A1B2C3' : undefined,
        payment_reference: status === ClaimStatus.PROCESSED ? 'TXN-' + Math.floor(Math.random()*10000) : undefined,
        payment_method: status === ClaimStatus.PROCESSED ? 'Bank Transfer' : undefined,
        processed_by: status === ClaimStatus.PROCESSED ? 'u3' : undefined,
        approved_at: isPastApproval ? claimDate : undefined,
        client_meeting_details: {
          type_of_account: 'Corporate',
          company_name: clientName,
          purpose_of_meeting: 'Sales Sync',
          category: 'New Business',
          location: 'Client Office',
          contact_person: 'Maria Santos',
          contact_person_designation: 'Purchasing Manager',
          contact_person_email: `msantos@${clientName.replace(/\s+/g, '').toLowerCase()}.com`,
          description: `Discussed sales opportunities with ${clientName}.`
        },
        created_at: claimDate,
        updated_at: claimDate
      };
      claims.push(claim);

      statusHistories.push({
        id: uuidv4(),
        claim_id: claimId,
        old_status: ClaimStatus.DRAFT,
        new_status: status,
        changed_by: requestorId,
        reason: 'Seeded data',
        timestamp: claimDate
      });
    };

    createClaim('u1', ClaimStatus.DRAFT, 'SM Prime', 1500, 'SM Prime Holdings', 1);
    createClaim('u5', ClaimStatus.SUBMITTED, 'Ayala Land', 2500, 'Ayala Land Inc', 2);
    createClaim('u1', ClaimStatus.MEETING_SCHEDULED, 'Jollibee', 1200, 'Jollibee Foods', 3);
    createClaim('u6', ClaimStatus.PENDING_APPROVAL, 'BPI', 3500, 'Bank of the Philippine Islands', 4);
    createClaim('u5', ClaimStatus.APPROVED, 'PLDT', 5000, 'PLDT Inc', 5);
    createClaim('u1', ClaimStatus.FOR_PROCESSING, 'Globe', 4200, 'Globe Telecom', 6);
    createClaim('u6', ClaimStatus.PROCESSED, 'San Miguel', 8000, 'San Miguel Corp', 7);
    createClaim('u5', ClaimStatus.REJECTED, 'Meralco', 10000, 'Meralco', 8);
    createClaim('u1', ClaimStatus.RETURNED, 'BDO', 2000, 'BDO Unibank', 9);

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
