import { describe, it, expect } from 'vitest';
import {
  buildTranscriptLines,
  cleanText,
  dedupeEvents,
  formatTimestamp,
  isValidSource,
  isValidSpeaker,
  renderTranscriptText,
  sortEvents,
  type TranscriptEvent,
} from './transcript.format.js';

function ev(partial: Partial<TranscriptEvent>): TranscriptEvent {
  return {
    sessionId: 's1',
    speaker: 'candidate',
    text: 'hello',
    timestampMs: 0,
    source: 'manual',
    isFinal: true,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...partial,
  };
}

describe('event creation / validation', () => {
  it('accepts valid speakers and sources', () => {
    expect(isValidSpeaker('candidate')).toBe(true);
    expect(isValidSpeaker('interviewer')).toBe(true);
    expect(isValidSpeaker('ai')).toBe(false);
    expect(isValidSource('convai')).toBe(true);
    expect(isValidSource('browser_stt')).toBe(true);
    expect(isValidSource('whisper')).toBe(true);
    expect(isValidSource('nope')).toBe(false);
  });

  it('cleanText trims and collapses whitespace, rejects non-strings', () => {
    expect(cleanText('  hi   there  ')).toBe('hi there');
    expect(cleanText('\n\n')).toBe('');
    expect(cleanText(undefined)).toBe('');
    expect(cleanText(42 as any)).toBe('');
  });
});

describe('ignore empty text', () => {
  it('drops empty / whitespace-only events from the built lines', () => {
    const lines = buildTranscriptLines([
      ev({ text: '   ', timestampMs: 0 }),
      ev({ text: 'real answer', timestampMs: 1000 }),
      ev({ text: '', timestampMs: 2000 }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('real answer');
  });
});

describe('ordering by timestamp', () => {
  it('sorts out-of-order events ascending', () => {
    const sorted = sortEvents([
      ev({ text: 'third', timestampMs: 3000 }),
      ev({ text: 'first', timestampMs: 1000 }),
      ev({ text: 'second', timestampMs: 2000 }),
    ]);
    expect(sorted.map((e) => e.text)).toEqual(['first', 'second', 'third']);
  });

  it('built lines come out in chronological order across speakers', () => {
    const lines = buildTranscriptLines([
      ev({ speaker: 'candidate', text: 'my answer', timestampMs: 12000 }),
      ev({ speaker: 'interviewer', text: 'first question', timestampMs: 4000 }),
    ]);
    expect(lines.map((l) => l.speaker)).toEqual(['interviewer', 'candidate']);
  });
});

describe('duplicate removal', () => {
  it('removes same-speaker, same-text events within the window', () => {
    const deduped = dedupeEvents([
      ev({ text: 'Hello, my name is Sam.', timestampMs: 1000 }),
      ev({ text: 'hello my name is sam', timestampMs: 1500 }), // normalized dup
    ]);
    expect(deduped).toHaveLength(1);
  });

  it('keeps identical text from different speakers', () => {
    const deduped = dedupeEvents([
      ev({ speaker: 'interviewer', text: 'thank you', timestampMs: 1000 }),
      ev({ speaker: 'candidate', text: 'thank you', timestampMs: 1200 }),
    ]);
    expect(deduped).toHaveLength(2);
  });

  it('collapses interim partials superseded by a final', () => {
    const lines = buildTranscriptLines([
      ev({ text: 'I built a', timestampMs: 1000, isFinal: false, source: 'browser_stt' }),
      ev({ text: 'I built a URL shortener', timestampMs: 1400, isFinal: false, source: 'browser_stt' }),
      ev({ text: 'I built a URL shortener', timestampMs: 1800, isFinal: true, source: 'browser_stt' }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('I built a URL shortener');
  });
});

describe('timestamp formatting', () => {
  it('formats ms to hh:mm:ss', () => {
    expect(formatTimestamp(4000)).toBe('00:00:04');
    expect(formatTimestamp(72000)).toBe('00:01:12');
    expect(formatTimestamp(3661000)).toBe('01:01:01');
    expect(formatTimestamp(-50)).toBe('00:00:00');
  });
});

describe('final .txt generation', () => {
  it('produces a clean transcript with header and separated speakers', () => {
    const txt = renderTranscriptText(
      buildTranscriptLines([
        ev({ speaker: 'interviewer', text: 'Hello, welcome to the interview. Please introduce yourself.', timestampMs: 4000 }),
        ev({ speaker: 'candidate', text: 'Hi, my name is Sam.', timestampMs: 12000 }),
        ev({ speaker: 'interviewer', text: 'Great. Can you explain your project?', timestampMs: 35000 }),
      ]),
      { sessionId: 'sess-123', candidateId: 'cand-9', startedAt: '2026-06-18T10:00:00.000Z', endedAt: '2026-06-18T10:25:00.000Z' },
    );
    expect(txt).toContain('Interview Transcript');
    expect(txt).toContain('Session ID: sess-123');
    expect(txt).toContain('Candidate ID: cand-9');
    expect(txt).toContain('[00:00:04] Interviewer: Hello, welcome to the interview. Please introduce yourself.');
    expect(txt).toContain('[00:00:12] Candidate: Hi, my name is Sam.');
    expect(txt).toContain('[00:00:35] Interviewer: Great. Can you explain your project?');
  });

  it('merges adjacent same-speaker fragments into one line', () => {
    const lines = buildTranscriptLines([
      ev({ speaker: 'candidate', text: 'My project', timestampMs: 1000, source: 'browser_stt' }),
      ev({ speaker: 'candidate', text: 'is a URL shortener.', timestampMs: 2500, source: 'browser_stt' }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('My project is a URL shortener.');
  });
});

describe('missing / empty transcript handling', () => {
  it('renders a placeholder body when there are no events', () => {
    const txt = renderTranscriptText([], { sessionId: 'empty-1', candidateId: null, startedAt: null, endedAt: null });
    expect(txt).toContain('Interview Transcript');
    expect(txt).toContain('Session ID: empty-1');
    expect(txt).toContain('Candidate ID: unknown');
    expect(txt).toContain('(No transcript was captured for this interview.)');
  });

  it('buildTranscriptLines on all-empty input yields zero lines', () => {
    expect(buildTranscriptLines([ev({ text: '   ' }), ev({ text: '' })])).toHaveLength(0);
  });
});
