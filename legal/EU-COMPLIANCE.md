# IntervieHire — EU/EEA Compliance (combined)

> **One document, three parts, in reading order:**
> **Part 1 — Concise Review Sheet** (fast read / lawyer hand-off) ·
> **Part 2 — Europe: the detailed deep-dive** (why each rule applies) ·
> **Part 3 — EU/EEA Compliance Plan** (the full, ordered do-list).
>
> India is in [`ROADMAP.md`](./ROADMAP.md). **Verified 2026-06-26. ⚠️ Not legal advice** — an EU
> data-protection/AI lawyer must sign off the lawful basis, DPIA, and consent/notice wording before you
> process a real EU candidate. **Law is in flux** — the *Digital Omnibus* (Nov 2025) is amending GDPR +
> the AI Act; build to current law and don't bank on proposed relaxations (flagged inline).

---
---

# Part 1 — Concise Review Sheet

> **Purpose:** a one-page-ish review summary of *all* EU data, for a fast read / lawyer hand-off.
> Detailed version: **Part 2** below. India: [`ROADMAP.md`](./ROADMAP.md).

## Where this product sits

An **AI hiring tool with biometric (face + voice) proctoring** combines the EU's two most-regulated
things: **special-category biometric data** (GDPR) + **recruitment AI** (AI Act high-risk). This is
close to the hardest EU posture a product can have. Two features may need redesign, not just docs.

## The map (status at a glance)

| Regime | In force? | What it means for us | Key date |
|--------|-----------|----------------------|----------|
| **GDPR** | Yes (2018) | Face/voice = special-category; lawful basis, DPIA, transfers, EU rep | now |
| **AI Act — prohibited practices** | **Yes (Feb 2025)** | **Emotion recognition in workplace = banned** | now |
| **AI Act — high-risk (recruitment, Annex III)** | Obligations **2 Dec 2027** | Conformity assessment, CE mark, bias testing, human oversight, EU registration | **2 Dec 2027** |
| **ePrivacy (cookies)** | Yes | Opt-in banner for non-essential cookies/analytics | now |
| **Pay Transparency Dir. (2023/970)** | **Transpose by 7 Jun 2026** | **Salary-history ban** in recruitment; pay-range disclosure | now landing |
| **UK DUAA 2025** (if UK in scope) | **Yes (5 Feb 2026)** | Separate, *more permissive* ADM regime; ICO enforcing AI hiring | now |
| **Digital Omnibus** | **Proposal** | Will relax GDPR/AI Act — *not law yet* | watch |

## 🚫 Showstoppers (can force product change)

1. **Emotion recognition in the workplace is banned** (AI Act Art 5(1)(f)) — inferring emotions from
   biometric data. **Verified in your code:** `GAZE_AWAY` is behavioural (eye *direction*), **not**
   emotion → OK. The avatar's `emotionState` is the AI's own expression → OK. **Do not** start labelling
   gaze/face as "nervous/disengaged/dishonest." Fine: ≤ €35M / 7% turnover.
2. **Biometric proctoring under GDPR is precarious** — special-category data; consent is weak in hiring
   (power imbalance); DPAs have fined facial recognition; **DPIA mandatory**. → For EU candidates, make
   proctoring **optional with a real alternative (typed interview)** or **off by default**.

## ✅ Heavy-but-doable obligations

- **AI Act high-risk programme** (by ~Dec 2027): risk management, data governance + **bias testing**,
  technical docs, logging, **designed-in human oversight**, conformity assessment + **CE marking** + EU
  database registration, post-market monitoring. **Label the avatar as AI** (transparency).
- **GDPR**: valid **lawful basis** (likely legitimate-interest + balancing, *not* consent); **Art 22**
  human-in-the-loop (no solely-automated rejection; explanation + contest); **DPIA**; **EU representative
  (Art 27)**; **DPO** likely; **ePrivacy** cookie banner; **breach 72h**; fines ≤ €20M / 4%.
- **Data minimisation** — pseudonymise the scoring prompt (drop candidateId/name). Already on India list.

## 🌍 Transfers (your stack is offshore)

- **EU → US** (LLM swap, Supabase/Render/Vercel, Deepgram, OpenAI): use **DPF-certified** vendors, else
  **SCCs + Transfer Impact Assessment**. DPF is valid in 2026 (survived *Latombe*).
- **EU → India** (if data reaches India ops): **no adequacy** → **SCCs** required.
- **EU → China:** no clean path → confirms the **DeepSeek → US** swap.
- **Best move:** **host EU candidates' data in an EU Supabase region** (available, unlike India) to
  minimise transfers.

## 🆕 Easy-to-miss, recruitment-specific

