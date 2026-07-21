// Generates the interview evaluation report via OpenRouter, renders it as an HTML
// page styled like the dashboard's Deep Analysis report-page, and prints to PDF.
//
//   node scripts/report-to-pdf.mjs
//
// Scenario (per request): candidate shows a phone (proctoring violation) and does
// not answer any of the blueprint questions for session cmqlizi78004nsvpkgr7kjiop.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from '../../dashboard/node_modules/playwright/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── creds ──────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const API_KEY = env.OPENROUTER_API_KEY;
const MODEL = env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const BASE_URL = env.DEEPSEEK_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';

// ── session context ──────────────────────────────────────────────────────────
const SESSION_ID = 'cmqlizi78004nsvpkgr7kjiop';
const candidateName = 'Aviral Deshratna Saxena';
const roleTitle = 'Head of Talent Management / HR Strategy Leader';
const company = 'Hyundai Motor India Limited';

const QUESTIONS = [
  'What is the primary purpose of adding a distributed cache to a service that needs to scale?',
  'How do you keep data consistent across services when something fails mid-write?',
  'Tell me about a tricky bug you tracked down. How did you isolate the root cause?',
  'How do you make sure your code is reliable before it ships?',
  'Describe a time you disagreed with a teammate on a technical decision. What happened?',
  'Tell me about your hands-on experience with Total experience 12-15 years. Walk me through a concrete example and your specific role in it.',
  'Tell me about your hands-on experience with MBA in HR from Tier 1 or Tier 2 B-School. Walk me through a concrete example and your specific role in it.',
  'Tell me about your hands-on experience with Talent Management & Succession Planning. Walk me through a concrete example and your specific role in it.',
  'Tell me about your hands-on experience with Stakeholder Management & Influencing Skills. Walk me through a concrete example and your specific role in it.',
  'Tell me about your hands-on experience with Performance Management Systems (PMS) Expertise. Walk me through a concrete example and your specific role in it.',
  'Tell me about your hands-on experience with HR Technology (SuccessFactors) & Analytics. Walk me through a concrete example and your specific role in it.',
];
const nonAnswers = [
  'Sorry, hold on a second.',
  "Yeah, I'm just checking something on my phone real quick.",
  "Hmm, I don't really know. Can we skip this one?",
  'I am not sure honestly. Pass.',
  "I'd rather not answer that one.",
  "Let me check my notes on my phone... I don't have an example.",
  "I'm not sure what to say here.",
  "Pass. I don't have anything specific.",
  "Can we move on? I don't have an answer.",
  "I don't really remember. Skip.",
  "Nothing comes to mind. Are we almost done?",
];
const proctoringLogs = [
  { type: 'PHONE_DETECTED', severity: 'CRITICAL', detail: 'Mobile phone visible in frame and held up to face during questioning.' },
  { type: 'GAZE_OFF_SCREEN', severity: 'HIGH', detail: 'Candidate repeatedly looking down/away from screen while using phone.' },
];

const transcript = [];
QUESTIONS.forEach((q, i) => {
  transcript.push({ speaker: 'ai', text: q });
  transcript.push({ speaker: 'candidate', text: nonAnswers[i] ?? "I don't have an answer." });
});

// ── build Q&A + prompt (matches transcript-report.service.ts) ──────────────────
const conversation = QUESTIONS.map((q, i) => `Q${i + 1} (Interviewer): ${q}\nA${i + 1} (Candidate): ${nonAnswers[i]}`).join('\n\n');
const proctoringText = proctoringLogs.map((l, i) => `${i + 1}. [${l.severity}] ${l.type}: ${l.detail}`).join('\n');

const systemInstruction = [
  'You are a rigorous but fair interview evaluator.',
  `You are scoring a candidate for: ${roleTitle} at ${company}.`,
  'You are given the FULL interview transcript (the interviewer is an AI avatar; the candidate is the human) AND a list of proctoring violations.',
  'Judge ONLY on the transcript and proctoring violations. If the candidate failed to answer questions, score those near zero and reflect it in overall score and recommendation. Treat proctoring violations (e.g. phone use) as red flags.',
  'Return STRICT JSON with this exact shape:',
  '{ "overallScore": number (0-100), "recommendation": one of ["strong_proceed","proceed","hold","reject","needs_human_review"], "recommendationConfidence": one of ["high","medium","low"], "confidenceScore": number (0-100), "summary": string (3-5 sentences), "strengths": string[], "weaknesses": string[], "redFlags": [{"label": string, "severity": "low"|"medium"|"high"|"critical", "reason": string}], "skillScores": [{"skill": string, "score": number}], "questionBreakdown": [{"questionText": string, "score": number, "summary": string, "strengths": string[], "weaknesses": string[]}], "suggestedNextSteps": string[] }',
  'questionBreakdown must have one entry per interviewer question, in order. Do not invent answers the candidate did not give.',
].join('\n');

