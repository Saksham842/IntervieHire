import fs from 'node:fs';

// ─────────────────────────────────────────────────────────────────────────────
// Server-side ASR. Transcribes an uploaded audio file into timestamped segments
// so the interviewer (avatar) audio captured in the browser becomes transcript
// events with accurate, interview-relative timestamps.
//
// Provider preference: Deepgram (webm-native, cheap, generous free credit) →
// OpenAI Whisper (if you have that key) → none. Keyless behaviour: when no
// provider is configured, asrAvailable() is false and callers degrade gracefully
// (the candidate side still works via keyless browser STT).
// ─────────────────────────────────────────────────────────────────────────────

export type AsrSegment = { text: string; startMs: number; endMs: number };

const hasDeepgram = () => {
  const k = process.env.DEEPGRAM_API_KEY;
  return Boolean(k && k !== 'replace-me');
};
const hasWhisper = () => {
  const k = process.env.OPENAI_API_KEY;
  return Boolean(k && k !== 'replace-me');
};

export function asrAvailable(): boolean {
  return hasDeepgram() || hasWhisper();
}

export function asrProvider(): 'deepgram' | 'whisper' | null {
  if (hasDeepgram()) return 'deepgram';
  if (hasWhisper()) return 'whisper';
  return null;
}

/**
 * Transcribe an audio file into segments. `baseOffsetMs` is added to every
 * segment's start so timestamps are relative to the interview start.
 * Returns null when no ASR provider is configured.
 */
export async function transcribeAudioSegments(
  filePath: string,
  baseOffsetMs = 0,
  mimeType = 'audio/webm',
): Promise<AsrSegment[] | null> {
  const provider = asrProvider();
  if (!provider) return null;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) return [];
  return provider === 'deepgram'
    ? transcribeWithDeepgram(filePath, baseOffsetMs, mimeType)
    : transcribeWithWhisper(filePath, baseOffsetMs);
}

// ── Deepgram (pre-recorded) ──────────────────────────────────────────────────
async function transcribeWithDeepgram(
  filePath: string,
  baseOffsetMs: number,
  mimeType: string,
): Promise<AsrSegment[]> {
  const apiKey = process.env.DEEPGRAM_API_KEY as string;
  const model = process.env.DEEPGRAM_MODEL || 'nova-2';
  const params = new URLSearchParams({
    model,
    smart_format: 'true',
    punctuate: 'true',
    utterances: 'true', // utterance-level start/end timestamps for clean lines
  });

  const audio = fs.readFileSync(filePath);
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': mimeType },
    body: audio,
  });
  if (!res.ok) {
    throw new Error(`Deepgram transcription failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();

  // Prefer utterances (each has a start/end in seconds).
  const utterances: any[] = data?.results?.utterances ?? [];
  if (utterances.length) {
    return utterances
      .map((u) => ({
        text: String(u?.transcript ?? '').trim(),
        startMs: baseOffsetMs + Math.round(Number(u?.start ?? 0) * 1000),
        endMs: baseOffsetMs + Math.round(Number(u?.end ?? u?.start ?? 0) * 1000),
      }))
      .filter((s) => s.text.length > 0);
  }

  // Fallback: the single best transcript for the whole file.
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  const text = String(alt?.transcript ?? '').trim();
  if (!text) return [];
  const startMs = baseOffsetMs + Math.round(Number(alt?.words?.[0]?.start ?? 0) * 1000);
  return [{ text, startMs, endMs: startMs }];
}

// ── OpenAI Whisper (verbose segments) ────────────────────────────────────────
async function transcribeWithWhisper(filePath: string, baseOffsetMs: number): Promise<AsrSegment[]> {
  const apiKey = process.env.OPENAI_API_KEY as string;
  const model = process.env.OPENAI_ASR_MODEL || 'whisper-1';

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath) as any);
  form.append('model', model);
  form.append('response_format', 'verbose_json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form as any,
  });
  if (!res.ok) {
    throw new Error(`Whisper transcription failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();
  const segments: any[] = Array.isArray(data?.segments) ? data.segments : [];
  if (segments.length) {
    return segments
      .map((s) => ({
        text: String(s.text ?? '').trim(),
        startMs: baseOffsetMs + Math.round(Number(s.start ?? 0) * 1000),
        endMs: baseOffsetMs + Math.round(Number(s.end ?? s.start ?? 0) * 1000),
      }))
      .filter((s) => s.text.length > 0);
  }
  const text = String(data?.text ?? '').trim();
  return text ? [{ text, startMs: baseOffsetMs, endMs: baseOffsetMs }] : [];
}