- **Pay Transparency Directive** — **don't ask candidates for salary history**; support pay-range info.
  → **Check your intake/application forms** for a salary-history field and remove it for EU.
- **UK (if in scope) is a separate regime** — UK DUAA 2025 permits automated CV screening on legitimate
  interests *with* transparency + human review + right to contest; **ICO is actively enforcing** (found
  most AI-hiring employers non-compliant). UK uses the **UK-US Data Bridge** for US transfers. UK is **not**
  under the EU AI Act (principles-based + ICO guidance instead).

## ⏳ In flux — Digital Omnibus (proposal, 19 Nov 2025) — do NOT rely on yet

The Commission proposed major simplifications. **Still a proposal; current GDPR applies until enacted.**
Watch — it would: narrow the **"personal data"** definition (pseudonymised data may exit scope for one
holder); make cookies **single-click** + 6-month moratorium; extend breach reporting **72h → 96h** and
only for **high-risk** breaches; **relax automated-decision** restrictions. The **AI Act high-risk delay
to 2 Dec 2027** (Parliament-endorsed 16 Jun 2026, adoption expected ~Jul 2026) is the firmest piece.
→ **Don't follow the 96h/relaxed-ADM rules yet, and don't bank on them; build to current GDPR.**

## Corrections incorporated (vs. earlier drafts)

- **Added** Pay Transparency Directive (salary-history ban) — was missing.
- **Upgraded** the UK note to the DUAA 2025 regime + ICO enforcement — was a one-liner.
- **Added** the Digital Omnibus "in flux" caveat (breach 96h / ADM / cookies / personal-data definition).
- **Confirmed** still-current: AI Act recruitment = high-risk, 2 Dec 2027; emotion-recognition ban in
  force; DPF valid; India no EU adequacy; GDPR breach still **72h today**.

## Open decisions for EU launch

- [ ] Biometric proctoring for EU: **off by default** or **optional + DPIA**?
- [ ] EU data residency: pin EU candidates to an **EU Supabase region**?
- [ ] Confirm intake forms carry **no salary-history** field (Pay Transparency).
- [ ] Is **UK** in scope? (separate DUAA programme if so)
- [ ] Appoint **EU representative**; assess **DPO**.

## Part 1 sources (verified 2026-06-26)

