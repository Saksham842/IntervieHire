/**
 * flagcheckTranscription
 * -----------------------
 * Content-integrity "flagcheck" for the live interview transcript. Its job is to
 * estimate whether the candidate is speaking spontaneously or RECITING AN
 * AI-GENERATED ANSWER read aloud.
 *
 * It does NOT rely on someone literally saying "let me ask ChatGPT" (nobody
 * does). Instead it scores the *tone and texture* of the speech:
 *
 *   - Spontaneous human speech has disfluencies (um, uh, restarts, self-
 *     corrections), informal phrasing, uneven structure, and concrete
 *     answer-specific detail.
 *   - An AI-generated answer read aloud sounds unusually polished: textbook
 *     structure ("firstly... secondly... in conclusion"), generic completeness,
 *     even cadence, LLM boilerplate connectives, and almost no fillers.
 *
 * This module is the isomorphic CORE shared by both tiers:
 *   - Tier 1 (client): `analyzeAiToneHeuristics` runs live, with no network, over
 *     the accumulated transcript so the room shows an instant AI-tone read.
 *   - Tier 2 (server): the same heuristics run on the saved `.txt` transcript and
 *     are blended with a DeepSeek/Gemini semantic pass for a thorough verdict
 *     (see api/services/flagcheckTranscription.service).
 *
 * Like AI-authorship analysis, this is a probabilistic, text-only inference and
 * is NEVER proof of misconduct. Keep this file free of Node/DOM dependencies.
 */

export const FLAGCHECK_DISCLAIMER =
  'AI-tone flagcheck is a probabilistic, text-only inference based on speech texture, not proof of misconduct.';

export type AiToneBand = 'LOW' | 'ELEVATED' | 'HIGH';
export type AiToneConfidence = 'low' | 'medium' | 'high';

export type AiToneCategory =
  | 'disfluency'
  | 'structure'
  | 'boilerplate'
  | 'enumeration'
  | 'tool_reference';

/** One contributing piece of evidence toward (or against) an AI-tone verdict. */
export interface AiToneSignal {
  id: string;
  category: AiToneCategory;
  label: string;
  /** Points this signal contributes to the heuristic score (can be 0). */
  weight: number;
  /** Matched phrase(s) or a metric string, for transparency in the report. */
  evidence?: string;
}

/** The full AI-tone verdict for a transcript (or transcript-so-far). */
export interface AiToneAssessment {
  /** 0-100. Higher = more likely the answer is being recited from AI output. */
  score: number;
  band: AiToneBand;
  /** Deterministic heuristic component (0-100), always present. */
  heuristicScore: number;
  /** LLM semantic component (0-100), present only when a semantic pass ran. */
  llmProbability?: number;
  confidence: AiToneConfidence;
  signals: AiToneSignal[];
  /** Top human-readable reasons, ready for the UI / report. */
  reasons: string[];
  wordCount: number;
  source: 'heuristic' | 'heuristic+deepseek' | 'heuristic+gemini';
  disclaimer: string;
}

type Marker = { id: string; label: string; pattern: RegExp };

/**
 * Filler / disfluency markers. Their PRESENCE lowers AI-tone suspicion, so this
 * list is deliberately generous — over-counting fillers only makes the check
 * more conservative (fewer false AI flags).
 */
const DISFLUENCY_MARKERS: RegExp[] = [
  /\b(?:um+|uh+|erm+|er|ah+|hmm+|huh)\b/i,
  /\byou know\b/i,
  /\bi mean\b/i,
  /\bsort of\b/i,
  /\bkind of\b/i,
  /\bkinda\b/i,
  /\bi guess\b/i,
  /\bbasically\b/i,
  /\bactually\b/i,
  /\blike\b/i,
  /\bso(?:,| yeah)\b/i,
  /\bwait\b/i,
];

/** Textbook structural connectors — a hallmark of written-then-read answers. */
const STRUCTURE_MARKERS: Marker[] = [
  { id: 'first_of_all', label: 'Opens with "first of all / firstly"', pattern: /\b(?:first of all|firstly|first,)\b/i },
  { id: 'secondly', label: 'Enumerated "secondly / thirdly"', pattern: /\b(?:secondly|thirdly|fourthly)\b/i },
  { id: 'to_begin_with', label: 'Says "to begin with"', pattern: /\bto begin with\b/i },
  { id: 'moreover', label: 'Uses "moreover / furthermore"', pattern: /\b(?:moreover|furthermore)\b/i },
  { id: 'additionally', label: 'Uses "additionally / in addition"', pattern: /\b(?:additionally|in addition)\b/i },
  { id: 'on_the_other_hand', label: 'Uses "on the other hand"', pattern: /\bon the other hand\b/i },
  { id: 'in_conclusion', label: 'Wraps with "in conclusion / to summarize"', pattern: /\b(?:in conclusion|to conclude|to summari[sz]e|in summary)\b/i },
  { id: 'first_and_foremost', label: 'Says "first and foremost"', pattern: /\bfirst and foremost\b/i },
];

