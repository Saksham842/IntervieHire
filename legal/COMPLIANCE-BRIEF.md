# IntervieHire — Data Protection & Compliance Brief (India)

**Prepared by:** Manan · **Date:** 26 June 2026 · **For:** Management review · **Classification:** Internal

---

## Executive summary

A review of IntervieHire against current Indian law — the **Digital Personal Data Protection
Act 2023 (DPDP)** and its **2025 Rules** — finds that the platform is **not yet compliant**.
Today it collects sensitive personal data, including candidates' **facial, gaze and voice
biometrics**, with **no informed consent and no privacy policy**. All candidate data is also
**stored and processed outside India**, and (until a planned change ships) some is routed to a
**China-based** AI provider.

The core DPDP obligations become legally enforceable on **13 May 2027**, with penalties up to
**₹250 crore**. None of the required building blocks — consent, privacy notice, data-deletion,
grievance handling — exist yet. The engineering work is achievable in-house; what's needed from
management is **sign-off on a few decisions** and a **modest budget for external legal review**.

This brief summarises the findings and a phased plan to reach compliance before the deadline.
Full technical detail and source citations are maintained in `legal/ROADMAP.md`.

---

## Why this matters now

- **Hard deadline — 13 May 2027.** DPDP's consent, notice, security and data-rights obligations
  become enforceable; the older interim rules fall away the same day. Consent flows, deletion
  endpoints and vendor contracts take months and depend on each other, so the build window is now.
- **Penalty exposure.** Up to **₹250 cr** (failure of security safeguards), **₹200 cr** (failure to
  report a breach), **₹200 cr** (mishandling a minor's data). Penalties can apply even without
  actual harm.
- **Revenue blocker, not just legal.** Enterprise and government buyers will not purchase without a
  privacy policy, a data-processing agreement, and defensible data handling — and most will reject
  data routed through China. Compliance is a **sales gate**.

---

## Key findings — current state

| Area | Finding | Risk |
|------|---------|------|
| **Consent** | Camera, gaze and microphone capture begin with no informed consent | 🔴 Critical |
| **Biometrics** | Candidates' face **and voice** (both biometric) are captured and recorded | 🔴 Critical |
| **Legal documents** | No privacy policy, terms, or candidate notice exist anywhere | 🔴 Critical |
| **Data location** | All candidate data is stored outside India (US/EU); some routed to China | 🟠 High |
| **Third-party sharing** | ~14 external vendors may receive candidate data; none under a DPA | 🟠 High |
| **Minors** | No age gate; under-18 candidates legally require verifiable parental consent | 🟠 High |
| **Accessibility** | Gaze/face proctoring may disadvantage disabled candidates (RPwD Act) | 🟡 Medium–High |
| **AI transparency** | The AI avatar is not labelled "AI-generated" (now legally required) | 🟡 Medium |
| **Talent Finder** | Sources candidate profiles from the web — processes data of non-applicants | 🟡 Medium |

---

## What's already been decided

- **Migrate the AI scoring and resume-parsing model off the China-based provider to a US-based one.**
  This removes the single highest-risk data flow. *Note:* it is a risk **reduction, not elimination**
  — candidate data still leaves India, which keeps the disclosure and customer-localization concerns
  live.

---

## The plan — phased to the deadline

| Phase | Focus | Mainly | Needs |
|-------|-------|--------|-------|
| **0 — Immediate** | Informed consent (camera + mic + AI scoring), 18+ age gate, data-retention rules, finish the US-model migration, fix exposed key | Engineering | Decisions below |
| **1 — Documents** (~2 wks) | Privacy policy / notice, terms of service, candidate AI-notice, footer links | Drafting | Legal review |
| **2 — Data rights** (~1 mo) | Data access & deletion, grievance contact (90-day SLA), 72-hour breach process | Engineering + process | — |
| **Accessibility & AI** | Label the avatar as AI-generated (already required), accessible interview mode | Product | — |
| **3 — Customer-facing** | DPA template, vendor sub-processor agreements, Talent Finder legal review | Legal + eng | Legal review |
| **4 — Corporate** | Incorporation, founder IP assignment, trademark, GST | External | CA / CS |

Engineering items (consent screen, age gate, deletion endpoint, avatar label) can be built in-house.
Document drafting can be produced in-house and **finalised by counsel**. Corporate filings need a
Chartered Accountant / Company Secretary.

---

## What I need from management

1. **Budget for external legal sign-off** — an Indian data-protection lawyer to review the consent
   flow and privacy policy. Drafting them in-house first keeps this review fast and low-cost.
2. **Confirm the US LLM provider** (recommended: Anthropic Claude; enterprise alternative: Azure
   OpenAI) so the migration off China can be completed.
3. **Approve an 18+ age gate** as the starting position (vs. building full parental-consent now).
4. **Prioritisation** — confirm Phase 0 is a near-term priority given the legal deadline and the
   sales gate it represents.

---

## Caveats

This is an internal assessment to scope and accelerate compliance; it **does not constitute legal
advice**. Final consent wording and published policies require sign-off from qualified Indian
counsel, and some sector-specific rules are outside the scope of this review. Compliance timelines
assume the planned engineering work is resourced.