- AI Act high-risk = recruitment retained, deadline 2 Dec 2027 — [Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/), [DLA Piper](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2026/The-Digital-AI-Omnibus-Proposed-deferral-of-high-risk-AI-obligations-under-the-AI-Act)
- Emotion-recognition prohibition (Art 5(1)(f)) — [FPF](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/)
- Digital Omnibus GDPR changes (personal data / cookies / 96h breach / ADM) — [White & Case](https://www.whitecase.com/insight-alert/gdpr-under-revision-key-takeaways-from-digital-omnibus-regulation-proposal), [Stephenson Harwood](https://www.stephensonharwood.com/media/4oajo5bu/styled-digital-omnibus-article-nov-2025.pdf)
- Pay Transparency Directive — salary-history ban, 7 Jun 2026 — [Boundless](https://boundlesshq.com/blog/the-eu-pay-transparency-directive-a-complete-guide-for-employers/), [Ogletree](https://ogletree.com/insights-resources/blog-posts/eu-pay-transparency-directive-updates-on-implementation-across-member-states/)
- UK DUAA 2025 ADM in recruitment + ICO enforcement — [ICO](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/03/automated-decisions-can-streamline-the-hiring-process-with-the-right-safeguards-in-place/), [Ropes & Gray](https://www.ropesgray.com/en/insights/viewpoints/102mpug/helping-hand-or-complete-control-ai-in-recruitment-in-the-eu-and-uk)
- EU-US DPF valid 2026 (Latombe) — [Epstein Becker Green](https://www.workforcebulletin.com/adequacy-of-the-eu-u-s-data-privacy-framework-survives-challenge)

---
---

# Part 2 — Europe: the detailed deep-dive

> **Companion to [`ROADMAP.md`](./ROADMAP.md) (India).** Read this for *why* each rule applies. **The EU
> is materially heavier than India for *this* product** — an AI hiring tool with biometric (face + voice)
> proctoring sits in the EU's most-regulated zone.

## TL;DR — two of these are potential *showstoppers*, not paperwork

1. **Emotion recognition in the workplace is BANNED** (EU AI Act Art 5). If your gaze/face proctoring
   infers attention, engagement, stress or emotion, that is a **prohibited practice** for EU candidates
   — not regulated, *forbidden*. Already in force.
2. **Biometric proctoring under GDPR is legally precarious.** Face/voice = *special-category* data;
   regulators have fined facial-recognition use and demand proportionality + a mandatory DPIA + genuine
   less-intrusive alternatives. May have to be **off by default** for EU candidates.
3. **Recruitment AI = "high-risk"** under the EU AI Act → heavy conformity obligations (docs, bias
   testing, human oversight, CE marking, EU registration). Deadline **~2 Dec 2027** (see timeline).
4. **GDPR mechanics** are stricter than India on automated decisions, lawful basis, transfers, and you
   must appoint an **EU representative**.

Two of these (1, 2) may require **turning features off or redesigning them** for the EU. Plan for that.

## Red line #1 — Emotion recognition is prohibited (EU AI Act Art 5(1)(f))

The AI Act **bans** AI that infers a person's emotions in the **workplace or education** from biometric
data (narrow medical/safety exceptions only). Rationale: such systems are scientifically unreliable and
discriminatory. **Already enforceable** (prohibitions applied Feb 2025); investigations into workplace
emotion recognition are reportedly underway.

- **Why it hits you:** candidate assessment is very likely read as "workplace" context. If proctoring
  classifies "engagement", "attention", "nervousness", "confidence" etc. from face/gaze — **stop doing
  that for EU candidates.** Also prohibited: **biometric categorisation** to infer race, religion, sex
  life, political/union views, etc.
- **Safe design:** proctoring may *detect events* (no face, multiple faces, looking away) but must **not
  infer emotional/affective states**. Audit your gaze/violation logic against this line before EU launch.
- **Verified against your code (2026-06-26):** `GAZE_AWAY` is a *behavioural* event (eye direction via
  geometry + eye-look blendshapes), **not** emotion inference → **most likely NOT prohibited**. The
  avatar's `emotionState` is the *AI interviewer's* own expression, not candidate emotion → fine.
  ⚠️ But `analyzeTranscriptConfidence` scores candidate **"confidence"** + applies a penalty — it's
  *text*-based (filler/hedge words), so **outside** the biometric ban, yet a real **fairness/
  discrimination risk** (non-native speakers, neurodivergent, speech disfluencies) under GDPR + AI-Act
  high-risk **and India's RPwD Act**. Re-examine it. **The red line is crossed only if gaze/face is used
  to infer a mental/emotional state** ('nervous', 'disengaged', 'dishonest').
- **Penalty:** prohibited practices → up to **€35M or 7% of global annual turnover**.

## Red line #2 — Biometric proctoring under GDPR

Face and voice processed to identify/monitor a person are **special-category data** (GDPR Art 9). To do
it lawfully you need an **Art 9 condition** — practically **explicit consent** — *plus* a demonstration
that it is **necessary and proportionate** and that **less-intrusive alternatives were considered**.

- **The consent problem:** in a hiring/exam context regulators distrust consent (power imbalance — the
  candidate can't freely say no). EU DPAs have fined facial-recognition deployments (e.g. Sweden ~€20k
  school attendance; Spain — DPIA failed to assess proportionality; Romania — employee time-tracking).
- **A DPIA is mandatory** here (large-scale special-category + systematic monitoring), and a *superficial*
  DPIA is itself a breach.
- **Practical stance for EU:** make proctoring **optional with a real alternative** (the typed interview),
  or **disable biometric proctoring for EU candidates**, and complete a proper DPIA either way.

## The EU AI Act — recruitment AI is "high-risk"

Hiring/selection/candidate-evaluation AI is **Annex III high-risk**. If you're not in a prohibited zone
(above), you fall here, which triggers a substantial compliance system **as the AI provider**:

- Risk-management system; **data governance + bias testing**; technical documentation; automatic
  **logging/record-keeping**; **transparency + instructions** to deployers (your recruiter customers);
  **human oversight** designed in; accuracy/robustness/cybersecurity.
- **Conformity assessment + CE marking**; **registration in the EU high-risk database**; quality-
  management system; **post-market monitoring**. Your *customers* (deployers) owe their own duties incl.
  a possible **Fundamental Rights Impact Assessment** and worker/candidate notice.
- **Transparency:** AI systems interacting with people must disclose they're AI — your **avatar must be
  labelled AI** (also an India requirement now).

**Timeline (verify — moving):** high-risk Annex III obligations were due **2 Aug 2026**, but the EU's
**Digital Omnibus** (Commission 19 Nov 2025; Parliament endorsed 16 Jun 2026; formal Council adoption +
publication expected **Jul 2026**) **defers them to ~2 December 2027**. Treat **2 Dec 2027** as the
planning date, but confirm once it's in the Official Journal — until then the Aug 2026 date technically
stands. Non-compliance with high-risk duties → up to **€15M or 3% of global turnover**.

## GDPR mechanics that differ from India (DPDP)

| Topic | India (DPDP) | EU (GDPR) — stricter |
|-------|--------------|----------------------|
| **Lawful basis** | Consent / certain legitimate uses | Needs a valid basis; **consent is shaky in recruitment** (power imbalance) — may rely on legitimate interest + balancing test |
| **Automated decisions** | No hard equivalent yet | **Art 22**: right not to be subject to *solely* automated decisions with significant effect → **human-in-the-loop**, explanation, and a route to **contest** the AI score |
| **DPIA** | Only Significant Data Fiduciaries | **Mandatory** for your biometric + profiling processing, *before* you start |
| **Representative/DPO** | Grievance officer; DPO only if SDF | **EU representative (Art 27)** required for a non-EU company targeting EU; **DPO likely required** (large-scale special-category) |
| **Transfers** | Negative list (allowed by default) | **Restricted** — need a mechanism (below) |
| **Cookies/analytics** | DPDP consent | **ePrivacy**: explicit opt-in banner for non-essential cookies |
| **Breach** | 72h to DPBI | 72h to the supervisory authority |
| **Fines** | up to ₹250 cr | up to **€20M or 4%** of global turnover (GDPR) |

> **⚠️ In flux — Digital Omnibus (proposal, 19 Nov 2025, NOT law yet):** would narrow the **"personal
> data"** definition, make cookies **single-click** + 6-month moratorium, extend breach reporting **72h →
> 96h** (high-risk breaches only), and **relax Art 22 automated-decision** limits. Current GDPR (above)
> still applies — **don't rely on these relaxations, and don't adopt the 96h window, until it's enacted.**

### International transfers (this is where your stack matters)
- **EU → US** (your LLM swap target, Supabase/Render/Vercel, Deepgram, OpenAI): allowed if the vendor is
  **EU-US Data Privacy Framework certified** (the DPF is valid as of 2026 — survived the *Latombe*
  challenge), otherwise **Standard Contractual Clauses (SCCs) + a Transfer Impact Assessment**. **Prefer
  DPF-certified vendors.**
- **EU → India** (if EU candidate data reaches your India ops/storage): India has **no EU adequacy**
  (not expected before ~2028–2029) → you need **SCCs**.
- **EU → China:** effectively no clean path — yet another reason the **DeepSeek→US swap** is right.
- **Best move:** **host EU candidates' data in an EU region** (Supabase *does* offer EU regions, unlike
  India) to minimise transfers, and pin the data per candidate region.

## What actually helps you (good news)

- **The DeepSeek→US LLM swap helps the EU case too** — US (DPF) is workable; China was not.
- **Supabase offers EU regions** → you can keep EU candidate data in the EU (you couldn't for India).
- **The AI-avatar "AI-generated" label** you need for India also satisfies the EU transparency duty.
- **The Digital Omnibus delay** buys runway to ~Dec 2027 for the heaviest high-risk obligations.
- **Data minimisation / pseudonymised prompts** (already on the India list) materially de-risk transfers.

## EU expansion checklist (high level — the full ordered plan is Part 3)

- [ ] **Audit proctoring for emotion/affect inference** → remove it for EU (Red line #1).
- [ ] **Decide biometric proctoring for EU**: off by default, or optional + real alternative + DPIA (#2).
- [ ] **DPIA** for EU processing (mandatory, before launch).
- [ ] **AI Act high-risk programme**: risk mgmt, bias testing, technical docs, logging, human oversight,
      conformity assessment + CE marking, EU-database registration (target ~Dec 2027).
- [ ] **Art 22 human-in-the-loop**: no solely-automated rejection; explanation + contest route.
- [ ] **Lawful basis** worked out with a lawyer (likely legitimate interest + balancing, not consent).
- [ ] **Appoint an EU representative (Art 27)**; assess **DPO** requirement.
- [ ] **Transfers**: use DPF-certified US vendors or SCCs+TIA; **host EU data in EU region**; SCCs for any
      EU→India flow.
- [ ] **GDPR docs**: EU-facing privacy notice, data-subject-rights process (access/erasure/portability/
      objection), **ePrivacy cookie banner**, 72h breach process.
- [ ] **Pay Transparency Directive (2023/970, transpose by 7 Jun 2026)** — **no salary-history questions**
      in recruitment; check intake/application forms and remove any current/previous-pay field for EU.
- [ ] **Label the AI avatar** (transparency).
- [ ] _(If targeting the UK too)_ **UK is a separate, more-permissive regime** — the **Data (Use and Access)
      Act 2025** (in force 5 Feb 2026) replaced Art 22: automated CV screening is allowed on **legitimate
      interests + safeguards** (transparency, human review, right to contest), and the **ICO is actively
      enforcing** on AI hiring. UK uses the **UK-US Data Bridge** for US transfers and is **not** under the
      EU AI Act. Run a separate UK track.

## Part 2 sources (verified 2026-06-26)

- AI Act high-risk timeline + Digital Omnibus deferral to ~2 Dec 2027 — [DLA Piper](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2026/The-Digital-AI-Omnibus-Proposed-deferral-of-high-risk-AI-obligations-under-the-AI-Act), [Crowell & Moring](https://www.crowell.com/en/insights/client-alerts/artificial-intelligence-and-human-resources-in-the-eu-a-2026-legal-overview), [EU AI Act portal](https://artificialintelligenceact.eu/what-the-act-means-for-staffing-businesses/)
- Emotion-recognition-in-workplace prohibition (Art 5(1)(f)) — [FPF](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/), [Wolters Kluwer](https://legalblogs.wolterskluwer.com/global-workplace-law-and-policy/the-prohibition-of-ai-emotion-recognition-technologies-in-the-workplace-under-the-ai-act/)
- GDPR biometric proctoring / facial-recognition enforcement + DPIA — [VinciWorks (Ireland €550k)](https://vinciworks.com/blog/is-your-use-of-facial-recognition-breaking-the-law-lessons-from-irelands-e550k-fine/), [EDPB facial-recognition guidance](https://www.edpb.europa.eu/news/news/2022/edpb-adopts-guidelines-calculation-fines-guidelines-use-facial-recognition_en)
- EU-US DPF valid in 2026 (Latombe); India no adequacy until ~2028–29 — [Epstein Becker Green](https://www.workforcebulletin.com/adequacy-of-the-eu-u-s-data-privacy-framework-survives-challenge), [eucrim](https://eucrim.eu/news/general-court-confirms-adequacy-of-us-data-protection/), [DPDPA.com India adequacy](https://www.dpdpa.com/blogs/india_eu_data_adequacy_dpdpa_gdpr.html)

---
---

# Part 3 — EU/EEA Compliance Plan (full working document)

> **What this is:** the complete, do-it-top-to-bottom plan for taking IntervieHire into the EU/EEA.
> Everything is listed — nothing summarised away. Work through it in the order written; each step is
> placed where it is because it either removes the biggest risk, unblocks later steps, or is cheap to
> do now. The concise one-pager is **Part 1** above; India is [`ROADMAP.md`](./ROADMAP.md).

## Read this before anything else — the two hard constraints

These two shape every decision below. They are not tasks; they are the boundaries you design within.

**Constraint A — Emotion recognition in the workplace is banned (EU AI Act, Art 5(1)(f)).**
AI that infers a person's emotions from biometric data in a workplace/education context is a *prohibited
practice* (in force since Feb 2025), punishable by up to **€35M or 7% of global annual turnover**. A
candidate assessment is very likely treated as a "workplace" context.
- **Where you stand (verified in code 2026-06-26):** your `GAZE_AWAY` detection reads eye *direction*
  (geometry + MediaPipe eye-look blendshapes) and flags a behavioural event — it does **not** infer an
  emotion, so it is **most likely outside the ban**. The avatar's `emotionState` field is the *AI
  interviewer's own* expression, not an inference about the candidate — also fine.
- **The line you must never cross:** the moment any face/gaze/voice signal is turned into an inferred
  emotional or mental state — "nervous", "disengaged", "stressed", "dishonest", "low confidence",
  "likely cheating" — you are in prohibited territory. Keep every proctoring output a *fact*, never a
  *feeling*.

**Constraint B — Biometric proctoring under GDPR is legally precarious.**
Face and voice processed to monitor a candidate are **special-category data** (GDPR Art 9). To do it at
all you need an Art 9 condition (practically explicit consent) **plus** proof it is necessary and
proportionate **plus** a completed DPIA. EU regulators distrust "consent" in hiring (the candidate can't
freely refuse) and have fined facial-recognition deployments. Realistically, for EU candidates,
**biometric proctoring becomes optional-with-a-real-alternative or is switched off** — decided below.

## 1. Lock these decisions first

They are free, they take an afternoon, and almost everything downstream depends on them. Write the answer
next to each.

- [ ] **Is the UK in scope, or EU/EEA only?** The UK is now a *separate, more permissive* regime
      (see §11). If yes, you run a second, parallel track. Decision: ________________.
- [ ] **Biometric proctoring for EU candidates — off by default, or optional + DPIA?** This is the single
      biggest product decision for the EU. "Off by default with the typed interview as the path" is the
      lowest-risk and fastest to ship. Decision: ________________.
- [ ] **EU data residency — pin EU candidates to an EU Supabase region?** Supabase *does* offer EU regions
      (it offers none for India), so this is achievable and kills most of the transfer problem. Strongly
      recommended. Decision: ________________.
- [ ] **Which EU member states first?** Some have transposed Pay Transparency and have stricter works-
      council rules (e.g. Germany); narrowing the launch set simplifies the first pass. Decision: ______.
- [ ] **Who is the responsible owner + the external EU lawyer?** Nothing here is "done" until a lawyer
      signs the lawful basis, DPIA, and notice. Line one up now. Decision: ________________.

## 2. Run these audits now (cheap, just reading code/config)

Findings here change what you build, so do them before building.

- [ ] **Emotion-inference audit (largely done).** Confirm no part of proctoring or scoring labels an
      emotional/mental state from biometric data. Status: `GAZE_AWAY` clear; avatar `emotionState` clear.
      Re-check on every future proctoring change.
- [ ] **Salary-history audit.** The EU Pay Transparency Directive bans asking candidates about current or
      past pay. Grep the intake/application forms and candidate model for any salary-history / current-CTC
      / expected-pay field. If present, it must go (for EU). Touchpoints: `dashboard/` application forms,
      `backend/app/models` applicant fields, any "custom fields".
- [ ] **Sub-processor inventory + transfer status.** List every third party that can receive EU personal
      data and note whether each is **EU-US DPF certified** or needs **SCCs**: the new US LLM, **Supabase,
      Render, Vercel, Deepgram, OpenAI/Whisper, OpenRouter, ElevenLabs, Convai, Google (Calendar/CSE),
      Resend, Gemini, Groq, GitHub/Brave (Talent Finder)**. This list feeds the notice, the DPA, and §7.
- [ ] **Confidence-metric fairness audit.** `analyzeTranscriptConfidence` penalises filler words and
      hedging ("um", "i guess", "not sure"). It's text-based (so *outside* the emotion ban) but is a real
      **discrimination risk** — it disadvantages non-native speakers, neurodivergent candidates, and people
      with speech disfluencies. Quantify how much it can move a hire/no-hire outcome, and cap or remove it.
      Touchpoint: `interview-engine/packages/shared/src/evaluation/confidence.ts`.
- [ ] **Talent Finder audit.** It scrapes GitHub/Google/Brave for profiles of people who never applied —
      under GDPR that needs its own lawful basis and notice (the "publicly available" defence is narrow in
      the EU). Decide whether Talent Finder is disabled for EU or re-papered.

## 3. Ship these quick fixes (small code/config, high value, needed anyway)

Each is a few hours to a few days and reduces risk immediately.

- [ ] **Label the AI avatar as AI-generated.** Required by the EU AI Act transparency rules *and* already
      required in India (IT "synthetic content" rules). One visible + audible disclosure. Do this regardless
      of geography. Touchpoint: candidate room / avatar component.
- [ ] **Pseudonymise the scoring prompt.** Today the LLM payload includes `candidateId`, `companyId`, and
      the full transcript. The scorer needs only the **answer text + rubric**. Strip direct identifiers
      before the call — it shrinks every transfer and every third party's exposure at once. Touchpoints:
      `interview-engine/apps/api/src/services/evaluation.service.ts`, `backend/app/utils/resume_parser.py`.
- [ ] **Remove the salary-history field for EU** (if the §2 audit found one).
- [ ] **Make proctoring optional for EU with the typed interview as the real alternative**, and **never
      auto-reject on a proctoring "violation"** — a human reviews. (Implements Constraint B's decision and
      pre-satisfies the AI Act human-oversight duty.) Touchpoints: candidate room gating, `useProctoring.ts`.
- [ ] **Finish the DeepSeek → US LLM swap** at every call site (engine eval, dashboard resume-analysis,
      backend resume_parser/deepseek). China has no clean EU transfer path; the US does (DPF). Keep the
      zero-key deterministic fallback.

## 4. Put EU candidate data in the EU

- [ ] **Provision an EU-region Supabase project (or region-pin EU candidates)** so EU personal data is
      stored in the EEA. This is the highest-leverage transfer mitigation — most EU→US storage transfers
      simply disappear. Touchpoints: `DATABASE_URL` per environment, Render/Vercel region settings.
- [ ] **Route EU interviews' ASR/LLM/avatar calls to EU endpoints where the vendor offers them** (Deepgram,
      OpenAI/Azure, etc. have EU options); where they don't, that flow falls under §7 transfers.
- [ ] **Confirm backups, logs, and the `video_url`/clip storage also stay in-region.**

## 5. Establish the legal foundation (lawful basis + DPIA)

This is the part a lawyer must own; start it early because it gates launch.

- [ ] **Data Protection Impact Assessment (DPIA).** Mandatory here (large-scale special-category biometric
      data + systematic monitoring + profiling). Must genuinely assess necessity, proportionality, and
      less-intrusive alternatives — a superficial DPIA is itself a breach. Covers proctoring, voice,
      AI scoring, and Talent Finder.
- [ ] **Lawful basis for each processing activity.** Consent is weak in recruitment (power imbalance);
      expect to rely on **legitimate interests + a documented balancing test** for core scoring, with a
      separate Art 9 condition (explicit consent or substantial-public-interest) for the biometric parts.
      Lawyer decision.
- [ ] **Record of Processing Activities (Art 30).** Document purposes, categories, recipients, transfers,
      retention — for you as both controller (self-serve/demo candidates) and processor (recruiter-driven).
- [ ] **Retention schedule.** Define and enforce deletion timelines per data type (clips, audio,
      transcripts, scores), aligned with purpose limitation.

## 6. Build the automated-decision safeguards (GDPR Art 22)

Your product scores and ranks candidates — that's automated decision-making with significant effect.

- [ ] **Human-in-the-loop:** no candidate is rejected *solely* by the AI; a person makes/*meaningfully*
      reviews the decision. (Also satisfies the AI Act human-oversight requirement.)
- [ ] **Explanation:** candidates can be told that AI is used and, in plain terms, how it works.
- [ ] **Contest route:** a candidate can request human review of, and challenge, an automated score.
- [ ] _(Watch)_ the Digital Omnibus proposes to relax Art 22 — do **not** rely on that yet.

## 7. Set up the international-transfer mechanisms

For every flow that still leaves the EEA after §4.

- [ ] **EU → US:** prefer **DPF-certified** vendors; for any that aren't certified, put **Standard
      Contractual Clauses (SCCs) + a Transfer Impact Assessment** in place. (DPF is valid in 2026 — it
      survived the *Latombe* challenge — but is politically fragile; SCCs are the durable backstop.)
- [ ] **EU → India:** India has **no EU adequacy** (not expected before ~2028–29) → **SCCs required** for
      any EU candidate data that reaches your India operations/support/storage.
- [ ] **EU → China:** none — confirmed by removing DeepSeek.
- [ ] **Attach the transfer terms to each sub-processor** from the §2 inventory and disclose them in the
      notice.

## 8. Produce the EU-facing documents

- [ ] **EU privacy notice (GDPR Arts 13–14).** Itemised: data collected (incl. face + voice biometrics,
      transcripts, AI scores), purposes, lawful basis, recipients/sub-processors, **cross-border transfers**,
      retention, and all data-subject rights.
- [ ] **Data-subject-rights process & endpoint** — access, rectification, **erasure**, restriction,
      **portability**, and **objection**; with an SLA to respond within one month.
- [ ] **ePrivacy cookie banner** — genuine opt-in for non-essential cookies/analytics. _(Digital Omnibus
      proposes single-click accept/reject + a 6-month memory — design for it, but current ePrivacy applies.)_
- [ ] **Pay Transparency compliance in the recruitment flow** — no salary-history capture; support
      disclosure of pay ranges to candidates where the customer must provide them.
- [ ] **Candidate-facing AI notice** in the interview room (plain "an AI evaluates your interview").
- [ ] **Footer + in-room links** to all of the above.

## 9. Appointments, breach response & governance

- [ ] **Appoint an EU Representative (Art 27)** — required because you're a non-EU company offering services
      to / monitoring EU data subjects. A named entity in an EU member state.
- [ ] **Assess and (likely) appoint a DPO** — large-scale special-category processing + systematic
      monitoring usually triggers it.
- [ ] **Breach response procedure** — notify the supervisory authority within **72 hours** (current law;
      the Omnibus proposes 96h + high-risk-only — don't adopt yet) and affected candidates without undue
      delay. Keep an internal breach register.
- [ ] **Grievance / contact point** published for data-subject queries.

## 10. Stand up the AI Act high-risk conformity programme

The largest workstream, but the deadline is the furthest out — **~2 December 2027** (deferred by the
Digital Omnibus from 2 Aug 2026; the deferral was Parliament-endorsed 16 Jun 2026, adoption expected
~Jul 2026). Recruitment AI **remains** Annex III high-risk — it was *not* removed. Build this as a system:

- [ ] **Risk-management system** — continuous identification + mitigation of risks to health, safety,
      fundamental rights.
- [ ] **Data governance** — training/validation data quality, representativeness, and **bias testing /
      mitigation** (ties directly to the confidence-metric and scoring fairness work).
- [ ] **Technical documentation** — the Annex IV file describing the system, its design, and its testing.
- [ ] **Automatic logging / record-keeping** of the system's operation for traceability.
- [ ] **Transparency + instructions for use** provided to your deployers (the recruiter customers), so
      they can meet *their* duties (candidate notice, human oversight, and possibly a Fundamental Rights
      Impact Assessment).
- [ ] **Human oversight designed into the product** (already started in §6).
- [ ] **Accuracy, robustness, and cybersecurity** appropriate to the risk.
- [ ] **Quality-management system** governing the above as an ongoing process.
- [ ] **Conformity assessment + CE marking** — the formal pre-market declaration the system conforms.
- [ ] **Registration in the EU database** for high-risk AI systems before going to market.
- [ ] **Post-market monitoring** — ongoing performance + incident tracking after launch.

## 11. UK track (only if the UK is in scope)

The UK left the EU regime; treat it as a second jurisdiction — in places *easier* than the EU.

- [ ] **UK GDPR + DPA 2018**, as amended by the **Data (Use and Access) Act 2025** (in force 5 Feb 2026):
      automated CV screening is permitted on **legitimate interests + safeguards** (transparency, meaningful
      human review, right to contest) — more permissive than EU Art 22.
- [ ] **ICO is actively enforcing** on AI hiring (its 2026 review found most employers non-compliant) —
      so the safeguards must actually function, with documented bias monitoring.
- [ ] **UK is *not* under the EU AI Act** — it's principles-based + ICO guidance, no separate AI statute yet.
- [ ] **Transfers to the US** use the **UK-US Data Bridge**; appoint a **UK representative** if required.

## 12. Keep watching (this won't sit still)

- [ ] **Digital Omnibus** (GDPR + AI Act amendments) — track to final text; it may narrow "personal data",
      change cookies, move breach reporting to 96h/high-risk-only, and relax automated decisions. Re-baseline
      these docs when it's enacted.
- [ ] **AI Act high-risk guidance + harmonised standards** — the practical conformity detail is still being
      published; revisit §10 as standards land.
- [ ] **Pay Transparency transposition** — member states are transposing unevenly through 2026; check each
      launch country.
- [ ] **Periodic bias review** of the scoring model (quarterly is a sensible cadence and supports both the
      AI Act and UK ICO expectations).

## Penalty reference (why this matters)

| Breach | Ceiling |
|--------|---------|
| AI Act — prohibited practice (e.g. workplace emotion recognition) | **€35M or 7%** of global annual turnover |
| AI Act — high-risk non-compliance | **€15M or 3%** |
| GDPR — core violations (lawful basis, transfers, special-category) | **€20M or 4%** |
| GDPR — lesser (records, processor duties) | **€10M or 2%** |

## Part 3 sources (verified 2026-06-26)

- AI Act: recruitment retained as high-risk, deadline 2 Dec 2027 — [Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/), [DLA Piper](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2026/The-Digital-AI-Omnibus-Proposed-deferral-of-high-risk-AI-obligations-under-the-AI-Act)
- Emotion-recognition-in-workplace prohibition (Art 5(1)(f)) — [FPF](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/), [Wolters Kluwer](https://legalblogs.wolterskluwer.com/global-workplace-law-and-policy/the-prohibition-of-ai-emotion-recognition-technologies-in-the-workplace-under-the-ai-act/)
- GDPR biometric proctoring / facial-recognition enforcement + DPIA — [VinciWorks](https://vinciworks.com/blog/is-your-use-of-facial-recognition-breaking-the-law-lessons-from-irelands-e550k-fine/), [EDPB](https://www.edpb.europa.eu/news/news/2022/edpb-adopts-guidelines-calculation-fines-guidelines-use-facial-recognition_en)
- Digital Omnibus GDPR changes (personal data / cookies / 96h breach / ADM) — [White & Case](https://www.whitecase.com/insight-alert/gdpr-under-revision-key-takeaways-from-digital-omnibus-regulation-proposal), [Stephenson Harwood](https://www.stephensonharwood.com/media/4oajo5bu/styled-digital-omnibus-article-nov-2025.pdf)
- EU-US DPF valid 2026 (Latombe); India no adequacy until ~2028–29 — [Epstein Becker Green](https://www.workforcebulletin.com/adequacy-of-the-eu-u-s-data-privacy-framework-survives-challenge), [DPDPA.com](https://www.dpdpa.com/blogs/india_eu_data_adequacy_dpdpa_gdpr.html)
- Pay Transparency Directive (salary-history ban, 7 Jun 2026) — [Boundless](https://boundlesshq.com/blog/the-eu-pay-transparency-directive-a-complete-guide-for-employers/), [Ogletree](https://ogletree.com/insights-resources/blog-posts/eu-pay-transparency-directive-updates-on-implementation-across-member-states/)
- UK DUAA 2025 ADM in recruitment + ICO enforcement — [ICO](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/03/automated-decisions-can-streamline-the-hiring-process-with-the-right-safeguards-in-place/), [Ropes & Gray](https://www.ropesgray.com/en/insights/viewpoints/102mpug/helping-hand-or-complete-control-ai-in-recruitment-in-the-eu-and-uk)
