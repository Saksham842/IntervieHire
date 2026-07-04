# IntervieHire — Privacy/Trust Competitive Benchmark

> **Date:** 2026-06-27 · **Purpose:** compare our privacy & trust posture with comparable
> AI-hiring players and identify where we can be better.
> **Method:** public web research of each vendor's privacy policy, candidate notice, trust
> center, and security/AI pages. Some artifacts (DPAs, SOC 2 reports, full sub-processor
> registers) sit behind trust-center gates and are marked accordingly. Not legal advice.

## Who we compared, and why

| Vendor | Why it's a benchmark |
|---|---|
| **HireVue** (+ Modern Hire) | The AI-video-interview leader; most-scrutinised (EPIC FTC complaint). Sets the bar for biometric retreat + AI explainability. |
| **Sapia.ai** (ex-PredictiveHire) | AI-fairness leader; **text-only** by design; first AI-interview firm with ISO 42001. |
| **Paradox / Olivia** | Conversational recruiting; "AI automates, humans decide" framing. Being acquired by Workday (2025). |
| **Talview** | India-HQ (Bengaluru) peer that, like us, does **video + proctoring + biometric + AI scoring**. |
| **iMocha** | India-rooted skills-assessment peer. |
| **HackerRank / Codility** | Enterprise assessment players with mature data-governance / trust centers. |

## Side-by-side

| Dimension | **IntervieHire (us)** | HireVue | Sapia.ai | Talview (India) | HackerRank / Codility |
|---|---|---|---|---|---|
| **Biometric capture** | Face + gaze + **voice** proctoring, violation clips | **Dropped facial/visual analysis (2021)** — now language-only NLP | **None** — text-only AI; video (if used) is **not** AI-scored | Face match/detect, video/screen/audio, **gaze**, facial-expression scoring (TBI) | Webcam snapshots / behavioural events (proctoring) |
| **AI explainability** | Not published yet | **Annual "AI Explainability Statement" (PDF, 2024/2025)** | **FAIR™ framework + model cards** | High-level "ethical AI" only, no methodology | Minimal |
| **Bias / adverse-impact audit** | Not published | O'Neil independent audit (scope criticised) | Adverse-impact testing, 4/5ths rule, re-testing | Marketing-level only | Minimal |
| **Automated decision / human-in-loop** | Human decides (verified in code) — stated in policy | "Decision support; human decides" | "Decision support; human decides" | Implied | n/a |
| **Candidate feedback** | None | Candidate FAQ/help center | **Free personality + coaching report to every candidate** | None | Candidate FAQ |
| **Certifications** | **None yet** | ISO 27001:2022, **ISO 27701**, SOC 2 Type 2, SOC 3, FedRAMP, EU-US/UK/Swiss **DPF** | ISO 27001, SOC 2 Type 1&2, **ISO 42001 (AI mgmt)** | ISO 27001, SOC 2 Type II (no 27701) | ISO 27001, SOC 1/2, GDPR |
| **Trust center** | None | SafeBase (trust.hirevue.com) | SafeBase (trust.sapia.ai) | talview.com/trust-center | security.hackerrank.com |
| **Published sub-processor list** | Enumerated in our policy draft | Gated (DPA + subscription URL, ~10-day notice); only AWS named publicly | Categories only (gated) | None named | Codility: DPA + objection rights; one named (iMocha: Tecknack) |
| **Data residency** | Supabase (no India region) — US/EU | Co-located US + Europe; regional options | **Regional: AU / UK / US / EU** (AWS) | Azure; EU-for-EU-clients; India back-office access | AWS-based |
| **Concrete retention** | Placeholders | Customer-configured auto-purge (~3yr typical) | Retains **anonymised** data indefinitely | **Vague** ("as long as required") | **Codility: proctoring snapshots 30 days** |
| **India / DPDP done properly** | **Yes — DPDP-itemised, named Grievance Officer, multilingual, nomination** | No | No | **No** — no Grievance Officer, no DPDP reference, no India section | No |