/** Boilerplate connective phrasing that LLMs lean on heavily. */
const BOILERPLATE_MARKERS: Marker[] = [
  { id: 'important_to_note', label: 'LLM filler: "it\'s important to note"', pattern: /\bit(?:'s| is) important to (?:note|understand|remember)\b/i },
  { id: 'worth_noting', label: 'LLM filler: "it\'s worth noting"', pattern: /\bit(?:'s| is) worth noting\b/i },
  { id: 'crucial_role', label: 'LLM filler: "plays a crucial role"', pattern: /\bplays? a (?:crucial|key|vital|significant|important) role\b/i },
  { id: 'wide_range', label: 'LLM filler: "a wide range / variety of"', pattern: /\ba (?:wide range|variety|number) of\b/i },
  { id: 'delve', label: 'LLM filler: "delve into"', pattern: /\bdelve into\b/i },
  { id: 'when_it_comes_to', label: 'LLM filler: "when it comes to"', pattern: /\bwhen it comes to\b/i },
  { id: 'in_essence', label: 'LLM filler: "in essence / essentially"', pattern: /\b(?:in essence|in essence,|essentially)\b/i },
  { id: 'not_only_but_also', label: 'LLM filler: "not only... but also"', pattern: /\bnot only\b[\s\S]{0,60}\bbut also\b/i },
  { id: 'in_order_to', label: 'Formal "in order to"', pattern: /\bin order to\b/i },
  { id: 'leverage', label: 'Corporate-LLM verb "leverage / utilize"', pattern: /\b(?:leverage|utilize|facilitate)\b/i },
];

/** Listing cadence typical of generated, exhaustively-structured answers. */
const ENUMERATION_MARKERS: Marker[] = [
  { id: 'there_are_several', label: 'Lists "there are several / many..."', pattern: /\bthere are (?:several|a few|many|multiple|various|numerous)\b/i },
  { id: 'the_following', label: 'Says "the following"', pattern: /\bthe following\b/i },
  { id: 'such_as', label: 'Enumerates with "such as / for instance"', pattern: /\b(?:such as|for instance|for example)\b/i },
  { id: 'including', label: 'Says "including but not limited to"', pattern: /\bincluding(?: but not limited to)?\b/i },
];

/** Explicit tool references — still strong evidence WHEN present (not required). */
const TOOL_REFERENCE_MARKERS: Marker[] = [
  { id: 'tool_chatgpt', label: 'Named ChatGPT', pattern: /\bchat\s?gpt\b/i },
  { id: 'tool_copilot', label: 'Named Copilot', pattern: /\b(?:github\s+)?copilot\b/i },
  { id: 'tool_gpt_model', label: 'Named a GPT model', pattern: /\bgpt[-\s]?[345](?:\.\d)?\b/i },
  { id: 'tool_language_model', label: 'Mentioned an LLM / language model', pattern: /\b(?:llm|large language model|language model)\b/i },
];

const MIN_WORDS_FOR_ASSESSMENT = 25;
const MIN_WORDS_FOR_DISFLUENCY = 40;

function tokenizeWords(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z']*/g) ?? [];
}

function countOccurrences(text: string, pattern: RegExp): number {
  const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  let count = 0;
  while (global.exec(text) !== null) {
    count += 1;
    if (count > 1000) break; // safety
  }
  return count;
}

/** Find which markers fire and collect a short evidence sample for each. */
function collectMarkers(text: string, markers: Marker[]): Array<{ marker: Marker; evidence: string }> {
  const hits: Array<{ marker: Marker; evidence: string }> = [];
  for (const marker of markers) {
    const match = marker.pattern.exec(text);
    if (match) hits.push({ marker, evidence: match[0].trim().slice(0, 60) });
  }
  return hits;
}

function bandFromScore(score: number): AiToneBand {
  if (score >= 55) return 'HIGH';
  if (score >= 25) return 'ELEVATED';
  return 'LOW';
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Tier 1 / deterministic core: score a transcript's AI-tone from speech texture.
 * Pure, synchronous, no dependencies — safe to run live on every update.
 */
export function analyzeAiToneHeuristics(rawText: string): AiToneAssessment {
  const text = (rawText ?? '').trim();
  const words = tokenizeWords(text);
  const wordCount = words.length;

  if (wordCount < MIN_WORDS_FOR_ASSESSMENT) {
    return {
      score: 0,
      band: 'LOW',
      heuristicScore: 0,
      confidence: 'low',
      signals: [],
      reasons: ['Not enough transcript yet for a reliable AI-tone assessment.'],
      wordCount,
      source: 'heuristic',
      disclaimer: FLAGCHECK_DISCLAIMER,
    };
  }

  const signals: AiToneSignal[] = [];
  let score = 0;

  // --- Disfluency: ABSENCE of fillers across a long answer is suspicious. ---
  const disfluencyCount = DISFLUENCY_MARKERS.reduce((sum, pattern) => sum + countOccurrences(text, pattern), 0);
  const disfluencyRate = disfluencyCount / wordCount;
  if (wordCount >= MIN_WORDS_FOR_DISFLUENCY) {
    if (disfluencyRate < 0.005) {
      const weight = 35;
      score += weight;
      signals.push({
        id: 'no_disfluency',
        category: 'disfluency',
        label: 'Almost no natural speech fillers across a long answer',
        weight,
        evidence: `${disfluencyCount} fillers in ${wordCount} words`,
      });
    } else if (disfluencyRate < 0.02) {
      const weight = 16;
      score += weight;
      signals.push({
        id: 'low_disfluency',
        category: 'disfluency',
        label: 'Unusually few speech fillers for spontaneous speech',
        weight,
        evidence: `${disfluencyCount} fillers in ${wordCount} words`,
      });
    }
  }

  // --- Structure: textbook connectors. ---
  const structureHits = collectMarkers(text, STRUCTURE_MARKERS);
  if (structureHits.length) {
    const weight = Math.min(structureHits.length * 8, 28);
    score += weight;
    signals.push({
      id: 'textbook_structure',
      category: 'structure',
      label: `Textbook structure (${structureHits.length} connector${structureHits.length > 1 ? 's' : ''})`,
      weight,
      evidence: structureHits.map((hit) => hit.evidence).join(', '),
    });
  }

  // --- Boilerplate: LLM connective phrasing. ---
  const boilerplateHits = collectMarkers(text, BOILERPLATE_MARKERS);
  if (boilerplateHits.length) {
    const weight = Math.min(boilerplateHits.length * 12, 40);
    score += weight;
    signals.push({
      id: 'llm_boilerplate',
      category: 'boilerplate',
      label: `LLM boilerplate phrasing (${boilerplateHits.length})`,
      weight,
      evidence: boilerplateHits.map((hit) => `"${hit.evidence}"`).join(', '),
    });
  }

  // --- Enumeration cadence. ---
  const enumerationHits = collectMarkers(text, ENUMERATION_MARKERS);
  if (enumerationHits.length) {
    const weight = Math.min(enumerationHits.length * 6, 18);
    score += weight;
    signals.push({
      id: 'enumeration_cadence',
      category: 'enumeration',
      label: `Listing / enumeration cadence (${enumerationHits.length})`,
      weight,
      evidence: enumerationHits.map((hit) => `"${hit.evidence}"`).join(', '),
    });
  }

  // --- Explicit tool reference (supplementary, strong when present). ---
  const toolHits = collectMarkers(text, TOOL_REFERENCE_MARKERS);
  if (toolHits.length) {
    const weight = Math.min(toolHits.length * 22, 44);
    score += weight;
    signals.push({
      id: 'tool_reference',
      category: 'tool_reference',
      label: `Referenced an AI tool (${toolHits.map((hit) => hit.evidence).join(', ')})`,
      weight,
    });
  }

  const heuristicScore = clamp(score);
  const confidence: AiToneConfidence = wordCount < MIN_WORDS_FOR_DISFLUENCY ? 'low' : wordCount < 120 ? 'medium' : 'high';

  const reasons = signals.length
    ? [...signals].sort((a, b) => b.weight - a.weight).slice(0, 4).map((signal) => signal.label)
    : ['Speech texture looks consistent with spontaneous answering.'];

  return {
    score: heuristicScore,
    band: bandFromScore(heuristicScore),
    heuristicScore,
    confidence,
    signals,
    reasons,
    wordCount,
    source: 'heuristic',
    disclaimer: FLAGCHECK_DISCLAIMER,
  };
}

/** Blend the deterministic heuristic with an LLM probability into one verdict. */
export function blendAiToneAssessment(
  heuristic: AiToneAssessment,
  llm: { probability: number; confidence?: AiToneConfidence; reasons?: string[] },
  provider: 'deepseek' | 'gemini',
): AiToneAssessment {
  const llmProbability = clamp(llm.probability);
  // Weight the LLM and heuristic evenly; the LLM catches paraphrased polish the
  // regex heuristics can't, the heuristics anchor it against over-flagging.
  const score = clamp(0.5 * heuristic.heuristicScore + 0.5 * llmProbability);
  const reasons = dedupeStrings([...(llm.reasons ?? []), ...heuristic.reasons]).slice(0, 5);
  const confidenceRank: Record<AiToneConfidence, number> = { low: 0, medium: 1, high: 2 };
  const confidence =
    confidenceRank[heuristic.confidence] >= confidenceRank[llm.confidence ?? 'low']
      ? heuristic.confidence
      : llm.confidence ?? heuristic.confidence;

  return {
    ...heuristic,
    score,
    band: bandFromScore(score),
    llmProbability,
    confidence,
    reasons,
    source: provider === 'deepseek' ? 'heuristic+deepseek' : 'heuristic+gemini',
  };
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}