console.log(`Calling OpenRouter (${MODEL})...`);
const res = await fetch(BASE_URL, {
  method: 'POST',
  headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://interviehire.local', 'X-Title': 'IntervieHire' },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `Interview transcript for ${roleTitle} at ${company}:\n\n${conversation}\n\nProctoring violations detected:\n${proctoringText}\n\nEvaluate and return the JSON report.` },
    ],
    temperature: 0.2, max_tokens: 4000, response_format: { type: 'json_object' },
  }),
});
if (!res.ok) throw new Error(`OpenRouter failed: ${res.status} ${await res.text()}`);
const data = await res.json();
const content = data.choices?.[0]?.message?.content ?? '';
const llm = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? content);

// ── apply structured proctoring penalty (LOW1/MED4/HIGH10/CRIT20, cap 40) ──────
const PEN = { LOW: 1, MEDIUM: 4, HIGH: 10, CRITICAL: 20 };
const proctoringPenalty = Math.min(40, proctoringLogs.reduce((s, l) => s + (PEN[l.severity] || 0), 0));
const contentScore = Math.max(0, Math.min(100, Math.round(Number(llm.overallScore) || 0)));
const finalScore = Math.max(0, contentScore - proctoringPenalty);
const band = (n) => (n >= 65 ? 'high' : n >= 45 ? 'medium' : 'low');
const recLabel = { strong_proceed: 'STRONG PROCEED', proceed: 'PROCEED', hold: 'HOLD', reject: 'REJECT', needs_human_review: 'NEEDS HUMAN REVIEW' };

// ── HTML matching the dashboard report-page UI ─────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const initials = candidateName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const ringCirc = 2 * Math.PI * 52;
const ringOffset = ringCirc * (1 - finalScore / 100);

const skillBars = (llm.skillScores || []).map((s) => {
  const v = Math.max(0, Math.min(100, Math.round(Number(s.score) || 0)));
  return `<div class="rp-dim">
    <div class="rp-dim-head"><span>${esc(s.skill)}</span><strong class="${band(v)}">${v}</strong></div>
    <div class="rp-dim-track"><span class="rp-dim-fill ${band(v)}" style="width:${v}%"></span></div>
  </div>`;
}).join('');

const qBlocks = (llm.questionBreakdown || []).map((q, i) => {
  const v = Math.max(0, Math.min(100, Math.round(Number(q.score) || 0)));
  const weak = (q.weaknesses || []).map((w) => `<span class="rp-pill-mini bad">${esc(w)}</span>`).join('');
  return `<div class="rp-q-block">
    <div class="rp-q-head">
      <span class="rp-q-num">Q${i + 1}</span>
      <span class="rp-q-text">${esc(q.questionText)}</span>
      <span class="rp-q-score ${band(v)}">${v}</span>
    </div>
    <p class="rp-cov miss">${esc(q.summary)}</p>
    <div class="rp-q-sub">${weak}</div>
  </div>`;
}).join('');

const redFlags = (llm.redFlags || []).map((f) => `<div class="rp-proc-row">
  <div><strong>${esc(f.label)}</strong><p>${esc(f.reason)}</p></div>
  <span class="rp-proc-count bad">${esc(String(f.severity).toUpperCase())}</span>
</div>`).join('');

const weaknesses = (llm.weaknesses || []).map((w) => `<li>${esc(w)}</li>`).join('');
const strengths = (llm.strengths || []).length
  ? (llm.strengths).map((w) => `<li>${esc(w)}</li>`).join('')
  : '<li class="rp-none">None identified.</li>';
