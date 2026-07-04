# IntervieHire — Legal & Compliance Roadmap (India)

> **Scope:** India-only. Customers (recruiters) and candidates assumed to be in India.
> **Status:** living checklist. Tick boxes as you go.
> **Verified:** 2026-06-26 — every codebase claim is checked against the actual source
> (file:line cited); every legal claim against current Indian law (DPDP Rules notified
> 13 Nov 2025; IT "synthetic content" amendment in force 15 Nov 2025). Sources at the bottom.
> **⚠️ Not legal advice.** Written by an AI as an engineering/orientation roadmap. Before
> launch, have an Indian data-protection lawyer sign off the consent flow + Privacy Policy /
> Terms. This doc's job is to get you ~90% there so that review is fast and cheap.

---

## The compliance clock (read first)

India's data law (**DPDP Act 2023**) now has operative **DPDP Rules 2025**, notified
**13 Nov 2025**, phased:

| Date | What turns on |
|------|----------------|
| **14 Nov 2025** | Definitions, Data Protection Board of India (DPBI), procedure. *(now)* |
| **~Nov 2026** | Consent Manager registration regime. |
| **13 May 2027** | **Substantive obligations** — consent, notice, security, data-principal rights, children's/disabled-persons' data. **Same date: old IT Act §43A + SPDI Rules 2011 are omitted.** |

Also already in force: **IT Rules "synthetically generated information" amendment (15 Nov 2025)**
— AI-generated audio-visual must be labelled (see §Accessibility & AI-content below).

**Your real deadline is 13 May 2027.** Consent flows, deletion endpoints, vendor contracts
and policies take months and block on each other. Treat *now → mid-2027* as the build window.

---

## What you actually collect & where it goes (verified against code)

This is the heart of the matter — the law only bites where data flows. **Almost nothing stays
in India.**

### Personal data collected
- **Biometric — face & gaze.** MediaPipe facial-landmark detection (468 pts) + gaze tracking;
  records video "violation" clips sent to the server over WebSocket.
  _`interview-engine/apps/web/hooks/useProctoring.ts` (~6–60, 1266–1494, 1697–1762)._
- **Biometric — voice.** Candidate **audio is recorded and transcribed** via **Deepgram** and
  **OpenAI Whisper**, with live voice streamed to the **Convai** avatar. Voiceprints are biometric.
  _`interview-engine/apps/api/src/services/asr.service.ts` (~40–132); `vapi-config.service.ts`._
- **Transcripts.** Full interview transcripts stored (`TranscriptEvent`, `InterviewTranscript`)
  + a `video_url` on `interview_reports`. _`apps/api/prisma/schema.prisma` ~142–170._
- **Resume PII.** Name, email, phone, full resume text extracted and stored — and the resume text
  is **sent to a US/EU AI provider** for parsing/scoring (DeepSeek/China removed 2026-06-27; product
  code intentionally unchanged, so call sites may remain — clean up). _`backend/app/utils/resume_parser.py`
  (~139–202); `dashboard/src/dashboard/resume-analysis.ts`._
- **Sourced third-party PII.** "Talent Finder" searches **GitHub / Brave / Google** for candidate
  profiles — i.e. processes personal data of people who **never applied**.
  _`backend/app/talent_finder/*`; keys in `backend/.env.example`._

### Where it physically lives / who receives it
- **⚠️ The whole database is outside India.** **Supabase offers no India region** → all candidate
  PII is stored in the **US/EU**. Backend on **Render (US)**, frontends on **Vercel (US)**.
  _`backend/.env.example`, `interview-engine/.env.example` (`*.pooler.supabase.com`); `render.yaml`._
- **External services** that may receive personal data — **all now US/EU** (DeepSeek/China removed
  2026-06-27): the **AI evaluation provider (US/EU)** — résumé + answers;
  **Deepgram, OpenAI/Whisper, OpenRouter, ElevenLabs, Convai (US)** — audio/eval; **Google Calendar,
  Gmail/SMTP, Resend (US)** — name/email/links; **Gemini, Groq, xAI/Grok (US)** — eval fallbacks; **Brave,
  Google CSE, GitHub (US)** — sourcing. _Hosts in each component's `.env.example`._
