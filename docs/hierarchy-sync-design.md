# Office 365 / Entra ID Hierarchy Sync — Design Summary

**Status:** design notes for Stage 2 (real backend). Not implemented yet — this repo is still prototype/mock-data only per [CLAUDE.md](../CLAUDE.md). Review with Sir Ace before building.

**Goal:** approval routing should automatically follow the company's real org chart, with no manual upkeep when someone is promoted, demoted, or gets a new manager.

## 1. Source of truth
Microsoft Entra ID (Office 365) is authoritative for org structure — never manually edited in our system.

## 2. Sync approach
Scheduled sync (not live per-request Graph calls) pulls the full org chart periodically and updates our own records per user. Keeps the app working even if Graph is briefly down.

Sync writes: `reports_to`, Name, Email, Department, Job Title, Employment Status (Active/Inactive). Employment Status matters beyond display — an employee going Inactive is what tells the system their pending claims/approvals need handling (see point 9).

## 3. Approver role — hierarchy ≠ approval authority
Original design derived Approver status purely from headcount ("≥1 direct report ⇒ Approver"). Revised: keep those two things separate.

- `reports_to` is always synced and always reflects the real org chart.
- Reimbursement approval authority is a separate flag (e.g. `can_approve_reimbursements`), defaulted to true for anyone with ≥1 direct report, but Admin-overridable per person.

Why: managing people and being authorized to approve money aren't automatically the same thing at every company, and hardcoding "manager ⇒ approver" removes flexibility if approval policy differs from the reporting structure. Demotion that removes all direct reports still drops the flag automatically on next sync (default case); Admin can also revoke/grant it independent of headcount.

**Decision:** still open — not decided while this is prototype stage. Default to "any manager with ≥1 direct report can approve" (`can_approve_reimbursements = true` by default) until Sir Ace confirms company policy before Stage 2 build.

## 4. Promotion / new manager
Sync updates `reports_to`. Future claims route to the new manager automatically. No special handling needed.

## 5. Demotion — in-flight claims
Claims already `Pending Approval` (or `Review Meeting Scheduled`) stay with the original approver by default — they aren't auto-reassigned mid-review.

The original approver instead gets notified: *"[Requestor] no longer reports to you — keep reviewing, or transfer to [new approver]?"*

- If they choose to transfer: claim's approver updates, logged to `StatusHistory` (old → new approver, reason: org change), new approver gets the normal "now actionable" notification.
- Fallback if they never act: after **7 days** untouched, auto-escalate (notify Admin to force reassignment). N=7 days is a config value, adjustable later.
- Admin can also force reassignment manually at any time, independent of the 7-day fallback — not required to wait for the timeout.

## 6. Losing Approver role ≠ losing access to already-assigned claims
Role eligibility (can I be routed *new* claims) and claim assignment (do I own *this* claim) are checked separately. Someone who drops to 0 direct reports can still finish claims already in their queue.

## 7. Still Admin's job
Manual override/reassignment (Admin forcing a claim to a different approver, for any reason outside the above) still goes through the existing Admin path with a reason logged to the audit trail — unchanged from current rules.

## 8. Residual approver access is claim-scoped, not role-scoped
`role` stays single-valued per `User` record (`Requestor`/`Approver`/`Custodian`/`Admin`) — a demoted person's role genuinely flips to `Requestor`, and their default UI becomes the Requestor dashboard.

But the approve/reject/return **action** on a specific claim must never be authorized by checking `user.role === 'Approver'`. It must check `claim.approver_id === current_user.id`. This is already how the `Claim`/`Approval` model references an approver — it just means the server-side check on those routes stays claim-scoped even after a role change.

**UI implication:** a demoted user sees the normal Requestor UI as their home experience, plus a small data-driven "Claims still awaiting your review" section that shows up regardless of role — it queries "any claims where I'm the assigned approver and status is actionable." Empty for anyone who was never an approver, so it costs nothing for the normal case. Once every leftover claim is resolved or transferred, the section disappears and they're a clean, ordinary Requestor.

## 9. Employment Status sync
Syncing Employment Status (Active/Inactive) means a departed employee is detectable, not just a demoted one. Same fallback mechanism from point 5 should apply if an *approver* goes Inactive (e.g. resigns) with claims still pending under them — don't wait on a notification to someone who no longer has access; treat it like a non-response and let the fallback escalation handle it.

## Decisions so far
1. **Approval authority scope** — still TBD, deferred until out of prototype stage. Defaulting to "any manager with direct reports can approve" in the meantime (see point 3).
2. **In-flight claim policy on manager change** — Option (c): notify the old approver and let them choose to transfer, backed by the 7-day fallback escalation to Admin. Admin can also force reassignment anytime, not just after the fallback fires.
3. **Fallback window** — 7 days.