const nextSteps = (llm.suggestedNextSteps || []).map((w) => `<li>${esc(w)}</li>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root { --glass-bg: rgba(255,255,255,0.04); --glass-border: rgba(255,255,255,0.10);
    --color-text-primary:#e8eaf0; --color-text-muted:#9aa0b4; --color-text-faint:#6b7280; }
  * { box-sizing: border-box; }
  body { margin:0; padding:26px 30px; font-family:'Segoe UI',system-ui,sans-serif;
    background:#0c0e16; color:#e8eaf0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .rp-shell { display:flex; flex-direction:column; gap:16px; max-width:920px; margin:0 auto; }
  .rp-topbar { display:flex; align-items:center; gap:16px; padding:16px 20px; border-radius:16px;
    background:var(--glass-bg); border:1px solid var(--glass-border); }
  .rp-avatar { width:50px; height:50px; border-radius:14px; display:flex; align-items:center; justify-content:center;
    font-weight:700; color:#fff; background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 6px 18px rgba(99,102,241,.35); }
  .rp-identity { flex:1; min-width:0; }
  .rp-name { margin:0; font-size:1.2rem; font-weight:700; display:flex; align-items:center; gap:10px; }
  .rp-score-inline { font-size:.74rem; font-weight:700; padding:3px 10px; border-radius:999px; }
  .rp-score-inline.high{background:rgba(16,185,129,.14);color:#10b981;} .rp-score-inline.medium{background:rgba(245,158,11,.14);color:#f59e0b;}
  .rp-score-inline.low{background:rgba(244,63,94,.14);color:#f43f5e;}
  .rp-contact { margin:4px 0 0; font-size:.78rem; color:var(--color-text-muted); }
  .rp-logo { font-size:.72rem; font-weight:800; letter-spacing:.04em;
    background:linear-gradient(90deg,#6366f1,#a855f7); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .rp-card { padding:20px; border-radius:16px; background:var(--glass-bg); border:1px solid var(--glass-border); }
  .rp-card-title { margin:0 0 14px; font-size:.95rem; font-weight:700; display:flex; align-items:center; gap:9px; }
  .rp-card-title.gradient { background:linear-gradient(90deg,#6366f1,#a855f7); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .rp-gold .rp-card-title { background:linear-gradient(90deg,#d4af37,#ffc72c); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .rp-overview-grid { display:grid; grid-template-columns:1.7fr 1fr; gap:16px; align-items:start; }
  .rp-score-card { padding:20px; border-radius:16px; text-align:center;
    background:linear-gradient(160deg,rgba(99,102,241,.12),rgba(168,85,247,.06)); border:1px solid rgba(99,102,241,.25); }
  .rp-score-card-head { font-size:.8rem; font-weight:700; margin-bottom:8px; }
  .rp-ring-wrap { position:relative; width:150px; margin:0 auto; }
  .rp-ring-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .rp-ring-center strong { font-size:2.1rem; font-weight:800; }
  .rp-ring-center span { font-size:.72rem; color:var(--color-text-muted); }
  .rp-rec-strip { display:inline-flex; align-items:center; gap:8px; margin-top:12px; padding:8px 18px; border-radius:999px; font-size:.82rem; font-weight:800; }
  .rp-rec-strip.high{background:rgba(16,185,129,.14);color:#10b981;border:1px solid rgba(16,185,129,.3);}
  .rp-rec-strip.medium{background:rgba(245,158,11,.14);color:#f59e0b;border:1px solid rgba(245,158,11,.3);}
  .rp-rec-strip.low{background:rgba(244,63,94,.14);color:#f43f5e;border:1px solid rgba(244,63,94,.3);}
  .rp-summary { font-size:.86rem; line-height:1.6; color:#cfd3e0; margin:0; }
  .rp-score-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; }
  .rp-score-cell { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:11px; padding:12px 14px; display:flex; flex-direction:column; gap:3px; }
  .rp-score-cell span { font-size:11px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.04em; }
  .rp-score-cell strong { font-size:24px; font-weight:800; }
  .rp-score-cell.big { grid-column:span 2; } .rp-score-cell.big strong { font-size:34px; }
  .rp-score-cell.high strong{color:#34d399;} .rp-score-cell.medium strong{color:#fbbf24;} .rp-score-cell.low strong{color:#f87171;}
  .rp-score-cell .neg { color:#f87171; }
  .rp-formula { margin-top:12px; font-size:11.5px; font-style:italic; color:var(--color-text-muted); }
  .rp-dim { margin-bottom:11px; }
  .rp-dim-head { display:flex; justify-content:space-between; font-size:12.5px; }
  .rp-dim-head strong.high{color:#34d399;} .rp-dim-head strong.medium{color:#fbbf24;} .rp-dim-head strong.low{color:#f87171;}
  .rp-dim-track { height:6px; border-radius:5px; background:rgba(255,255,255,.08); overflow:hidden; margin-top:4px; }
  .rp-dim-fill { display:block; height:100%; border-radius:5px; }
  .rp-dim-fill.high{background:linear-gradient(90deg,#10b981,#34d399);} .rp-dim-fill.medium{background:linear-gradient(90deg,#d4af37,#fbbf24);} .rp-dim-fill.low{background:linear-gradient(90deg,#ef4444,#f87171);}
  .rp-q-block { border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:13px 15px; margin-top:11px; background:rgba(255,255,255,.02); }
  .rp-q-head { display:flex; align-items:center; gap:10px; }
  .rp-q-num { font-size:11px; font-weight:800; color:#1a1205; background:linear-gradient(135deg,#d4af37,#ffc72c); border-radius:6px; padding:3px 8px; }
  .rp-q-text { flex:1; font-weight:600; font-size:13px; }
  .rp-q-score { font-size:18px; font-weight:800; }
  .rp-q-score.high{color:#34d399;} .rp-q-score.medium{color:#fbbf24;} .rp-q-score.low{color:#f87171;}
  .rp-cov { font-size:12px; margin:7px 0 0; } .rp-cov.miss{color:#f87171;}
  .rp-q-sub { display:flex; gap:7px; flex-wrap:wrap; margin:8px 0 0; }
  .rp-pill-mini { font-size:10.5px; font-weight:700; border-radius:999px; padding:2px 9px; background:rgba(212,175,55,.14); color:#d4af37; }
  .rp-pill-mini.bad { background:rgba(248,113,113,.16); color:#f87171; }
  .rp-proc-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:6px; }
  .rp-proc-stat { display:flex; flex-direction:column; gap:3px; padding:14px 16px; border-radius:13px; border:1px solid var(--glass-border); }
  .rp-proc-stat span { font-size:11px; color:var(--color-text-muted); }
  .rp-proc-stat strong { font-size:1.3rem; font-weight:800; }
  .rp-proc-stat.missed { background:rgba(244,63,94,.07); border-color:rgba(244,63,94,.3); } .rp-proc-stat.missed strong{color:#f43f5e;}
  .rp-proc-stat.info { background:rgba(14,165,233,.07); border-color:rgba(14,165,233,.3); } .rp-proc-stat.info strong{color:#0ea5e9;}
  .rp-proc-row { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 0; border-bottom:1px solid var(--glass-border); }
  .rp-proc-row:last-child { border-bottom:none; }
  .rp-proc-row strong { font-size:.82rem; display:block; } .rp-proc-row p { margin:3px 0 0; font-size:.72rem; color:var(--color-text-muted); }
  .rp-proc-count { font-size:.74rem; font-weight:800; padding:3px 10px; border-radius:999px; }
  .rp-proc-count.bad { color:#f43f5e; background:rgba(244,63,94,.12); border:1px solid rgba(244,63,94,.3); }
  .rp-two { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .rp-bullets { margin:0; padding-left:18px; display:flex; flex-direction:column; gap:7px; }
  .rp-bullets li { font-size:.82rem; line-height:1.55; } .rp-bullets li::marker { color:#6366f1; }
  .rp-bullets .rp-none { color:var(--color-text-muted); list-style:none; margin-left:-18px; }
  .rp-foot { text-align:center; font-size:.68rem; color:var(--color-text-muted); margin-top:4px; }
  .rp-section-break { break-inside:avoid; }
</style></head><body>
<div class="rp-shell">

  <div class="rp-topbar">
    <div class="rp-avatar">${esc(initials)}</div>
    <div class="rp-identity">
      <h1 class="rp-name">${esc(candidateName)} <span class="rp-score-inline ${band(finalScore)}">${finalScore}/100</span></h1>
      <p class="rp-contact">${esc(roleTitle)} · ${esc(company)} · Session ${esc(SESSION_ID)}</p>
    </div>
    <div class="rp-logo">INTERVIEHIRE · DEEP ANALYSIS</div>
  </div>

  <div class="rp-overview-grid">
    <div class="rp-card rp-section-break">
      <h2 class="rp-card-title gradient">Executive Summary</h2>
      <p class="rp-summary">${esc(llm.summary)}</p>
    </div>
    <div class="rp-score-card">
      <div class="rp-score-card-head">Overall Score</div>
      <div class="rp-ring-wrap">
        <svg width="150" height="150" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(120,130,160,.18)" stroke-width="10"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="${finalScore >= 65 ? '#10b981' : finalScore >= 45 ? '#f59e0b' : '#f43f5e'}"
            stroke-width="10" stroke-linecap="round" stroke-dasharray="${ringCirc.toFixed(1)}" stroke-dashoffset="${ringOffset.toFixed(1)}"
            transform="rotate(-90 60 60)"/>
        </svg>
        <div class="rp-ring-center"><strong>${finalScore}</strong><span>out of 100</span></div>
      </div>
      <div class="rp-rec-strip ${band(finalScore)}">${esc(recLabel[llm.recommendation] || 'REJECT')} · ${esc(String(llm.recommendationConfidence || 'high'))} confidence</div>
    </div>
  </div>

  <div class="rp-card rp-gold rp-section-break">
    <h2 class="rp-card-title">Interview Analysis · Score Breakdown</h2>
    <div class="rp-score-grid">
      <div class="rp-score-cell big ${band(finalScore)}"><span>Final Score</span><strong>${finalScore}</strong><em>${esc(recLabel[llm.recommendation] || 'REJECT')}</em></div>
      <div class="rp-score-cell ${band(contentScore)}"><span>Content Score</span><strong>${contentScore}</strong></div>
      <div class="rp-score-cell"><span>Proctoring Penalty</span><strong class="neg">−${proctoringPenalty}</strong></div>
      <div class="rp-score-cell ${band(Number(llm.confidenceScore)||0)}"><span>Comm. Confidence</span><strong>${Math.round(Number(llm.confidenceScore)||0)}</strong></div>
    </div>
    <p class="rp-formula">finalScore = contentScore (${contentScore}) − proctoringPenalty (${proctoringPenalty}) = ${finalScore}. Penalty: 1×CRITICAL(20) + 1×HIGH(10), capped at 40.</p>
  </div>

  <div class="rp-card rp-section-break">
    <h2 class="rp-card-title gradient">Competency Scores</h2>
    ${skillBars}
  </div>

  <div class="rp-card rp-gold">
    <h2 class="rp-card-title">Per-Question Breakdown</h2>
    ${qBlocks}
  </div>

  <div class="rp-card rp-section-break">
    <h2 class="rp-card-title gradient">Proctoring &amp; Red Flags</h2>
    <div class="rp-proc-stats">
      <div class="rp-proc-stat missed"><span>Total Violations</span><strong>${proctoringLogs.length}</strong></div>
      <div class="rp-proc-stat missed"><span>Critical / High</span><strong>${proctoringLogs.filter((l) => ['CRITICAL', 'HIGH'].includes(l.severity)).length}</strong></div>
      <div class="rp-proc-stat info"><span>Penalty Applied</span><strong>−${proctoringPenalty}</strong></div>
    </div>
    ${redFlags}
  </div>

  <div class="rp-two">
    <div class="rp-card rp-section-break">
      <h2 class="rp-card-title gradient">Strengths</h2>
      <ul class="rp-bullets">${strengths}</ul>
    </div>
    <div class="rp-card rp-section-break">
      <h2 class="rp-card-title gradient">Weaknesses</h2>
      <ul class="rp-bullets">${weaknesses}</ul>
    </div>
  </div>

  <div class="rp-card rp-section-break">
    <h2 class="rp-card-title gradient">Suggested Next Steps</h2>
    <ul class="rp-bullets">${nextSteps}</ul>
  </div>

  <p class="rp-foot">Generated by IntervieHire · LLM evaluation via OpenRouter (${esc(MODEL)}) · reportEngine: transcript_llm · ${esc(SESSION_ID)}</p>
</div>
</body></html>`;

const htmlPath = resolve(__dirname, 'interview-report.html');
writeFileSync(htmlPath, html, 'utf8');

// ── render to PDF ──────────────────────────────────────────────────────────────
const OUT_PDF = 'C:\\Users\\AVIRAL PC\\Downloads\\IntervieHire-Report-Aviral-Saxena.pdf';
console.log('Rendering PDF...');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
await page.pdf({ path: OUT_PDF, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '10mm', right: '10mm' } });
await browser.close();

console.log(`\n✅ Final score ${finalScore}/100 (content ${contentScore} − proctoring ${proctoringPenalty}) · ${recLabel[llm.recommendation]}`);
console.log(`✅ PDF written to: ${OUT_PDF}`);