- **Correction to an earlier note:** the zero-key deterministic evaluator avoids the *LLM call*,
  but candidate data is **still stored on Supabase outside India**. "No data leaves India" is **not**
  true on any current path.

### Consent & legal surface — none
- Only a *technical* permission gate ("Grant access before gaze calibration") — **no informed
  consent**, no disclosure of face/gaze/voice capture or AI scoring.
  _`interview-engine/apps/web/app/interviewcandidateroom/page.tsx` ~408–462._
- No Privacy Policy, Terms, consent text, deletion endpoint, grievance contact anywhere in repo;
  landing footer has no legal links. _`dashboard/src/landing/Sections.jsx` ~515–546._
- IntervieHire runs a **public demo + public scheduling** path where candidates interact directly →
  **IntervieHire is itself a Data Fiduciary (controller)**, not merely a processor.
  _`interview-engine/apps/api/src/routes/interview.routes.ts` ~138–232; `backend/app/routers/public.py`._

> **"Sensitive" status:** until **13 May 2027** SPDI Rules 2011 classify biometric (face + voice)
> as *sensitive* needing consent. After that DPDP applies (no special category) — but biometric is
> still personal data needing consent + security. **Conclusion unchanged: get consent, secure it.**

---

## The cross-border reality (recalibrated)

Earlier I called DeepSeek "the biggest legal landmine." The real picture is broader and calmer:
**your entire stack is offshore, and under DPDP that is currently legal by default** — §16 uses a
*negative list* (transfers allowed except to countries the government restricts) and **no restricted
list has been notified as of mid-2026**. So Supabase-US and Deepgram-US are *permitted today*
(DeepSeek/China has since been removed — 2026-06-27). The real obligations/risks:

- **Disclose every cross-border processor** in your notice/consent and DPA sub-processor list.
- **You stay liable** for the data after it's transferred.
- **DeepSeek/China *was* the highest-risk node — now removed (2026-06-27).** India has restricted
  Chinese apps before; removing it eliminates that node (kept here for rationale).
- **Localization pressure** will come from bigger customers even though the law doesn't force it.

**Decision (2026-06-26) — ✅ DONE (2026-06-27): the scoring + resume-parsing LLM has been moved off
DeepSeek (China); all AI providers are now US/EU.** Net effect and residual concerns below (the
US-specific concerns still apply). ⚠️ Operational + legal-doc change — confirm no deployed code path
still calls DeepSeek and clean up remaining call sites in the product.

**What the swap fixes**
- Removes the single highest-risk node — China is the most plausible future DPDP restricted-country
  entry, and the one enterprise/government buyers reject outright.
- Consolidates into the US, where your stack *already* lives (Supabase, Render, Vercel, Deepgram,
  OpenAI/Whisper) — no *new* jurisdiction is added.

**What the swap does NOT fix**
- Data is **still outside India** → still a cross-border transfer under §16 (legal by default, US not
  on any restricted list), so you **still must disclose it** in the notice + sub-processor list + DPA.
  China→US is a risk *reduction*, not *elimination*.
- It does **not** satisfy India data-localization, which big/government customers may still demand.
  True localization needs India-region hosting + an India-served model (limited) or an on-prem tier.

**New US-specific concerns to actively manage** (the real "what now")
1. **No-training guarantee** — use the provider's **API/enterprise tier** with a contractual commitment
   that candidate data is **not used to train models** (Anthropic, OpenAI API, Azure OpenAI, Bedrock all
   offer this; consumer tiers may not). Verify before sending real candidates.
2. **Zero / short retention** — request zero- or limited-retention so transcripts aren't kept long.
3. **Sign the provider's DPA** + add them to the sub-processor list + Privacy Policy.
4. **US government access (CLOUD Act)** — US providers can be compelled to disclose data to US
   authorities; lower political salience in India than China, but enterprise security reviews ask.
   Mitigate with encryption + data minimization (next point).
5. **Data minimization in the prompt** — today the payload sends `candidateId`, `companyId`, and the
   full transcript. The scorer needs only the **answer text + rubric**, not the candidate's identity.
   **Strip/pseudonymize direct identifiers before the call** — cuts exposure regardless of provider.

