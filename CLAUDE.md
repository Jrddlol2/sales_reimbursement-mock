# Sales Reimbursement System

## Current Status — read this first
This is still a **prototype**, not the real build. Everything runs on AI Studio's mock/in-memory data — there is no real database, no real auth, no real backend yet. The Tech Stack, Entity Model, and API-shaped rules below describe the *eventual* real build (Stage 2 onward) — they are not things to start scaffolding now. Continue treating this as frontend/prototype work only (bug fixes, UI polish, new mock-data features) unless explicitly told to begin the real backend.

Internal web app replacing a manual, paper-based sales reimbursement process. Solo intern project — treat suggestions as recommendations, not silent changes; ask before deviating from anything below.

## Tech Stack
- Frontend: React + TypeScript + Tailwind (scaffolded in Google AI Studio, now living here)
- Backend: Node.js + Express + Prisma ORM
- Database: PostgreSQL
- Auth: JWT, bcrypt-hashed passwords, single role per User record

## Roles (enforce server-side on every route, never just in the UI)
- **Requestor** (Sales Rep): submits claims, documents the client meeting, schedules the Approver review, tracks own status.
- **Approver** (Head/Immediate Superior): reviews and approves/rejects/returns claims from direct reports only.
- **Custodian**: marks approved claims processed, records payment reference.
- **Admin**: manages users/roles/config. Cannot approve or process claims — segregation of duties is a hard rule, not a convenience default.

## Two distinct "meeting" concepts — don't merge these again
1. **Client meeting (MOM)** — already happened, is why the expense exists. Documented as fields filled in during claim submission. No scheduling involved; the expense date on each line item covers "when."
2. **Review meeting** — forward-looking, scheduled by the Requestor with their Approver *after* submitting, to discuss/review the claim before a decision. This is the existing "Schedule Review Meeting" step (Meeting Date, Meeting Time, Approver auto-shown, conflict-avoidance against the Approver's existing scheduled meetings).

## MOM Fields (client meeting documentation — mirrors the company's real form)
Type of Account (dropdown — placeholder: Existing Client, Prospective Client / Lead, Partner / Distributor, Internal / Other), Company Name (dropdown to select existing, "specify own value" fallback for a new one — one field, not two), Purpose of Meeting (required), Category (dropdown — placeholder: Sales Call, Client Servicing, Business Review, Contract/Negotiation, Other — "specify own value" fallback), Location, Contact Person, Contact Person Designation, Contact Person Email, Description. Confirm the real Type of Account / Category dropdown values with Sir Ace before treating these as final.

## Entity Model
- User (name, email, role, department, reports_to)
- Claim (requestor, status, total = sum of line items, timestamps)
- MOM (linked claim — **1:1**, all fields above) — filled in during submission, not gated behind any prior step
- ExpenseLineItem (claim ref, expense date, vendor, category, amount, payment method, business purpose, receipt attachment) — **Claim 1:many ExpenseLineItem**, receipt uploads live per-row, not as one global upload
- ReviewMeeting (claim ref, approver, meeting date, meeting time) — **Claim 1:1 ReviewMeeting**
- ApproverDelegation (approver, delegate, start_date, end_date, created_by) — self-service, an Approver naming a temporary backup for their own claims
- Approval (claim ref, approver, decision, comment, timestamp)
- StatusHistory (claim ref, old status, new status, changed_by, timestamp) — **append-only, no update/delete route ever**
- Notification (recipient, claim ref, type, read/unread, timestamp)

## Submit Claim Wizard Order
1. Expense Line Items (with per-row receipt upload)
2. Meeting / Client Details (MOM fields)
3. Schedule Review Meeting
4. Review & Submit

## Claim Lifecycle
`Draft → Submitted → Review Meeting Scheduled → Pending Approval → Approved → For Processing → Processed/Paid`
Submission, MOM fields, and review-meeting scheduling all happen in one wizard pass — no separate later step to attach anything. Status goes to `Review Meeting Scheduled` on submit; it becomes `Pending Approval` once the scheduled review meeting's date has passed (or is manually marked complete).
Branches: `Rejected` (reason required, terminal, archived not deleted) / `Returned for Revision` (back to Draft with reason; resubmission creates a new Approval record, prior ones stay visible — never overwritten).

## Rules that must never be silently relaxed
- A Requestor can never approve their own claim.
- An Approver can only act on claims from people who report to them.
- Every status change writes a StatusHistory row AND fires exactly one notification per recipient group listed below — never zero, never an unlisted group:
  `Submitted → Approver (heads-up) + Requestor (submission confirmation)` | `Review Meeting Scheduled → Approver (calendar invite)` | `Pending Approval → Approver (now actionable)` | `Approved → Requestor` | `For Processing → Custodian` | `Rejected/Returned → Requestor`
  Submitted is the one transition with two recipient groups (Approver heads-up + Requestor confirmation) — both fire from the same submit action, covering both the initial submission and a post-Return resubmission.
- The MOM's Contact Person is an external client contact — the Approver is CC'd/notified for visibility on the review meeting, not on the original client meeting; they were never at the client meeting.
- Each ExpenseLineItem's receipt is its own upload — never one bulk multi-file box disconnected from the line items.
- The Approver on a claim is always derived from the Requestor's `reports_to` (or an active ApproverDelegation covering that date) — a Requestor never selects or changes who approves their own claim. Only Admin can manually reassign, and only with a reason logged to the audit trail.
- Entering "For Processing" generates a random release code, emailed to the Custodian. "Mark as Processed" requires that exact code — wrong code is rejected, not silently ignored.
- Audit log and StatusHistory are immutable at the DB level — no UPDATE/DELETE grant for the app's DB role, not just missing routes.

## Working conventions
- Backend and schema changes first, frontend integration screen-by-screen after — don't bulk find-and-replace mock data with real API calls across the whole app in one pass.
- Use a mock/logging email transport until real SMTP creds exist; keep the swap a config change, not a rewrite.
- No secrets committed — `.env.example` lists required vars, actual `.env` stays local.
- When a stated rule above conflicts with what seems like a reasonable shortcut, the rule wins — ask before changing it.
