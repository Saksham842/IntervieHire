<!-- Handoff written 2026-06-27 to resume the legal/compliance work in a fresh chat. -->

# IntervieHire — Legal/Compliance Work: Session Handoff

**Purpose:** resume this workstream in a new chat with full context. Not legal advice.

---

## 0. IMMEDIATE NEXT TASK (what to do first in the new chat)

The user approved: **"implement the doable — doc-only changes, and implement a biometric consent
in the same page as the 18[+ check]."** Concretely:

1. **Doc-only change — write the AI Explainability Statement** (recommendation #2). The recruiter
   report is ALREADY fully explainable (see §4), so this is mostly *describing what exists*:
   - Create `legal/AI-EXPLAINABILITY-STATEMENT.md` (model = HireVue's ICO-reviewed statement):
     what the AI does (scores interview answers vs a rubric across 6 dimensions), what it does
     **not** do, that a **human makes the final decision** (verified true), candidate right to
     human review, and that we don't train models on candidate data.
   - Optionally add a short "Automated decision-making & AI" cross-reference already present in
     `PRIVACY-POLICY.md` §7 (it's already there — just keep consistent).
2. **Biometric consent on the same gate as the 18+ check** — in
   `interview-engine/apps/web/app/interviewcandidateroom/page.tsx`, the consent gate currently has
   TWO checkboxes: (a) `isAdult` (18+), (b) `agreeData` (bundled camera+mic+recording+AI). **Add a
   THIRD, biometric-specific checkbox** (e.g. `agreeBiometric`) with its own plain-language line
   ("I give explicit written consent to the capture and processing of my **biometric data** — face,
   gaze, and voice"). Gate the continue button on `isAdult && agreeData && agreeBiometric`. Add the
   scope + a `biometricConsent: true` field into the `grantConsent()` record. This is the cheapest
   protection against BIPA-style claims (see §5, *Deyerler*). **Same page, no new route** — pure
   frontend edit, consistent with the existing gate we built.
   - Note: server-side persistence of consent is a SEPARATE follow-up (still localStorage-only).

Do NOT touch product code beyond the consent gate unless asked (user previously said "legal docs
only" for the DeepSeek change; the DeepSeek call sites still exist in code — see §6).

---

## 1. What this workstream is

The user (non-lawyer founder, new to compliance) is building the **legal/compliance layer** for
**IntervieHire**, an AI hiring platform (recruiter dashboard + AI interview engine w/ camera+gaze+
voice proctoring + AI scoring + resume parsing + Talent Finder sourcing). Target markets: **India
(DPDP) + EU (GDPR)**. Everything lives under `legal/`.

Product = 3 services over one Supabase DB: `dashboard/` (Next.js + vanilla-JS engine),
`interview-engine/` (Fastify `apps/api` + Next.js `apps/web` candidate room), `backend/` (FastAPI).
See root `CLAUDE.md`.

---

## 2. Files I created/edited this session (status)

| File | Status | Notes |
|---|---|---|
| `legal/ROADMAP.md` | ✅ done, living | India DPDP compliance roadmap; verified vs code + law. User/linter also edited it. |
| `legal/PRIVACY-POLICY.md` | ✅ template, needs lawyer + `[BRACKETS]` filled | Dual GDPR+DPDP. DeepSeek removed → "US/EU AI provider" (legal-doc-only change). |
| `legal/PRIVACY-POLICY.docx` | ✅ generated | From the .md via `scratchpad/md2docx.py`. Re-run script if .md changes. |
| `legal/COMPETITIVE-BENCHMARK.md` | ✅ done | Benchmark vs HireVue/Sapia/Paradox/Talview/iMocha/HackerRank/Codility + recommendations. |
| `interview-engine/apps/web/hooks/useProctoring.ts` | ✅ edited | Added `proctoringEnabled` 4th param (default true) gating the camera + gesture effects. |
| `interview-engine/apps/web/app/interviewcandidateroom/page.tsx` | ✅ edited | Built the informed-consent gate (see §3). |
| `scratchpad/md2docx.py` | ✅ tool | Markdown→docx converter (no pandoc; uses python-docx). Path in scratchpad. |

**Files the USER created (contents NOT in my context — review them):** `legal/EU-COMPLIANCE.md`
(+.docx), `legal/COMPLIANCE-BRIEF.md` (+.docx), `legal/PRIVACY-POLICY-WEBSITE.md` (+.docx).
`legal/~$-COMPLIANCE.docx` is a Word lock file (ignore/delete).

**NOT verified this session:** engine `node_modules` isn't installed, so the consent-gate code was
NOT compiled/lint-checked. It's type-simple and reviewed by reading, but run `next lint`/build to be sure.

---

## 3. The consent gate we built (Phase 0) — current state

In `page.tsx`: `CONSENT_VERSION='2026-06-26'`; state `consentGiven`, `consentDeclined`, `isAdult`,
`agreeData`. A gate renders BEFORE the permission gate; `useProctoring(..., consentGiven)` blocks
camera/mic/models until consent. Two checkboxes (18+ and one bundled consent). `grantConsent()`
records to `localStorage` (`ih_consent_${sessionId}`: version, timestamp, scope, UA) and restores
on refresh. Decline → "nothing recorded" screen (NO text-only fallback yet).
**Gap to close (next task §0.2):** add a separate biometric checkbox; later, server-side persistence.

---

## 4. Verified product facts (file:line) — from the 7-capability audit

1. **Biometric consent** — PARTIAL: bundled checkbox, `localStorage` only, no server record, no
   separate biometric consent. (`page.tsx:15,84-87,374-390,461-489`)
2. **AI explainability** — EXISTS (recruiter side): `EvalCandidateReport` has overallScore,
   recommendation, strengths/weaknesses, redFlags, skillScores, per-question breakdown across 6
   dimensions w/ rubric evidence (`evaluation.service.ts:217`, `packages/shared/src/evaluation/types.ts:217`).
   Candidate-facing report is INTENTIONALLY sanitized (strengths/growth only, no scores;
   `types.ts:257`; endpoint `interview.routes.ts:361`). → We're ahead; statement = describe it.
3. **Bias testing** — only `bias_check()` for job-description wording (`backend/app/talent_finder/matching.py`)
   + JD inclusivity audit (`dashboard/src/dashboard/ai-api.ts`). Interview eval path: NONE, and no
   demographic data captured.
4. **Retention/deletion** — DOES NOT EXIST. No TTL/cron/purge. Recordings written as LOCAL FILES in
   `uploads/` (`interview.routes.ts:424`). Proctoring logs/transcripts in Supabase, never deleted.
5. **Candidate data rights (DSAR/export/delete)** — DOES NOT EXIST. No endpoints, no portal.
6. **Grievance Officer / DPDP** — DOES NOT EXIST in product (policy placeholder only).
7. **Proctoring optional / text-only** — DOES NOT EXIST. ⚠️ **BUG:** `InterviewSettings.proctoring`
   toggle exists (defaults true, `dashboard/src/dashboard/state.ts:848`, `models.ts:174`) but the
   candidate room NEVER checks it (`page.tsx:203` runs proctoring unconditionally). Decline just
   blocks; zero-key evaluator is a backend fallback, NOT a candidate text mode.
   **Human-in-the-loop = TRUE:** stage changes are manual recruiter actions
   (`job-detail-panes.ts:740`); `recommendationFromScore` advisory; no auto-reject. (So the
   privacy policy's Art. 22 "a human decides" claim is safe.)

---

## 5. Recommendation buckets (from the competitor benchmark)

- ✅ **Doc-only (do now):** #2 AI Explainability (already true); human-in-the-loop (already true).
- 🟡 **Half-built (finish):** #1 biometric consent (split + server-persist); #7 honor the
  `proctoring` toggle + add text-only branch.
- 🔴 **Net-new engineering:** #4 retention/purge job; #5 DSAR/erasure endpoints; #6 grievance
  config; #3 fairness pipeline (needs demographic data you may not want — keep the policy
  commitment process-based / external-audit-based).

Recommended sequence: **#2 doc → #1 biometric consent → fix #7 toggle bug → #4/#5**.

Biggest strategic point: market leaders (HireVue, Sapia) **retreated from facial/voice biometric**;
we do face+gaze+voice — our outlier risk (see *Deyerler v. HireVue* BIPA suit in the benchmark).
Our clearest differentiator: **India/DPDP done right** (even Talview/iMocha don't name a Grievance
Officer or DPDP). Both HireVue & Sapia run scoring on **Anthropic Claude via AWS Bedrock** —
validates the parked US-LLM pick.

---

## 6. Key decisions & caveats already made

- **DeepSeek (China) → US/EU LLM:** decided; changed in **legal docs only** (per user). ⚠️ **Product
  code still calls DeepSeek** (`backend/app/utils/resume_parser.py`, `deepseek.py`,
  engine `evaluation.service.ts`, dashboard `resume-analysis.ts`). Until the code/deploy actually
  stops calling DeepSeek, any "no China" claim is only true if the deployment can't reach it —
  VERIFY before publishing. Recommended provider: Claude on Bedrock.
- **DPDP timeline:** Rules notified 13 Nov 2025; substantive obligations + SPDI Rules repeal =
  **13 May 2027** (the real deadline). Penalties up to ₹250 cr.
- **Privacy policy** is a TEMPLATE: fill `[BRACKETS]` (entity, DPO/Grievance Officer, EU/UK rep,
  domain, dates, retention numbers) and get EU+India lawyer sign-off before publishing. Must name
  the actual AI provider (still a placeholder).

---

## 7. Environment / gotchas

- Windows; PowerShell primary + Bash tool. Bash tool cwd persists — use absolute paths.
- `interview-engine` deps NOT installed → can't `next lint`/build without `npm install` (heavy).
- No pandoc → use `scratchpad/md2docx.py` for docx.
- MCP servers **Supabase / Google Drive / Apollo.io need OAuth** (do via claude.ai connector
  settings or `/mcp` in an interactive session) — unavailable until authorized.
- Background research sub-agents (general-purpose) tended to over-delegate; Explore agents worked
  reliably for codebase facts.