**Provider:** recommended default **Anthropic Claude** (no training on API data, zero-retention
available, strong DPA, top-tier rubric reasoning). Best *enterprise-compliance story* alternative:
**Azure OpenAI** (region pinning, Microsoft DPA). **OpenAI direct** is lowest-friction (already used for
Whisper). Lock this in before implementation.

---

## Phase 0 — Stop collecting what you can't defend  ⏱ start now

> **Status (2026-06-26):** ✅ Informed-consent gate + 18+ self-attestation + decline screen are
> **built** in the candidate room — camera/mic/screen capture and the face/object models now stay
> **off** until the candidate ticks two un-pre-ticked boxes and clicks "I agree" (via a new
> `proctoringEnabled` gate on `useProctoring`). Consent is logged client-side (version + timestamp +
> scope) in `localStorage`. **Still open:** server-side consent persistence, verifiable guardian
> consent for under-18 / disabled candidates, retention auto-delete, the LLM swap, the Convai key fix.

Camera + **microphone** + face/gaze data captured with **no informed consent**. Fix first. Code — I
can build it.

- [ ] **Informed consent screen before capture.** Upgrade the permission gate into real consent:
      plain-language disclosure that the interview uses **camera (face + gaze)** and **microphone
      (voice recorded + transcribed)**, may record clips, sends data to third parties **including
      outside India**, and is **AI-scored**. Explicit, un-pre-ticked "I agree". Link the Privacy Policy.
- [ ] **Decline path.** Offer the typed interview (zero-key text path exists) or a clear "cannot
      proceed". Log the choice + consent version + timestamp (you must be able to prove consent).
- [ ] **Under-18 + persons-with-disabilities.** ⚠️ DPDP §9 + Rule 10 require **verifiable parental/
      guardian consent** for **under-18 candidates** *and* for **persons with disabilities who have a
      lawful guardian** (penalty ceiling ₹200 cr). Either **age-gate to 18+** and route guardianship
      cases to a manual path, or build verifiable guardian consent (Rule 10 / DigiLocker). Decision: ____.
- [ ] **Retention rule.** Auto-delete clips, audio, transcripts, scores once purpose is served
      (e.g. N days after the hiring decision): ______ days. **But** DPDP Rules require keeping
      **security/access logs ≥1 year** — delete the *personal data*, retain those *logs*.
- [~] **Swap DeepSeek → US/EU LLM — done operationally (2026-06-27); all AI now US/EU.** ⚠️ Product
      code was intentionally left unchanged, so DeepSeek call sites likely remain (engine
      `evaluation.service.ts`, dashboard `resume-analysis.ts`, backend `resume_parser.py` /
      `deepseek.py`) — **clean these up** so no path can reach China, and confirm the deployment can't.
      Keep the **zero-key deterministic fallback**. Use the provider's **JSON/structured-output mode**,
      a cost-appropriate tier, and **pseudonymize the prompt** (drop candidateId/name). Update **api.md**.
- [ ] **Security hygiene.** `NEXT_PUBLIC_CONVAI_API_KEY` ships the avatar key to the browser — move
      secret-bearing calls server-side. DPDP requires "reasonable security safeguards"; leaked keys
      undercut that. _`interview-engine/apps/web/.env.example`._

---

## Phase 1 — Baseline documents  ⏱ 1–2 weeks

Must describe what the product *actually* collects (resume PII, face + voice biometrics, transcripts,
AI scores) and **name every sub-processor**. DPDP requires an **itemized notice**: data, purposes,
retention, how to withdraw consent, how to exercise rights, how to complain to the DPBI.

- [ ] **Privacy Policy / DPDP notice** — itemized; names the US/EU AI provider + Deepgram + OpenAI +
      Supabase + the rest; states cross-border transfer explicitly.
- [ ] **Multilingual notice** — DPDP requires the notice be available in any of the **22 Eighth-Schedule
      languages on request** (Hindi, Tamil, Bengali, …). At minimum architect for it.
