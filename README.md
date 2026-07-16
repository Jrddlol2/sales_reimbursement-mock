# Sales Reimbursement System

An internal web application that replaces a manual, paper-based process for submitting, reviewing, approving, and processing sales-team expense reimbursements — including client-meeting documentation (Minutes of Meeting), review-meeting scheduling, cash advances, and liquidations. It gives Requestors, Approvers, Custodians, and Admins a single system of record for a claim's full lifecycle, with status history and notifications generated automatically at every step.

> **Status: prototype.** This repository is scaffolded from Google AI Studio and runs entirely on in-memory mock data — there is no real database, authentication, or persistence yet. It is built and reviewed as frontend/UI work today; the tech stack and data model described below are the target for the real backend build, not something already running. See [CLAUDE.md](CLAUDE.md) for full internal dev notes and rules.

## Table of Contents

- [Overview](#overview)
- [Roles](#roles)
- [Core Concepts](#core-concepts)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [API Surface (Mock Backend)](#api-surface-mock-backend)
- [Data Model](#data-model)
- [Claim Lifecycle](#claim-lifecycle)
- [Business Rules](#business-rules)
- [Roadmap: Prototype → Real Build](#roadmap-prototype--real-build)

## Overview

Sales reps document client meetings and expenses, schedule a review with their manager, and track a claim from submission through payment — all in one wizard-driven flow. Approvers see only their direct reports' claims, Custodians handle release-code payment verification, and Admins manage users and can reassign approvers with an audited reason. Every status change is logged and triggers exactly one notification to the right person.

The app also models a related **cash advance / liquidation** flow: a Requestor can request funds up front, get it approved and released, then liquidate the actual spend afterward (settled, refund due, or reimbursement due), which can in turn generate a follow-on reimbursement claim.

An in-app **Scenario Guide** (`/scenarios`) documents key workflows — segregation of duties, delegation, revise-and-resubmit, admin reassignment, and more — as step-by-step walkthroughs for demoing and testing the prototype.

## Roles

| Role | Responsibilities |
|---|---|
| **Requestor** (Sales Rep) | Submits claims, documents the client meeting (MOM), schedules the review meeting, tracks status of their own claims. |
| **Approver** (Head / Immediate Superior) | Reviews and approves, rejects, or returns claims from direct reports only. Can name a temporary delegate. |
| **Custodian** | Generates the payment release code, marks approved claims "For Processing," and confirms payment on the correct code. |
| **Admin** | Manages users and roles, views the full audit log, and can manually reassign a claim's approver (with a logged reason). Cannot approve or process claims — segregation of duties is enforced server-side. |

## Core Concepts

Two distinct "meeting" concepts drive the workflow — they are intentionally not merged:

1. **Client meeting (MOM — Minutes of Meeting)** — a meeting that already happened, documenting *why* the expense exists: type of account, company, purpose, category, location, contact person and their details, and a description. Filled in as part of claim submission, not gated behind a separate step.
2. **Review meeting** — forward-looking. After submitting, the Requestor schedules a time with their Approver to discuss the claim, with conflict-avoidance against the Approver's existing scheduled meetings.

## Tech Stack

**Currently running (prototype):**
- React 19 + TypeScript, bundled with Vite
- React Router v7 for client-side routing
- Tailwind CSS v4
- Express server (`server.ts`) serving both the Vite dev middleware and a fully in-memory mock REST API
- Recharts for dashboard visualizations, Phosphor Icons, Motion for animation
- Tesseract.js for client-side OCR (receipt scanning)

**Target for the real build (not yet implemented):**
- Backend: Node.js + Express + Prisma ORM
- Database: PostgreSQL
- Auth: JWT with bcrypt-hashed passwords, one role per user, enforced server-side on every route

## Getting Started

**Prerequisites:** Node.js

```bash
# Install dependencies
npm install

# Run the app (Express + Vite dev server, mock API included)
npm run dev
```

The app runs on `http://localhost:3000` by default (override with the `PORT` env var). Log in with any of the seeded mock users (see `server.ts` for the full list), e.g. `alice@example.com` (Requestor), `bob@example.com` (Approver), `carol@example.com` (Custodian), or `dave@example.com` (Admin) — no password is required in the prototype. A `DebugRoleSwitcher` overlay is also available in the UI to jump between mock users.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the app locally via `tsx server.ts` (Express + Vite middleware, mock API). |
| `npm run build` | Builds the frontend with Vite and bundles `server.ts` into `dist/server.cjs` with esbuild. |
| `npm start` | Runs the production bundle (`node dist/server.cjs`). |
| `npm run lint` | Type-checks the project with `tsc --noEmit`. |
| `npm run clean` | Removes build output (`dist/`, `server.js`). |

## Project Structure

```
server.ts              # Express app: in-memory mock data + full REST API
src/
  App.tsx              # Route definitions and role-based route guarding
  types.ts             # Shared TypeScript types/enums (User, Claim, Mom, etc.)
  components/          # Shared UI: layout, auth context, claim widgets, forms, modals
  pages/                # One component per route (see below)
  lib/api.ts           # Frontend fetch helpers
```

Key pages under `src/pages/`:

- `Dashboard` — Requestor home: claim summary, KPIs, quick actions
- `SubmitClaim` — the multi-step submission wizard (expenses → MOM → review meeting → review & submit)
- `ClaimDetail` — full claim view: line items, MOM, approvals, status history
- `ApprovalQueue` — Approver's queue of claims awaiting decision
- `ProcessingQueue` / `ReadyToClaim` — Custodian's release-code and payment-confirmation flow
- `Moms` / `MomDetail` — Minutes of Meeting list and detail views
- `Calendar` — review meetings and client meetings plotted together
- `CashAdvanceDetail` / `LiquidationDetail` — cash advance and liquidation flows
- `TransactionHistory` — a requestor's completed/historical claims
- `AuditLog` — Admin-only, full status-history feed across all claims
- `SystemEmails` — the mock notification "outbox" (per-user inbox of system emails)
- `Settings` — approver delegation setup
- `ScenarioGuide` — in-app walkthroughs of key workflows for demoing/testing

## API Surface (Mock Backend)

All endpoints are served in-memory by `server.ts` (there is no database). Auth is mocked via an `X-User-Id` header (or `mockUserId` in `localStorage` on the frontend) rather than real sessions or tokens.

**Auth & users:** `GET /api/users`, `POST /api/login`, `GET /api/me`

**MOM (client meetings):** `GET/POST /api/moms`, `GET/PUT /api/moms/:id`, `POST /api/moms/:id/send`

**Claims:** `GET/POST /api/claims`, `GET /api/claims/:id`, `PUT /api/claims/:id/resubmit`, `POST /api/claims/:id/approve`, `PUT /api/claims/:id/claim-code`, `POST /api/claims/:id/ready-for-claim`, `POST /api/claims/:id/claim`, `PUT /api/claims/:id/reassign`

**Review meetings:** `GET /api/review-meetings`, `GET /api/approver/schedule`, `GET /api/approver/review-meetings`

**Notifications:** `GET /api/outbox`, `PUT /api/outbox/read`, `GET /api/activity/status`, `POST /api/activity/seen`

**Audit:** `GET /api/history`

**Cash advances:** `GET/POST /api/cash-advances`, `GET/PUT /api/cash-advances/:id`, `POST /api/cash-advances/:id/submit`, `POST /api/cash-advances/:id/approve`, `POST /api/cash-advances/:id/release`

**Liquidations:** `GET/POST /api/liquidations`, `GET /api/liquidations/:id`, `POST/PUT/DELETE /api/liquidations/:id/line-items[/:itemId]`, `POST /api/liquidations/:id/submit`, `POST /api/liquidations/:id/review`, `POST /api/liquidations/:id/collect-refund`

**Admin & settings:** `PUT /api/settings/delegation`, `POST /api/admin/seed`, `POST /api/admin/seed-year`, `POST /api/admin/reset`

## Data Model

Defined in `src/types.ts` and used as the shape of the in-memory store in `server.ts`:

- **User** — name, email, role, department, `reports_to`, optional temporary delegation
- **Claim** — requestor, current/original approver, linked MOM, status, total (sum of line items), release code, high-value flag, timestamps
- **Mom** — 1:1 with a Claim; all client-meeting fields (client, contact person, purpose, discussion, agreements, action items, etc.)
- **ExpenseLineItem** — 1:many per Claim; expense date, vendor, category, amount, payment method, business purpose, per-row receipt URL
- **ReviewMeeting** — 1:1 with a Claim; approver, meeting date/time, status
- **Approval** — decision (Approved/Rejected/Returned), comment, timestamp; a new row on every decision, never overwritten
- **StatusHistory** — append-only audit trail of every status transition, with the reason where applicable
- **Email** — the mock notification transport's sent messages, addressable per recipient
- **CashAdvance** — amount, purpose, linked MOM, approver, release info, status
- **Liquidation** / **LiquidationLineItem** — actual spend against a cash advance, with computed variance (settled / refund due / reimbursement due)

## Claim Lifecycle

```
Draft → Submitted → Review Meeting Scheduled → Pending Approval → Approved → For Processing → Processed/Paid
```

Submission, MOM documentation, and review-meeting scheduling all happen in a single wizard pass. A claim can branch to:

- **Rejected** — reason required, terminal, archived (never deleted)
- **Returned for Revision** — goes back to Draft with a reason; resubmission creates a new Approval record, and prior ones stay visible

## Business Rules

- A Requestor can never approve their own claim (enforced server-side, not just hidden in the UI).
- An Approver can only act on claims from their own direct reports (or as an active delegate).
- Every status change writes an (append-only) StatusHistory row and fires exactly one notification to the correct recipient — never zero, never more than one recipient group.
- The MOM's Contact Person is an external client contact; the Approver is notified for visibility on the *review* meeting, not the client meeting they were never part of.
- Each expense line item's receipt is its own upload, tied to that row.
- The approver on a claim is always derived from the Requestor's `reports_to` (or an active delegation) — a Requestor never selects their own approver. Only an Admin can manually reassign, and only with a reason logged to the audit trail.
- Entering "For Processing" generates a random release code; "Mark as Processed" requires that exact code.

## Roadmap: Prototype → Real Build

This prototype uses in-memory arrays inside `server.ts` and mock header-based auth. The planned real build (Stage 2+) replaces these with:

- PostgreSQL + Prisma ORM for persistence
- JWT-based auth with bcrypt-hashed passwords, one role per user
- Server-enforced role checks on every route (not just UI-level)
- A real (or SMTP-backed) email transport behind the same interface the mock transport already uses
- DB-level immutability (no UPDATE/DELETE grants) for the audit log and status history

Backend and schema work will land first, with frontend screens migrated from mock data to real API calls one at a time — not as a single bulk replacement.