## The five patterns that matter

1. **The market leaders RETREATED from facial/visual analysis — we lean into it.** HireVue dropped facial analysis (2020) **and even voice/tone analysis (2021)** — its AI now scores **only the transcribed words** (its RoBERTa-based "CUSTARD" NLP). Sapia's entire pitch is *"video productises bias"* and it refuses to AI-score video. We do face **+ gaze + voice**. Among serious peers, only Talview matches our biometric intensity. The regulatory and reputational direction of travel is **away** from what we do most.
2. **Nobody does India well — not even the Indian peers.** Talview (Bengaluru) and iMocha both **fail to name a Grievance Officer or reference the DPDP Act/SPDI Rules**, despite being India-rooted. Our policy already does all three. **This is our clearest differentiation.**
3. **AI transparency is now a published artifact, not a paragraph.** HireVue publishes a dated annual *AI Explainability Statement*; Sapia publishes a *FAIR framework* + *model cards* + holds *ISO 42001*. We have neither.
4. **Trust = certifications + a trust center.** Every serious peer has SOC 2 Type II + ISO 27001 and a public trust portal. We have **none yet** — this blocks enterprise deals.
5. **Concrete beats vague.** Codility states "proctoring snapshots kept 30 days." Vague retention (Talview) reads as immature. Our policy still has `[N]` placeholders.

## Cautionary tale: *Deyerler v. HireVue* (the BIPA class action)

This is the most directly relevant precedent to us. HireVue was sued under Illinois BIPA for capturing
**facial geometry** without proper written consent / retention policy. In Feb 2024 the court **denied
the motion to dismiss** on the core claims, holding that **facial geometry is a "biometric identifier"
even when not used to identify the person** — exactly the "we don't use it to identify you" defense
HireVue (and HackerRank) lean on. The case was voluntarily dismissed in Jan 2026 with **no merits
ruling** (terms undisclosed). Lesson for us: our face **and** gaze **and** voice capture is squarely the
kind of processing that draws BIPA-style class actions; "we don't identify you" is **not** a safe harbor.
The cheapest insurance is explicit written biometric consent + a published retention policy + minimisation
— and ideally reducing how much biometric we collect at all.

## Where our policy is ALREADY ahead

- **India/DPDP**: itemised notice, named Grievance Officer, 90-day grievance, **nomination right**, multilingual-on-request — beats both Indian peers.
- **Dual controller/processor role** is spelled out (most peers only frame themselves as processor).
- **Cross-border honesty**: we explicitly disclose every offshore processor; peers gate this.
- **Human-in-the-loop** is real (verified in code) and stated — parity with the best.

## How ours gets better — prioritised

### A. Policy/disclosure (I can do these now)
1. **Add an "AI Explainability Statement"** section (how scoring works, what it does/doesn't use, that it doesn't read protected traits) — match HireVue; consider an annual dated version.
2. **Add a concrete fairness/bias-testing commitment** — adverse-impact / 4/5ths testing, re-tested after model changes — match Sapia's FAIR. Don't just say "auditable."
3. **Fill retention with real numbers** — peer precedents to anchor to: **Codility** keeps proctoring snapshots **30 days**, candidate data **12 months**; **HackerRank** caps webcam images at **~90 days** (GDPR), biometric/facial images at **3 years** (Illinois), and anonymises **14 days** after a deletion request. Pick concrete numbers and kill the `[N]` placeholders.
4. **Publish a clean, dated, public sub-processor list** with a change-notification subscribe — *beat* the peers who gate it.
5. **Write a separate candidate-facing privacy FAQ** (plain-language), distinct from the corporate policy — HireVue/Codility/Sapia all have one. **Best template = HackerRank's three-doc model**: a privacy policy + a **Candidate AI Notice** + an **Image Detection Notice**, with a **separate, explicit *written* biometric consent** step (not bundled into general T&Cs). Given *Deyerler*, separate written biometric consent is the single most protective thing to copy.
6. **Lean hard into the India/DPDP advantage** — make it a visible selling point, not just compliance.

