import React, { useState } from 'react';
import { 
  BookOpen, ShieldAlert, UserCheck, RefreshCw, Ban, 
  CheckSquare, AlertCircle, HelpCircle, User, Award, 
  Clock, Lock, Zap, Sliders, Layers, ChevronRight, Activity, Server
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';

interface Scenario {
  id: number;
  title: string;
  category: 'Policy' | 'Delegation' | 'Workflow' | 'Admin' | 'Edge Cases';
  description: string;
  badge?: string;
  badgeType?: 'default' | 'amber' | 'rose' | 'green';
  rolesInvolved: string[];
  steps: string[];
  expectedOutcome: string;
  status: 'Fully Implemented' | 'Not yet implemented' | 'Blocked';
}

export const ScenarioGuide: React.FC = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const scenarios: Scenario[] = [
    {
      id: 1,
      title: "Segregation of duties",
      category: "Policy",
      description: "An Approver cannot approve their own claim to prevent conflicts of interest and maintain financial compliance.",
      rolesInvolved: ["Bob Approver (Approver)", "Ivy Senior (VP)"],
      steps: [
        "Switch to Bob Approver (bob@example.com) and go to 'New Request' to submit a claim of his own.",
        "Because claim routing always resolves to the submitter's own manager (never to the submitter), Bob's claim routes to Ivy Senior Approver, not to Bob himself — self-approval can't occur through normal submission.",
        "As defense-in-depth, the server also rejects any approval attempt where the acting user matches the claim's requestor, regardless of how the claim got routed to them."
      ],
      expectedOutcome: "The Approver cannot self-approve; the system enforces strict segregation of duties on the server-side.",
      status: "Fully Implemented"
    },
    {
      id: 2,
      title: "Approver can only act on direct reports",
      category: "Policy",
      description: "Strict hierarchical check: Approvers can only view and approve claims submitted by their own direct reports, unless granted delegated access.",
      rolesInvolved: ["Grace Approver (Approver)", "Alice Requestor (Report to Bob)"],
      steps: [
        "Using the 'Preview As...' role switcher in the bottom-right corner, switch to Grace Approver (grace@example.com).",
        "Try to view or approve a claim belonging to one of Bob's reports (like Alice Requestor's or Eve Requestor's claim).",
        "Since Grace is not in Alice's direct reporting chain and has no active delegation from Bob, the server will block any approval/rejection request with a 'Forbidden' or authorization error."
      ],
      expectedOutcome: "The request is rejected with a server-side permission error, protecting organizational data integrity.",
      status: "Fully Implemented"
    },
    {
      id: 3,
      title: "Active delegation auto-routing",
      category: "Delegation",
      description: "When an Approver establishes an active delegation window, claims filed by their reports automatically route to their designated delegate.",
      badge: "Active Delegation Seeded",
      badgeType: "green",
      rolesInvolved: ["Eve Requestor (Requestor)", "Bob Approver (Manager)", "Grace Approver (Delegate)"],
      steps: [
        "Bob Approver has an active delegation to Grace Approver.",
        "Using the 'Preview As...' role switcher, switch to Eve Requestor (eve@example.com) (one of Bob's reports).",
        "Navigate to 'Submit Claim', select an available Completed MOM, enter any claim detail, and submit.",
        "Open the claim detail page and look at the 'Activity Timeline'. You will see that the Current Approver is Grace Approver instead of Bob, and the timeline shows: 'Auto-routed to delegate Grace Approver (on behalf of Bob Approver)'."
      ],
      expectedOutcome: "The claim is instantly and dynamically routed to Grace Approver for immediate review.",
      status: "Fully Implemented"
    },
    {
      id: 4,
      title: "Expired delegation does NOT auto-route",
      category: "Delegation",
      description: "If the delegation date window has already expired, claims route back to the original manager, preventing stale delegations.",
      badge: "Expired Delegation Seeded",
      badgeType: "default",
      rolesInvolved: ["Henry Approver (Manager)", "Bob Approver (Stale Delegate)"],
      steps: [
        "Henry Approver has an expired delegation to Bob (the dates in the seed data are in the past).",
        "Switch to one of Henry's reports or submit a claim directly.",
        "Verify that the claim is routed directly to Henry Approver and does NOT auto-route to Bob, confirming that date-bound constraints are active."
      ],
      expectedOutcome: "The claim is routed to Henry Approver, verifying the delegation expired logic.",
      status: "Fully Implemented"
    },
    {
      id: 5,
      title: "MOM reuse guard",
      category: "Policy",
      description: "Each completed Minutes of Meeting (MOM) document can only be linked to a single claim to prevent double-claiming.",
      rolesInvolved: ["Any Requestor"],
      steps: [
        "Go to 'Submit Claim' as any Requestor.",
        "In the MOM dropdown, you will see completed meetings. Attempt to submit a claim using a MOM that is already linked (e.g. Globe Telecom's MOM).",
        "The server-side system validates MOM usage and rejects the request with the error: 'This Minutes of Meeting is already linked to another claim and cannot be reused.'."
      ],
      expectedOutcome: "The system rejects duplicate MOM linkage with a clear error prompt.",
      status: "Fully Implemented"
    },
    {
      id: 6,
      title: "Returned → Revise & Resubmit",
      category: "Workflow",
      description: "Returned claims can be fully modified and resubmitted, restarting the approval workflow without losing prior activity logs.",
      rolesInvolved: ["Henry Approver (Manager)", "Requestor"],
      steps: [
        "Switch to Henry Approver (henry@example.com).",
        "In 'My Inbox', find the BDO Unibank claim, which has been returned to Henry (in status 'Needs Revision').",
        "Click 'Fix & Resubmit'. In the form, edit the remarks, categories, or amounts as needed.",
        "Click 'Revise & Resubmit Claim'. The claim's status transitions back to 'Pending Approval' for review."
      ],
      expectedOutcome: "The claim resets to Pending Approval and records the revision in the history timeline.",
      status: "Fully Implemented"
    },
    {
      id: 7,
      title: "Rejected is terminal",
      category: "Workflow",
      description: "Once a claim is explicitly rejected, it becomes terminal and cannot be modified, resubmitted, or advanced.",
      rolesInvolved: ["Alice Requestor (Requestor)", "Bob Approver (Manager)"],
      steps: [
        "Find the Meralco claim (originally submitted by Alice and rejected by Bob).",
        "Click to view the claim details. Notice that all interactive action buttons (like Revise, Reassign, Approve, or Process) are hidden.",
        "This terminal state is preserved across all roles to ensure records cannot be tampered with once finalized."
      ],
      expectedOutcome: "No further state transitions are possible for rejected claims.",
      status: "Fully Implemented"
    },
    {
      id: 8,
      title: "Bulk approve/reject",
      category: "Workflow",
      description: "Allows high-volume approvers to process multiple claims simultaneously in a single transaction from their Inbox.",
      rolesInvolved: ["Bob Approver (Approver)"],
      steps: [
        "Switch to Bob Approver (bob@example.com) and go to 'My Inbox'.",
        "In the 'Action Items' table, select the checkboxes next to multiple claims.",
        "Choose 'Bulk Actions' above the table, insert a comment (e.g. 'Bulk Approved'), and select 'Bulk Approve' or 'Bulk Reject'.",
        "All selected claims will be updated together in the database, with email notifications dispatched to all requestors."
      ],
      expectedOutcome: "Batch-updates multiple claims instantly, sending out corresponding mock emails.",
      status: "Fully Implemented"
    },
    {
      id: 9,
      title: "Admin reassignment",
      category: "Admin",
      description: "System administrators can manually override any claim's current approver to resolve organizational blockers.",
      badge: "Reassignment panel exists but claim detail is unreachable for Admin",
      badgeType: "amber",
      rolesInvolved: ["Dave Admin (Admin)"],
      steps: [
        "The reassignment controls (choose a new approver, provide a reason, confirm) are built into the claim detail panel and are gated to the Admin role.",
        "However, the Audit Log has no click-through to an individual claim, and Admin is not currently among the roles permitted to open a claim detail page directly — so this panel cannot be reached through any current navigation path.",
        "This is a known access gap, not a missing feature; the underlying reassignment logic and audit trail already work correctly once the panel is reachable."
      ],
      expectedOutcome: "Once claim detail access is restored for Admin, the claim is instantly reassigned to the new approver, bypasses hierarchy, and logs the change.",
      status: "Blocked"
    },
    {
      id: 10,
      title: "3-tier approval chain",
      category: "Workflow",
      description: "Supports multi-level routing, ensuring hierarchical progression from Mid-Level Approvers up to Executive VPs.",
      rolesInvolved: ["Jack Mid-Level Approver (Manager)", "Ivy Senior Approver (VP)"],
      steps: [
        "Jack is a Mid-Level Approver who reports to Ivy.",
        "Switch to Jack (jack@example.com) and submit a new reimbursement claim.",
        "The system identifies Jack's supervisor and automatically routes the claim to Ivy Senior Approver.",
        "Check the seeded 'Ayala Land Inc' claim which was filed by Jack to view this routing in action."
      ],
      expectedOutcome: "The claim routes automatically to Ivy Senior Approver for final executive sign-off.",
      status: "Fully Implemented"
    },
    {
      id: 11,
      title: "Amount boundary cases",
      category: "Edge Cases",
      description: "Validation limits: confirms support for micro-transactions (₱0.01) and policy flags for high-value claims (₱15,000+).",
      rolesInvolved: ["Any User"],
      steps: [
        "Locate the Cebu Pacific Air claim in the database, which is seeded at ₱0.01. This demonstrates floating-point precision support.",
        "Locate the Robinsons Land Corp claim, which is seeded at ₱185,000. It is fully submitted and pending review, showing no hard upper block.",
        "Any claim containing a line item exceeding ₱15,000 gets flagged on creation with 'flagged_high_value: true', adding a visual high-value badge for the Approver."
      ],
      expectedOutcome: "Both edge cases are handled elegantly, proving exact monetary calculations.",
      status: "Fully Implemented"
    },
    {
      id: 12,
      title: "Duplicate expense warning",
      category: "Edge Cases",
      description: "Real-time client-side cross-referencing alerts the Requestor if a new expense duplicates a previous claim's category and amount.",
      rolesInvolved: ["Alice Requestor (Requestor)"],
      steps: [
        "Switch to Alice Requestor (alice@example.com).",
        "Navigate to the 'Submit Claim' page.",
        "Click the brand-new, amber 'Simulate Duplicate Expense' button next to Quick-fill.",
        "This automatically populates a line item with Category = 'Client Meals' and Amount = '1500.00', which matches Alice's pre-existing seeded claim.",
        "An amber notice instantly warns: 'A previous claim has the exact same category and amount. Ensure this is not a duplicate.'"
      ],
      expectedOutcome: "The duplicate alert renders dynamically on screen in real-time.",
      status: "Fully Implemented"
    }
  ];

  const categories = ['All', 'Policy', 'Delegation', 'Workflow', 'Admin', 'Edge Cases'];

  const filteredScenarios = selectedCategory === 'All' 
    ? scenarios 
    : scenarios.filter(s => s.category === selectedCategory);

  const getStatusBadge = (status: Scenario['status'], badge?: string, type?: Scenario['badgeType']) => {
    if (status === 'Blocked') {
      return (
        <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          {badge || "Blocked"}
        </span>
      );
    }
    if (status === 'Not yet implemented') {
      return (
        <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-gray-100 text-gray-500 border border-gray-200">
          Not yet implemented
        </span>
      );
    }
    
    if (badge) {
      const bgColors = {
        default: 'bg-blue-50 text-blue-700 border-blue-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        rose: 'bg-rose-50 text-rose-700 border-rose-200',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
      return (
        <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full border ${bgColors[type || 'default']}`}>
          {badge}
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
        Active & Verified
      </span>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Policy': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'Delegation': return <Layers className="w-4 h-4 text-purple-500" />;
      case 'Workflow': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Admin': return <Sliders className="w-4 h-4 text-blue-500" />;
      case 'Edge Cases': return <Activity className="w-4 h-4 text-emerald-500" />;
      default: return <BookOpen className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-gray-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand" /> Demo Scenario Guide
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            A comprehensive, interactive playbook showing how the system's business rules and edge-case behaviors are enforced server-side.
          </p>
        </div>
        <div className="bg-brand bg-opacity-5 border border-brand border-opacity-10 rounded px-4 py-2 flex items-center gap-2.5">
          <Server className="w-4 h-4 text-brand shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-gray-700">Sandbox Environment:</span> Active. Use the <span className="font-semibold text-brand">Preview As…</span> switcher to toggle users instantly.
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${
              selectedCategory === cat 
                ? 'border-brand text-brand' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid List of Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredScenarios.map(scenario => (
          <div 
            key={scenario.id} 
            className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Top Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(scenario.category)}
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{scenario.category}</span>
                </div>
                {getStatusBadge(scenario.status, scenario.badge, scenario.badgeType)}
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                {scenario.title}
              </h3>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                {scenario.description}
              </p>

              {/* Roles Involved */}
              <div className="mb-4 bg-gray-50 rounded p-2.5 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Key Users / Actors:</span>
                <div className="flex flex-wrap gap-1.5">
                  {scenario.rolesInvolved.map((role, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-white text-gray-700 border border-gray-200 rounded px-2 py-0.5 text-[11px] font-medium">
                      <User className="w-2.5 h-2.5 text-gray-400" /> {role}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps to Reproduce */}
              <div className="space-y-2 mb-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">How to verify / test:</span>
                <ol className="list-decimal pl-4 space-y-1.5 text-xs text-gray-700 leading-relaxed">
                  {scenario.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Expected Result */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-700">
              <Award className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-900">Expected System Outcome:</span> {scenario.expectedOutcome}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
