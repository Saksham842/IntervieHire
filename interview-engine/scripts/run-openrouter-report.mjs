// Standalone OpenRouter transcript-report demo.
// Scenario: candidate shows a phone (proctoring violation) and does not answer
// any of the interviewer's questions. Mirrors the prompt/shape used by
// apps/api/src/services/transcript-report.service.ts but runs without the DB.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── load OpenRouter creds from interview-engine/.env ───────────────────────────
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const API_KEY = env.OPENROUTER_API_KEY;
const MODEL = env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const BASE_URL = env.DEEPSEEK_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
if (!API_KEY || API_KEY === 'replace-me') throw new Error('OPENROUTER_API_KEY not set in .env');

const roleTitle = 'Head of Talent Management / HR Strategy Leader (Hyundai Motor India Limited)';

// Actual blueprint questions for session cmqlizi78004nsvpkgr7kjiop.
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

// Candidate dodges / fails to answer every question (and is on their phone).
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

// ── the transcript: avatar asks each blueprint question, candidate dodges ───────
const transcript = [];
QUESTIONS.forEach((q, i) => {
  transcript.push({ speaker: 'ai', text: q });
  transcript.push({ speaker: 'candidate', text: nonAnswers[i] ?? "I don't have an answer." });
});

// proctoring violations the proctoring system would have flagged
const proctoringLogs = [
  { type: 'PHONE_DETECTED', severity: 'CRITICAL', detail: 'Mobile phone visible in frame at 00:42 and held up to face at 01:15.' },
  { type: 'GAZE_OFF_SCREEN', severity: 'HIGH', detail: 'Candidate repeatedly looking down/away from screen while "checking phone".' },
];

// ── build Q&A pairs (same logic as transcript-report.service.ts) ───────────────
function buildPairs(t) {
  const pairs = [];
  let current = null;
  for (const turn of t) {
    const text = (turn?.text ?? '').trim();
    if (!text) continue;
    const isInterviewer = turn.speaker === 'ai' || turn.speaker === 'interviewer';
    if (isInterviewer) {
      if (current) pairs.push(current);
      current = { questionText: text, answerText: '' };
    } else if (current) {
      current.answerText = `${current.answerText} ${text}`.trim();
    } else {
      current = { questionText: '(opening remarks)', answerText: text };
    }
  }
  if (current) pairs.push(current);
  return pairs.filter((p) => p.answerText.length > 0);
}

const pairs = buildPairs(transcript);
const conversation = pairs
  .map((p, i) => `Q${i + 1} (Interviewer): ${p.questionText}\nA${i + 1} (Candidate): ${p.answerText}`)
  .join('\n\n');

const proctoringText = proctoringLogs
  .map((l, i) => `${i + 1}. [${l.severity}] ${l.type}: ${l.detail}`)
  .join('\n');

const systemInstruction = [
  'You are a rigorous but fair technical interview evaluator.',
  `You are scoring a candidate for: ${roleTitle}.`,
  'You are given the FULL interview transcript (the interviewer is an AI avatar; the candidate is the human) AND a list of proctoring violations detected during the session.',
  'Judge ONLY on the transcript and the proctoring violations. Score the substance of the answers: correctness, depth, reasoning, relevant examples, and communication.',
  'If the candidate failed to answer questions, score those questions near zero and reflect it in the overall score and recommendation. Treat proctoring violations (e.g. phone use) as red flags and factor their severity into the recommendation.',
  'Return STRICT JSON with this exact shape:',
  '{',
  '  "overallScore": number (0-100),',
  '  "recommendation": one of ["strong_proceed","proceed","hold","reject","needs_human_review"],',
  '  "recommendationConfidence": one of ["high","medium","low"],',
  '  "confidenceScore": number (0-100, the candidate\'s communication confidence),',
  '  "summary": string (3-5 sentences),',
  '  "strengths": string[], "weaknesses": string[],',
  '  "redFlags": [{"label": string, "severity": "low"|"medium"|"high"|"critical", "reason": string}],',
  '  "skillScores": [{"skill": string, "score": number (0-100)}],',
  '  "questionBreakdown": [{"questionText": string, "score": number (0-100), "summary": string, "strengths": string[], "weaknesses": string[]}],',
  '  "suggestedNextSteps": string[]',
  '}',
  'questionBreakdown must have one entry per interviewer question, in order. Do not invent answers the candidate did not give.',
].join('\n');

const userPrompt =
  `Interview transcript for ${roleTitle}:\n\n${conversation}\n\n` +
  `Proctoring violations detected during the session:\n${proctoringText}\n\n` +
  `Evaluate and return the JSON report.`;

// ── call OpenRouter ────────────────────────────────────────────────────────────
console.log(`Calling OpenRouter (${MODEL})...\n`);
const res = await fetch(BASE_URL, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://interviehire.local',
    'X-Title': 'IntervieHire',
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  }),
});

if (!res.ok) throw new Error(`OpenRouter failed: ${res.status} ${await res.text()}`);
const data = await res.json();
const content = data.choices?.[0]?.message?.content ?? '';
const report = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? content);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  INTERVIEW EVALUATION REPORT — ${roleTitle}`);
console.log('  (generated via OpenRouter)');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(JSON.stringify(report, null, 2));
