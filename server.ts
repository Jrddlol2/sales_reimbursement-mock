import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { v4 as uuidv4 } from 'uuid';
import {
  User, UserRole, Mom, MomStatus, MinutesSource, Claim, ClaimStatus,
  ExpenseLineItem, Approval, StatusHistory, Email,
  CashAdvance, CashAdvanceStatus, Liquidation, LiquidationStatus,
  LiquidationVarianceType, LiquidationLineItem,
  ReviewMeeting, ReviewMeetingStatus, Company, SupportRequest, SupportRequestMessage, SupportRequestStatus, SupportRequestPriority, ImportBatch,
  ApproverDelegation, DelegationStatus
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
let importBatches: ImportBatch[] = [];
let supportRequests: SupportRequest[] = [];
let supportMessages: SupportRequestMessage[] = [];
let delegations: ApproverDelegation[] = [];

// System Settings (In-Memory)
let systemSettings = {
  expenseCategories: [
    'Client Meals', 'Travel', 'Accommodation', 'Transportation',
    'Office Supplies', 'Software Subscriptions', 'Training', 'Miscellaneous'
  ],
  highValueThreshold: 15000
};

let claimCounter = 123;

// Company Directory - canonical master list of client companies. Seeded from
// the same names the mock-data generators use (see SEED_COMPANY_NAMES below)
// so seeding and the real directory share one source of truth: any client
// name touched by seeding or by a real MOM submission funnels through
// getOrCreateCompany() and ends up here exactly once.
const SEED_COMPANY_NAMES = [
  // Sales
  'SM Prime Holdings', 'PLDT Inc', 'Jollibee Foods Corp', 'Bank of the Philippine Islands',
  'Globe Telecom', 'San Miguel Corporation', 'Meralco', 'BDO Unibank',
  // Marketing
  'Creative Agency', 'Partner Promo Group', 'Media Corp',
  // Engineering
  'Internal Operations', 'Beta Testing Corp', 'DevOps Consultants',
  // Operations
  'Headquarters', 'Cebu Branch Office', 'Manila Warehouse',
  // Used by the hand-written /api/admin/seed demo records and mkMomAndClaim
  'Ayala Land Inc', 'Maxs Restaurant Corp', 'JG Summit', 'Robinsons Land Corp',
  'Cebu Pacific Air', 'Metrobank', 'Internal / Partner'
];

const buildInitialCompanies = (): Company[] =>
  SEED_COMPANY_NAMES.map(name => ({ id: uuidv4(), name }));

let companies: Company[] = buildInitialCompanies();

const getOrCreateCompany = (name?: string | null): void => {
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  const exists = companies.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (!exists) {
    companies.push({ id: uuidv4(), name: trimmed });
  }
};

// The standard demo org chart: two full approval chains (Bob<-Alice,Eve and
// Grace<-Frank,Henry) so Admin Reassignment always has a second Approver to
// offer and segregation-of-duties can be demoed across two independent
// chains. Shared by both /api/admin/seed and /api/admin/reset so the two
// never drift apart.
const buildDefaultUsers = (): User[] => [
  { id: 'u13', name: 'Mia Requestor', email: 'mia@example.com', role: UserRole.REQUESTOR, department: 'Marketing', job_title: 'Marketing Specialist', reports_to: 'u14' },
  { id: 'u14', name: 'Noah Approver', email: 'noah@example.com', role: UserRole.APPROVER, department: 'Marketing', job_title: 'Marketing Director', reports_to: 'u19' },
  { id: 'u15', name: 'Olivia Requestor', email: 'olivia@example.com', role: UserRole.REQUESTOR, department: 'Engineering', job_title: 'Software Engineer', reports_to: 'u16' },
  { id: 'u16', name: 'Peter Approver', email: 'peter@example.com', role: UserRole.APPROVER, department: 'Engineering', job_title: 'Engineering Manager', reports_to: 'u19' },
  { id: 'u17', name: 'Quinn Requestor', email: 'quinn@example.com', role: UserRole.REQUESTOR, department: 'Operations', job_title: 'Operations Coordinator', reports_to: 'u18' },
  { id: 'u18', name: 'Ryan Approver', email: 'ryan@example.com', role: UserRole.APPROVER, department: 'Operations', job_title: 'Operations Manager', reports_to: 'u19' },
  { id: 'u19', name: 'Sarah Executive', email: 'sarah@example.com', role: UserRole.APPROVER, department: 'Executive', job_title: 'VP of Operations', reports_to: null },
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
const sendEmail = (toOrId: string, subject: string, body: string, ccId?: string, opts?: { plain?: boolean; recipientName?: string; fromLabel?: string; timestamp?: string }) => {
  const recipient = users.find(u => u.id === toOrId);
  const toEmail = recipient ? recipient.email : toOrId;
  const recipientId = recipient ? recipient.id : 'external';
  const recipientName = opts?.recipientName || (recipient ? recipient.name : toOrId.split('@')[0]);
  const fromLine = opts?.plain ? (opts.fromLabel || 'system@reimbursement.local') : "SharePoint Online <no-reply@company.com>";

  const emailTimestamp = opts?.timestamp || new Date().toISOString();
  const sentString = new Date(emailTimestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila' });

  const finalBody = opts?.plain
    ? `Dear ${recipientName},


${body}`
    : `From:
${fromLine}

Sent:
${sentString}

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
    timestamp: emailTimestamp
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
        timestamp: emailTimestamp
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

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json());
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.post('/api/upload', upload.single('file'), (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

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

  const addUserHistory = (userId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string) => {
    statusHistories.push({
      id: uuidv4(),
      claim_id: '',
      user_id: userId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason,
      timestamp: new Date().toISOString()
    });
  };

  const addDelegationHistory = (delegationId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string) => {
    statusHistories.push({
      id: uuidv4(),
      claim_id: '',
      delegation_id: delegationId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason,
      timestamp: new Date().toISOString()
    });
  };

  // Lazily flips any Active delegation whose end_date has passed to Expired.
  // No scheduler exists in this prototype, so this runs on every read/use of
  // the delegations list instead - self-healing rather than time-driven.
  const syncDelegationStatuses = () => {
    const now = new Date();
    delegations.forEach(d => {
      if (d.status === DelegationStatus.ACTIVE) {
        const end = new Date(d.end_date);
        end.setHours(23, 59, 59, 999);
        if (now > end) {
          const oldStatus = d.status;
          d.status = DelegationStatus.EXPIRED;
          d.updated_at = now.toISOString();
          addDelegationHistory(d.id, oldStatus, DelegationStatus.EXPIRED, 'system', 'Delegation window ended.');
        }
      }
    });
  };

  // The one place "who is actually approving for this approver right now"
  // gets decided - every claim/CADV/MOM/review-meeting routing check below
  // calls this instead of re-deriving it inline.
  const getActiveDelegation = (approverId: string, atDate: Date = new Date()): ApproverDelegation | undefined => {
    syncDelegationStatuses();
    return delegations.find(d => {
      if (d.approver_id !== approverId || d.status !== DelegationStatus.ACTIVE) return false;
      const start = new Date(d.start_date);
      const end = new Date(d.end_date);
      end.setHours(23, 59, 59, 999);
      return atDate >= start && atDate <= end;
    });
  };

  // Walks the (pre-change) reporting chain upward from candidateManagerId; if
  // it ever reaches userId, assigning candidateManagerId as userId's manager
  // would close a loop (direct or transitive). Guards against pre-existing
  // cycles/bad data causing an infinite walk.
  const wouldCreateCycle = (userId: string, candidateManagerId: string): boolean => {
    if (candidateManagerId === userId) return true;
    let currentId: string | null = candidateManagerId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === userId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);
      const currentUser: User | undefined = users.find(u => u.id === currentId);
      currentId = currentUser?.reports_to ?? null;
    }
    return false;
  };

  // Auth endpoints (Mock)
  app.get('/api/users', (req, res) => res.json(users));

  // Admin settings endpoints
  app.get('/api/admin/settings', (req, res) => {
    res.json(systemSettings);
  });

  app.put('/api/admin/settings', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { expenseCategories, highValueThreshold } = req.body;
    if (expenseCategories && Array.isArray(expenseCategories)) {
      systemSettings.expenseCategories = expenseCategories;
    }
    if (typeof highValueThreshold === 'number') {
      systemSettings.highValueThreshold = highValueThreshold;
    }
    res.json(systemSettings);
  });

  // Admin: Update a user's role/department/job title/reporting manager.
  // Configuration action, deliberately separate from claim approval/processing
  // permissions - segregation of duties for claims is untouched by this route.
  app.put('/api/users/:id', (req, res) => {
    const admin = getUser(req);
    if (!admin || admin.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });

    const target = users.find(u => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const { role, department, job_title, reports_to, confirmOrphan } = req.body;

    // Defense in depth - the UI also disables this, but never trust the client.
    if (target.id === admin.id && role !== undefined && role !== UserRole.ADMIN) {
      return res.status(400).json({ error: 'You cannot remove your own Admin role.' });
    }

    if (reports_to !== undefined && reports_to !== null) {
      if (reports_to === target.id) {
        return res.status(400).json({ error: 'A user cannot report to themselves.' });
      }
      if (wouldCreateCycle(target.id, reports_to)) {
        return res.status(400).json({ error: 'This change would create a circular reporting chain.' });
      }
    }

    const roleChanging = role !== undefined && role !== target.role;
    if (roleChanging && target.role === UserRole.APPROVER && role !== UserRole.APPROVER) {
      const reportees = users.filter(u => u.reports_to === target.id);
      if (reportees.length > 0 && !confirmOrphan) {
        return res.status(409).json({
          error: 'orphan_warning',
          message: `${target.name} still has ${reportees.length} direct report${reportees.length > 1 ? 's' : ''} (${reportees.map(u => u.name).join(', ')}) who will be left without a valid approver. Confirm to proceed anyway.`,
          reportees: reportees.map(u => ({ id: u.id, name: u.name }))
        });
      }
    }

    const changed: string[] = [];

    if (role !== undefined && role !== target.role) {
      addUserHistory(target.id, target.role, role, admin.id, `Changed ${target.name}'s role`);
      target.role = role;
      changed.push('role');
    }
    if (department !== undefined && department !== target.department) {
      addUserHistory(target.id, target.department, department, admin.id, `Changed ${target.name}'s department`);
      target.department = department;
      changed.push('department');
    }
    if (job_title !== undefined && job_title !== target.job_title) {
      addUserHistory(target.id, target.job_title || '(none)', job_title || '(none)', admin.id, `Changed ${target.name}'s job title`);
      target.job_title = job_title;
      changed.push('job_title');
    }
    if (reports_to !== undefined && reports_to !== target.reports_to) {
      const oldManagerName = users.find(u => u.id === target.reports_to)?.name || '(none)';
      const newManagerName = reports_to ? (users.find(u => u.id === reports_to)?.name || reports_to) : '(none)';
      addUserHistory(target.id, oldManagerName, newManagerName, admin.id, `Changed ${target.name}'s reporting manager`);
      target.reports_to = reports_to;
      changed.push('reports_to');
    }

    res.json({ user: target, changed });
  });

  // Company Directory - readable by any authenticated role since MOM creation
  // (any Requestor/Approver) needs to read it; create/edit is Admin-only.
  app.get('/api/companies', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json([...companies].sort((a, b) => a.name.localeCompare(b.name)));
  });

  app.post('/api/companies', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });

    const { name, industry, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Company name is required.' });
    if (companies.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ error: 'A company with this name already exists.' });
    }

    const company: Company = { id: uuidv4(), name: name.trim(), industry, notes };
    companies.push(company);
    res.json(company);
  });

  app.put('/api/companies/:id', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });

    const company = companies.find(c => c.id === req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { name, industry, notes } = req.body;
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Company name is required.' });
      company.name = name.trim();
    }
    if (industry !== undefined) company.industry = industry;
    if (notes !== undefined) company.notes = notes;

    res.json(company);
  });
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
    
    let relevantMoms: Mom[] = [];
    if (user.role === UserRole.ADMIN) {
      relevantMoms = moms; // Admin sees all MOMs
    } else if (user.role === UserRole.CUSTODIAN) {
      // Custodians only need the claim/receipt to verify and release payment;
      // MOM client-meeting content is out of scope for that role.
      relevantMoms = [];
    } else if (user.role === UserRole.REQUESTOR) {
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
        prepared_by_department: requestor ? requestor.department : undefined,
        prepared_by_job_title: requestor ? requestor.job_title : undefined,
        client_name: m.client || m.summary || 'Unknown Client' // for calendar/retro-compatibility
      };
    });
    
    res.json(enriched);
  });

  app.get('/api/moms/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (user.role === UserRole.CUSTODIAN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const mom = moms.find(m => m.id === req.params.id);
    if (!mom) return res.status(404).json({ error: 'Minutes of Meeting not found' });

    let hasAccess = false;
    if (user.role === UserRole.ADMIN) {
      hasAccess = true;
    } else if (user.role === UserRole.REQUESTOR) {
      hasAccess = mom.requestor_id === user.id;
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      hasAccess = mom.requestor_id === user.id || (mom.requestor_id && reporteeIds.includes(mom.requestor_id));
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const requestor = users.find(u => u.id === mom.requestor_id);
    const linkedClaim = mom.claim_id ? claims.find(c => c.id === mom.claim_id) : undefined;

    res.json({
      ...mom,
      requestor,
      prepared_by: requestor ? requestor.name : (mom.prepared_by || 'Unknown'),
      prepared_by_department: requestor ? requestor.department : undefined,
      prepared_by_job_title: requestor ? requestor.job_title : undefined,
      linkedClaim,
    });
  });

  app.get('/api/receipts', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });

    const flatReceipts = [];

    // 1. Flatten claim expenses
    for (const exp of expenses) {
      const claim = claims.find(c => c.id === exp.claim_id);
      const reqUser = claim ? users.find(u => u.id === claim.requestor_id) : undefined;
      const claimNo = claim ? (claim.claim_number || `REIM-${claim.id.substring(0, 6)}`) : 'Unknown';
      
      flatReceipts.push({
        id: `exp-${exp.id}`,
        sourceId: exp.id,
        parentId: claim?.id || '',
        parentType: 'Claim',
        parentNumber: claimNo,
        receipt_url: exp.receipt_url || '',
        or_number: exp.or_number || '',
        vendor: exp.vendor || 'Unknown Vendor',
        amount: exp.amount,
        expense_date: exp.expense_date,
        category: exp.category,
        business_purpose: exp.business_purpose || '',
        requestor_name: reqUser ? reqUser.name : 'Unknown',
        requestor_department: reqUser ? reqUser.department : 'Unknown',
      });
    }

    // 2. Flatten liquidation expenses
    for (const item of liquidationLineItems) {
      const liq = liquidations.find(l => l.id === item.liquidationId);
      const reqUser = liq ? users.find(u => u.id === liq.requestorId) : undefined;
      const liqNo = liq ? `LIQ-${liq.id.substring(0, 6)}` : 'Unknown';

      flatReceipts.push({
        id: `liq-${item.id}`,
        sourceId: item.id,
        parentId: liq?.id || '',
        parentType: 'Liquidation',
        parentNumber: liqNo,
        receipt_url: item.receipt_url || '',
        or_number: item.or_number || '',
        vendor: item.vendor || 'Unknown Vendor',
        amount: item.amount,
        expense_date: item.expense_date,
        category: item.category,
        business_purpose: item.business_purpose || '',
        requestor_name: reqUser ? reqUser.name : 'Unknown',
        requestor_department: reqUser ? reqUser.department : 'Unknown',
      });
    }

    // Sort by expense date descending
    flatReceipts.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

    res.json(flatReceipts);
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

    getOrCreateCompany(mom.client);
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
        const activeDelegation = getActiveDelegation(momOwner.reports_to);
        authorized = activeDelegation?.delegate_id === user.id;
      }
      if (!authorized) {
        return res.status(403).json({ error: 'Forbidden: not your direct report' });
      }
    }

    mom.client = req.body.client ?? mom.client;
    getOrCreateCompany(mom.client);
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
      filtered = claims.filter(c => [ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(c.status) || c.requestor_id === user.id);
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
      const reviewMeeting = reviewMeetings.find(rm => rm.claim_id === c.id);
      return { ...c, mom, requestor: reqUser, expenses: claimExpenses, approvals: claimApprovals, history: claimHistory, reviewMeeting };
    });

    res.json(enriched);
  });

  app.get('/api/claims/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Not found' });

    // Mirror the scoping already applied by GET /api/claims - the list endpoint
    // was correctly scoped but this single-record lookup was not, allowing any
    // authenticated user to read any claim by id.
    let hasAccess = false;
    if (user.role === UserRole.ADMIN) {
      hasAccess = true;
    } else if (user.role === UserRole.REQUESTOR) {
      hasAccess = claim.requestor_id === user.id;
    } else if (user.role === UserRole.APPROVER) {
      hasAccess = claim.current_approver_id === user.id || claim.original_approver_id === user.id || claim.requestor_id === user.id;
    } else if (user.role === UserRole.CUSTODIAN) {
      hasAccess = [ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(claim.status) || claim.requestor_id === user.id;
    }
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

    const claimExpenses = expenses.filter(e => e.claim_id === claim.id);
    const claimApprovals = approvals.filter(a => a.claim_id === claim.id);
    const claimHistory = statusHistories.filter(h => h.claim_id === claim.id).map(h => ({      ...h,      changedBy: users.find(u => u.id === h.changed_by)    })).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const mom = moms.find(m => m.id === claim.mom_id);
    const requestor = users.find(u => u.id === claim.requestor_id);
    const reviewMeeting = reviewMeetings.find(rm => rm.claim_id === claim.id);

    res.json({
      ...claim,
      expenses: claimExpenses,
      approvals: claimApprovals,
      history: claimHistory,
      mom,
      requestor,
      reviewMeeting
    });
  });

  app.post('/api/claims', (req, res) => {
    const user = getUser(req);
    if (!user || !user.reports_to) return res.status(403).json({ error: 'Forbidden: You must have a designated manager (reports_to) to submit.' });
    
    const { mom_id, expense_category, total_amount, receipt_url, or_number, remarks, supporting_documents, line_items, meeting_date, meeting_time, is_draft } = req.body;

    if (!is_draft && !mom_id) return res.status(400).json({ error: 'Minutes of Meeting (MOM) is required.' });
    const mom = moms.find(m => m.id === mom_id);
    if (!mom) return res.status(400).json({ error: 'Minutes of Meeting (MOM) not found.' });

    if (!is_draft && mom.status !== MomStatus.COMPLETED) {
      return res.status(400).json({ error: 'Cannot attach an incomplete or draft Minutes of Meeting.' });
    }
    if (mom.claim_id) {
      return res.status(400).json({ error: 'This Minutes of Meeting is already linked to another claim and cannot be reused.' });
    }

    if (!is_draft && (!meeting_date || !meeting_time)) {
      return res.status(400).json({ error: 'A Review Meeting date and time must be scheduled with your Approver.' });
    }

    let itemsToCreate: any[] = [];
    let claimTotal = 0;
    let mainCategory = expense_category || 'Multiple Categories';
    let mainReceipt = receipt_url || '';

    if (line_items && Array.isArray(line_items) && line_items.length > 0) {
      for (const item of line_items) {
        if (!is_draft && !item.category) return res.status(400).json({ error: 'Each expense must have a category.' });
        const numericAmount = Number(item.amount);
        if (isNaN(numericAmount) || numericAmount <= 0) return res.status(400).json({ error: 'Each expense amount must be a valid number greater than zero.' });
        if (!item.receipt_url) return res.status(400).json({ error: 'Each expense must have a receipt.' });
        
        itemsToCreate.push({
          category: item.category,
          amount: numericAmount,
          receipt_url: item.receipt_url,
          or_number: item.or_number,
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
        or_number: or_number,
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
        receipt_url: item.receipt_url,
        or_number: item.or_number
      });
    }

    let originalApproverId: string | undefined = undefined;
    let currentApproverId = user.reports_to || '';
    
    if (user.reports_to) {
      const activeDelegation = getActiveDelegation(user.reports_to);
      if (activeDelegation) {
        originalApproverId = user.reports_to;
        currentApproverId = activeDelegation.delegate_id;
      }
    }

    const hasConflict = reviewMeetings.some(rm =>
      rm.approver_id === currentApproverId &&
      [ReviewMeetingStatus.PENDING_CONFIRMATION, ReviewMeetingStatus.CONFIRMED].includes(rm.status) &&
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
      flagged_high_value: itemsToCreate.some(item => item.amount > systemSettings.highValueThreshold)
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
      status: ReviewMeetingStatus.PENDING_CONFIRMATION,
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
        claim_number: claim?.claim_number,
        total_amount: claim?.total_amount
      };
    });

    res.json(enriched);
  });

  // Shared by confirm/decline: a Review Meeting can be acted on by its
  // assigned approver_id, or by whoever they've actively delegated to right
  // now - the same dynamic delegation check already used for MOM PUT access.
  const isAuthorizedForReviewMeeting = (rm: ReviewMeeting, user: User): boolean => {
    if (rm.approver_id === user.id) return true;
    return getActiveDelegation(rm.approver_id)?.delegate_id === user.id;
  };

  // Approver (or active delegate) confirms a proposed Review Meeting time.
  app.post('/api/review-meetings/:id/confirm', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const rm = reviewMeetings.find(r => r.id === req.params.id);
    if (!rm) return res.status(404).json({ error: 'Review Meeting not found' });
    if (!isAuthorizedForReviewMeeting(rm, user)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned Review Meeting' });
    }
    if (rm.status !== ReviewMeetingStatus.PENDING_CONFIRMATION) {
      return res.status(400).json({ error: 'Only a meeting pending confirmation can be confirmed.' });
    }

    rm.status = ReviewMeetingStatus.CONFIRMED;
    rm.decline_reason = undefined;

    const requestor = users.find(u => u.id === rm.requestor_id);
    const claim = claims.find(c => c.id === rm.claim_id);
    const claimNumber = claim?.claim_number || `REIM-${rm.claim_id.substring(0, 6)}`;

    sendEmail(
      rm.requestor_id,
      `Review Meeting Confirmed - ${claimNumber}`,
      `${user.name} has confirmed your proposed Review Meeting for claim ${claimNumber} on ${rm.meeting_date} at ${rm.meeting_time}.

Reference:
${claimNumber}`
    );

    res.json(rm);
  });

  // Approver (or active delegate) declines a proposed Review Meeting time,
  // optionally with a reason. The Requestor must propose a new time via
  // PUT /api/review-meetings/:id/reschedule before the meeting can move
  // forward again.
  app.post('/api/review-meetings/:id/decline', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const rm = reviewMeetings.find(r => r.id === req.params.id);
    if (!rm) return res.status(404).json({ error: 'Review Meeting not found' });
    if (!isAuthorizedForReviewMeeting(rm, user)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned Review Meeting' });
    }
    if (rm.status !== ReviewMeetingStatus.PENDING_CONFIRMATION) {
      return res.status(400).json({ error: 'Only a meeting pending confirmation can be declined.' });
    }

    const { reason } = req.body;
    rm.status = ReviewMeetingStatus.DECLINE_REQUESTED;
    rm.decline_reason = reason || undefined;

    const claim = claims.find(c => c.id === rm.claim_id);
    const claimNumber = claim?.claim_number || `REIM-${rm.claim_id.substring(0, 6)}`;

    sendEmail(
      rm.requestor_id,
      `Review Meeting Declined - ${claimNumber}`,
      `${user.name} can't make the proposed Review Meeting for claim ${claimNumber} on ${rm.meeting_date} at ${rm.meeting_time}.
${reason ? `\nReason:\n${reason}\n` : ''}
Required Action:
Please log in to the system and propose a new date/time for this Review Meeting.`
    );

    res.json(rm);
  });

  // Requestor proposes a new date/time for their own Review Meeting - reused
  // after a decline (or any time before the meeting is Completed), re-opening
  // the same pending-confirmation cycle rather than a separate claim step.
  app.put('/api/review-meetings/:id/reschedule', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const rm = reviewMeetings.find(r => r.id === req.params.id && r.requestor_id === user.id);
    if (!rm) return res.status(404).json({ error: 'Review Meeting not found' });
    if (rm.status === ReviewMeetingStatus.COMPLETED) {
      return res.status(400).json({ error: 'This Review Meeting has already been completed.' });
    }

    const { meeting_date, meeting_time } = req.body;
    if (!meeting_date || !meeting_time) {
      return res.status(400).json({ error: 'A new meeting date and time are required.' });
    }

    const hasConflict = reviewMeetings.some(other =>
      other.id !== rm.id &&
      other.approver_id === rm.approver_id &&
      [ReviewMeetingStatus.PENDING_CONFIRMATION, ReviewMeetingStatus.CONFIRMED].includes(other.status) &&
      other.meeting_date === meeting_date &&
      other.meeting_time === meeting_time
    );
    if (hasConflict) {
      return res.status(409).json({ error: 'Your Approver already has a Review Meeting scheduled at that date and time. Please choose another slot.' });
    }

    rm.meeting_date = meeting_date;
    rm.meeting_time = meeting_time;
    rm.status = ReviewMeetingStatus.PENDING_CONFIRMATION;
    rm.decline_reason = undefined;

    const claim = claims.find(c => c.id === rm.claim_id);
    const claimNumber = claim?.claim_number || `REIM-${rm.claim_id.substring(0, 6)}`;

    sendEmail(
      rm.approver_id,
      `Review Meeting Rescheduled - ${claimNumber}`,
      `${user.name} has proposed a new time for the Review Meeting on claim ${claimNumber}: ${meeting_date} at ${meeting_time}.

Required Action:
Please log in to the system and confirm or decline this new time.`
    );

    res.json(rm);
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

    const { mom_id, expense_category, total_amount, receipt_url, or_number, remarks, supporting_documents, line_items } = req.body;

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
          or_number: item.or_number,
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
        or_number: or_number,
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
        receipt_url: item.receipt_url,
        or_number: item.or_number
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
    claim.flagged_high_value = itemsToCreate.some(item => item.amount > systemSettings.highValueThreshold);

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
    const activeDelegation = getActiveDelegation(user.reports_to);
    if (activeDelegation) {
      currentApproverId = activeDelegation.delegate_id;
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
    const activeDelegation = getActiveDelegation(user.reports_to);
    if (activeDelegation) {
      currentApproverId = activeDelegation.delegate_id;
    }

    const relevant = reviewMeetings.filter(rm => rm.approver_id === currentApproverId && [ReviewMeetingStatus.PENDING_CONFIRMATION, ReviewMeetingStatus.CONFIRMED].includes(rm.status));
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

    // calendar: count of upcoming active (pending-confirmation or confirmed) review meetings
    const activeMeetingStatuses = [ReviewMeetingStatus.PENDING_CONFIRMATION, ReviewMeetingStatus.CONFIRMED, ReviewMeetingStatus.DECLINE_REQUESTED];
    let calendarCount = 0;
    if (user.role === UserRole.REQUESTOR) {
      calendarCount = reviewMeetings.filter(rm => rm.requestor_id === user.id && activeMeetingStatuses.includes(rm.status)).length;
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      calendarCount = reviewMeetings.filter(rm => (rm.requestor_id === user.id || rm.approver_id === user.id || reporteeIds.includes(rm.requestor_id)) && activeMeetingStatuses.includes(rm.status)).length;
    }

    // emails: count of unread emails for the user
    const emailsCount = emails.filter(e => e.recipient_id === user.id && !e.read).length;

    // inbox: (Approver only) count of pending-approval claims assigned to them,
    // their own returned claims, and Review Meetings awaiting their confirmation
    let inboxCount = 0;
    if (user.role === UserRole.APPROVER) {
      const pendingClaims = claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL && c.current_approver_id === user.id);
      const returnedClaims = claims.filter(c => c.status === ClaimStatus.RETURNED && c.requestor_id === user.id);
      const pendingMeetingConfirmations = reviewMeetings.filter(rm => rm.approver_id === user.id && rm.status === ReviewMeetingStatus.PENDING_CONFIRMATION);
      inboxCount = pendingClaims.length + returnedClaims.length + pendingMeetingConfirmations.length;
    }

    // processing: (Custodian only) count of claims currently in PROCESSING status
    let processingCount = 0;
    if (user.role === UserRole.CUSTODIAN) {
      processingCount = claims.filter(c => c.status === ClaimStatus.PROCESSING).length;
    }

    // dashboard: (Requestor only) count of the requestor's own claims currently in RETURNED status needing their action
    let dashboardCount = 0;
    if (user.role === UserRole.REQUESTOR) {
      dashboardCount = claims.filter(c => c.requestor_id === user.id && c.status === ClaimStatus.RETURNED).length;
    }

    // readyToClaim: (Requestor only) count of their own claims in READY_FOR_CLAIM status
    let readyToClaimCount = 0;
    if (user.role === UserRole.REQUESTOR) {
      readyToClaimCount = claims.filter(c => c.requestor_id === user.id && c.status === ClaimStatus.READY_FOR_CLAIM).length;
    }

    res.json({
      calendar: calendarCount,
      emails: emailsCount,
      inbox: inboxCount,
      processing: processingCount,
      dashboard: dashboardCount,
      readyToClaim: readyToClaimCount
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
      const targetUser = h.user_id ? users.find(u => u.id === h.user_id) : undefined;
      return { ...h, claim, changedBy, targetUser };
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

    // Mirror the scoping already applied by GET /api/cash-advances - the list
    // endpoint was correctly scoped but this single-record lookup was not.
    let hasAccess = false;
    if (user.role === UserRole.REQUESTOR) {
      hasAccess = ca.requestorId === user.id;
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      hasAccess = ca.approverId === user.id || ca.requestorId === user.id || reporteeIds.includes(ca.requestorId);
    } else {
      hasAccess = true; // Custodian and Admin see all
    }
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

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
      status: CashAdvanceStatus.DRAFT,
      createdAt: new Date().toISOString()
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
      const activeDelegation = getActiveDelegation(user.reports_to);
      ca.approverId = activeDelegation ? activeDelegation.delegate_id : user.reports_to;
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

    // Mirror the scoping already applied by GET /api/liquidations - the list
    // endpoint was correctly scoped but this single-record lookup was not.
    let hasAccess = false;
    if (user.role === UserRole.REQUESTOR) {
      hasAccess = l.requestorId === user.id;
    } else if (user.role === UserRole.APPROVER) {
      const reporteeIds = users.filter(u => u.reports_to === user.id).map(u => u.id);
      const relatedCa = cashAdvances.find(c => c.id === l.cashAdvanceId);
      hasAccess = l.requestorId === user.id || relatedCa?.approverId === user.id || reporteeIds.includes(l.requestorId);
    } else {
      hasAccess = true; // Custodian and Admin see all
    }
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

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
      status: LiquidationStatus.DRAFT,
      createdAt: new Date().toISOString()
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

    const { expense_date, vendor, category, amount, payment_method, business_purpose, receipt_url, attachment_type, or_number } = req.body;
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
      attachment_type: attachment_type || 'Official Receipt',
      or_number: or_number || undefined
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

    const { expense_date, vendor, category, amount, payment_method, business_purpose, receipt_url, attachment_type, or_number } = req.body;

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
    if (or_number !== undefined) item.or_number = or_number;

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
          flagged_high_value: l.varianceAmount > systemSettings.highValueThreshold
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

  // Delegation: list delegations relevant to the current user, either as the
  // Approver who requested them or as the delegate being asked to cover -
  // powers both "my delegation status/history" and "pending requests
  // waiting on my response" in Settings.
  app.get('/api/delegations', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    syncDelegationStatuses();
    const relevant = delegations.filter(d => d.approver_id === user.id || d.delegate_id === user.id);
    const enriched = relevant.map(d => ({
      ...d,
      approver: users.find(u => u.id === d.approver_id),
      delegate: users.find(u => u.id === d.delegate_id)
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(enriched);
  });

  // Approver requests a delegation. Starts Pending - routing does not change
  // until the delegate explicitly accepts (see /accept below).
  app.post('/api/delegations', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.APPROVER) return res.status(403).json({ error: 'Forbidden' });

    const { delegate_id, start_date, end_date } = req.body;
    if (!delegate_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Delegate, start date, and end date are all required.' });
    }
    if (delegate_id === user.id) {
      return res.status(400).json({ error: 'You cannot delegate to yourself.' });
    }
    const delegate = users.find(u => u.id === delegate_id);
    if (!delegate || delegate.role !== UserRole.APPROVER) {
      return res.status(400).json({ error: 'You can only delegate to another Approver.' });
    }
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'The start date cannot be after the end date.' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const delegation: ApproverDelegation = {
      id,
      approver_id: user.id,
      delegate_id,
      start_date,
      end_date,
      status: DelegationStatus.PENDING,
      created_by: user.id,
      created_at: now,
      updated_at: now
    };
    delegations.push(delegation);
    addDelegationHistory(id, '', DelegationStatus.PENDING, user.id, `Delegation requested to ${delegate.name}`);

    sendEmail(
      delegate_id,
      `Delegation Request from ${user.name}`,
      `${user.name} has asked you to cover their approval duties from ${start_date} to ${end_date}.\n\nPlease log in and Accept or Decline this request from Settings > Approval Delegation. Your decision does not take effect until you respond - claims will keep routing to ${user.name} until then.`
    );

    res.json(delegation);
  });

  // Delegate accepts a Pending request - only now does routing actually change.
  app.post('/api/delegations/:id/accept', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    syncDelegationStatuses();

    const delegation = delegations.find(d => d.id === req.params.id);
    if (!delegation) return res.status(404).json({ error: 'Delegation not found' });
    if (delegation.delegate_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
    if (delegation.status !== DelegationStatus.PENDING) {
      return res.status(400).json({ error: `This request is ${delegation.status.toLowerCase()} and can no longer be accepted.` });
    }

    const oldStatus = delegation.status;
    delegation.status = DelegationStatus.ACTIVE;
    delegation.updated_at = new Date().toISOString();
    addDelegationHistory(delegation.id, oldStatus, DelegationStatus.ACTIVE, user.id, 'Delegation accepted');

    sendEmail(
      delegation.approver_id,
      `${user.name} accepted your delegation request`,
      `${user.name} has accepted your request to cover approvals from ${delegation.start_date} to ${delegation.end_date}. Claims from your direct reports will now route to them for that period.`
    );

    res.json(delegation);
  });

  // Delegate declines - request never takes effect, approver has to pick someone else.
  app.post('/api/delegations/:id/decline', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const delegation = delegations.find(d => d.id === req.params.id);
    if (!delegation) return res.status(404).json({ error: 'Delegation not found' });
    if (delegation.delegate_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
    if (delegation.status !== DelegationStatus.PENDING) {
      return res.status(400).json({ error: `This request is ${delegation.status.toLowerCase()} and can no longer be declined.` });
    }

    const { reason } = req.body;
    const oldStatus = delegation.status;
    delegation.status = DelegationStatus.DECLINED;
    delegation.decline_reason = reason || undefined;
    delegation.updated_at = new Date().toISOString();
    addDelegationHistory(delegation.id, oldStatus, DelegationStatus.DECLINED, user.id, reason || 'Delegation declined');

    sendEmail(
      delegation.approver_id,
      `${user.name} declined your delegation request`,
      `${user.name} has declined your request to cover approvals from ${delegation.start_date} to ${delegation.end_date}.${reason ? `\n\nReason: ${reason}` : ''}\n\nPlease choose a different delegate if you still need coverage for this period.`
    );

    res.json(delegation);
  });

  // Approver cancels their own delegation early, whether it's still Pending
  // or already Active.
  app.post('/api/delegations/:id/cancel', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const delegation = delegations.find(d => d.id === req.params.id);
    if (!delegation) return res.status(404).json({ error: 'Delegation not found' });
    if (delegation.approver_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
    if (delegation.status !== DelegationStatus.PENDING && delegation.status !== DelegationStatus.ACTIVE) {
      return res.status(400).json({ error: `This delegation is already ${delegation.status.toLowerCase()}.` });
    }

    const oldStatus = delegation.status;
    delegation.status = DelegationStatus.CANCELLED;
    delegation.updated_at = new Date().toISOString();
    addDelegationHistory(delegation.id, oldStatus, DelegationStatus.CANCELLED, user.id, 'Delegation cancelled by approver');

    sendEmail(
      delegation.delegate_id,
      `${user.name} cancelled their delegation request`,
      `${user.name} has cancelled the delegation ${oldStatus === DelegationStatus.ACTIVE ? 'that was active' : 'request'} covering ${delegation.start_date} to ${delegation.end_date}. ${oldStatus === DelegationStatus.ACTIVE ? 'You no longer need to act on their behalf.' : 'No action is needed.'}`
    );

    res.json(delegation);
  });

  // Admin: Reassign Approver
  app.put('/api/claims/:id/reassign', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });
    
    const { new_approver_id, reason } = req.body;
    if (!new_approver_id || !reason) return res.status(400).json({ error: 'Missing required fields' });

    const newApprover = users.find(u => u.id === new_approver_id);
    if (!newApprover) return res.status(400).json({ error: 'New approver not found.' });
    if (newApprover.role !== UserRole.APPROVER) return res.status(400).json({ error: 'New approver must have the Approver role.' });

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
    companies = buildInitialCompanies();

    users.length = 0;
    users.push(...buildDefaultUsers());

    const rDate = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString();
    };

    // Seeds a delegation already in the Active state (pre-accepted), so demo
    // data doesn't require someone to manually click Accept after every
    // reset. Looked up by id, not array position - buildDefaultUsers() has
    // been reordered before and a positional index silently pointed at the
    // wrong user (Noah) the last time this drifted.
    const seedAcceptedDelegation = (approverId: string, delegateId: string, startDate: string, endDate: string) => {
      const approver = users.find(u => u.id === approverId);
      const delegate = users.find(u => u.id === delegateId);
      if (!approver || !delegate) return;
      const id = uuidv4();
      const createdAt = rDate(15);
      delegations.push({
        id,
        approver_id: approverId,
        delegate_id: delegateId,
        start_date: startDate,
        end_date: endDate,
        status: DelegationStatus.ACTIVE,
        created_by: approverId,
        created_at: createdAt,
        updated_at: createdAt
      });
      addDelegationHistory(id, '', DelegationStatus.PENDING, approverId, `Delegation requested to ${delegate.name}`);
      addDelegationHistory(id, DelegationStatus.PENDING, DelegationStatus.ACTIVE, delegateId, 'Delegation accepted');
    };

    // Bob has an active delegation to Grace (covers "today", so auto-routing is demoable live).
    const activeDelegationStart = rDate(2).split('T')[0];
    const activeDelegationEnd = rDate(-5).split('T')[0];
    seedAcceptedDelegation('u2', 'u7', activeDelegationStart, activeDelegationEnd);

    // Henry has a delegation to Bob that already ended 2 days ago - demonstrates
    // the lazy Active -> Expired transition the first time delegations are read.
    const expiredStart = rDate(10).split('T')[0];
    const expiredEnd = rDate(2).split('T')[0];
    seedAcceptedDelegation('u8', 'u2', expiredStart, expiredEnd);

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
      const actualClient = client && client.trim() !== '' ? client : 'SM Prime Holdings';
      const reqUser = users.find(u => u.id === requestorId);
      const contact = CONTACTS[idx];
      const [first, ...rest] = contact.split(' ');
      const last = rest[rest.length - 1] || first;
      const momDate = rDate(daysAgo);
      const mom: Mom = {
        id: uuidv4(),
        requestor_id: requestorId,
        client: actualClient,
        contact_person: contact,
        contact_person_email: `${first.toLowerCase()}.${last.toLowerCase()}@${actualClient.replace(/[^a-zA-Z]/g, '').toLowerCase()}.com`,
        meeting_date: momDate.split('T')[0],
        meeting_time: TIMES[idx],
        location: LOCATIONS[idx],
        purpose: PURPOSES[idx],
        discussion: DISCUSSIONS[idx](actualClient),
        agreements: AGREEMENTS[idx],
        action_items: ACTION_ITEMS[idx],
        prepared_by: reqUser?.name || 'Requestor',
        status,
        created_at: momDate,
        minutes_source: MinutesSource.TEMPLATE
      };
      getOrCreateCompany(actualClient);
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

      const approvedAt = opts.approvedDaysAgo !== undefined ? rDate(opts.approvedDaysAgo) : createdAt;

      // Handle delegation for current_approver_id
      let currentApproverId = opts.approverId;
      const activeDelegationAtCreation = getActiveDelegation(opts.approverId, new Date(createdAt));
      if (activeDelegationAtCreation) {
        currentApproverId = activeDelegationAtCreation.delegate_id;
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
          timestamp: approvedAt
        });
      }

      const isReleaseStage = [ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(opts.status);
      const processedAt = opts.processedDaysAgo !== undefined ? rDate(opts.processedDaysAgo) : approvedAt;
      const updatedAt = isReleaseStage ? processedAt : (decision ? approvedAt : createdAt);

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
        processing_date: isReleaseStage ? processedAt : undefined,
        approved_at: decision === 'Approved' ? approvedAt : undefined,
        created_at: createdAt,
        updated_at: updatedAt
      };

      claims.push(claim);

      // Get user names for email templates
      const requestor = users.find(u => u.id === opts.requestorId);
      const approver = users.find(u => u.id === currentApproverId);
      const requestorName = requestor?.name || 'Requestor';
      const approverName = approver?.name || 'Approver';

      const comment = opts.approvalComment || (
        decision === 'Approved' ? 'Approved. Valid receipt attached and MOM summary completed.'
        : decision === 'Rejected' ? 'Rejected: Out-of-policy amount exceeded without pre-approval.'
        : 'Returned for Revision: Please upload a clearer receipt image showing the tax breakdown.'
      );

      // --- SEQUENCE TRANSITIONS AND EMAILS ---

      // 1. Initial Draft state
      statusHistories.push({
        id: uuidv4(),
        claim_id: claimId,
        old_status: '',
        new_status: ClaimStatus.DRAFT,
        changed_by: opts.requestorId,
        reason: 'Claim created as draft',
        timestamp: createdAt
      });

      // 2. Submission to Pending Approval
      if (opts.status !== ClaimStatus.DRAFT) {
        statusHistories.push({
          id: uuidv4(),
          claim_id: claimId,
          old_status: ClaimStatus.DRAFT,
          new_status: ClaimStatus.PENDING_APPROVAL,
          changed_by: opts.requestorId,
          reason: 'Submitted for approval',
          timestamp: createdAt
        });

        if (currentApproverId) {
          const emailSubject = `Reimbursement Submitted - ${claimNumber}`;
          const emailBody = `A new reimbursement request ${claimNumber} by ${requestorName} has been submitted and is awaiting your review and approval.

Reference:
${claimNumber}

Required Action:
Please log in to the system and navigate to the Approval Queue to approve or reject this claim.`;
          sendEmail(currentApproverId, emailSubject, emailBody, undefined, { timestamp: createdAt });
        }
      }

      // 3. Approver Decision
      if ([ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(opts.status)) {
        const nextStatus = opts.status === ClaimStatus.APPROVED ? ClaimStatus.APPROVED : ClaimStatus.PROCESSING;
        statusHistories.push({
          id: uuidv4(),
          claim_id: claimId,
          old_status: ClaimStatus.PENDING_APPROVAL,
          new_status: nextStatus,
          changed_by: currentApproverId,
          reason: comment,
          timestamp: approvedAt
        });

        // Approved email to requestor
        const approvedSubject = `Approved - ${claimNumber}`;
        const approvedBody = `Your reimbursement request ${claimNumber} has been approved by ${approverName}. It has been forwarded to the Custodian for processing and payment release.

Reference:
${claimNumber}`;
        sendEmail(opts.requestorId, approvedSubject, approvedBody, undefined, { timestamp: approvedAt });

        // Processing email to custodians
        const custodians = users.filter(u => u.role === UserRole.CUSTODIAN);
        custodians.forEach(c => {
          const custodianSubject = `Reimbursement Processing Required - ${claimNumber}`;
          const custodianBody = `Reimbursement request ${claimNumber} submitted by ${requestorName} and approved by ${approverName} is now in your processing queue.

Reference:
${claimNumber}

Required Action:
Please generate the Claim Code, release the payment, and mark it as Ready for Claim.`;
          sendEmail(c.id, custodianSubject, custodianBody, undefined, { timestamp: approvedAt });
        });
      } else if (opts.status === ClaimStatus.REJECTED) {
        statusHistories.push({
          id: uuidv4(),
          claim_id: claimId,
          old_status: ClaimStatus.PENDING_APPROVAL,
          new_status: ClaimStatus.REJECTED,
          changed_by: currentApproverId,
          reason: comment,
          timestamp: approvedAt
        });

        const emailSubject = `Reimbursement Rejected - ${claimNumber}`;
        const emailBody = `Your reimbursement request ${claimNumber} has been rejected by ${approverName}.

Reason:
${comment}

Reference:
${claimNumber}

Required Action:
No action required.`;
        sendEmail(opts.requestorId, emailSubject, emailBody, undefined, { timestamp: approvedAt });
      } else if (opts.status === ClaimStatus.RETURNED) {
        statusHistories.push({
          id: uuidv4(),
          claim_id: claimId,
          old_status: ClaimStatus.PENDING_APPROVAL,
          new_status: ClaimStatus.RETURNED,
          changed_by: currentApproverId,
          reason: comment,
          timestamp: approvedAt
        });

        const emailSubject = `Reimbursement Returned - ${claimNumber}`;
        const emailBody = `Your reimbursement request ${claimNumber} has been returned by ${approverName}.

Reason:
${comment}

Reference:
${claimNumber}

Required Action:
Please revise and resubmit your claim.`;
        sendEmail(opts.requestorId, emailSubject, emailBody, undefined, { timestamp: approvedAt });
      }

      // 4. Ready for Claim
      if ([ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(opts.status)) {
        statusHistories.push({
          id: uuidv4(),
          claim_id: claimId,
          old_status: ClaimStatus.PROCESSING,
          new_status: ClaimStatus.READY_FOR_CLAIM,
          changed_by: 'u3', // Carol Custodian
          reason: `Processed. Payment method: ${opts.paymentMethod || 'GCash'}.`,
          timestamp: processedAt
        });

        const emailSubject = `Reimbursement - For Release`;
        const emailBody = `This request ${claimNumber} by ${requestorName} has been approved and ready for release.

Enter code ${opts.releaseCode || 'T8QXM4'} for releasing of cash.
_________________________________________
This is an automatically generated email, please do not reply.
${requestorName}
BSM Assistant | BSD - IT Security Business`;

        sendEmail(opts.requestorId, emailSubject, emailBody, undefined, { 
          plain: true,
          fromLabel: "SharePoint Online <no-reply@sharepointonline.com>",
          timestamp: processedAt
        });
      }

      // 5. Completed
      if (opts.status === ClaimStatus.COMPLETED) {
        statusHistories.push({
          id: uuidv4(),
          claim_id: claimId,
          old_status: ClaimStatus.READY_FOR_CLAIM,
          new_status: ClaimStatus.COMPLETED,
          changed_by: opts.requestorId,
          reason: 'Claim completed and cash received.',
          timestamp: processedAt
        });
      }

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

    // Define helper functions for setting status history with custom timestamps
    const addCaHistoryWithTimestamp = (caId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string, timestamp?: string) => {
      statusHistories.push({
        id: uuidv4(),
        claim_id: '',
        cash_advance_id: caId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
        reason,
        timestamp: timestamp || new Date().toISOString()
      });
    };

    const addLiqHistoryWithTimestamp = (liqId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string, timestamp?: string) => {
      statusHistories.push({
        id: uuidv4(),
        claim_id: '',
        liquidation_id: liqId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
        reason,
        timestamp: timestamp || new Date().toISOString()
      });
    };

    // 1. Standalone Cash Advances

    // ca1: Draft
    const ca1Id = uuidv4();
    cashAdvances.push({
      id: ca1Id,
      requestorId: 'u1',
      amount: 3500.00,
      purpose: 'Client Lunch - Rockwell',
      approverId: 'u2',
      status: CashAdvanceStatus.DRAFT,
      createdAt: rDate(1),
    });
    addCaHistoryWithTimestamp(ca1Id, '', CashAdvanceStatus.DRAFT, 'u1', 'Draft created', rDate(1));

    // ca2: Submitted
    const ca2Id = uuidv4();
    cashAdvances.push({
      id: ca2Id,
      requestorId: 'u5',
      amount: 5000.00,
      purpose: 'Travel to Cebu',
      approverId: 'u2',
      status: CashAdvanceStatus.SUBMITTED,
      createdAt: rDate(3),
    });
    addCaHistoryWithTimestamp(ca2Id, '', CashAdvanceStatus.DRAFT, 'u5', 'Draft created', rDate(3));
    addCaHistoryWithTimestamp(ca2Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u5', 'Submitted for Approval', rDate(2));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca2Id.substring(0,6)}`,
      `A Cash Advance request for PHP 5000 has been submitted by Eve Requestor for your approval.\n\nPurpose: Travel to Cebu`,
      undefined,
      { timestamp: rDate(2) }
    );

    // ca3: Approved
    const ca3Id = uuidv4();
    cashAdvances.push({
      id: ca3Id,
      requestorId: 'u6',
      amount: 7500.00,
      purpose: 'Client Entertainment - BGC',
      approverId: 'u2',
      status: CashAdvanceStatus.APPROVED,
      createdAt: rDate(4),
    });
    addCaHistoryWithTimestamp(ca3Id, '', CashAdvanceStatus.DRAFT, 'u6', 'Draft created', rDate(4));
    addCaHistoryWithTimestamp(ca3Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u6', 'Submitted for Approval', rDate(3));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca3Id.substring(0,6)}`,
      `A Cash Advance request for PHP 7500 has been submitted by Frank Requestor for your approval.\n\nPurpose: Client Entertainment - BGC`,
      undefined,
      { timestamp: rDate(3) }
    );
    addCaHistoryWithTimestamp(ca3Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u2', 'Approved', rDate(2));
    sendEmail(
      'u6',
      `Cash Advance Request Approved - CADV-${ca3Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 7500 has been Approved by Bob Approver.`,
      undefined,
      { timestamp: rDate(2) }
    );

    // ca4: Rejected
    const ca4Id = uuidv4();
    cashAdvances.push({
      id: ca4Id,
      requestorId: 'u11',
      amount: 12000.00,
      purpose: 'Team Building Advance',
      approverId: 'u10',
      status: CashAdvanceStatus.REJECTED,
      createdAt: rDate(5),
    });
    addCaHistoryWithTimestamp(ca4Id, '', CashAdvanceStatus.DRAFT, 'u11', 'Draft created', rDate(5));
    addCaHistoryWithTimestamp(ca4Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u11', 'Submitted for Approval', rDate(4));
    sendEmail(
      'u10',
      `Cash Advance Request Submitted - CADV-${ca4Id.substring(0,6)}`,
      `A Cash Advance request for PHP 12000 has been submitted by Kyle Requestor for your approval.\n\nPurpose: Team Building Advance`,
      undefined,
      { timestamp: rDate(4) }
    );
    addCaHistoryWithTimestamp(ca4Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.REJECTED, 'u10', 'Rejected due to budget constraints', rDate(3));
    sendEmail(
      'u11',
      `Cash Advance Request Rejected - CADV-${ca4Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 12000 has been Rejected by Jack Mid-Level Approver.\n\nComment: Rejected due to budget constraints`,
      undefined,
      { timestamp: rDate(3) }
    );

    // ca5: Released
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
      releaseReference: 'REF-LIAM-CA',
      createdAt: rDate(5),
    });
    addCaHistoryWithTimestamp(ca5Id, '', CashAdvanceStatus.DRAFT, 'u12', 'Draft created', rDate(5));
    addCaHistoryWithTimestamp(ca5Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u12', 'Submitted for Approval', rDate(4));
    sendEmail(
      'u10',
      `Cash Advance Request Submitted - CADV-${ca5Id.substring(0,6)}`,
      `A Cash Advance request for PHP 6000 has been submitted by Liam Requestor for your approval.\n\nPurpose: Field surveys`,
      undefined,
      { timestamp: rDate(4) }
    );
    addCaHistoryWithTimestamp(ca5Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u10', 'Approved', rDate(3));
    sendEmail(
      'u12',
      `Cash Advance Request Approved - CADV-${ca5Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 6000 has been Approved by Jack Mid-Level Approver.`,
      undefined,
      { timestamp: rDate(3) }
    );
    addCaHistoryWithTimestamp(ca5Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(2));
    sendEmail(
      'u12',
      `Cash Advance Released - CADV-${ca5Id.substring(0,6)}`,
      `Your Cash Advance for PHP 6000 has been released by Carol Custodian.\n\nRelease Reference: REF-LIAM-CA\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(2) }
    );

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
      releaseReference: 'REF-LIAM-SURVEY',
      createdAt: rDate(6),
    };
    cashAdvances.push(ca6);
    addCaHistoryWithTimestamp(ca6Id, '', CashAdvanceStatus.DRAFT, 'u12', 'Draft created', rDate(6));
    addCaHistoryWithTimestamp(ca6Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u12', 'Submitted for Approval', rDate(5));
    sendEmail(
      'u10',
      `Cash Advance Request Submitted - CADV-${ca6Id.substring(0,6)}`,
      `A Cash Advance request for PHP 6000 has been submitted by Liam Requestor for your approval.\n\nPurpose: Field survey Liam`,
      undefined,
      { timestamp: rDate(5) }
    );
    addCaHistoryWithTimestamp(ca6Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u10', 'Approved', rDate(4));
    sendEmail(
      'u12',
      `Cash Advance Request Approved - CADV-${ca6Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 6000 has been Approved by Jack Mid-Level Approver.`,
      undefined,
      { timestamp: rDate(4) }
    );
    addCaHistoryWithTimestamp(ca6Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(3));
    sendEmail(
      'u12',
      `Cash Advance Released - CADV-${ca6Id.substring(0,6)}`,
      `Your Cash Advance for PHP 6000 has been released by Carol Custodian.\n\nRelease Reference: REF-LIAM-SURVEY\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(3) }
    );

    const liq1Id = uuidv4();
    liquidations.push({
      id: liq1Id,
      cashAdvanceId: ca6Id,
      requestorId: 'u12',
      totalSpent: 0,
      varianceAmount: -6000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.DRAFT,
      createdAt: rDate(2),
    });
    addCaHistoryWithTimestamp(ca6Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u12', 'Liquidation Started', rDate(2));
    addLiqHistoryWithTimestamp(liq1Id, '', LiquidationStatus.DRAFT, 'u12', 'Draft Liquidation started', rDate(2));

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
      releaseReference: 'REF-ALICE-MAXS',
      createdAt: rDate(7),
    };
    cashAdvances.push(ca7);
    addCaHistoryWithTimestamp(ca7Id, '', CashAdvanceStatus.DRAFT, 'u1', 'Draft created', rDate(7));
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u1', 'Submitted for Approval', rDate(6));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca7Id.substring(0,6)}`,
      `A Cash Advance request for PHP 5000 has been submitted by Alice Requestor for your approval.\n\nPurpose: Max's Group Lunch`,
      undefined,
      { timestamp: rDate(6) }
    );
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u2', 'Approved', rDate(5));
    sendEmail(
      'u1',
      `Cash Advance Request Approved - CADV-${ca7Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 5000 has been Approved by Bob Approver.`,
      undefined,
      { timestamp: rDate(5) }
    );
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(4));
    sendEmail(
      'u1',
      `Cash Advance Released - CADV-${ca7Id.substring(0,6)}`,
      `Your Cash Advance for PHP 5000 has been released by Carol Custodian.\n\nRelease Reference: REF-ALICE-MAXS\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(4) }
    );

    const liq2Id = uuidv4();
    liquidations.push({
      id: liq2Id,
      cashAdvanceId: ca7Id,
      requestorId: 'u1',
      totalSpent: 5000.00,
      varianceAmount: 0.00,
      varianceType: LiquidationVarianceType.SETTLED,
      status: LiquidationStatus.SUBMITTED,
      createdAt: rDate(3),
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
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u1', 'Liquidation Started', rDate(3));
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u1', 'Liquidation Submitted', rDate(3));
    addLiqHistoryWithTimestamp(liq2Id, '', LiquidationStatus.DRAFT, 'u1', 'Draft Liquidation started', rDate(3));
    addLiqHistoryWithTimestamp(liq2Id, LiquidationStatus.DRAFT, LiquidationStatus.SUBMITTED, 'u1', 'Liquidation submitted for review', rDate(3));
    sendEmail(
      'u2',
      `Liquidation Submitted - LIQ-${liq2Id.substring(0,6)}`,
      `A Liquidation report has been submitted by Alice Requestor for Cash Advance CADV-${ca7Id.substring(0,6)}.\n\nTotal Spent: PHP 5000\nVariance: PHP 0 (SETTLED)`,
      undefined,
      { timestamp: rDate(3) }
    );

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
      releaseReference: 'REF-EVE-CEBU',
      createdAt: rDate(9),
    };
    cashAdvances.push(ca8);
    addCaHistoryWithTimestamp(ca8Id, '', CashAdvanceStatus.DRAFT, 'u5', 'Draft created', rDate(9));
    addCaHistoryWithTimestamp(ca8Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u5', 'Submitted for Approval', rDate(8));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca8Id.substring(0,6)}`,
      `A Cash Advance request for PHP 8000 has been submitted by Eve Requestor for your approval.\n\nPurpose: Cebu Client Visit`,
      undefined,
      { timestamp: rDate(8) }
    );
    addCaHistoryWithTimestamp(ca8Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u2', 'Approved', rDate(7));
    sendEmail(
      'u5',
      `Cash Advance Request Approved - CADV-${ca8Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 8000 has been Approved by Bob Approver.`,
      undefined,
      { timestamp: rDate(7) }
    );
    addCaHistoryWithTimestamp(ca8Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(6));
    sendEmail(
      'u5',
      `Cash Advance Released - CADV-${ca8Id.substring(0,6)}`,
      `Your Cash Advance for PHP 8000 has been released by Carol Custodian.\n\nRelease Reference: REF-EVE-CEBU\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(6) }
    );

    const liq3Id = uuidv4();
    liquidations.push({
      id: liq3Id,
      cashAdvanceId: ca8Id,
      requestorId: 'u5',
      totalSpent: 6000.00,
      varianceAmount: -2000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.RETURNED_FOR_REVISION,
      createdAt: rDate(5),
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
    addCaHistoryWithTimestamp(ca8Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u5', 'Liquidation Started', rDate(5));
    addCaHistoryWithTimestamp(ca8Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u5', 'Liquidation Submitted', rDate(4));
    addCaHistoryWithTimestamp(ca8Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u2', 'Liquidation Returned for Revision: Please attach official receipts instead of booking screenshots', rDate(3));
    
    addLiqHistoryWithTimestamp(liq3Id, '', LiquidationStatus.DRAFT, 'u5', 'Draft Liquidation started', rDate(5));
    addLiqHistoryWithTimestamp(liq3Id, LiquidationStatus.DRAFT, LiquidationStatus.SUBMITTED, 'u5', 'Liquidation submitted for review', rDate(4));
    sendEmail(
      'u2',
      `Liquidation Submitted - LIQ-${liq3Id.substring(0,6)}`,
      `A Liquidation report has been submitted by Eve Requestor for Cash Advance CADV-${ca8Id.substring(0,6)}.\n\nTotal Spent: PHP 6000\nVariance: PHP -2000 (REFUND_DUE)`,
      undefined,
      { timestamp: rDate(4) }
    );
    addLiqHistoryWithTimestamp(liq3Id, LiquidationStatus.SUBMITTED, LiquidationStatus.RETURNED_FOR_REVISION, 'u2', 'Returned: Please attach official receipts instead of booking screenshots', rDate(3));
    sendEmail(
      'u5',
      `Liquidation Returned - LIQ-${liq3Id.substring(0,6)}`,
      `Your Liquidation report has been returned for revision by Bob Approver.\n\nReason: Returned: Please attach official receipts instead of booking screenshots`,
      undefined,
      { timestamp: rDate(3) }
    );

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
      releaseReference: 'REF-FRANK-BGC',
      createdAt: rDate(11),
    };
    cashAdvances.push(ca9);
    addCaHistoryWithTimestamp(ca9Id, '', CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(8));

    const liq4Id = uuidv4();
    liquidations.push({
      id: liq4Id,
      cashAdvanceId: ca9Id,
      requestorId: 'u6',
      totalSpent: 7000.00,
      varianceAmount: -3000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.REVIEWED,
      createdAt: rDate(7),
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
    addCaHistoryWithTimestamp(ca9Id, '', CashAdvanceStatus.DRAFT, 'u6', 'Draft created', rDate(11));
    addCaHistoryWithTimestamp(ca9Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u6', 'Submitted for Approval', rDate(10));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca9Id.substring(0,6)}`,
      `A Cash Advance request for PHP 10000 has been submitted by Frank Requestor for your approval.\n\nPurpose: BGC Accounts`,
      undefined,
      { timestamp: rDate(10) }
    );
    addCaHistoryWithTimestamp(ca9Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u2', 'Approved', rDate(9));
    sendEmail(
      'u6',
      `Cash Advance Request Approved - CADV-${ca9Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 10000 has been Approved by Bob Approver.`,
      undefined,
      { timestamp: rDate(9) }
    );
    addCaHistoryWithTimestamp(ca9Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(8));
    sendEmail(
      'u6',
      `Cash Advance Released - CADV-${ca9Id.substring(0,6)}`,
      `Your Cash Advance for PHP 10000 has been released by Carol Custodian.\n\nRelease Reference: REF-FRANK-BGC\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(8) }
    );
    addCaHistoryWithTimestamp(ca9Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u6', 'Liquidation Started', rDate(7));
    addCaHistoryWithTimestamp(ca9Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u6', 'Liquidation Submitted', rDate(6));
    addCaHistoryWithTimestamp(ca9Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u2', 'Liquidation Reviewed (Pending Refund)', rDate(5));

    addLiqHistoryWithTimestamp(liq4Id, '', LiquidationStatus.DRAFT, 'u6', 'Draft Liquidation started', rDate(7));
    addLiqHistoryWithTimestamp(liq4Id, LiquidationStatus.DRAFT, LiquidationStatus.SUBMITTED, 'u6', 'Liquidation submitted for review', rDate(6));
    sendEmail(
      'u2',
      `Liquidation Submitted - LIQ-${liq4Id.substring(0,6)}`,
      `A Liquidation report has been submitted by Frank Requestor for Cash Advance CADV-${ca9Id.substring(0,6)}.\n\nTotal Spent: PHP 7000\nVariance: PHP -3000 (REFUND_DUE)`,
      undefined,
      { timestamp: rDate(6) }
    );
    addLiqHistoryWithTimestamp(liq4Id, LiquidationStatus.SUBMITTED, LiquidationStatus.REVIEWED, 'u2', 'Approved and Reviewed. Pending refund of PHP 3,000', rDate(5));
    sendEmail(
      'u6',
      `Liquidation Reviewed & Approved - LIQ-${liq4Id.substring(0,6)}`,
      `Your Liquidation has been approved and is awaiting Custodian refund collection of PHP 3000.`,
      undefined,
      { timestamp: rDate(5) }
    );

    // Closed (Refund Collected) Liquidation - REFUND_DUE (Spent PHP 3,000 of PHP 4,000)
    const ca10Id = uuidv4();
    const ca10 = {
      id: ca10Id,
      requestorId: 'u1',
      amount: 4000.00,
      purpose: 'Client Sync Taguig',
      approverId: 'u2',
      status: CashAdvanceStatus.LIQUIDATED,
      createdAt: rDate(13),
    };
    cashAdvances.push(ca10);

    const liq5Id = uuidv4();
    liquidations.push({
      id: liq5Id,
      cashAdvanceId: ca10Id,
      requestorId: 'u1',
      totalSpent: 3000.00,
      varianceAmount: -1000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.CLOSED,
      createdAt: rDate(9),
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

    addCaHistoryWithTimestamp(ca10Id, '', CashAdvanceStatus.DRAFT, 'u1', 'Draft created', rDate(13));
    addCaHistoryWithTimestamp(ca10Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u1', 'Submitted for Approval', rDate(12));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca10Id.substring(0,6)}`,
      `A Cash Advance request for PHP 4000 has been submitted by Alice Requestor for your approval.\n\nPurpose: Client Sync Taguig`,
      undefined,
      { timestamp: rDate(12) }
    );
    addCaHistoryWithTimestamp(ca10Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u2', 'Approved', rDate(11));
    sendEmail(
      'u1',
      `Cash Advance Request Approved - CADV-${ca10Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 4000 has been Approved by Bob Approver.`,
      undefined,
      { timestamp: rDate(11) }
    );
    addCaHistoryWithTimestamp(ca10Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(10));
    sendEmail(
      'u1',
      `Cash Advance Released - CADV-${ca10Id.substring(0,6)}`,
      `Your Cash Advance for PHP 4000 has been released by Carol Custodian.\n\nRelease Reference: REF-ALICE-SYNC\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(10) }
    );
    addCaHistoryWithTimestamp(ca10Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u1', 'Liquidation Started', rDate(9));
    addCaHistoryWithTimestamp(ca10Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u1', 'Liquidation Submitted', rDate(8));
    addCaHistoryWithTimestamp(ca10Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u2', 'Liquidation Reviewed (Pending Refund)', rDate(7));
    addCaHistoryWithTimestamp(ca10Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.LIQUIDATED, 'u3', 'Closed (Refund Collected)', rDate(6));

    addLiqHistoryWithTimestamp(liq5Id, '', LiquidationStatus.DRAFT, 'u1', 'Draft Liquidation started', rDate(9));
    addLiqHistoryWithTimestamp(liq5Id, LiquidationStatus.DRAFT, LiquidationStatus.SUBMITTED, 'u1', 'Liquidation submitted for review', rDate(8));
    sendEmail(
      'u2',
      `Liquidation Submitted - LIQ-${liq5Id.substring(0,6)}`,
      `A Liquidation report has been submitted by Alice Requestor for Cash Advance CADV-${ca10Id.substring(0,6)}.\n\nTotal Spent: PHP 3000\nVariance: PHP -1000 (REFUND_DUE)`,
      undefined,
      { timestamp: rDate(8) }
    );
    addLiqHistoryWithTimestamp(liq5Id, LiquidationStatus.SUBMITTED, LiquidationStatus.REVIEWED, 'u2', 'Approved and Reviewed. Pending refund of PHP 1,000', rDate(7));
    sendEmail(
      'u1',
      `Liquidation Reviewed & Approved - LIQ-${liq5Id.substring(0,6)}`,
      `Your Liquidation has been approved and is awaiting Custodian refund collection of PHP 1000.`,
      undefined,
      { timestamp: rDate(7) }
    );
    addLiqHistoryWithTimestamp(liq5Id, LiquidationStatus.REVIEWED, LiquidationStatus.CLOSED, 'u3', 'Closed (Refund Collected). Note: Cash returned to Carol', rDate(6));
    sendEmail(
      'u1',
      `Liquidation Closed (Refund Collected) - LIQ-${liq5Id.substring(0,6)}`,
      `Your Liquidation has been marked as Closed. Custodian Carol Custodian has verified collection of your refund of PHP 1000.`,
      undefined,
      { timestamp: rDate(6) }
    );

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
      status: CashAdvanceStatus.LIQUIDATED,
      createdAt: rDate(10),
    };
    cashAdvances.push(ca11);

    const liq6Id = uuidv4();
    liquidations.push({
      id: liq6Id,
      cashAdvanceId: ca11Id,
      requestorId: 'u1',
      totalSpent: 6200.00,
      varianceAmount: 1200.00,
      varianceType: LiquidationVarianceType.REIMBURSEMENT_DUE,
      status: LiquidationStatus.CLOSED,
      createdAt: rDate(7),
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

    addCaHistoryWithTimestamp(ca11Id, '', CashAdvanceStatus.DRAFT, 'u1', 'Draft created', rDate(10));
    addCaHistoryWithTimestamp(ca11Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u1', 'Submitted for Approval', rDate(9));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca11Id.substring(0,6)}`,
      `A Cash Advance request for PHP 5000 has been submitted by Alice Requestor for your approval.\n\nPurpose: SM Prime Partnership`,
      undefined,
      { timestamp: rDate(9) }
    );
    addCaHistoryWithTimestamp(ca11Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u2', 'Approved', rDate(8));
    sendEmail(
      'u1',
      `Cash Advance Request Approved - CADV-${ca11Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 5000 has been Approved by Bob Approver.`,
      undefined,
      { timestamp: rDate(8) }
    );
    addCaHistoryWithTimestamp(ca11Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(7));
    sendEmail(
      'u1',
      `Cash Advance Released - CADV-${ca11Id.substring(0,6)}`,
      `Your Cash Advance for PHP 5000 has been released by Carol Custodian.\n\nRelease Reference: REF-ALICE-SMPRIME\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(7) }
    );
    addCaHistoryWithTimestamp(ca11Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u1', 'Liquidation Started', rDate(7));
    addCaHistoryWithTimestamp(ca11Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u1', 'Liquidation Submitted', rDate(6));
    addCaHistoryWithTimestamp(ca11Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.LIQUIDATED, 'u3', 'Closed (Shortfall Reimbursement Payout Queued)', rDate(5));

    addLiqHistoryWithTimestamp(liq6Id, '', LiquidationStatus.DRAFT, 'u1', 'Draft Liquidation started', rDate(7));
    addLiqHistoryWithTimestamp(liq6Id, LiquidationStatus.DRAFT, LiquidationStatus.SUBMITTED, 'u1', 'Liquidation submitted for review', rDate(6));
    sendEmail(
      'u2',
      `Liquidation Submitted - LIQ-${liq6Id.substring(0,6)}`,
      `A Liquidation report has been submitted by Alice Requestor for Cash Advance CADV-${ca11Id.substring(0,6)}.\n\nTotal Spent: PHP 6200\nVariance: PHP 1200 (REIMBURSEMENT_DUE)`,
      undefined,
      { timestamp: rDate(6) }
    );
    addLiqHistoryWithTimestamp(liq6Id, LiquidationStatus.SUBMITTED, LiquidationStatus.CLOSED, 'u2', 'Approved & Closed. Shortfall reimbursement claim created.', rDate(5));

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

    // Shortfall Claim has claim number: shortfallClaimNo
    sendEmail(
      'u1',
      `Liquidation Approved & Reimbursement Payout Queued - LIQ-${liq6Id.substring(0,6)}`,
      `Your Liquidation has been approved. A shortfall reimbursement claim ${shortfallClaimNo} for PHP 1200 has been automatically created and routed directly to the Custodian's disbursement preparation queue.`,
      undefined,
      { timestamp: rDate(5) }
    );

    // --- Additional seeds for other departments ---
    const mkMomAndClaim = (reqId: string, appId: string, category: string, amt: number, status: ClaimStatus, daysAgo: number) => {
      const momId = uuidv4();
      const mom = {
        id: momId,
        requestor_id: reqId,
        client: 'Internal / Partner',
        client_name: 'Internal / Partner',
        contact_person: 'Partner Contact',
        meeting_date: rDate(daysAgo),
        minutes_source: MinutesSource.TEMPLATE,
        meeting_type: 'In-person',
        purpose: 'Departmental sync',
        discussion: 'Regular departmental meeting.',
        action_items: 'None',
        status: MomStatus.COMPLETED,
        created_at: rDate(daysAgo)
      };
      getOrCreateCompany(mom.client);
      moms.push(mom);
      mkClaim({
        requestorId: reqId,
        approverId: appId,
        mom,
        status,
        category,
        amount: amt,
        createdDaysAgo: daysAgo,
        approvedDaysAgo: daysAgo > 2 ? daysAgo - 1 : undefined,
        processedDaysAgo: daysAgo > 3 ? daysAgo - 2 : undefined
      });
    };

    // Marketing (u13 -> u14)
    mkMomAndClaim('u13', 'u14', 'Marketing Materials', 15000, ClaimStatus.COMPLETED, 15);
    mkMomAndClaim('u13', 'u14', 'Event Hosting', 25000, ClaimStatus.PENDING_APPROVAL, 2);
    
    // Engineering (u15 -> u16)
    mkMomAndClaim('u15', 'u16', 'Software Licenses', 8500, ClaimStatus.PROCESSING, 5);
    mkMomAndClaim('u15', 'u16', 'Cloud Hosting', 12000, ClaimStatus.COMPLETED, 20);
    mkMomAndClaim('u15', 'u16', 'Team Lunch', 4500, ClaimStatus.REJECTED, 3);
    
    // Operations (u17 -> u18)
    mkMomAndClaim('u17', 'u18', 'Office Supplies', 6000, ClaimStatus.READY_FOR_CLAIM, 7);
    mkMomAndClaim('u17', 'u18', 'Equipment Repair', 9500, ClaimStatus.COMPLETED, 12);
    
    const mkCa = (reqId: string, appId: string, amt: number, purpose: string, status: CashAdvanceStatus, days: number) => {
      const caId = uuidv4();
      const createdDate = rDate(days + 1);
      const ca: CashAdvance = {
        id: caId,
        requestorId: reqId,
        amount: amt,
        purpose,
        approverId: appId,
        status,
        createdAt: createdDate,
      };
      cashAdvances.push(ca);

      const reqUser = users.find(u => u.id === reqId);
      const reqName = reqUser?.name || 'Requestor';
      const appUser = users.find(u => u.id === appId);
      const appName = appUser?.name || 'Approver';

      const actionDate = rDate(days);

      // Draft
      addCaHistoryWithTimestamp(caId, '', CashAdvanceStatus.DRAFT, reqId, 'Draft created', createdDate);

      // Submitted
      if (status !== CashAdvanceStatus.DRAFT) {
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, reqId, 'Submitted for Approval', createdDate);
        
        const subSubject = `Cash Advance Request Submitted - CADV-${caId.substring(0,6)}`;
        const subBody = `A Cash Advance request for PHP ${amt} has been submitted by ${reqName} for your approval.\n\nPurpose: ${purpose}`;
        sendEmail(appId, subSubject, subBody, undefined, { timestamp: createdDate });
      }

      // Approved / Rejected / Released
      if (status === CashAdvanceStatus.APPROVED || status === CashAdvanceStatus.RELEASED) {
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, appId, 'Approved', actionDate);

        const appSubject = `Cash Advance Request Approved - CADV-${caId.substring(0,6)}`;
        const appBody = `Your Cash Advance request for PHP ${amt} has been Approved by ${appName}.`;
        sendEmail(reqId, appSubject, appBody, undefined, { timestamp: actionDate });
      } else if (status === CashAdvanceStatus.REJECTED) {
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.REJECTED, appId, 'Rejected due to policy limit', actionDate);

        const rejSubject = `Cash Advance Request Rejected - CADV-${caId.substring(0,6)}`;
        const rejBody = `Your Cash Advance request for PHP ${amt} has been Rejected by ${appName}.\n\nComment: Rejected due to policy limit`;
        sendEmail(reqId, rejSubject, rejBody, undefined, { timestamp: actionDate });
      }

      if (status === CashAdvanceStatus.RELEASED) {
        ca.releasedBy = 'u3';
        ca.releaseDate = actionDate;
        ca.releaseReference = `REF-${reqId.toUpperCase()}-${caId.substring(0,4).toUpperCase()}`;
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', actionDate);

        const relSubject = `Cash Advance Released - CADV-${caId.substring(0,6)}`;
        const relBody = `Your Cash Advance for PHP ${amt} has been released by Carol Custodian.\n\nRelease Reference: ${ca.releaseReference}\n\nPlease file your liquidation within 7 days.`;
        sendEmail(reqId, relSubject, relBody, undefined, { timestamp: actionDate });
      }
    };
    
    mkCa('u13', 'u14', 10000, 'Upcoming Expo', CashAdvanceStatus.APPROVED, 3);
    mkCa('u15', 'u16', 5000, 'Server Migration Overtime Food', CashAdvanceStatus.RELEASED, 4);
    mkCa('u17', 'u18', 20000, 'Facility Maintenance Deposit', CashAdvanceStatus.SUBMITTED, 1);

    claimCounter = seedCounter;

    res.json({ success: true });
  });

  function seedYearOfData() {
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
    companies = buildInitialCompanies();

    users.length = 0;
    users.push(...buildDefaultUsers());

    const rDate = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString();
    };

    // Seeds a delegation already in the Active state (pre-accepted), so demo
    // data doesn't require someone to manually click Accept after every
    // reset. Looked up by id, not array position - buildDefaultUsers() has
    // been reordered before and a positional index silently pointed at the
    // wrong user (Noah) the last time this drifted.
    const seedAcceptedDelegation = (approverId: string, delegateId: string, startDate: string, endDate: string) => {
      const approver = users.find(u => u.id === approverId);
      const delegate = users.find(u => u.id === delegateId);
      if (!approver || !delegate) return;
      const id = uuidv4();
      const createdAt = rDate(15);
      delegations.push({
        id,
        approver_id: approverId,
        delegate_id: delegateId,
        start_date: startDate,
        end_date: endDate,
        status: DelegationStatus.ACTIVE,
        created_by: approverId,
        created_at: createdAt,
        updated_at: createdAt
      });
      addDelegationHistory(id, '', DelegationStatus.PENDING, approverId, `Delegation requested to ${delegate.name}`);
      addDelegationHistory(id, DelegationStatus.PENDING, DelegationStatus.ACTIVE, delegateId, 'Delegation accepted');
    };

    // Bob has an active delegation to Grace (covers "today", so auto-routing is demoable live).
    const activeDelegationStart = rDate(2).split('T')[0];
    const activeDelegationEnd = rDate(-5).split('T')[0];
    seedAcceptedDelegation('u2', 'u7', activeDelegationStart, activeDelegationEnd);

    // Henry has a delegation to Bob that already ended 2 days ago - demonstrates
    // the lazy Active -> Expired transition the first time delegations are read.
    const expiredStart = rDate(10).split('T')[0];
    const expiredEnd = rDate(2).split('T')[0];
    seedAcceptedDelegation('u8', 'u2', expiredStart, expiredEnd);

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
      const actualClient = client && client.trim() !== '' ? client : 'SM Prime Holdings';
      const reqUser = users.find(u => u.id === requestorId);
      const contact = CONTACTS[idx];
      const [first, ...rest] = contact.split(' ');
      const last = rest[rest.length - 1] || first;
      const momDate = rDate(daysAgo);
      const mom: Mom = {
        id: uuidv4(),
        requestor_id: requestorId,
        client: actualClient,
        contact_person: contact,
        contact_person_email: `${first.toLowerCase()}.${last.toLowerCase()}@${actualClient.replace(/[^a-zA-Z]/g, '').toLowerCase()}.com`,
        meeting_date: momDate.split('T')[0],
        meeting_time: TIMES[idx],
        location: LOCATIONS[idx],
        purpose: PURPOSES[idx],
        discussion: DISCUSSIONS[idx](actualClient),
        agreements: AGREEMENTS[idx],
        action_items: ACTION_ITEMS[idx],
        prepared_by: reqUser?.name || 'Requestor',
        status,
        created_at: momDate,
        minutes_source: MinutesSource.TEMPLATE
      };
      getOrCreateCompany(actualClient);
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
          receipt_url: '/receipt_placeholder.png',
          or_number: 'OR-' + Math.floor(10000 + Math.random() * 90000)
        });
      });

      const decision: 'Approved' | 'Rejected' | 'Returned' | undefined = opts.decisionOverride
        || ([ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(opts.status) ? 'Approved'
          : opts.status === ClaimStatus.REJECTED ? 'Rejected'
          : opts.status === ClaimStatus.RETURNED ? 'Returned'
          : undefined);

      const approvedAt = opts.approvedDaysAgo !== undefined ? rDate(opts.approvedDaysAgo) : createdAt;

      let currentApproverId = opts.approverId;
      const activeDelegationAtCreation = getActiveDelegation(opts.approverId, new Date(createdAt));
      if (activeDelegationAtCreation) {
        currentApproverId = activeDelegationAtCreation.delegate_id;
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
          timestamp: approvedAt
        });
      }

      const isReleaseStage = [ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(opts.status);
      const processedAt = opts.processedDaysAgo !== undefined ? rDate(opts.processedDaysAgo) : approvedAt;
      const updatedAt = isReleaseStage ? processedAt : (decision ? approvedAt : createdAt);

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
        processing_date: isReleaseStage ? processedAt : undefined,
        approved_at: decision === 'Approved' ? approvedAt : undefined,
        created_at: createdAt,
        updated_at: updatedAt
      };

      claims.push(claim);

      const requestor = users.find(u => u.id === opts.requestorId);
      const approver = users.find(u => u.id === currentApproverId);
      const requestorName = requestor?.name || 'Requestor';
      const approverName = approver?.name || 'Approver';

      const comment = opts.approvalComment || (
        decision === 'Approved' ? 'Approved. Valid receipt attached and MOM summary completed.'
        : decision === 'Rejected' ? 'Rejected: Out-of-policy amount exceeded without pre-approval.'
        : 'Returned for Revision: Please upload a clearer receipt image showing the tax breakdown.'
      );

      // Status history chain
      statusHistories.push({
        id: uuidv4(),
        claim_id: claimId,
        old_status: '',
        new_status: ClaimStatus.DRAFT,
        changed_by: opts.requestorId,
        timestamp: createdAt
      });

      statusHistories.push({
        id: uuidv4(),
        claim_id: claimId,
        old_status: ClaimStatus.DRAFT,
        new_status: ClaimStatus.PENDING_APPROVAL,
        changed_by: opts.requestorId,
        timestamp: createdAt
      });

      // Submit Email
      sendEmail(
        currentApproverId,
        `Reimbursement Claim Submitted - ${claimNumber}`,
        `A reimbursement claim for PHP ${opts.amount} has been submitted by ${requestorName} for your approval.\n\nDescription: Reimbursement for sales meeting with ${opts.mom.client} team.`,
        undefined,
        { timestamp: createdAt }
      );

      if (opts.status !== ClaimStatus.PENDING_APPROVAL) {
        if (opts.status === ClaimStatus.RETURNED) {
          statusHistories.push({
            id: uuidv4(),
            claim_id: claimId,
            old_status: ClaimStatus.PENDING_APPROVAL,
            new_status: ClaimStatus.RETURNED,
            changed_by: currentApproverId,
            reason: comment,
            timestamp: approvedAt
          });
          sendEmail(
            opts.requestorId,
            `Reimbursement Claim Returned - ${claimNumber}`,
            `Your reimbursement claim has been returned by ${approverName} for revision.\n\nComment: ${comment}`,
            undefined,
            { timestamp: approvedAt }
          );
        } else if (opts.status === ClaimStatus.REJECTED) {
          statusHistories.push({
            id: uuidv4(),
            claim_id: claimId,
            old_status: ClaimStatus.PENDING_APPROVAL,
            new_status: ClaimStatus.REJECTED,
            changed_by: currentApproverId,
            reason: comment,
            timestamp: approvedAt
          });
          sendEmail(
            opts.requestorId,
            `Reimbursement Claim Rejected - ${claimNumber}`,
            `Your reimbursement claim has been rejected by ${approverName}.\n\nComment: ${comment}`,
            undefined,
            { timestamp: approvedAt }
          );
        } else {
          // APPROVED, PROCESSING, READY_FOR_CLAIM, COMPLETED
          statusHistories.push({
            id: uuidv4(),
            claim_id: claimId,
            old_status: ClaimStatus.PENDING_APPROVAL,
            new_status: ClaimStatus.APPROVED,
            changed_by: currentApproverId,
            reason: comment,
            timestamp: approvedAt
          });
          sendEmail(
            opts.requestorId,
            `Reimbursement Claim Approved - ${claimNumber}`,
            `Your reimbursement claim of PHP ${opts.amount} has been Approved by ${approverName} and routed to Finance.`,
            undefined,
            { timestamp: approvedAt }
          );

          if (opts.status !== ClaimStatus.APPROVED) {
            statusHistories.push({
              id: uuidv4(),
              claim_id: claimId,
              old_status: ClaimStatus.APPROVED,
              new_status: ClaimStatus.PROCESSING,
              changed_by: 'u3',
              timestamp: processedAt
            });
            sendEmail(
              opts.requestorId,
              `Reimbursement Processing Initiated - ${claimNumber}`,
              `Finance has begun preparing disbursement for your approved claim of PHP ${opts.amount}.`,
              undefined,
              { timestamp: processedAt }
            );

            if (opts.status !== ClaimStatus.PROCESSING) {
              if (opts.status === ClaimStatus.READY_FOR_CLAIM) {
                statusHistories.push({
                  id: uuidv4(),
                  claim_id: claimId,
                  old_status: ClaimStatus.PROCESSING,
                  new_status: ClaimStatus.READY_FOR_CLAIM,
                  changed_by: 'u3',
                  reason: 'Disbursement prepared; release code generated.',
                  timestamp: processedAt
                });
                sendEmail(
                  opts.requestorId,
                  `Reimbursement Ready to Claim - ${claimNumber}`,
                  `Your reimbursement of PHP ${opts.amount} is ready. Please view your claim details to retrieve your release code and claim your funds.`,
                  undefined,
                  { timestamp: processedAt }
                );
              } else if (opts.status === ClaimStatus.COMPLETED) {
                statusHistories.push({
                  id: uuidv4(),
                  claim_id: claimId,
                  old_status: ClaimStatus.PROCESSING,
                  new_status: ClaimStatus.COMPLETED,
                  changed_by: 'u3',
                  reason: 'Funds successfully released to Requestor.',
                  timestamp: processedAt
                });
                sendEmail(
                  opts.requestorId,
                  `Reimbursement Completed - ${claimNumber}`,
                  `Your reimbursement of PHP ${opts.amount} has been successfully paid out via ${claim.payment_method || 'GCash'}.`,
                  undefined,
                  { timestamp: processedAt }
                );
              }
            }
          }
        }
      }

      return claim;
    };

    // Standard live-workflow seed records
    // 1. Claim 1: Draft - Alice Requestor
    const mom1 = mkMom('u1', 'Ayala Land Inc', MomStatus.COMPLETED, 3);
    const claim1Id = uuidv4();
    const claim1Number = nextClaimNumber();
    mom1.claim_id = claim1Id;
    claims.push({
      id: claim1Id,
      claim_number: claim1Number,
      requestor_id: 'u1',
      current_approver_id: 'u2',
      original_approver_id: 'u2',
      mom_id: mom1.id,
      status: ClaimStatus.DRAFT,
      total_amount: 3200.00,
      expense_category: 'Client Meals',
      receipt_url: '/receipt_placeholder.png',
      remarks: 'Dinner meeting with Ayala Land procurement team to discuss Q3 targets.',
      supporting_documents: 'Ayala_Agenda_v1.pdf',
      created_at: rDate(2),
      updated_at: rDate(2)
    });
    expenses.push({
      id: uuidv4(),
      claim_id: claim1Id,
      expense_date: mom1.meeting_date,
      vendor: 'Max Restaurant',
      category: 'Client Meals',
      amount: 3200.00,
      payment_method: 'Cash',
      business_purpose: 'Group dinner with Ayala Land procurement staff.',
      receipt_url: '/receipt_placeholder.png'
    });
    statusHistories.push({
      id: uuidv4(),
      claim_id: claim1Id,
      old_status: '',
      new_status: ClaimStatus.DRAFT,
      changed_by: 'u1',
      timestamp: rDate(2)
    });

    // 2. Claim 2: Pending Approval - Alice Requestor
    const mom2 = mkMom('u1', 'SM Prime Holdings', MomStatus.COMPLETED, 4);
    mkClaim({
      requestorId: 'u1',
      approverId: 'u2',
      mom: mom2,
      status: ClaimStatus.PENDING_APPROVAL,
      category: 'Travel',
      amount: 4500.00,
      createdDaysAgo: 3
    });

    // 3. Claim 3: Returned for Revision - Eve Requestor
    const mom3 = mkMom('u5', 'JG Summit', MomStatus.COMPLETED, 6);
    mkClaim({
      requestorId: 'u5',
      approverId: 'u2',
      mom: mom3,
      status: ClaimStatus.RETURNED,
      category: 'Accommodation',
      amount: 8500.00,
      createdDaysAgo: 5,
      approvedDaysAgo: 4
    });

    // 4. Claim 4: Approved (Routed to Finance) - Eve Requestor
    const mom4 = mkMom('u5', 'Aboitiz Equity', MomStatus.COMPLETED, 5);
    mkClaim({
      requestorId: 'u5',
      approverId: 'u2',
      mom: mom4,
      status: ClaimStatus.APPROVED,
      category: 'Transportation',
      amount: 1500.00,
      createdDaysAgo: 4,
      approvedDaysAgo: 3
    });

    // 5. Claim 5: Processing (In Finance Queue) - Frank Requestor
    const mom5 = mkMom('u6', 'San Miguel Corp', MomStatus.COMPLETED, 7);
    mkClaim({
      requestorId: 'u6',
      approverId: 'u2',
      mom: mom5,
      status: ClaimStatus.PROCESSING,
      category: 'Client Meals',
      amount: 6200.00,
      createdDaysAgo: 6,
      approvedDaysAgo: 5,
      processedDaysAgo: 4
    });

    // 6. Claim 6: Ready for Claim (Awaiting Code Entry) - Frank Requestor
    const mom6 = mkMom('u6', 'Megaworld Corp', MomStatus.COMPLETED, 8);
    mkClaim({
      requestorId: 'u6',
      approverId: 'u2',
      mom: mom6,
      status: ClaimStatus.READY_FOR_CLAIM,
      category: 'Client Meals',
      amount: 4800.00,
      createdDaysAgo: 7,
      approvedDaysAgo: 6,
      processedDaysAgo: 5,
      releaseCode: 'CLAIM99'
    });

    // 7. Claim 7: Completed (Paid Out) - Frank Requestor
    const mom7 = mkMom('u6', 'Robinsons Land', MomStatus.COMPLETED, 10);
    mkClaim({
      requestorId: 'u6',
      approverId: 'u2',
      mom: mom7,
      status: ClaimStatus.COMPLETED,
      category: 'Travel',
      amount: 12500.00,
      createdDaysAgo: 9,
      approvedDaysAgo: 8,
      processedDaysAgo: 7,
      releaseCode: 'PAID777',
      paymentMethod: 'Bank Transfer'
    });

    // 8. Claim 8: Rejected - Alice Requestor
    const mom8 = mkMom('u1', 'BDO Unibank', MomStatus.COMPLETED, 12);
    mkClaim({
      requestorId: 'u1',
      approverId: 'u2',
      mom: mom8,
      status: ClaimStatus.REJECTED,
      category: 'Entertainment',
      amount: 25000.00,
      createdDaysAgo: 11,
      approvedDaysAgo: 10
    });

    // Standalone MOMs
    mkMom('u1', 'Ayala Land Inc', MomStatus.DRAFT, 2);
    mkMom('u5', 'Metrobank', MomStatus.COMPLETED, 1);

    // Cash Advance & Liquidation Seed Records helpers
    const addCaHistoryWithTimestamp = (caId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string, timestamp?: string) => {
      statusHistories.push({
        id: uuidv4(),
        claim_id: '',
        cash_advance_id: caId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
        reason,
        timestamp: timestamp || new Date().toISOString()
      });
    };

    const addLiqHistoryWithTimestamp = (liqId: string, oldStatus: string, newStatus: string, changedBy: string, reason?: string, timestamp?: string) => {
      statusHistories.push({
        id: uuidv4(),
        claim_id: '',
        liquidation_id: liqId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
        reason,
        timestamp: timestamp || new Date().toISOString()
      });
    };

    // 1. Standalone Cash Advances
    const ca1Id = uuidv4();
    cashAdvances.push({
      id: ca1Id,
      requestorId: 'u1',
      amount: 3500.00,
      purpose: 'Client Lunch - Rockwell',
      approverId: 'u2',
      status: CashAdvanceStatus.DRAFT,
      createdAt: rDate(1),
    });
    addCaHistoryWithTimestamp(ca1Id, '', CashAdvanceStatus.DRAFT, 'u1', 'Draft created', rDate(1));

    const ca2Id = uuidv4();
    cashAdvances.push({
      id: ca2Id,
      requestorId: 'u5',
      amount: 5000.00,
      purpose: 'Travel to Cebu',
      approverId: 'u2',
      status: CashAdvanceStatus.SUBMITTED,
      createdAt: rDate(3),
    });
    addCaHistoryWithTimestamp(ca2Id, '', CashAdvanceStatus.DRAFT, 'u5', 'Draft created', rDate(3));
    addCaHistoryWithTimestamp(ca2Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u5', 'Submitted for Approval', rDate(2));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca2Id.substring(0,6)}`,
      `A Cash Advance request for PHP 5000 has been submitted by Eve Requestor for your approval.\n\nPurpose: Travel to Cebu`,
      undefined,
      { timestamp: rDate(2) }
    );

    const ca3Id = uuidv4();
    cashAdvances.push({
      id: ca3Id,
      requestorId: 'u6',
      amount: 7500.00,
      purpose: 'Client Entertainment - BGC',
      approverId: 'u2',
      status: CashAdvanceStatus.APPROVED,
      createdAt: rDate(4),
    });
    addCaHistoryWithTimestamp(ca3Id, '', CashAdvanceStatus.DRAFT, 'u6', 'Draft created', rDate(4));
    addCaHistoryWithTimestamp(ca3Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u6', 'Submitted for Approval', rDate(3));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca3Id.substring(0,6)}`,
      `A Cash Advance request for PHP 7500 has been submitted by Frank Requestor for your approval.\n\nPurpose: Client Entertainment - BGC`,
      undefined,
      { timestamp: rDate(3) }
    );
    addCaHistoryWithTimestamp(ca3Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u2', 'Approved', rDate(2));
    sendEmail(
      'u6',
      `Cash Advance Request Approved - CADV-${ca3Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 7500 has been Approved by Bob Approver.`,
      undefined,
      { timestamp: rDate(2) }
    );

    const ca4Id = uuidv4();
    cashAdvances.push({
      id: ca4Id,
      requestorId: 'u11',
      amount: 12000.00,
      purpose: 'Team Building Advance',
      approverId: 'u10',
      status: CashAdvanceStatus.REJECTED,
      createdAt: rDate(5),
    });
    addCaHistoryWithTimestamp(ca4Id, '', CashAdvanceStatus.DRAFT, 'u11', 'Draft created', rDate(5));
    addCaHistoryWithTimestamp(ca4Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u11', 'Submitted for Approval', rDate(4));
    sendEmail(
      'u10',
      `Cash Advance Request Submitted - CADV-${ca4Id.substring(0,6)}`,
      `A Cash Advance request for PHP 12000 has been submitted by Kyle Requestor for your approval.\n\nPurpose: Team Building Advance`,
      undefined,
      { timestamp: rDate(4) }
    );
    addCaHistoryWithTimestamp(ca4Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.REJECTED, 'u10', 'Rejected due to budget constraints', rDate(3));
    sendEmail(
      'u11',
      `Cash Advance Request Rejected - CADV-${ca4Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 12000 has been Rejected by Jack Mid-Level Approver.\n\nComment: Rejected due to budget constraints`,
      undefined,
      { timestamp: rDate(3) }
    );

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
      releaseReference: 'REF-LIAM-CA',
      createdAt: rDate(5),
    });
    addCaHistoryWithTimestamp(ca5Id, '', CashAdvanceStatus.DRAFT, 'u12', 'Draft created', rDate(5));
    addCaHistoryWithTimestamp(ca5Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u12', 'Submitted for Approval', rDate(4));
    sendEmail(
      'u10',
      `Cash Advance Request Submitted - CADV-${ca5Id.substring(0,6)}`,
      `A Cash Advance request for PHP 6000 has been submitted by Liam Requestor for your approval.\n\nPurpose: Field surveys`,
      undefined,
      { timestamp: rDate(4) }
    );
    addCaHistoryWithTimestamp(ca5Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u10', 'Approved', rDate(3));
    sendEmail(
      'u12',
      `Cash Advance Request Approved - CADV-${ca5Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 6000 has been Approved by Jack Mid-Level Approver.`,
      undefined,
      { timestamp: rDate(3) }
    );
    addCaHistoryWithTimestamp(ca5Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(2));
    sendEmail(
      'u12',
      `Cash Advance Released - CADV-${ca5Id.substring(0,6)}`,
      `Your Cash Advance for PHP 6000 has been released by Carol Custodian.\n\nRelease Reference: REF-LIAM-CA\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(2) }
    );

    // 2. Cash Advances with Liquidations in different stages
    const ca6Id = uuidv4();
    cashAdvances.push({
      id: ca6Id,
      requestorId: 'u12',
      amount: 6000.00,
      purpose: 'Field survey Liam',
      approverId: 'u10',
      status: CashAdvanceStatus.RELEASED,
      releasedBy: 'u3',
      releaseDate: rDate(3),
      releaseReference: 'REF-LIAM-SURVEY',
      createdAt: rDate(6),
    });
    addCaHistoryWithTimestamp(ca6Id, '', CashAdvanceStatus.DRAFT, 'u12', 'Draft created', rDate(6));
    addCaHistoryWithTimestamp(ca6Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u12', 'Submitted for Approval', rDate(5));
    sendEmail(
      'u10',
      `Cash Advance Request Submitted - CADV-${ca6Id.substring(0,6)}`,
      `A Cash Advance request for PHP 6000 has been submitted by Liam Requestor for your approval.\n\nPurpose: Field survey Liam`,
      undefined,
      { timestamp: rDate(5) }
    );
    addCaHistoryWithTimestamp(ca6Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u10', 'Approved', rDate(4));
    sendEmail(
      'u12',
      `Cash Advance Request Approved - CADV-${ca6Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 6000 has been Approved by Jack Mid-Level Approver.`,
      undefined,
      { timestamp: rDate(4) }
    );
    addCaHistoryWithTimestamp(ca6Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(3));
    sendEmail(
      'u12',
      `Cash Advance Released - CADV-${ca6Id.substring(0,6)}`,
      `Your Cash Advance for PHP 6000 has been released by Carol Custodian.\n\nRelease Reference: REF-LIAM-SURVEY\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(3) }
    );

    const liq1Id = uuidv4();
    liquidations.push({
      id: liq1Id,
      cashAdvanceId: ca6Id,
      requestorId: 'u12',
      totalSpent: 0,
      varianceAmount: -6000.00,
      varianceType: LiquidationVarianceType.REFUND_DUE,
      status: LiquidationStatus.DRAFT,
      createdAt: rDate(2),
    });
    addCaHistoryWithTimestamp(ca6Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u12', 'Liquidation Started', rDate(2));
    addLiqHistoryWithTimestamp(liq1Id, '', LiquidationStatus.DRAFT, 'u12', 'Draft Liquidation started', rDate(2));

    // Submitted Liquidation
    const ca7Id = uuidv4();
    const ca7Mom = mkMom('u1', 'Maxs Restaurant Corp', MomStatus.COMPLETED, 4);
    cashAdvances.push({
      id: ca7Id,
      requestorId: 'u1',
      amount: 5000.00,
      purpose: "Max's Group Lunch",
      momId: ca7Mom.id,
      approverId: 'u2',
      status: CashAdvanceStatus.RELEASED,
      releasedBy: 'u3',
      releaseDate: rDate(4),
      releaseReference: 'REF-ALICE-MAXS',
      createdAt: rDate(7),
    });
    addCaHistoryWithTimestamp(ca7Id, '', CashAdvanceStatus.DRAFT, 'u1', 'Draft created', rDate(7));
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, 'u1', 'Submitted for Approval', rDate(6));
    sendEmail(
      'u2',
      `Cash Advance Request Submitted - CADV-${ca7Id.substring(0,6)}`,
      `A Cash Advance request for PHP 5000 has been submitted by Alice Requestor for your approval.\n\nPurpose: Max's Group Lunch`,
      undefined,
      { timestamp: rDate(6) }
    );
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, 'u2', 'Approved', rDate(5));
    sendEmail(
      'u1',
      `Cash Advance Request Approved - CADV-${ca7Id.substring(0,6)}`,
      `Your Cash Advance request for PHP 5000 has been Approved by Bob Approver.`,
      undefined,
      { timestamp: rDate(5) }
    );
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', rDate(4));
    sendEmail(
      'u1',
      `Cash Advance Released - CADV-${ca7Id.substring(0,6)}`,
      `Your Cash Advance for PHP 5000 has been released by Carol Custodian.\n\nRelease Reference: REF-ALICE-MAXS\n\nPlease file your liquidation within 7 days.`,
      undefined,
      { timestamp: rDate(4) }
    );

    const liq2Id = uuidv4();
    liquidations.push({
      id: liq2Id,
      cashAdvanceId: ca7Id,
      requestorId: 'u1',
      totalSpent: 5000.00,
      varianceAmount: 0.00,
      varianceType: LiquidationVarianceType.SETTLED,
      status: LiquidationStatus.SUBMITTED,
      createdAt: rDate(3),
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
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u1', 'Liquidation Started', rDate(3));
    addCaHistoryWithTimestamp(ca7Id, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, 'u1', 'Liquidation Submitted', rDate(3));
    addLiqHistoryWithTimestamp(liq2Id, '', LiquidationStatus.DRAFT, 'u1', 'Draft Liquidation started', rDate(3));
    addLiqHistoryWithTimestamp(liq2Id, LiquidationStatus.DRAFT, LiquidationStatus.SUBMITTED, 'u1', 'Liquidation submitted for review', rDate(3));
    sendEmail(
      'u2',
      `Liquidation Submitted - LIQ-${liq2Id.substring(0,6)}`,
      `A Liquidation report has been submitted by Alice Requestor for Cash Advance CADV-${ca7Id.substring(0,6)}.\n\nTotal Spent: PHP 5000\nVariance: PHP 0 (SETTLED)`,
      undefined,
      { timestamp: rDate(3) }
    );

    // --- Additional seeds for other departments ---
    const mkMomAndClaim = (reqId: string, appId: string, category: string, amt: number, status: ClaimStatus, daysAgo: number) => {
      const momId = uuidv4();
      const mom = {
        id: momId,
        requestor_id: reqId,
        client: 'Internal / Partner',
        client_name: 'Internal / Partner',
        contact_person: 'Partner Contact',
        meeting_date: rDate(daysAgo),
        minutes_source: MinutesSource.TEMPLATE,
        meeting_type: 'In-person',
        purpose: 'Departmental sync',
        discussion: 'Regular departmental meeting.',
        action_items: 'None',
        status: MomStatus.COMPLETED,
        created_at: rDate(daysAgo)
      };
      getOrCreateCompany(mom.client);
      moms.push(mom);
      mkClaim({
        requestorId: reqId,
        approverId: appId,
        mom,
        status,
        category,
        amount: amt,
        createdDaysAgo: daysAgo,
        approvedDaysAgo: daysAgo > 2 ? daysAgo - 1 : undefined,
        processedDaysAgo: daysAgo > 3 ? daysAgo - 2 : undefined
      });
    };

    const mkCa = (reqId: string, appId: string, amt: number, purpose: string, status: CashAdvanceStatus, days: number) => {
      const caId = uuidv4();
      const createdDate = rDate(days + 1);
      const ca: CashAdvance = {
        id: caId,
        requestorId: reqId,
        amount: amt,
        purpose,
        approverId: appId,
        status,
        createdAt: createdDate,
      };
      cashAdvances.push(ca);

      const reqUser = users.find(u => u.id === reqId);
      const reqName = reqUser?.name || 'Requestor';
      const appUser = users.find(u => u.id === appId);
      const appName = appUser?.name || 'Approver';

      const actionDate = rDate(days);

      addCaHistoryWithTimestamp(caId, '', CashAdvanceStatus.DRAFT, reqId, 'Draft created', createdDate);

      if (status !== CashAdvanceStatus.DRAFT) {
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, reqId, 'Submitted for Approval', createdDate);
        
        const subSubject = `Cash Advance Request Submitted - CADV-${caId.substring(0,6)}`;
        const subBody = `A Cash Advance request for PHP ${amt} has been submitted by ${reqName} for your approval.\n\nPurpose: ${purpose}`;
        sendEmail(appId, subSubject, subBody, undefined, { timestamp: createdDate });
      }

      if (status === CashAdvanceStatus.APPROVED || status === CashAdvanceStatus.RELEASED) {
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, appId, 'Approved', actionDate);

        const appSubject = `Cash Advance Request Approved - CADV-${caId.substring(0,6)}`;
        const appBody = `Your Cash Advance request for PHP ${amt} has been Approved by ${appName}.`;
        sendEmail(reqId, appSubject, appBody, undefined, { timestamp: actionDate });
      } else if (status === CashAdvanceStatus.REJECTED) {
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.REJECTED, appId, 'Rejected due to policy limit', actionDate);

        const rejSubject = `Cash Advance Request Rejected - CADV-${caId.substring(0,6)}`;
        const rejBody = `Your Cash Advance request for PHP ${amt} has been Rejected by ${appName}.\n\nComment: Rejected due to policy limit`;
        sendEmail(reqId, rejSubject, rejBody, undefined, { timestamp: actionDate });
      }

      if (status === CashAdvanceStatus.RELEASED) {
        ca.releasedBy = 'u3';
        ca.releaseDate = actionDate;
        ca.releaseReference = `REF-${reqId.toUpperCase()}-${caId.substring(0,4).toUpperCase()}`;
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', actionDate);

        const relSubject = `Cash Advance Released - CADV-${caId.substring(0,6)}`;
        const relBody = `Your Cash Advance for PHP ${amt} has been released by Carol Custodian.\n\nRelease Reference: ${ca.releaseReference}\n\nPlease file your liquidation within 7 days.`;
        sendEmail(reqId, relSubject, relBody, undefined, { timestamp: actionDate });
      }
    };

    // Standard items
    mkMomAndClaim('u13', 'u14', 'Marketing Materials', 15000, ClaimStatus.COMPLETED, 15);
    mkMomAndClaim('u13', 'u14', 'Event Hosting', 25000, ClaimStatus.PENDING_APPROVAL, 2);
    mkMomAndClaim('u15', 'u16', 'Software Licenses', 8500, ClaimStatus.PROCESSING, 5);
    mkMomAndClaim('u15', 'u16', 'Cloud Hosting', 12000, ClaimStatus.COMPLETED, 20);
    mkMomAndClaim('u15', 'u16', 'Team Lunch', 4500, ClaimStatus.REJECTED, 3);
    mkMomAndClaim('u17', 'u18', 'Office Supplies', 6000, ClaimStatus.READY_FOR_CLAIM, 7);
    mkMomAndClaim('u17', 'u18', 'Equipment Repair', 9500, ClaimStatus.COMPLETED, 12);

    mkCa('u13', 'u14', 10000, 'Upcoming Expo', CashAdvanceStatus.APPROVED, 3);
    mkCa('u15', 'u16', 5000, 'Server Migration Overtime Food', CashAdvanceStatus.RELEASED, 4);
    mkCa('u17', 'u18', 20000, 'Facility Maintenance Deposit', CashAdvanceStatus.SUBMITTED, 1);

    // ==========================================
    // HISTORICAL BACKFILL FOR THE PAST 12 MONTHS
    // ==========================================
    const departments = [
      {
        name: 'Sales',
        requestors: ['u1', 'u5', 'u6', 'u11', 'u12'],
        approvers: ['u2', 'u7', 'u8', 'u10'],
        categories: ['Client Meals', 'Travel', 'Accommodation', 'Transportation'],
        vendors: ['Max Restaurant', 'Grab', 'Makati Diamond Residences', 'Mary Grace Cafe', 'Globe Telecom'],
        clients: ['SM Prime Holdings', 'PLDT Inc', 'Jollibee Foods Corp', 'Bank of the Philippine Islands', 'Globe Telecom', 'San Miguel Corporation', 'Meralco', 'BDO Unibank']
      },
      {
        name: 'Marketing',
        requestors: ['u13'],
        approvers: ['u14'],
        categories: ['Marketing Materials', 'Event Hosting', 'Advertising', 'Client Meals'],
        vendors: ['Print Central', 'Hotel Del Rio', 'Facebook Ads', 'Google Ads', 'Starbucks'],
        clients: ['Creative Agency', 'Partner Promo Group', 'Media Corp']
      },
      {
        name: 'Engineering',
        requestors: ['u15'],
        approvers: ['u16'],
        categories: ['Software Licenses', 'Cloud Hosting', 'Team Lunch', 'Technical Training'],
        vendors: ['Amazon Web Services', 'Microsoft Azure', 'Atlassian', 'JetBrains', 'GrabFood'],
        clients: ['Internal Operations', 'Beta Testing Corp', 'DevOps Consultants']
      },
      {
        name: 'Operations',
        requestors: ['u17'],
        approvers: ['u18'],
        categories: ['Office Supplies', 'Equipment Repair', 'Courier Services', 'Utility Bills'],
        vendors: ['National Bookstore', 'Lalamove', 'Meralco Office', 'PLDT Enterprise', 'Tech Support PH'],
        clients: ['Headquarters', 'Cebu Branch Office', 'Manila Warehouse']
      }
    ];

    const getDaysAgo = (year: number, month: number, day: number) => {
      const target = new Date(year, month - 1, day, 12, 0, 0);
      const now = new Date();
      const nowNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      const diffMs = nowNoon.getTime() - target.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    };

    const mkHistoricalCa = (
      reqId: string,
      appId: string,
      amt: number,
      purpose: string,
      status: CashAdvanceStatus,
      daysAgoCreated: number,
      isCompleted: boolean,
      category: string,
      vendor: string,
      client: string
    ) => {
      const caId = uuidv4();
      const createdDate = rDate(daysAgoCreated);
      const ca: CashAdvance = {
        id: caId,
        requestorId: reqId,
        amount: amt,
        purpose,
        approverId: appId,
        status,
        createdAt: createdDate,
      };
      cashAdvances.push(ca);

      const reqUser = users.find(u => u.id === reqId);
      const reqName = reqUser?.name || 'Requestor';
      const appUser = users.find(u => u.id === appId);
      const appName = appUser?.name || 'Approver';

      
      // Draft
      addCaHistoryWithTimestamp(caId, '', CashAdvanceStatus.DRAFT, reqId, 'Draft created', createdDate);

      // Submitted
      addCaHistoryWithTimestamp(caId, CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, reqId, 'Submitted for Approval', createdDate);
      const subSubject = `Cash Advance Request Submitted - CADV-${caId.substring(0,6)}`;
      const subBody = `A Cash Advance request for PHP ${amt} has been submitted by ${reqName} for your approval.\n\nPurpose: ${purpose}`;
      sendEmail(appId, subSubject, subBody, undefined, { timestamp: createdDate });

      const approvedDaysAgo = daysAgoCreated - (1 + Math.floor(Math.random() * 2));
      const approvedDate = rDate(approvedDaysAgo);

      if (status === CashAdvanceStatus.REJECTED) {
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.REJECTED, appId, 'Rejected due to budget constraints', approvedDate);
        const rejSubject = `Cash Advance Request Rejected - CADV-${caId.substring(0,6)}`;
        const rejBody = `Your Cash Advance request for PHP ${amt} has been Rejected by ${appName}.\n\nComment: Rejected due to budget constraints`;
        sendEmail(reqId, rejSubject, rejBody, undefined, { timestamp: approvedDate });
        return;
      }

      // Approved
      addCaHistoryWithTimestamp(caId, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED, appId, 'Approved', approvedDate);
      const appSubject = `Cash Advance Request Approved - CADV-${caId.substring(0,6)}`;
      const appBody = `Your Cash Advance request for PHP ${amt} has been Approved by ${appName}.`;
      sendEmail(reqId, appSubject, appBody, undefined, { timestamp: approvedDate });

      // Released
      const releasedDaysAgo = approvedDaysAgo - (1 + Math.floor(Math.random() * 2));
      const releasedDate = rDate(releasedDaysAgo);
      
      ca.releasedBy = 'u3';
      ca.releaseDate = releasedDate;
      ca.releaseReference = `REF-${reqId.toUpperCase()}-${caId.substring(0,4).toUpperCase()}`;
      addCaHistoryWithTimestamp(caId, CashAdvanceStatus.APPROVED, CashAdvanceStatus.RELEASED, 'u3', 'Funds released', releasedDate);

      const relSubject = `Cash Advance Released - CADV-${caId.substring(0,6)}`;
      const relBody = `Your Cash Advance for PHP ${amt} has been released by Carol Custodian.\n\nRelease Reference: ${ca.releaseReference}\n\nPlease file your liquidation within 7 days.`;
      sendEmail(reqId, relSubject, relBody, undefined, { timestamp: releasedDate });

      // Liquidation
      if (status === CashAdvanceStatus.LIQUIDATED) {
        const liqStartedDaysAgo = releasedDaysAgo - (1 + Math.floor(Math.random() * 2));
        const liqStartedDate = rDate(liqStartedDaysAgo);

        const liqSubmittedDaysAgo = liqStartedDaysAgo - (1 + Math.floor(Math.random() * 2));
        const liqSubmittedDate = rDate(liqSubmittedDaysAgo);

        const liqClosedDaysAgo = liqSubmittedDaysAgo - (1 + Math.floor(Math.random() * 2));
        const liqClosedDate = rDate(liqClosedDaysAgo);

        const liqId = uuidv4();
        const totalSpent = amt;
        
        liquidations.push({
          id: liqId,
          cashAdvanceId: caId,
          requestorId: reqId,
          totalSpent,
          varianceAmount: 0.00,
          varianceType: LiquidationVarianceType.SETTLED,
          status: LiquidationStatus.CLOSED,
      createdAt: liqStartedDate,
        });

        liquidationLineItems.push({
          id: uuidv4(),
          liquidationId: liqId,
          expense_date: liqStartedDate.split('T')[0],
          vendor,
          category,
          amount: totalSpent,
          payment_method: 'Cash',
          business_purpose: `Liquidation of CADV-${caId.substring(0, 6)}: ${purpose}`,
          receipt_url: '/receipt_placeholder.png'
        });

        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, reqId, 'Liquidation Started', liqStartedDate);
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, reqId, 'Liquidation Submitted', liqSubmittedDate);
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.RELEASED, CashAdvanceStatus.RELEASED, appId, 'Liquidation Reviewed', liqClosedDate);
        addCaHistoryWithTimestamp(caId, CashAdvanceStatus.RELEASED, CashAdvanceStatus.LIQUIDATED, 'u3', 'Closed (Refund Collected)', liqClosedDate);

        addLiqHistoryWithTimestamp(liqId, '', LiquidationStatus.DRAFT, reqId, 'Draft Liquidation started', liqStartedDate);
        addLiqHistoryWithTimestamp(liqId, LiquidationStatus.DRAFT, LiquidationStatus.SUBMITTED, reqId, 'Liquidation submitted for review', liqSubmittedDate);
        
        const liqSubSubject = `Liquidation Submitted - LIQ-${liqId.substring(0,6)}`;
        const liqSubBody = `A Liquidation report has been submitted by ${reqName} for Cash Advance CADV-${caId.substring(0,6)}.\n\nTotal Spent: PHP ${totalSpent}\nVariance: PHP 0 (SETTLED)`;
        sendEmail(appId, liqSubSubject, liqSubBody, undefined, { timestamp: liqSubmittedDate });

        addLiqHistoryWithTimestamp(liqId, LiquidationStatus.SUBMITTED, LiquidationStatus.CLOSED, appId, 'Approved and Closed.', liqClosedDate);
        
        const liqCloSubject = `Liquidation Closed (Refund Collected) - LIQ-${liqId.substring(0,6)}`;
        const liqCloBody = `Your Liquidation has been marked as Closed. Custodian Carol Custodian has verified collection of your refund.`;
        sendEmail(reqId, liqCloSubject, liqCloBody, undefined, { timestamp: liqClosedDate });
      }
    };

    const now = new Date();
    const deptStates = departments.map(d => ({
      ...d,
      reqIdx: 0,
      appIdx: 0,
      totalItems: 0
    }));

    for (let monthOffset = 12; monthOffset >= 1; monthOffset--) {
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
      const year = targetMonthDate.getFullYear();
      const month = targetMonthDate.getMonth() + 1;

      for (const ds of deptStates) {
        const count = 8 + Math.floor(Math.random() * 4); // 8, 9, 10, or 11
        for (let i = 0; i < count; i++) {
          const createdDay = 1 + Math.floor(Math.random() * 28);
          const daysAgoCreated = getDaysAgo(year, month, createdDay);

          if (daysAgoCreated <= 20) {
            continue;
          }

          ds.totalItems++;

          // Deterministically assign 1 out of 7 items to Approver (approx 14.3%)
          const isApproverSubmitter = (ds.totalItems % 7 === 0);

          // Deterministically make every 4th item a Cash Advance, otherwise Claim (75% Claim, 25% CADV)
          const isClaim = (ds.totalItems % 4 !== 0);
          
          const isCompleted = Math.random() < 0.85;

          let reqId: string;
          let appId: string;

          if (isApproverSubmitter) {
            reqId = ds.approvers[ds.appIdx % ds.approvers.length];
            ds.appIdx++;

            const reqUser = users.find(u => u.id === reqId);
            appId = reqUser?.reports_to || 'u19';
          } else {
            reqId = ds.requestors[ds.reqIdx % ds.requestors.length];
            ds.reqIdx++;

            const reqUser = users.find(u => u.id === reqId);
            appId = reqUser?.reports_to || ds.approvers[0];
          }

          const category = ds.categories[Math.floor(Math.random() * ds.categories.length)];
          const vendor = ds.vendors[Math.floor(Math.random() * ds.vendors.length)];
          const client = ds.clients[Math.floor(Math.random() * ds.clients.length)];

          let amount = 1000 + Math.floor(Math.random() * 15000);
          if (category.includes('Hosting') || category.includes('Materials') || category.includes('Repair')) {
            amount += 10000 + Math.floor(Math.random() * 20000);
          }

          if (isClaim) {
            const momDaysAgo = daysAgoCreated + 1;
            const mom = mkMom(reqId, client, MomStatus.COMPLETED, momDaysAgo);

            const approvedDaysAgo = daysAgoCreated - (1 + Math.floor(Math.random() * 2));
            const processedDaysAgo = approvedDaysAgo - (1 + Math.floor(Math.random() * 2));
            const status = isCompleted ? ClaimStatus.COMPLETED : ClaimStatus.REJECTED;

            mkClaim({
              requestorId: reqId,
              approverId: appId,
              mom,
              status,
              category,
              amount,
              createdDaysAgo: daysAgoCreated,
              approvedDaysAgo: isCompleted || status === ClaimStatus.REJECTED ? approvedDaysAgo : undefined,
              processedDaysAgo: isCompleted ? processedDaysAgo : undefined,
              releaseCode: isCompleted ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
              paymentMethod: isCompleted ? (Math.random() < 0.5 ? 'GCash' : 'Bank Transfer') : undefined,
              approvalComment: status === ClaimStatus.REJECTED ? 'Rejected: Budget exceeds departmental quota for this category.' : undefined
            });
          } else {
            const status = isCompleted ? CashAdvanceStatus.LIQUIDATED : CashAdvanceStatus.REJECTED;
            const purpose = `${category} for ${client}`;
            mkHistoricalCa(reqId, appId, amount, purpose, status, daysAgoCreated, isCompleted, category, vendor, client);
          }
        }
      }
    }

    claimCounter = seedCounter;
  }

  // Admin: Seed 1 Year of History
  app.post('/api/admin/seed-year', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });

    try {
      seedYearOfData();
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to manually seed:', err);
      res.status(500).json({ error: err.message });
    }
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
    companies = buildInitialCompanies();

    users.length = 0;
    users.push(...buildDefaultUsers());

    claimCounter = 123;

    res.json({ success: true });
  });

  // Support Requests API
  app.get('/api/support', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    let userRequests = supportRequests;
    if (user.role !== UserRole.ADMIN) {
      userRequests = supportRequests.filter(sr => sr.requestor_id === user.id);
    }
    
    res.json(userRequests);
  });

  app.get('/api/support/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const request = supportRequests.find(sr => sr.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    
    if (user.role !== UserRole.ADMIN && request.requestor_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const messages = supportMessages.filter(sm => sm.request_id === request.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
    res.json({ ...request, messages });
  });

  app.post('/api/support', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role === UserRole.ADMIN) return res.status(403).json({ error: 'Admins manage support requests and cannot file their own.' });

    const { subject, description, related_entity_type, related_entity_id, priority } = req.body;
    
    const newRequest: SupportRequest = {
      id: uuidv4(),
      requestor_id: user.id,
      subject,
      description,
      related_entity_type,
      related_entity_id,
      priority: priority || SupportRequestPriority.LOW,
      status: SupportRequestStatus.OPEN,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    supportRequests.push(newRequest);
    
    // Notify Admins
    const admins = users.filter(u => u.role === UserRole.ADMIN);
    admins.forEach(admin => {
      sendEmail(admin.id, user.name, `New Support Request: ${subject}`, `A new support request has been created by ${user.name}.\n\nPriority: ${newRequest.priority}\nSubject: ${subject}\nDescription: ${description}`);
    });
    
    res.status(201).json(newRequest);
  });

  app.post('/api/support/:id/messages', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const request = supportRequests.find(sr => sr.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    
    if (user.role !== UserRole.ADMIN && request.requestor_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { message } = req.body;
    
    const newMessage: SupportRequestMessage = {
      id: uuidv4(),
      request_id: request.id,
      sender_id: user.id,
      message,
      timestamp: new Date().toISOString()
    };
    
    supportMessages.push(newMessage);
    request.updated_at = newMessage.timestamp;
    
    if (user.id === request.requestor_id) {
      if (request.assigned_admin_id) {
         sendEmail(request.assigned_admin_id, user.name, `New message on Support Request: ${request.subject}`, message);
      }
    } else {
      sendEmail(request.requestor_id, user.name, `New message on Support Request: ${request.subject}`, message);
    }
    
    res.status(201).json(newMessage);
  });

  app.put('/api/support/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const request = supportRequests.find(sr => sr.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    
    if (user.role !== UserRole.ADMIN && request.requestor_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (req.body.status) {
      const oldStatus = request.status;
      request.status = req.body.status;
      if (oldStatus !== request.status && request.status === SupportRequestStatus.RESOLVED) {
        sendEmail(request.requestor_id, 'System', `Support Request Resolved: ${request.subject}`, 'Your support request has been marked as resolved.');
      }
    }
    
    if (req.body.priority && user.role === UserRole.ADMIN) {
      request.priority = req.body.priority;
    }
    
    if (req.body.assigned_admin_id && user.role === UserRole.ADMIN) {
      request.assigned_admin_id = req.body.assigned_admin_id;
    }
    
    request.updated_at = new Date().toISOString();
    
    res.json(request);
  });

  app.get('/api/imports', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });
    res.json(importBatches);
  });

  app.post('/api/imports', (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== UserRole.ADMIN) return res.status(403).json({ error: 'Forbidden' });
    
    const { filename, records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No valid records provided' });
    }

    const batchId = uuidv4();
    const newBatch: ImportBatch = {
      id: batchId,
      admin_id: user.id,
      filename,
      total_records: records.length,
      imported_at: new Date().toISOString()
    };
    importBatches.push(newBatch);

    // Create claims
    for (const record of records) {
      const claimId = uuidv4();
      
      const newClaim: Claim = {
        id: claimId,
        claim_number: record.claim_number || `REIM-${claimCounter++}`,
        requestor_id: record.requestor_id,
        current_approver_id: user.id, // Or whoever, it's historical so doesn't matter much
        mom_id: record.mom_id || '',
        status: ClaimStatus.COMPLETED,
        total_amount: record.total_amount,
        expense_category: record.expense_category,
        receipt_url: record.receipt_url || '',
        remarks: record.remarks || '',
        import_batch_id: batchId,
        created_at: record.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      claims.push(newClaim);
      
      if (record.lineItems && Array.isArray(record.lineItems)) {
        for (const li of record.lineItems) {
          expenses.push({
            id: uuidv4(),
            claim_id: claimId,
            expense_date: li.expense_date || new Date().toISOString().split('T')[0],
            vendor: li.vendor || 'Unknown',
            category: li.category || 'Other',
            amount: li.amount || 0,
            payment_method: li.payment_method || 'Corporate Card',
            business_purpose: li.business_purpose || 'Historical data import',
            receipt_url: li.receipt_url || '',
            or_number: li.or_number || ''
          });
        }
      }
      
      statusHistories.push({
        id: uuidv4(),
        claim_id: claimId,
        old_status: 'Imported',
        new_status: ClaimStatus.COMPLETED,
        changed_by: user.id,
        reason: `Migrated from historical records by ${user.name} (Batch ${batchId.substring(0,6)})`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json(newBatch);
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

  // Auto-seed on startup if not in production and not disabled
  if (process.env.NODE_ENV !== 'production' && process.env.AUTO_SEED !== 'false') {
    try {
      console.log('Detected development/demo environment. Auto-seeding 1 year of historical mock data...');
      seedYearOfData();
      console.log('Successfully auto-seeded 1 year of mock data on startup.');
    } catch (err: any) {
      console.error('Failed to auto-seed mock data on startup:', err);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