### B. Trust & certification roadmap (product/ops — not policy text)
7. **SOC 2 Type II + ISO 27001** — table stakes for enterprise; we have neither. Then chase **ISO 27701** (privacy) and **ISO 42001** (AI management) as differentiators — Sapia already has 42001.
8. **Stand up a trust center** (SafeBase/Sprinto) with downloadable certs.
9. **EU data residency option** (Supabase has EU regions) for GDPR customers; explore an India-resident tier — peers offer regional hosting, we don't.
10. **EU-US Data Privacy Framework / SCCs** signed with each US sub-processor; **a vulnerability-disclosure policy** (HireVue uses HackerOne).

### C. Strategic — the biggest lever
11. **Reconsider the biometric posture.** The leaders moved away from facial/visual analysis; we do face + gaze + voice. Options, in order of ambition: (a) make proctoring **optional / configurable** per role; (b) offer a **text-only interview mode** (Sapia's entire moat) as a low-risk tier; (c) **minimise** what biometric we retain (process-in-memory, store events not clips). This simultaneously cuts BIPA/DPDP risk **and** opens a "privacy-first" positioning the incumbents vacated.

## Useful data point for the (parked) US-LLM decision

Both AI-interview leaders run their scoring LLM on **Anthropic Claude via AWS Bedrock** — HireVue
names *Amazon Bedrock + Anthropic PBC* in its **public** sub-processor list, and Sapia hosts on AWS
Bedrock + Claude with "zero sharing with AI providers." This validates **Claude-on-Bedrock** as the
industry-standard pick for our DeepSeek→US-LLM swap: it stays in our existing US/AWS footprint, offers
contractual no-training terms, and matches what the most scrutinised peers chose.

## Sources (key)
- HireVue: [Candidate FAQ](https://www.hirevue.com/candidates/faq), [AI facts/myths](https://www.hirevue.com/blog/hiring/ai-in-hiring-facts), [2025 AI Explainability Statement](https://www.hirevue.com/wp-content/uploads/2025/10/HV_2025_AI-Explainability-Statement.pdf), [Enterprise security/compliance](https://www.hirevue.com/platform/enterprise-security-compliance), [trust.hirevue.com](https://trust.hirevue.com/), [DPA](https://www.hirevue.com/legal/dpa), [facial analysis discontinued (SHRM)](https://www.shrm.org/topics-tools/news/talent-acquisition/hirevue-discontinues-facial-analysis-screening)
- Sapia.ai: [Candidate explainer](https://sapia.ai/candidate-explainer/), [Security](https://sapia.ai/security/), [Data governance](https://sapia.ai/data-governance/), [ISO 42001 announcement](https://sapia.ai/resources/blog/sapia-ai-certified-to-iso-iec-42001-setting-the-global-standard-for-responsible-ai-in-hiring/), [video-interviewing bias](https://sapia.ai/resources/blog/video-interviewing-bias/)
- Talview: [Privacy](https://www.talview.com/en/privacy), [GDPR](https://www.talview.com/gdpr), [Compliance](https://www.talview.com/compliance), [Trust center](https://www.talview.com/trust-center)
- iMocha: [Privacy](https://www.imocha.io/privacy-policy)
- HackerRank: [Trust](https://www.hackerrank.com/trust/), [security.hackerrank.com](https://security.hackerrank.com/)
- Codility: [Data Privacy Notice](https://www.codility.com/data-privacy-notice/), [DPA](https://www.codility.com/wp-content/uploads/2025/01/Data-Processing-Agreement-Template-WEBSITE-2023-1.pdf), [GDPR](https://support.codility.com/hc/en-us/articles/360043317634-Codility-is-GDPR-Compliant)
