// Deep Analysis — post-interview candidate intelligence. Renders the canonical
// CandidateReport contract (Aviral's evaluation engine; see memory:
// interviehire-eval-report-contract) as a master→detail view: a ranked roster
// of interviewed candidates, drilling into one full evaluation report.
// Until the eval pipeline is wired at stitch time, reports are sampled
// deterministically per candidate from the job's blueprint so the tab is live.

import { document } from './runtime';
import { escapeHTML, sourceLabel } from './escape';
import { AppState } from './state';
import { filterCandidatesByDateRange } from './render-views';
import { soundEngine } from './sound';
import { isApiMode, apiFetchCandidateReport, apiFetchTestReport } from './api';
import type { Candidate, Job } from './types';

const DIMENSIONS = ['Correctness', 'Depth', 'Clarity', 'Communication', 'Role alignment'];

// The evaluation engine emits a different dimension set per question type
// (technical vs behavioral vs system_design vs coding …), so a mixed interview
// yields a long, uneven skillScores list of raw snake_case keys. We map keys to
// human labels, order by canonical priority (broadly-assessed core dimensions
// first), and cap the list with a toggle — faithful to the data, just legible.
const normKey = (k: unknown): string => String(k || '').toLowerCase().replace(/\s+/g, '_');
const DIM_LABELS: Record<string, string> = {
  relevance: 'Relevance', correctness: 'Correctness', completeness: 'Completeness',
  depth: 'Depth', clarity: 'Clarity', communication: 'Communication', role_alignment: 'Role alignment',
  ownership: 'Ownership', impact: 'Impact', reflection: 'Reflection',
  requirements_understanding: 'Requirements', architecture: 'Architecture', tradeoffs: 'Trade-offs',
  scalability: 'Scalability', failure_handling: 'Failure handling',
  problem_framing: 'Problem framing', analysis_quality: 'Analysis quality',
  business_judgment: 'Business judgment', recommendation_quality: 'Recommendation',
  discovery_quality: 'Discovery', objection_handling: 'Objection handling',
  customer_empathy: 'Customer empathy', persuasion: 'Persuasion', structure: 'Structure',
  motivation: 'Motivation', professionalism: 'Professionalism', risk_flags: 'Risk flags',
  concept_coverage: 'Concept coverage', examples: 'Examples',
  problem_understanding: 'Problem understanding', algorithm_correctness: 'Algorithm correctness',
  edge_cases: 'Edge cases', complexity_analysis: 'Complexity analysis', code_quality: 'Code quality',
  addressed_followup: 'Follow-up handling', depth_expansion: 'Depth expansion',
  consistency: 'Consistency', adaptability: 'Adaptability',
};
// Cross-cutting dimensions lead; specialised per-type dimensions follow, ordered
// by how many answers actually scored them (set in dimensionsSection).
const DIM_PRIORITY = ['correctness', 'algorithm_correctness', 'completeness', 'concept_coverage',
  'depth', 'depth_expansion', 'clarity', 'communication', 'relevance', 'role_alignment'];
