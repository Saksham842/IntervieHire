// ─────────────────────────────────────────────────────────────────────────────
// Pure transcript-shaping logic — NO database, NO fs. This is the testable core
// of the transcript generator: take a raw bag of events (which may be out of
// order, duplicated, partial, or empty) and turn it into the clean, ordered,
// human-readable text body of the final .txt file.
//
// Keeping it pure means the dedup / ordering / merge / formatting rules can be
// unit-tested deterministically without a Postgres connection (see
// transcript.format.test.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type TranscriptSpeaker = 'candidate' | 'interviewer';
export type TranscriptSource = 'convai' | 'browser_stt' | 'whisper' | 'manual';

export type TranscriptEvent = {
  sessionId: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestampMs: number;
  source: TranscriptSource;
  isFinal: boolean;
  createdAt: string;
};

export type TranscriptLine = {
  speaker: TranscriptSpeaker;
  text: string;
  timestampMs: number;
};

export type TranscriptMetaForFile = {
  sessionId: string;
  candidateId?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
};

const SPEAKER_LABEL: Record<TranscriptSpeaker, string> = {
  candidate: 'Candidate',
  interviewer: 'Interviewer',
};

// Default window (ms) within which two same-speaker, same-text events are treated
// as the same utterance (e.g. a retried POST, or server + browser both capturing
// the same line). Also the gap under which adjacent same-speaker lines merge.
const DUP_WINDOW_MS = 8000;
const MERGE_GAP_MS = 4000;

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
}

export function cleanText(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim();
}

export function isValidSpeaker(value: unknown): value is TranscriptSpeaker {
  return value === 'candidate' || value === 'interviewer';
}

export function isValidSource(value: unknown): value is TranscriptSource {
  return value === 'convai' || value === 'browser_stt' || value === 'whisper' || value === 'manual';
}

/**
 * Collapse interim (isFinal:false) events. If a final version of the same
 * speaker+source utterance exists, the interim ones are dropped. Interim events
 * with no final counterpart are kept (best-effort) but treated as final text.
 * Empty text is removed entirely.
 */
function dropInterimSuperseded(events: TranscriptEvent[]): TranscriptEvent[] {
  const finals = events.filter((e) => e.isFinal && cleanText(e.text).length > 0);
  const finalKeys = new Set(
    finals.map((e) => `${e.speaker}|${e.source}|${normalizeForCompare(e.text)}`),
  );

  const kept: TranscriptEvent[] = [];
  for (const e of events) {
    if (cleanText(e.text).length === 0) continue;
    if (!e.isFinal) {
      // keep an interim only when no final shares its normalized text/speaker/source
      const key = `${e.speaker}|${e.source}|${normalizeForCompare(e.text)}`;
      const supersededByFinal = finals.some(
        (f) =>
          f.speaker === e.speaker &&
          (finalKeys.has(key) || normalizeForCompare(f.text).startsWith(normalizeForCompare(e.text))),
      );
      if (supersededByFinal) continue;
    }
    kept.push(e);
  }
  return kept;
}

/** Remove duplicate utterances: same speaker + same normalized text within DUP_WINDOW_MS. */
export function dedupeEvents(
  events: TranscriptEvent[],
  windowMs: number = DUP_WINDOW_MS,
): TranscriptEvent[] {
  const seen: Array<{ speaker: TranscriptSpeaker; norm: string; timestampMs: number }> = [];
  const out: TranscriptEvent[] = [];
  for (const e of events) {
    const norm = normalizeForCompare(e.text);
    if (!norm) continue;
    const dup = seen.find(
      (s) => s.speaker === e.speaker && s.norm === norm && Math.abs(s.timestampMs - e.timestampMs) <= windowMs,
    );
    if (dup) continue;
    seen.push({ speaker: e.speaker, norm, timestampMs: e.timestampMs });
    out.push(e);
  }
  return out;
}

/** Stable sort by timestamp, then by original index (preserved via createdAt tiebreak). */
export function sortEvents(events: TranscriptEvent[]): TranscriptEvent[] {
  return [...events].sort((a, b) => {
    if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
}

/** Merge consecutive same-speaker fragments that are close in time into one line. */
export function mergeAdjacent(
  events: TranscriptEvent[],
  gapMs: number = MERGE_GAP_MS,
): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  for (const e of events) {
    const text = cleanText(e.text);
    if (!text) continue;
    const last = lines[lines.length - 1];
    if (last && last.speaker === e.speaker && e.timestampMs - last.timestampMs <= gapMs) {
      last.text = `${last.text} ${text}`.replace(/\s+/g, ' ').trim();
    } else {
      lines.push({ speaker: e.speaker, text, timestampMs: e.timestampMs });
    }
  }
  return lines;
}

/**
 * Full pipeline: raw events -> clean ordered lines.
 * drop empty -> collapse interim -> sort -> dedupe -> merge adjacent.
 */
export function buildTranscriptLines(events: TranscriptEvent[]): TranscriptLine[] {
  const withText = events.filter((e) => cleanText(e.text).length > 0);
  const noInterim = dropInterimSuperseded(withText);
  const sorted = sortEvents(noInterim);
  const deduped = dedupeEvents(sorted);
  return mergeAdjacent(deduped);
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/** Render the final .txt body from lines + header metadata. */
export function renderTranscriptText(
  lines: TranscriptLine[],
  meta: TranscriptMetaForFile,
): string {
  const header = [
    'Interview Transcript',
    `Session ID: ${meta.sessionId}`,
    `Candidate ID: ${meta.candidateId ?? 'unknown'}`,
    `Started At: ${meta.startedAt ?? 'unknown'}`,
    `Ended At: ${meta.endedAt ?? 'unknown'}`,
    '',
  ].join('\n');

  if (!lines.length) {
    return `${header}\n(No transcript was captured for this interview.)\n`;
  }

  const body = lines
    .map((l) => `[${formatTimestamp(l.timestampMs)}] ${SPEAKER_LABEL[l.speaker]}: ${l.text}`)
    .join('\n');

  return `${header}\n${body}\n`;
}