- [~] **Terms of Service** (recruiters — the paying users). **Draft written** → `legal/TERMS-OF-SERVICE.md`
      (recruiter/Client B2B terms; fill brackets + lawyer sign-off).
- [ ] **Candidate AI-notice** — short, plain "an AI evaluates your interview," shown in-room.
- [ ] **Footer + interview-room links** to all of the above. _`dashboard/src/landing/Sections.jsx`._

---

## Phase 2 — Data-principal rights & governance  ⏱ next month

DPDP gives every candidate rights you must honour, plus security duties.

- [ ] **Access (§11)** — summary of their data + processing.
- [ ] **Correction & erasure (§12)** — needs an endpoint + documented process, not a manual scramble.
- [ ] **Grievance redressal (§13)** — published contact; **must resolve within 90 days**.
- [ ] **Nomination (§14)** — let a candidate nominate someone to exercise rights on death/incapacity.
- [ ] **Consent withdrawal** as easy as giving it.
- [ ] **Security safeguards (Rules-specified)** — encryption, access controls + logs, backups, and
      **breach notification to DPBI + affected candidates within 72 hours**.
- [ ] _(Scale only)_ If named a **Significant Data Fiduciary**: annual **DPIA + independent audit +
      DPO-in-India + algorithmic-fairness assessment** of the scoring model. Flag for later.

---

## Phase 3 — Your dual role + B2B obligations  ⏱ before first paying customer

You are **both**: a **Data Fiduciary (controller)** for self-serve/demo/direct candidates, **and** a
**Data Processor** for recruiter-driven candidates. Both sets of duties apply.

- [~] **Data Processing Addendum (DPA)** template for recruiter contracts (you as processor). **Draft
      written** → `legal/DATA-PROCESSING-ADDENDUM.md` (Art. 28 processor terms; annexes for processing
      details, security measures, sub-processors, SCCs; fill brackets + lawyer sign-off).
- [ ] **Sub-processor agreements** — you need DPAs/terms *with* your AI provider, Deepgram, OpenAI,
      Supabase, etc., and must disclose them downstream.
- [ ] **Talent Finder review.** Scraping GitHub/search profiles processes personal data of non-
      applicants. DPDP's "publicly available" carve-out is **narrow** (data the person *themselves*
      made public) and contested for recruitment reuse — get this legally reviewed before relying on it.
- [ ] **Written security baseline** (encryption, access control, breach response).

---

## Accessibility, non-discrimination & AI content  ⏱ design-level, ongoing

- [ ] **RPwD Act 2016 (binds private employers).** Gaze/face/voice proctoring can systematically flag
      **blind, low-vision, motor-impaired, or neurodivergent** candidates ("gaze away", "no face") →
      **disability-discrimination risk** for you and your customers. Provide **accommodations / an
      accessible interview mode** and don't let proctoring "violations" auto-reject.
- [ ] **Equal Opportunity Policy.** Once you (or a customer establishment) reach **20+ employees**,
      RPwD requires a published EO policy. Note for Phase 4.
- [ ] **AI-avatar labeling — now law.** The IT Rules **SGI amendment (in force 15 Nov 2025)** requires
      AI-generated audio-visual to be **clearly and prominently labelled** (visual + audio disclosure).
      **Label the avatar as AI-generated.** _`interview-engine/apps/web/...avatar/...`._
- [ ] **Model-bias / fairness (voluntary today).** No statute mandates hiring-AI bias audits yet, but
      LLM scoring can embed language/accent/gender bias → reputational + future-law risk. Keep
      scoring auditable; consider periodic fairness checks.

---

## Phase 4 — Corporate / business legal  ⏱ parallel track, with a CA/CS

Templates I can help with; **filing needs a professional**.

- [ ] **Incorporate** a **Private Limited Company** via the **MCA** portal.
- [ ] **DPIIT "Startup India"** recognition (tax + compliance benefits).
- [ ] **GST registration** (past threshold / B2B invoicing).
- [ ] **Founder IP-assignment agreements** — ensure the company owns the code.
- [ ] **Trademark** "IntervieHire" (word + logo) with the Indian Trade Marks Registry.
- [ ] **Customer MSA** template; **Equal Opportunity Policy** at 20+ employees (RPwD).