const DIM_CAP = 6;
function prettyDim(key: unknown): string {
  const n = normKey(key);
  if (DIM_LABELS[n]) return DIM_LABELS[n];
  const s = n.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function dimPriority(key: unknown): number { const i = DIM_PRIORITY.indexOf(normKey(key)); return i === -1 ? 99 : i; }

const RECO_META: Record<string, { label: string; color: string }> = {
  strong_proceed: { label: 'Strong proceed', color: '#2dd4bf' },
  proceed: { label: 'Proceed', color: '#34d399' },
  hold: { label: 'Hold', color: '#fbbf24' },
  reject: { label: 'Reject', color: '#f87171' },
  needs_human_review: { label: 'Needs review', color: '#fb923c' },
};
const SEV_COLOR: Record<string, string> = { low: '#9a9a9a', medium: '#fbbf24', high: '#fb923c', critical: '#f87171' };
const CONF_COLOR: Record<string, string> = { high: '#34d399', medium: '#fbbf24', low: '#f87171' };

function scoreColor(s: number): string {
  if (s >= 88) return '#2dd4bf';
  if (s >= 72) return '#34d399';
  if (s >= 55) return '#fbbf24';
  return '#f87171';
}
const uniq = (a?: unknown[]): any[] => [...new Set((a || []).filter(Boolean))];

// Deterministic PRNG so each candidate's sampled report is stable across renders.
function rng(seedStr: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

const GENERIC_Q = [
  { prompt: 'Walk me through a project you are proud of and your specific contribution.', questionType: 'behavioral', topic: 'Core competency', rubric: { requiredPoints: [{ description: 'Specific personal contribution' }, { description: 'Clear, measurable impact' }], redFlags: [{ description: 'Only describes the team, not themselves', severity: 'medium' }] } },
  { prompt: 'Describe a hard problem in your domain and how you approached it.', questionType: 'case_study', topic: 'Problem solving', rubric: { requiredPoints: [{ description: 'Breaks the problem into parts' }, { description: 'Weighs trade-offs' }], redFlags: [] } },
  { prompt: 'How would you explain your work to someone outside your field?', questionType: 'behavioral', topic: 'Communication', rubric: { requiredPoints: [{ description: 'Plain language, no jargon' }], redFlags: [] } },
];

export function buildSampleCandidateReport(candidate: Candidate, job: Job) {
  const rand = rng(candidate.id || candidate.name || 'seed');
  const anchor = Number.isFinite(candidate.interviewScore) ? (candidate.interviewScore as number) : Math.round(55 + rand() * 40);
  const vary = (base: number, spread: number): number => Math.max(10, Math.min(100, Math.round(base + (rand() * 2 - 1) * spread)));

  // Blueprint topics are loosely typed on Job (topics: unknown[]); treat as any[]
  // and guard each topic's `questions` so a topic authored without questions can't
  // throw here (the real engine tolerates sparse blueprints).
  const topics = ((job.functionalParameters && job.functionalParameters.topics) || []) as any[];
  let items = topics.flatMap((t: any) => (t.questions || []).map((q: any) => ({ q, topicName: t.name })));
  if (!items.length) items = GENERIC_Q.map((q) => ({ q, topicName: q.topic }));

  const questionBreakdown = items.map((item, i) => {
    const qScore = vary(anchor, 16);
    const reqs = (item.q.rubric?.requiredPoints || []).map((p: any) => p.description).filter(Boolean);
    const splitAt = Math.max(0, Math.round(reqs.length * (0.4 + rand() * 0.5)));
    const covered = reqs.slice(0, splitAt);
    const missed = reqs.slice(splitAt);
    // Seed per-dimension grounding so the evidence UI is demonstrable offline.
    // The real engine populates evidence[] with verbatim transcript quotes.
    const dimensionScores: Record<string, any> = {};
    DIMENSIONS.forEach((d, di) => {
      const dScore = vary(qScore, 12);
      const src = covered.length ? covered[(i + di) % covered.length] : null;
      dimensionScores[d] = {
        score: dScore,
        reason: `${d} graded on how the candidate handled the question's required points.`,
        evidence: src ? [`Candidate addressed “${src}”.`] : [],
        missing: dScore < 65 && missed.length ? [missed[di % missed.length]] : [],
      };
    });
    const flags = item.q.rubric?.redFlags || [];
    const triggered = (qScore < 62 && flags.length && rand() < 0.6)
      ? [{ label: flags[0].description || 'Concern', severity: flags[0].severity || 'medium', reason: 'Signal detected in the transcript.' }] : [];
    return {
      answerId: `a-${candidate.id}-${i}`,
      questionId: item.q.id || `q-${i}`,
      questionText: item.q.prompt || 'Question',
      topicName: item.topicName,
      questionOrigin: 'predetermined',
      evaluationMode: 'model_answer_based',
      overallScore: qScore,
      dimensionScores,
      modelAnswerComparison: { coveredRequiredPoints: covered, missedRequiredPoints: missed, coveredBonusPoints: [], incorrectClaims: [] },
      strengths: covered.slice(0, 2),
      weaknesses: missed.slice(0, 2),
      redFlags: triggered,
      followUpRecommendations: missed.length ? [`Probe deeper on: ${missed[0]}`] : [],
      evaluationConfidence: qScore > 75 ? 'high' : qScore > 55 ? 'medium' : 'low',
      summary: `Scored ${qScore}/100 on this question.`,
    };
  });

  // GENERIC_Q guarantees ≥1 item, but guard the divisor anyway so a future empty
  // path can never produce NaN scores.
  const denom = Math.max(1, questionBreakdown.length);
  const overallScore = Math.round(questionBreakdown.reduce((a, r) => a + r.overallScore, 0) / denom);
  const allFlags = questionBreakdown.flatMap((r) => r.redFlags);
  const hasCritical = allFlags.some((f) => f.severity === 'critical');
  const hasHigh = allFlags.some((f) => f.severity === 'high');
  let recommendation = overallScore >= 88 ? 'strong_proceed' : overallScore >= 72 ? 'proceed' : overallScore >= 55 ? 'hold' : 'reject';
  if (hasHigh && overallScore < 80) recommendation = 'hold';
  if (hasCritical) recommendation = 'needs_human_review';
  const lowR = questionBreakdown.filter((r) => r.evaluationConfidence === 'low').length / denom;
  const highR = questionBreakdown.filter((r) => r.evaluationConfidence === 'high').length / denom;
  const recommendationConfidence = lowR >= 0.35 ? 'low' : highR >= 0.6 ? 'high' : 'medium';

  const skillScores = DIMENSIONS.map((d) => ({
    skill: d,
    score: Math.round(questionBreakdown.reduce((a, r) => a + (r.dimensionScores[d]?.score || 0), 0) / denom),
    evidenceAnswerIds: questionBreakdown.map((r) => r.answerId),
  }));

  return {
    interviewId: `int-${candidate.id}`,
    candidateId: candidate.id,
    roleTitle: job.roleName || job.cardName || 'Role',
    interviewType: 'technical',
    overallScore,
    recommendation,
    recommendationConfidence,
    summary: `Candidate scored ${overallScore}/100 with a ${(RECO_META[recommendation] || RECO_META.hold).label.toLowerCase()} recommendation and ${recommendationConfidence} confidence based on transcript-only evaluation.`,
    strengths: uniq(questionBreakdown.flatMap((r) => r.strengths)).slice(0, 6),
    weaknesses: uniq(questionBreakdown.flatMap((r) => r.weaknesses)).slice(0, 6),
    redFlags: allFlags,
    skillScores,
    questionBreakdown,
    suggestedNextSteps: uniq(questionBreakdown.flatMap((r) => r.followUpRecommendations)).slice(0, 5),
    transcriptOnly: true,
  };
}

// Transient per-view UI state. Typed explicitly so the ids/keys can hold a string
// once a candidate/answer/dimension is selected (a bare literal would infer `null`
// and reject those assignments).
interface DaUiState {
  selectedId: string | null;
  openAnswerId: string | null;
  showAllDims: boolean;
  openDimKey: string | null;
  testOpen: boolean;
  hiringFilter: string;
}
const daUi: DaUiState = { selectedId: null, openAnswerId: null, showAllDims: false, openDimKey: null, testOpen: false, hiringFilter: 'all' };

// Live (api mode) report cache: candidateId -> { state:'loading'|'ready'|'pending'|'error', report?, error? }.
const liveReports = new Map<string, { state: string; report?: any; error?: string }>();

// "Run test interview" result cache: jobId -> { state:'loading'|'ready'|'none', report? }.
// Test interviews use a throwaway candidate that's excluded from the roster/funnel,
// so its report is fetched and shown separately, never added to AppState.candidates.
const testReports = new Map<string, { state: string; report?: any }>();

// Render the job's test-interview result as a separate, collapsible card above the
// roster — additive only: it does not enter AppState.candidates, the roster, or the
// stat strip, so the funnel and analytics counts are unaffected.
function testInterviewSection(job: Job, container: any): string {
  const entry = testReports.get(job.id);
  if (!entry) {
    testReports.set(job.id, { state: 'loading' });
    apiFetchTestReport(job.id)
      .then((rep: any) => testReports.set(job.id, rep ? { state: 'ready', report: rep } : { state: 'none' }))
      .catch(() => testReports.set(job.id, { state: 'none' }))
      .finally(() => { if (AppState.activeJobId === job.id && !daUi.selectedId) renderDeepAnalysisPane(job, container); });
    return '';
  }
  if (entry.state !== 'ready') return '';
  const rep = entry.report;
  const band = scoreColor(rep.overallScore);
  const open = daUi.testOpen;
  return `
    <div class="da-test-card" style="border:1px solid rgba(129,140,248,.35);background:rgba(129,140,248,.06);border-radius:12px;margin:0 0 18px;overflow:hidden;">
      <div data-action="toggle-test" role="button" tabindex="0" style="display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;">
        <span style="font-size:10px;font-weight:700;letter-spacing:.06em;color:#a5b4fc;border:1px solid rgba(129,140,248,.4);border-radius:5px;padding:2px 6px;">TEST</span>
        <span style="font-weight:600;color:#e7e7ea;">Last test interview result</span>
        <span style="margin-left:auto;font-weight:700;color:${band};">${rep.overallScore}</span>
        <button data-action="refresh-test" title="Refresh test report" style="background:none;border:none;color:#9a9a9a;cursor:pointer;font-size:14px;padding:2px 4px;line-height:1;">↻</button>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" stroke-width="2" style="transform:rotate(${open ? 90 : 0}deg);transition:transform .15s;"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      ${open ? `<div style="padding:0 14px 14px;">${functionalReportBody(rep)}</div>` : ''}
    </div>`;
}

const hasFunctional = (c: Candidate): boolean => c.interviewStatus === 'Completed' && Number.isFinite(c.interviewScore);
const hasResume = (c: Candidate): boolean => !!c.resumeAnalysis || c.matchScore != null;
const hasScreening = (c: Candidate): boolean => !!c.recruiterScreening || c.recruiterScreeningScore != null;

// ── R / S / F funnel chips ──────────────────────────────────────────────────
// Each hiring stage (Resume → Screening → Functional) resolves to one state:
//   'pass'   (green)  — stage cleared; the candidate moved on / wasn't stopped here
//   'reject' (red)    — the candidate was stopped at this stage; later stages never ran
//   'active' (yellow) — this stage is the candidate's current frontier (in progress / awaiting)
//   'idle'   (grey)   — stage not reached yet (or skipped)
// Two cascade rules make the row read like a funnel: advancing past a stage forces
// the earlier ones green (you cleared them to get there), and a rejection greys out
// every stage after it (those never happened). So a resume-rejected candidate reads
// R red · S grey · F grey, exactly as the recruiter sees the pipeline.
const STAGE_STATE_STYLE: Record<string, { color: string; bg: string; border: string; tip: string }> = {
  pass: { color: '#34d399', bg: 'rgba(52,211,153,.16)', border: 'rgba(52,211,153,.45)', tip: 'cleared' },
  reject: { color: '#f87171', bg: 'rgba(248,113,113,.16)', border: 'rgba(248,113,113,.45)', tip: 'rejected' },
  active: { color: '#fbbf24', bg: 'rgba(251,191,36,.18)', border: 'rgba(251,191,36,.5)', tip: 'in progress' },
  idle: { color: '#94a3b8', bg: 'rgba(148,163,184,.12)', border: 'rgba(148,163,184,.3)', tip: 'not reached' },
};

function deriveStageStates(c: Candidate): { resume: string; screening: string; functional: string } {
  const inList = (v: any, arr: string[]): boolean => arr.indexOf(v) !== -1;

  // Per-stage raw signals off the candidate object (see mapApplicantOutToCandidate).
  const screeningCompleted = c.screeningStatus === 'Completed' || !!c.recruiterScreening || c.recruiterScreeningScore != null;
  const screeningActive = inList(c.screeningStatus, ['Attempting', 'Evaluating']);
  const screeningRejected = c.recruiterScreening === 'Poor fit' || c.screeningStatus === 'Slot Missed';

  // A finite functional score is only minted post-interview by the eval engine, so a
  // present score means "scored/passed" even if functional_status is null or a
  // non-standard value mapInterviewStatus didn't normalise to 'Completed'. Using OR
  // (not AND) keeps the chip green in that case instead of falsely reading "in progress".
  const functionalCompleted = c.interviewStatus === 'Completed' || Number.isFinite(c.interviewScore);
  const functionalActive = inList(c.interviewStatus, ['Attempting', 'Evaluating']);
  const functionalRejected = c.interviewStatus === 'Slot Missed';

  const overallRejected = c.decision === 'rejected' || c.status === 'Rejected';

  // How far down the funnel the candidate actually got. 'Hired' is intentionally
  // excluded here so a candidate hired off an earlier stage doesn't show a phantom
  // (yellow) later stage they never attended. The reject-gated clauses pin a rejected
  // candidate to the DEEPEST stage they reached: on a reject the backend keeps
  // screening_status/functional_status (so interviewStatus/screeningStatus stay non-null)
  // even though status/decision collapse — so red lands on the stage it happened at.
  const reachedFunctional = functionalCompleted || functionalActive || functionalRejected
    || c.interviewStatus === 'Incomplete' || c.status === 'Functional'
    || (overallRejected && c.interviewStatus != null);      // survives reject: functional_status was set
  const reachedScreening = reachedFunctional || screeningCompleted || screeningActive || screeningRejected
    || c.status === 'Screening' || c.decision === 'shortlisted'
    || (overallRejected && c.screeningStatus != null);      // survives reject: screening_status was set

  let resume = 'idle';
  let screening = 'idle';
  let functional = 'idle';

  // RESUME — green ONLY once the candidate has actually advanced past resume into a later
  // stage (reachedScreening); red on a real resume-stage rejection (recruiter rejected AND
  // never advanced further); yellow while it still sits at resume awaiting a decision.
  // resume_shortlisted is just the AI's "Advance" RECOMMENDATION
  // (result.recommendation === 'Advance' — see resume-analysis.ts), NOT an actual advance,
  // so it must not turn the chip green on its own or every AI-recommended candidate falsely
  // reads "passed resume" while still parked at the resume stage.
  if (reachedScreening) resume = 'pass';
  else if (overallRejected) resume = 'reject';
  else resume = 'active';

  // SCREENING — only meaningful once the funnel reaches it.
  if (reachedScreening) {
    if (reachedFunctional) screening = 'pass';
    else if (screeningRejected || overallRejected) screening = 'reject';
    else if (screeningCompleted) screening = 'pass';
    else screening = 'active';
  }

  // FUNCTIONAL — only meaningful once the funnel reaches it.
  if (reachedFunctional) {
    if (functionalRejected || overallRejected) functional = 'reject';
    else if (functionalCompleted) functional = 'pass';
    else functional = 'active';
  }

  return { resume, screening, functional };
}

// Deep Analysis now holds ALL THREE result blocks per candidate (resume, screening,
// functional), so the roster includes anyone with at least one result — not just
// candidates who finished the interview (which left the tab empty pre-interview).
function rosterCandidates(job: Job): Candidate[] {
  // Scope to THIS job the same way every other view does: in api mode a candidate
  // belongs to the job only when its backend jobId matches. Matching on the role
  // NAME alone (the old behaviour) also swept in same-named rows from other jobs and
  // the local demo seed, so the roster showed phantom + duplicated candidates.
  const apiLive = isApiMode() && !!job._backend;
  return filterCandidatesByDateRange(AppState.candidates)
    .filter((c: Candidate) => {
      const belongsToJob = apiLive
        ? c.jobId === job.id
        : c.jobApplied === job.roleName || c.jobApplied === job.cardName;
      return belongsToJob && (hasResume(c) || hasScreening(c) || hasFunctional(c));
    });
}

// One headline number per candidate: functional score if interviewed, else resume
// match, else screening score. Null when nothing numeric exists yet.
function headlineScore(c: Candidate): number | null {
  if (hasFunctional(c)) return Math.round(c.interviewScore as number);
  const ra = c.resumeAnalysis as any;
  const m = (ra && ra.matchScore) ?? c.matchScore;
  if (Number.isFinite(m)) return Math.round(m);
  if (Number.isFinite(c.recruiterScreeningScore)) return Math.round(c.recruiterScreeningScore as number);
  return null;
}

function rosterEntry(c: Candidate) {
  const score = headlineScore(c);
  const ra = c.resumeAnalysis as any;
  let recommendation = 'hold';
  if (hasFunctional(c)) recommendation = recoFromScore(score ?? 0);
  else if (ra && ra.recommendation) {
    const r = ra.recommendation;
    recommendation = r === 'Advance' ? 'proceed' : r === 'Reject' ? 'reject' : 'hold';
  } else if (c.recruiterScreening) {
    recommendation = c.recruiterScreening === 'Good fit' ? 'proceed' : c.recruiterScreening === 'Poor fit' ? 'reject' : 'hold';
  }
  return { candidate: c, report: { overallScore: score, recommendation, recommendationConfidence: 'medium', redFlags: [], stages: { resume: hasResume(c), screening: hasScreening(c), functional: hasFunctional(c) } } };
}

const initials = (name: string | null | undefined): string => (name || '?').split(/\s+/).map((w) => w[0] || '').slice(0, 2).join('').toUpperCase();

export function renderDeepAnalysisPane(job: Job, container: any): void {
  if (!job || !container) return;
  const apiLive = isApiMode() && !!job._backend;
  // The test-interview result renders above the roster (api mode only). It's fetched
  // and cached separately so it never affects the roster or the stat strip below.
  const testHTML = apiLive ? testInterviewSection(job, container) : '';
  const entries = rosterCandidates(job).map(rosterEntry)
    .sort((a, b) => (b.report.overallScore ?? -1) - (a.report.overallScore ?? -1));
  if (!entries.length) { container.innerHTML = `<div class="da-intel">${testHTML}${emptyState(apiLive)}</div>`; bind(container, job); return; }

  const selected = daUi.selectedId ? entries.find((e) => e.candidate.id === daUi.selectedId) : null;
  if (!selected) { container.innerHTML = `<div class="da-intel">${testHTML}${rosterMarkup(job, entries)}</div>`; bind(container, job); return; }
  renderDetail(job, container, selected.candidate);
}

// ── Live path (real backend) ──────────────────────────────────────────────────
const recoFromScore = (s: number): string => (s >= 88 ? 'strong_proceed' : s >= 72 ? 'proceed' : s >= 55 ? 'hold' : 'reject');
// Detail: three stacked blocks. Resume + screening render synchronously off the
// candidate object; the functional block is sampled in local mode, or fetched live
// in api mode (loading → ready/pending/error) without blocking the other two.
function renderDetail(job: Job, container: any, candidate: Candidate): void {
  const apiLive = isApiMode() && !!job._backend;
  let functionalHTML: string;
  if (!hasFunctional(candidate)) {
    functionalHTML = `<div class="da-li muted">No functional interview completed yet.</div>`;
  } else if (!apiLive) {
    functionalHTML = functionalReportBody(buildSampleCandidateReport(candidate, job), candidate);
  } else {
    const entry = liveReports.get(candidate.id);
    if (!entry) {
      liveReports.set(candidate.id, { state: 'loading' });
      apiFetchCandidateReport(candidate.id)
        .then((rep) => liveReports.set(candidate.id, rep && Array.isArray(rep.questionBreakdown) ? { state: 'ready', report: rep } : { state: 'pending' }))
        .catch((e: any) => liveReports.set(candidate.id, { state: 'error', error: (e && e.message) || '' }))
        .finally(() => { if (daUi.selectedId === candidate.id && AppState.activeJobId === job.id) renderDeepAnalysisPane(job, container); });
      functionalHTML = functionalPending('loading');
    } else if (entry.state === 'ready') {
      functionalHTML = functionalReportBody(entry.report, candidate);
    } else {
      functionalHTML = functionalPending(entry.state, entry.error);
    }
  }
  container.innerHTML = `<div class="da-intel">${detailShell(candidate, functionalHTML)}</div>`;
  bind(container, job);
}

function functionalPending(state: string, error?: string): string {
  const msg = state === 'loading'
    ? ['Loading evaluation…', 'Fetching this candidate’s interview report from the backend.']
    : state === 'error'
      ? ['Couldn’t load the report', error || 'The backend did not return an evaluation.']
      : ['Evaluation pending', 'This interview hasn’t been scored yet. Dimensions, rubric coverage, red flags and a recommendation appear here once the engine processes the transcript.'];
  return `<div class="da-pending ${state === 'loading' ? 'is-loading' : ''}"><div class="da-pending-state">${escapeHTML(msg[0])}</div><div class="da-pending-desc">${escapeHTML(msg[1])}</div></div>`;
}

function sectionEmpty(title: string, copy: string): string {
  return `<div class="da-section"><h3 class="da-section-title">${escapeHTML(title)}</h3><div class="da-li muted">${escapeHTML(copy)}</div></div>`;
}

// Resume analysis block — match score + recommendation + evidenced strengths/gaps.
function resumeBlock(c: Candidate): string {
  const a = c.resumeAnalysis as any;
  const score = (a && a.matchScore) ?? c.matchScore;
  if (!a && score == null) return sectionEmpty('Resume analysis', 'Not analysed yet — run resume analysis on this candidate to populate this block.');
  const reco = a && a.recommendation;
  const strengths = (a && a.strengths) || [];
  const gaps = (a && a.improvements) || [];
  const recoColor = reco === 'Advance' ? '#34d399' : reco === 'Reject' ? '#f87171' : '#fbbf24';
  return `
    <div class="da-section">
      <h3 class="da-section-title">Resume analysis${score != null ? `<span class="da-dim-count" style="color:${scoreColor(score)};">${Math.round(score)}</span>` : ''}${reco ? `<span class="da-reco-chip" style="color:${recoColor};border-color:${recoColor}40;background:${recoColor}14;">${escapeHTML(reco)}</span>` : ''}</h3>
      ${strengths.length || gaps.length ? `
        <div class="da-cols">
          <div class="da-section da-half"><h3 class="da-section-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Strengths</h3>${strengths.length ? strengths.slice(0, 3).map((s: any) => `<div class="da-li ok">${escapeHTML(s)}</div>`).join('') : '<div class="da-li muted">None surfaced.</div>'}</div>
          <div class="da-section da-half"><h3 class="da-section-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/></svg> Gaps</h3>${gaps.length ? gaps.slice(0, 3).map((s: any) => `<div class="da-li warn">${escapeHTML(s)}</div>`).join('') : '<div class="da-li muted">None surfaced.</div>'}</div>
        </div>` : '<div class="da-li muted">Analysis recorded — open the full report for the breakdown.</div>'}
    </div>`;
}

// Recruiter screening block — verdict + parameter match score + status.
function screeningBlock(c: Candidate): string {
  const verdict = c.recruiterScreening;
  const score = c.recruiterScreeningScore;
  if (!verdict && score == null) return sectionEmpty('Recruiter screening', 'Not screened yet — results appear here once the candidate completes the screening stage.');
  const tone = verdict === 'Good fit' ? '#34d399' : verdict === 'Poor fit' ? '#f87171' : '#fbbf24';
  return `
    <div class="da-section">
      <h3 class="da-section-title">Recruiter screening${verdict ? `<span class="da-reco-chip" style="color:${tone};border-color:${tone}40;background:${tone}14;">${escapeHTML(verdict)}</span>` : ''}${score != null ? `<span class="da-dim-count" style="color:${scoreColor(score)};">${Math.round(score)}</span>` : ''}</h3>
      <div class="da-li">${score != null ? `Parameter match score ${Math.round(score)}/100` : 'Screening recorded'}${c.screeningStatus ? ` · status: ${escapeHTML(c.screeningStatus)}` : ''}.</div>
    </div>`;
}

function detailShell(candidate: Candidate, functionalHTML: string): string {
  return `
    <div class="da-detail-head">
      <button class="da-back" data-action="back"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> All candidates</button>
      <button class="da-open-report" data-action="open-report" data-cid="${escapeHTML(candidate.id)}">Open full report <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
    </div>
    <div class="da-detail-id" style="display:flex;align-items:center;gap:12px;margin:14px 0 4px;">
      <span class="da-avatar" style="width:40px;height:40px;font-size:15px;">${escapeHTML(initials(candidate.name))}</span>
      <div>
        <div class="da-report-name">${escapeHTML(candidate.name)}</div>
        <div class="da-report-role">${escapeHTML(candidate.jobApplied || '')}</div>
      </div>
    </div>
    ${resumeBlock(candidate)}
    ${screeningBlock(candidate)}
    <div class="da-section">
      <h3 class="da-section-title">Functional interview</h3>
      ${functionalHTML}
    </div>`;
}

function emptyState(apiMode?: boolean): string {
  const desc = 'Run resume analysis, recruiter screening or the AI interview on a candidate and they appear here — each row holds all three result blocks, ranked by score, drilling into one full evaluation report.';
  return `
  <div class="da-empty">
    <div class="da-empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="13" y2="11"/></svg></div>
    <p class="da-empty-title">No analysed candidates yet</p>
    <p class="da-empty-desc">${desc}</p>
  </div>`;
}

function rosterMarkup(job: Job, reports: any[]): string {
  const dist: Record<string, number> = {};
  reports.forEach((r) => { dist[r.report.recommendation] = (dist[r.report.recommendation] || 0) + 1; });
  const scored = reports.map((r) => r.report.overallScore).filter((s) => Number.isFinite(s));
  const avg = scored.length ? Math.round(scored.reduce((a, s) => a + s, 0) / scored.length) : 0;
  const interviewed = reports.filter((r) => r.report.stages && r.report.stages.functional).length;

  // Hiring-decision filter (P8): narrows the list below to the recruiter's Hired /
  // Rejected calls. The stat strip stays on the full analysed set.
  const filter = daUi.hiringFilter || 'all';
  const visible = reports.filter((r) =>
    filter === 'all' ? true
      : filter === 'hired' ? r.candidate.decision === 'hired'
        : r.candidate.decision === 'rejected'
  );

  return `
    <div class="da-roster-head">
      <div><h2 class="da-title">Candidate intelligence</h2><p class="da-sub">${reports.length} analysed candidate${reports.length !== 1 ? 's' : ''} · resume, screening &amp; interview · ranked by score</p></div>
      <select class="da-filter" data-action="filter" aria-label="Filter candidates by hiring decision">
        <option value="all"${filter === 'all' ? ' selected' : ''}>All</option>
        <option value="hired"${filter === 'hired' ? ' selected' : ''}>Hired</option>
        <option value="rejected"${filter === 'rejected' ? ' selected' : ''}>Rejected</option>
      </select>
    </div>
    <div class="da-stat-strip">
      <div class="da-stat"><span class="da-stat-num">${reports.length}</span><span class="da-stat-label">Candidates</span></div>
      <div class="da-stat"><span class="da-stat-num" style="color:${scoreColor(avg)};">${avg}</span><span class="da-stat-label">Avg score</span></div>
      <div class="da-stat"><span class="da-stat-num" style="color:#2dd4bf;">${(dist.strong_proceed || 0) + (dist.proceed || 0)}</span><span class="da-stat-label">Proceed</span></div>
      <div class="da-stat"><span class="da-stat-num" style="color:${interviewed ? '#34d399' : '#9a9a9a'};">${interviewed}</span><span class="da-stat-label">Interviewed</span></div>
    </div>
    <div class="da-roster">
      ${visible.length
        ? visible.map((r, i) => rosterRow(r, i)).join('')
        : `<div class="da-li muted" style="text-align:center;padding:20px;">No ${filter === 'hired' ? 'hired' : 'rejected'} candidates yet.</div>`}
    </div>`;
}

function rosterRow({ candidate, report }: { candidate: Candidate; report: any }, i: number): string {
  const reco = RECO_META[report.recommendation] || RECO_META.hold;
  const s = report.overallScore;
  const ss = deriveStageStates(candidate);
  const dot = (state: string, label: string): string => {
    const v = STAGE_STATE_STYLE[state] || STAGE_STATE_STYLE.idle;
    return `<span title="${label} — ${v.tip}" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;font-size:10px;font-weight:700;background:${v.bg};color:${v.color};border:1px solid ${v.border};">${label[0]}</span>`;
  };
  return `
  <div class="da-row" data-action="select" data-cid="${candidate.id}" role="button" tabindex="0">
    <span class="da-rank">${i + 1}</span>
    <span class="da-avatar">${escapeHTML(initials(candidate.name))}</span>
    <div class="da-row-id">
      <span class="da-row-name">${escapeHTML(candidate.name)}</span>
      <span class="da-row-meta">${escapeHTML(sourceLabel(candidate.entryMethod))}</span>
    </div>
    <span class="da-row-conf" title="Resume · Screening · Functional" style="display:inline-flex;gap:4px;">${dot(ss.resume, 'Resume')}${dot(ss.screening, 'Screening')}${dot(ss.functional, 'Functional')}</span>
    <span class="da-reco-chip" style="color:${reco.color};border-color:${reco.color}40;background:${reco.color}14;">${reco.label}</span>
    <span class="da-row-score" style="color:${s != null ? scoreColor(s) : '#9a9a9a'};">${s != null ? s : '—'}</span>
    <svg class="da-row-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
  </div>`;
}

// The structured (aviral) report is nested under `.structured`, or is the report
// itself when generated standalone. Holds the score breakdown (45/55 − penalty
// formula) and the real proctoring summary. null until the engine scores it.
function getStructuredReport(report: any): any {
  if (!report) return null;
  if (report.structured && report.structured.scoreBreakdown) return report.structured;
  if (report.scoreBreakdown) return report;
  return null;
}

function dlTranscriptBtn(candidate?: Candidate | null): string {
  if (!candidate || !candidate.id) return '';
  return `<button class="da-dl-transcript" data-action="dl-transcript" data-cid="${escapeHTML(candidate.id)}" data-name="${escapeHTML(candidate.name || '')}" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:#cfcfcf;border-radius:7px;padding:6px 11px;font-size:12px;cursor:pointer;">⬇ Download transcript</button>`;
}

// Score breakdown (45% rubric + 55% dimensions − red-flag − proctoring) and the
// real proctoring/integrity summary. This is the "Interview Analysis" content,
// folded into Deep Analysis so there's no separate tab. Shown only when the
// engine produced a structured report; otherwise just offers the transcript.
function structuredAnalysisSection(report: any, candidate?: Candidate | null): string {
  const s = getStructuredReport(report);
  const dl = dlTranscriptBtn(candidate);
  if (!s) {
    return dl ? `<div class="da-section" style="display:flex;justify-content:flex-end;">${dl}</div>` : '';
  }

  const sb = s.scoreBreakdown || {};
  const proc = s.proctoring || null;
  const finalScore = Math.round(sb.finalScore != null ? sb.finalScore : (s.overallScore || 0));
  const penTone = (v: number): string => ((v || 0) > 0 ? '#f87171' : '#34d399');

  const cell = (label: string, value: string | number, color?: string): string => `
    <div class="da-stat" style="align-items:flex-start;text-align:left;">
      <span class="da-stat-num"${color ? ` style="color:${color};"` : ''}>${value}</span>
      <span class="da-stat-label">${escapeHTML(label)}</span>
    </div>`;

  const cells = [
    cell('Final score', finalScore, scoreColor(finalScore)),
    cell('Rubric coverage (45%)', Math.round(sb.rubricCoverageAvg || 0)),
    cell('Weighted dimensions (55%)', Math.round(sb.dimensionAvg || 0)),
    cell('Red-flag penalty', `−${Math.round(sb.redFlagPenaltyAvg || 0)}`, penTone(sb.redFlagPenaltyAvg)),
    cell('Proctoring penalty', `−${Math.round(sb.proctoringPenalty || 0)}`, penTone(sb.proctoringPenalty)),
  ];
  if (proc) cells.push(cell('Integrity score', Math.round(proc.integrityScore), scoreColor(proc.integrityScore)));

  const formula = escapeHTML(sb.formula || 'finalAnswerScore = 45% rubric coverage + 55% weighted dimensions − red-flag penalty; overall − proctoring penalty');

  const violations = proc && Array.isArray(proc.violations) ? proc.violations : [];
  const proctoringBlock = proc ? `
    <div class="da-section">
      <h3 class="da-section-title">Proctoring &amp; integrity<span class="da-dim-count" style="color:${(proc.totalEvents || violations.length) ? '#fb923c' : '#34d399'};">${proc.totalEvents != null ? proc.totalEvents : violations.length}</span></h3>
      ${violations.length
        ? violations.map((v: any) => `<div class="da-flag"><span class="da-sev" style="color:${SEV_COLOR[String(v.severity || '').toLowerCase()] || '#9a9a9a'};background:${(SEV_COLOR[String(v.severity || '').toLowerCase()] || '#9a9a9a')}1a;">${escapeHTML(String(v.severity || 'flag'))}</span><span class="da-flag-text">${escapeHTML(String(v.eventType || 'Violation').replace(/_/g, ' '))}${v.detail ? ` — ${escapeHTML(v.detail)}` : ''}</span></div>`).join('')
        : '<div class="da-li ok">No integrity violations logged during this interview.</div>'}
    </div>` : '';

  return `
    <div class="da-section">
      <h3 class="da-section-title">Interview analysis<span class="da-dim-count" style="color:${scoreColor(finalScore)};">${finalScore}</span>${dl ? `<span style="margin-left:auto;">${dl}</span>` : ''}</h3>
      <div class="da-stat-strip" style="margin-bottom:8px;">${cells.join('')}</div>
      <p class="da-li muted" style="font-style:italic;">${formula}</p>
    </div>
    ${proctoringBlock}`;
}

function functionalReportBody(report: any, candidate?: Candidate | null): string {
  const reco = RECO_META[report.recommendation] || RECO_META.hold;
  const band = scoreColor(report.overallScore);
  const critical = (report.redFlags || []).filter((f: any) => f.severity === 'critical');
  return `
    ${critical.length ? `<div class="da-critical-banner"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Critical red flag — human review required before any decision.</div>` : ''}

    <div class="da-report-top">
      <div class="da-ring" style="--p:${report.overallScore};--c:${band};"><span class="da-ring-num">${report.overallScore}</span><span class="da-ring-of">/100</span></div>
      <div class="da-report-id">
        <div class="da-report-name">Interview evaluation<span class="da-report-role">${escapeHTML(report.roleTitle || '')}</span></div>
        <div class="da-report-chips">
          <span class="da-reco-chip lg" style="color:${reco.color};border-color:${reco.color}40;background:${reco.color}14;">${reco.label}</span>
          <span class="da-conf-chip" style="color:${CONF_COLOR[report.recommendationConfidence]};">${report.recommendationConfidence} confidence</span>
        </div>
        <p class="da-summary">${escapeHTML(report.summary || '')}</p>
      </div>
    </div>

    ${dimensionsSection(report.skillScores)}

    <div class="da-cols">
      <div class="da-section da-half">
        <h3 class="da-section-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Strengths</h3>
        ${report.strengths.length ? report.strengths.map((s: any) => `<div class="da-li ok">${escapeHTML(s)}</div>`).join('') : '<div class="da-li muted">None surfaced.</div>'}
      </div>
      <div class="da-section da-half">
        <h3 class="da-section-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/></svg> Weaknesses</h3>
        ${report.weaknesses.length ? report.weaknesses.map((s: any) => `<div class="da-li warn">${escapeHTML(s)}</div>`).join('') : '<div class="da-li muted">None surfaced.</div>'}
      </div>
    </div>

    ${report.redFlags.length ? `
      <div class="da-section">
        <h3 class="da-section-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Red flags</h3>
        ${report.redFlags.map((f: any) => `<div class="da-flag"><span class="da-sev" style="color:${SEV_COLOR[f.severity]};background:${SEV_COLOR[f.severity]}1a;">${f.severity}</span><span class="da-flag-text">${escapeHTML(f.label)}</span></div>`).join('')}
      </div>` : ''}

    <div class="da-section">
      <h3 class="da-section-title">Per-question breakdown</h3>
      ${report.questionBreakdown.map((r: any) => answerCard(r)).join('')}
    </div>

    ${report.suggestedNextSteps.length ? `
      <div class="da-section">
        <h3 class="da-section-title">Suggested next steps</h3>
        ${report.suggestedNextSteps.map((s: any) => `<div class="da-li step">${escapeHTML(s)}</div>`).join('')}
      </div>` : ''}

    ${structuredAnalysisSection(report, candidate)}`;
}

// "Evaluation dimensions" — the engine can return 15+ raw dimensions across a
// mixed interview. Normalise labels, rank by priority then evidence breadth then
// score, and cap to DIM_CAP with a toggle so the list reads short and even.
function dimensionsSection(skillScores: any[]): string {
  const dims = (skillScores || [])
    .filter((s: any) => s && Number.isFinite(s.score))
    .map((s: any) => ({ key: s.skill, label: prettyDim(s.skill), score: s.score, n: (s.evidenceAnswerIds || []).length }))
    .sort((a, b) => dimPriority(a.key) - dimPriority(b.key) || b.n - a.n || b.score - a.score);
  if (!dims.length) return '';

  const overflow = dims.length - DIM_CAP;
  const visible = daUi.showAllDims ? dims : dims.slice(0, DIM_CAP);
  const toggle = overflow > 0
    ? `<button class="da-dim-more" data-action="toggle-dims">${daUi.showAllDims ? 'Show fewer' : `Show all ${dims.length} dimensions`}</button>`
    : '';
  return `
    <div class="da-section">
      <h3 class="da-section-title">Evaluation dimensions<span class="da-dim-count">${dims.length}</span></h3>
      ${visible.map(dimRow).join('')}
      ${toggle}
    </div>`;
}

function dimRow(d: { label: string; score: number }): string {
  const c = scoreColor(d.score);
  return `<div class="da-dim"><span class="da-dim-name" title="${escapeHTML(d.label)}">${escapeHTML(d.label)}</span><span class="da-dim-track"><span class="da-dim-fill" style="width:${d.score}%;background:${c};"></span></span><span class="da-dim-score" style="color:${c};">${d.score}</span></div>`;
}

function answerCard(r: any): string {
  const open = daUi.openAnswerId === r.answerId;
  const c = scoreColor(r.overallScore);
  const mac = r.modelAnswerComparison || {};
  const dims = Object.entries(r.dimensionScores)
    .map(([d, v]: [string, any]) => ({
      key: d, label: prettyDim(d), score: v.score, reason: v.reason || '',
      evidence: (v.evidence || []).filter(Boolean), missing: (v.missing || []).filter(Boolean),
    }))
    .sort((a, b) => dimPriority(a.key) - dimPriority(b.key) || b.score - a.score);
  const openDim = daUi.openDimKey && daUi.openDimKey.indexOf(`${r.answerId}::`) === 0
    ? dims.find((d) => `${r.answerId}::${d.key}` === daUi.openDimKey) : null;
  return `
  <div class="da-ans ${open ? 'open' : ''}" data-aid="${r.answerId}">
    <div class="da-ans-top" data-action="toggle-answer" data-aid="${r.answerId}">
      <svg class="da-ans-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      <span class="da-ans-topic">${escapeHTML(r.topicName || '')}</span>
      <span class="da-ans-q">${escapeHTML(r.questionText)}</span>
      <span class="da-ans-conf" style="color:${CONF_COLOR[r.evaluationConfidence]};" title="evaluation confidence">${r.evaluationConfidence}</span>
      <span class="da-ans-score" style="color:${c};">${r.overallScore}</span>
    </div>
    ${open ? `
      <div class="da-ans-body">
        <div class="da-dim-grid">
          ${dims.map((d) => {
            const grounded = d.evidence.length || d.reason || d.missing.length;
            const active = openDim && openDim.key === d.key;
            return `<div class="da-dim-mini${grounded ? ' grounded' : ''}${active ? ' active' : ''}"${grounded ? ` data-action="toggle-dim" data-aid="${r.answerId}" data-dim="${escapeHTML(d.key)}" role="button" tabindex="0" title="Show the evidence behind this score"` : ` title="${escapeHTML(d.label)}"`}>
              <span>${escapeHTML(d.label)}</span><b style="color:${scoreColor(d.score)};">${d.score}</b>${grounded ? '<svg class="da-dim-cue" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>' : ''}
            </div>`;
          }).join('')}
        </div>
        ${openDim ? dimEvidence(openDim) : ''}
        ${(mac.coveredRequiredPoints || []).length || (mac.missedRequiredPoints || []).length ? `
          <div class="da-mac">
            ${(mac.coveredRequiredPoints || []).map((p: any) => `<div class="da-mac-row ok"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${escapeHTML(p)}</div>`).join('')}
            ${(mac.missedRequiredPoints || []).map((p: any) => `<div class="da-mac-row miss"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>${escapeHTML(p)}</div>`).join('')}
          </div>` : ''}
        <p class="da-ans-summary">${escapeHTML(r.summary)}</p>
      </div>` : ''}
  </div>`;
}

// Evidence panel for one dimension: the model's reason, the transcript quote(s)
// it cited, and any required point it found missing. This is the grounding that
// turns a bare score into something a recruiter can audit.
function dimEvidence(d: { label: string; score: number; reason: string; evidence: any[]; missing: any[] }): string {
  const c = scoreColor(d.score);
  return `
  <div class="da-evidence">
    <div class="da-evidence-head"><span class="da-evidence-dim" style="border-color:${c}66;color:${c};">${escapeHTML(d.label)} · ${d.score}</span>${d.reason ? `<span class="da-evidence-reason">${escapeHTML(d.reason)}</span>` : ''}</div>
    ${d.evidence.map((q: any) => `<blockquote class="da-quote">${escapeHTML(q)}</blockquote>`).join('')}
    ${d.missing.map((m: any) => `<div class="da-mac-row miss"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>${escapeHTML(m)}</div>`).join('')}
    ${!d.evidence.length && !d.missing.length && !d.reason ? '<p class="da-evidence-empty">No transcript evidence was captured for this dimension.</p>' : ''}
  </div>`;
}

function bind(container: any, job: Job): void {
  container.onclick = (e: any) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'select') { daUi.selectedId = el.dataset.cid; daUi.openAnswerId = null; daUi.openDimKey = null; daUi.showAllDims = false; soundEngine.playClick(); renderDeepAnalysisPane(job, container); }
    else if (action === 'back') { daUi.selectedId = null; daUi.openDimKey = null; daUi.showAllDims = false; soundEngine.playClick(); renderDeepAnalysisPane(job, container); }
    else if (action === 'open-report') { soundEngine.playClick(); const cid = el.dataset.cid; import('./report-page').then((m) => m.openCandidateReportPage && m.openCandidateReportPage(cid)); }
    else if (action === 'dl-transcript') { soundEngine.playClick(); const cid = el.dataset.cid; const name = el.dataset.name; import('./report-page').then((m) => m.downloadInterviewTranscript && m.downloadInterviewTranscript(cid, name)); }
    else if (action === 'toggle-answer') { const a = el.dataset.aid; daUi.openAnswerId = daUi.openAnswerId === a ? null : a; daUi.openDimKey = null; soundEngine.playClick(); renderDeepAnalysisPane(job, container); }
    else if (action === 'toggle-test') { daUi.testOpen = !daUi.testOpen; soundEngine.playClick(); renderDeepAnalysisPane(job, container); }
    else if (action === 'refresh-test') { testReports.delete(job.id); soundEngine.playClick(); renderDeepAnalysisPane(job, container); }
    else if (action === 'toggle-dims') { daUi.showAllDims = !daUi.showAllDims; soundEngine.playClick(); renderDeepAnalysisPane(job, container); }
    else if (action === 'toggle-dim') { const k = `${el.dataset.aid}::${el.dataset.dim}`; daUi.openDimKey = daUi.openDimKey === k ? null : k; soundEngine.playClick(); renderDeepAnalysisPane(job, container); }
  };
  container.onkeydown = (e: any) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target;
    if (t.classList && t.classList.contains('da-row')) {
      e.preventDefault(); daUi.selectedId = t.dataset.cid; daUi.openAnswerId = null; daUi.openDimKey = null; daUi.showAllDims = false; renderDeepAnalysisPane(job, container);
    } else if (t.classList && t.classList.contains('da-dim-mini') && t.dataset.dim) {
      e.preventDefault(); const k = `${t.dataset.aid}::${t.dataset.dim}`; daUi.openDimKey = daUi.openDimKey === k ? null : k; renderDeepAnalysisPane(job, container);
    }
  };
  // Hiring-decision filter dropdown (P8). Re-assigned each render like onclick/onkeydown,
  // so it never stacks listeners.
  container.onchange = (e: any) => {
    const sel = e.target.closest && e.target.closest('.da-filter');
    if (!sel) return;
    daUi.hiringFilter = sel.value;
    soundEngine.playClick();
    renderDeepAnalysisPane(job, container);
  };
}

export { renderDeepAnalysisPane as default };
