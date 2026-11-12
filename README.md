This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Baher Silver ERP / POS — Project Knowledge Base (`docs/project-knowledge/`)

Centralized engineering, business-rule, architecture, and session-handoff documentation for **Baher Silver OS (MIP Silver OS)** is maintained in [`docs/project-knowledge/`](./docs/project-knowledge/):

1. **[PROJECT_MASTER_STATUS.md](./docs/project-knowledge/PROJECT_MASTER_STATUS.md)** — Authoritative project status, deployment topology, completed/pending work packages, outstanding risks, and next approved action.
2. **[BUSINESS_RULES.md](./docs/project-knowledge/BUSINESS_RULES.md)** — Canonical business rules ledger (silver purities `999`/`925`/`900`/`800`, Base 999 conversion, SEG stone/tare exclusion, customer weight privacy, retail/wholesale pricing, dual ledgers, and RLS/branch isolation) with explicit epistemic classifications (`CONFIRMED`, `IMPLEMENTED`, `PROPOSED`, `NEEDS OWNER APPROVAL`, `NOT VERIFIED`).
3. **[TECHNICAL_ARCHITECTURE.md](./docs/project-knowledge/TECHNICAL_ARCHITECTURE.md)** — Next.js 16 & TypeScript domain architecture, PostgreSQL 18.6 ACID transactions, `FORCE ROW LEVEL SECURITY`, Scale HAL & physical A&D EK-1200 RS-232 integration, and offline-first Store Hub sync.
4. **[NEBU_RESEARCH_STATUS.md](./docs/project-knowledge/NEBU_RESEARCH_STATUS.md)** — Forensic summary of NEBU APK analysis strictly separating verified binary/asset facts, strong technical indicators, inferred functionality, and unresolved boundaries.
5. **[IMPLEMENTATION_ROADMAP.md](./docs/project-knowledge/IMPLEMENTATION_ROADMAP.md)** — Agreed work-package order (`WP1` through `WP5`), actual implementation status, and acceptance gates.
6. **[DEPLOYMENT_AND_RELEASE_POLICY.md](./docs/project-knowledge/DEPLOYMENT_AND_RELEASE_POLICY.md)** — Release pipeline (`Development → Tests → Staging → Acceptance → Production`), migration governance, backup drills, rollback procedures, and production locks.
7. **[SESSION_HANDOFF.md](./docs/project-knowledge/SESSION_HANDOFF.md)** — Complete onboarding and handoff guide for the next engineering session (authoritative repository, completed work, inviolable rules, test commands, and exact next task: proceed to WP4).
8. **[CONSOLIDATION_REPORT.md](./docs/project-knowledge/CONSOLIDATION_REPORT.md)** — Verification audit of the knowledge consolidation, cross-check between reports `135`–`149` and repository source code, and confirmation of zero code/database/config mutations.
9. **[REPORT_150_WP3_FINAL_ACCEPTANCE.md](./docs/project-knowledge/REPORT_150_WP3_FINAL_ACCEPTANCE.md)** — Independent Final Acceptance Audit for WP3 (Silver Pricing, Purity Conversion, SEG Stone Exclusion, Immutable Snapshots, and Historical Returns) — **ACCEPTED WITH CONDITIONS**.