---

## Not law yet — but watch

- **AI (Ethics & Accountability) Bill, 2025** — a *Private Member's Bill* (rarely passes) proposing
  bias audits + employment-AI limits. Direction-of-travel only.
- **Digital India Act** (draft since 2023) — will eventually replace the IT Act 2000, may regulate AI.

---

## Suggested order of attack

1. **Phase 0** — consent (now incl. **voice**) + under-18/guardian + cross-border decision + key hygiene.
2. **Phase 1** — documents + multilingual notice + full sub-processor list.
3. **Accessibility** — AI-avatar label (already law) + an accessible interview mode (discrimination risk).
4. **Phase 2** — erasure/rights endpoints + 72-hr breach process (before May 2027).
5. **Phase 3 / 4** — when you start selling / hiring.

> I can build the engineering items (consent screen incl. audio, age gate, avatar AI-label, erasure
> endpoint, server-side key fix, footer links) and draft first-version documents grounded in the real
> data flow. Corporate filing → CA/CS. Final policy + consent sign-off → an Indian DP lawyer.

---

## Sources (verified 2026-06-26)

- DPDP Rules 2025 — notification & phased timeline — [EY India](https://www.ey.com/en_in/insights/cybersecurity/transforming-data-privacy-digital-personal-data-protection-rules-2025), [India Briefing](https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html/), [PIB PDF](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)
- Cross-border §16 negative list; no restricted list yet — [Mondaq](https://www.mondaq.com/india/data-protection/1764976/from-localisation-debates-to-a-negative-list-making-cross-border-data-transfers-work-under-indias-dpdp-act), [K&K](https://ksandk.com/data-protection-and-data-privacy/indias-new-cross-border-data-transfer-framework/)
- §43A / SPDI Rules omitted w.e.f. 13 May 2027 — [Taxmann](https://www.taxmann.com/post/blog/dpdp-act-vs-it-act), [ConsentOS](https://consentos.in/learn/dpdp-vs-it-act/)
- Penalty schedule (₹250 cr security / ₹200 cr breach / ₹200 cr children) — [DPDPA.com](https://www.dpdpa.com/blogs/dpdpa_penalties_explained_50_crore_250_crore_fines.html), [DPDP Comply](https://dpdpcomply.com/blog/dpdp-act-penalties-explained)
- Notice language (22 Eighth-Schedule langs); rights — access/correction-erasure/grievance(90 days)/nomination; guardian consent — [Certinal](https://www.certinal.com/blog/multilingual-consent-under-dpdp-act), [Chandhiok](https://www.chandhiok.com/post/your-rights-and-duties-as-a-data-principal)
- Children / verifiable parental & guardian consent (Rule 10, DigiLocker) — [Consent.in](https://www.consent.in/blog/child-consent), [Chambers](https://chambers.com/articles/child-s-personal-data-and-privacy-analysing-the-draft-dpdp-rules-2025)
- IT Rules SGI / AI-content labeling, in force 15 Nov 2025 — [MeitY explanatory note (PDF)](https://www.meity.gov.in/static/uploads/2025/10/8e40cdd134cd92dd783a37556428c370.pdf), [Vaish](https://www.vaishlaw.com/regulation-of-ai-generated-deepfake-content-and-synthetically-generated-information-sgi-in-india/), [Freshfields](https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/india-targets-deepfakes-and-ai-generated-content-key-changes-under-meitys-2026-102mjwn)
- RPwD Act 2016 binds private employers; EO policy at 20+ — [Nishith Desai](https://www.nishithdesai.com/SectionCategory/33/Research-and-Articles/12/65/WhiteCollarandInvestigationsPractice/5108/7.html), [HSF Kramer](https://www.hsfkramer.com/notes/employment/2017-10/india-implementation-of-the-rights-of-persons-with-disabilities-act-2016)
- No AI-hiring statute; AI Bill 2025 / Digital India Act pending — [White & Case AI Tracker](https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-india), [IBA](https://www.ibanet.org/artificial-intelligence-in-Indian-workplaces)
