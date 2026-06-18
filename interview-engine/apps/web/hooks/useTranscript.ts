'use client';

import { useCallback, useEffect, useRef } from 'react';
import { API_URL } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// useTranscript — client-side transcript capture for the interview room.
//
// Responsibilities:
//   • stamp every utterance with a timestamp relative to interview start
//   • queue events and flush them to the backend in batches
//   • survive network interruptions (failed flushes are re-queued + retried;
//     a final flush is attempted on tab close via sendBeacon)
//   • optionally drive the browser Web Speech API to capture candidate speech
//
// The backend ALSO captures the conversation server-side, so this layer is
// additive — duplicates are removed during finalization. That means a flaky mic
// or STT never produces an empty transcript.
// ─────────────────────────────────────────────────────────────────────────────

export type TranscriptSpeaker = 'candidate' | 'interviewer';
export type TranscriptSource = 'convai' | 'browser_stt' | 'whisper' | 'manual';

export interface TranscriptEventInput {
  speaker: TranscriptSpeaker;
  text: string;
  source: TranscriptSource;
  isFinal?: boolean;
}

interface QueuedEvent extends TranscriptEventInput {
  timestampMs: number;
  createdAt: string;
}

const FLUSH_INTERVAL_MS = 4000;

export function useTranscript(sessionId: string) {
  const startRef = useRef<number>(Date.now());
  const queueRef = useRef<QueuedEvent[]>([]);
  const flushingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const avatarRecorderRef = useRef<MediaRecorder | null>(null);
  const avatarStreamRef = useRef<MediaStream | null>(null);
  const avatarChunksRef = useRef<BlobPart[]>([]);
  const avatarStartMsRef = useRef<number>(0);

  // Mark the interview start so timestamps are relative to it.
  const markStart = useCallback(() => {
    startRef.current = Date.now();
  }, []);

  const nowMs = useCallback(() => Math.max(0, Date.now() - startRef.current), []);

  const flush = useCallback(async () => {
    if (flushingRef.current || !sessionId) return;
    if (queueRef.current.length === 0) return;
    flushingRef.current = true;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    try {
      const res = await fetch(`${API_URL}/api/interviews/${sessionId}/transcript/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });
      if (!res.ok) throw new Error(`flush failed: ${res.status}`);
    } catch {
      // Network interruption: put the batch back at the front and retry later.
      queueRef.current = [...batch, ...queueRef.current];
    } finally {
      flushingRef.current = false;
    }
  }, [sessionId]);

  const recordEvent = useCallback((event: TranscriptEventInput) => {
    const text = (event.text || '').trim();
    if (!text) return; // ignore empty text up front
    queueRef.current.push({
      speaker: event.speaker,
      text,
      source: event.source,
      isFinal: event.isFinal ?? true,
      timestampMs: Math.max(0, Date.now() - startRef.current),
      createdAt: new Date().toISOString(),
    });
  }, []);

  // Periodic background flush.
  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => { void flush(); }, FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sessionId, flush]);

  // Best-effort final flush if the interview ends unexpectedly (tab close/reload).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      if (!sessionId || queueRef.current.length === 0) return;
      try {
        const blob = new Blob(
          [JSON.stringify({ events: queueRef.current })],
          { type: 'application/json' },
        );
        navigator.sendBeacon?.(`${API_URL}/api/interviews/${sessionId}/transcript/event`, blob);
      } catch {
        /* nothing more we can do on unload */
      }
    };
    window.addEventListener('pagehide', handler);
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('pagehide', handler);
      window.removeEventListener('beforeunload', handler);
    };
  }, [sessionId]);

  const finalize = useCallback(async () => {
    await flush();
    try {
      const res = await fetch(`${API_URL}/api/interviews/${sessionId}/transcript/finalize`, { method: 'POST' });
      return await res.json();
    } catch {
      return null;
    }
  }, [sessionId, flush]);

  const downloadUrl = useCallback(
    () => `${API_URL}/api/interviews/${sessionId}/transcript/file`,
    [sessionId],
  );

  // ── Browser Web Speech API capture for candidate speech (UE5 room) ──
  const startBrowserSTT = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || recognitionRef.current) return false;
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const result = e.results[i];
          const transcript = result[0]?.transcript ?? '';
          recordEvent({
            speaker: 'candidate',
            text: transcript,
            source: 'browser_stt',
            isFinal: Boolean(result.isFinal),
          });
        }
      };
      rec.onerror = () => { /* transient STT errors are non-fatal */ };
      rec.onend = () => {
        // auto-restart while we still hold the ref (network blips end recognition)
        if (recognitionRef.current === rec) {
          try { rec.start(); } catch { /* already started / not allowed */ }
        }
      };
      rec.start();
      recognitionRef.current = rec;
      return true;
    } catch {
      return false;
    }
  }, [recordEvent]);

  const stopBrowserSTT = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try { rec?.stop(); } catch { /* noop */ }
  }, []);

  useEffect(() => () => { stopBrowserSTT(); }, [stopBrowserSTT]);

  // ── Avatar/interviewer voice capture ──
  // The Convai avatar's voice arrives as audio inside the cross-origin pixel-
  // streaming iframe, so it can't be read directly. Instead we capture the
  // interview TAB's audio output (which carries the avatar's voice, NOT the
  // candidate's mic) via getDisplayMedia, record it for the whole interview, and
  // upload it on stop — the backend transcribes it with Whisper into interviewer
  // lines. Must be called from a user gesture (browser requirement).
  const startAvatarCapture = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      return { ok: false, reason: 'Screen/tab audio capture is not supported in this browser.' };
    }
    if (avatarRecorderRef.current) return { ok: true };
    try {
      // video is required by getDisplayMedia; we keep only the audio track.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = stream.getAudioTracks();
      stream.getVideoTracks().forEach((t) => t.stop());
      if (!audioTracks.length) {
        stream.getTracks().forEach((t) => t.stop());
        return { ok: false, reason: 'No tab audio was shared. Re-share and tick "Share tab audio".' };
      }
      const audioStream = new MediaStream(audioTracks);
      avatarStreamRef.current = audioStream;
      avatarChunksRef.current = [];
      avatarStartMsRef.current = nowMs();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(audioStream, { mimeType });
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) avatarChunksRef.current.push(e.data); };
      rec.start(1000); // collect data periodically so a crash still leaves chunks
      avatarRecorderRef.current = rec;
      return { ok: true };
    } catch (err: any) {
      return { ok: false, reason: err?.name === 'NotAllowedError' ? 'Tab-audio capture was denied.' : 'Could not start interviewer audio capture.' };
    }
  }, [nowMs]);

  // Stop avatar capture and upload the recording for server-side transcription.
  // Returns the backend result (or null if nothing was captured).
  const stopAvatarCapture = useCallback(async (): Promise<any> => {
    const rec = avatarRecorderRef.current;
    avatarRecorderRef.current = null;
    if (!rec) return null;

    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(avatarChunksRef.current, { type: rec.mimeType || 'audio/webm' }));
      try { rec.stop(); } catch { resolve(new Blob(avatarChunksRef.current, { type: 'audio/webm' })); }
    });
    avatarStreamRef.current?.getTracks().forEach((t) => t.stop());
    avatarStreamRef.current = null;

    if (!blob.size || !sessionId) return null;
    try {
      // Fields MUST come before the file: @fastify/multipart's req.file() only
      // exposes fields parsed before the file part.
      const form = new FormData();
      form.append('speaker', 'interviewer');
      form.append('startMs', String(avatarStartMsRef.current));
      form.append('file', blob, `interviewer-${Date.now()}.webm`);
      const res = await fetch(`${API_URL}/api/interviews/${sessionId}/transcript/audio`, { method: 'POST', body: form });
      return await res.json().catch(() => null);
    } catch {
      return null;
    }
  }, [sessionId]);

  useEffect(() => () => {
    avatarStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return {
    markStart,
    nowMs,
    recordEvent,
    flush,
    finalize,
    downloadUrl,
    startBrowserSTT,
    stopBrowserSTT,
    startAvatarCapture,
    stopAvatarCapture,
  };
}
