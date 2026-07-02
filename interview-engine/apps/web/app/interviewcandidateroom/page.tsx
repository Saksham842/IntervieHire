'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { WS_URL, API_URL } from '@/lib/api';
import { GazeCalibration } from '@/hooks/GazeCalibration';
import { useProctoring } from '@/hooks/useProctoring';
import { useSpeechMetrics } from '@/hooks/useSpeechMetrics';
import { useTranscript } from '@/hooks/useTranscript';
import { MonitorUp, ShieldCheck, Video } from 'lucide-react';
import type { CalibrationResult } from '@/hooks/useGazeCalibration';
import { roomStyles } from './roomStyles';
import { WaitingRoom } from './WaitingRoom';

const AVATAR_URL = process.env.NEXT_PUBLIC_AVATAR_URL || 'http://localhost:80';

// How early a candidate may enter the room before their scheduled slot. The
// lobby unlocks and the engine's /start accepts a start once inside this window.
// MUST stay in sync with EARLY_ENTRY_MS in the engine interview.routes.ts.
const EARLY_ENTRY_MS = 10 * 60 * 1000;

function withPixelStreamingParams(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('AutoConnect')) url.searchParams.set('AutoConnect', 'true');
    if (!url.searchParams.has('HoveringMouse')) url.searchParams.set('HoveringMouse', 'true');
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const QUESTIONS: { text: string; tag: string; hint: string }[] = [
  {
    text: 'Tell me about a time you handled a difficult situation at work — what was the context, and how did you navigate it?',
    tag: 'Behavioural',
    hint: 'Take a breath. Aim for a 60–90 second answer.',
  },
  {
    text: 'Walk me through a project you are most proud of. What was your specific contribution and the measurable outcome?',
    tag: 'Experience',
    hint: 'Use numbers where you can. Keep it focused on your role.',
  },
  {
    text: 'Describe a disagreement you had with a teammate. How did you reach a resolution?',
    tag: 'Teamwork',
    hint: 'Show how you listen, not just how you argue.',
  },
  {
    text: 'Where do you see the biggest opportunity for impact in this role within your first 90 days?',
    tag: 'Strategy',
    hint: 'Be specific and tie it back to the company.',
  },
];

export default function Interview() {
  const [sessionId, setSessionId] = useState('demo-session');
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([
    { speaker: 'ai', text: 'Welcome. I will ask a few structured questions. Please answer naturally with examples.' },
  ]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<{ text: string; tag: string; hint: string }[]>(QUESTIONS);
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const { markAiFinished } = useSpeechMetrics();
  const transcript = useTranscript(sessionId);
  const wsRef = useRef<WebSocket | null>(null);
  // Per-candidate invite token from the link (?ih_invite=). Forwarded to the
  // token-enforced engine endpoints (/start, GET session, WS register).
  const inviteTokenRef = useRef('');
  const sessionStartedRef = useRef(false);
  const captureStartedRef = useRef(false);
  const [transcriptReady, setTranscriptReady] = useState(false);

  // Post-interview report flow: the transcript is captured live (candidate via
  // browser STT, interviewer via avatar tab-audio → Whisper), finalized to a
  // .txt, and evaluated into the final report — no manual paste.
  const [ended, setEnded] = useState(false);
  const [reportStatus, setReportStatus] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [avatarCapture, setAvatarCapture] = useState<'off' | 'on' | 'error'>('off');
  const [avatarCaptureMsg, setAvatarCaptureMsg] = useState('');
  // Per-job interview settings + branding, synced from the recruiter dashboard.
  const [interviewSettings, setInterviewSettings] = useState<any>(null);
  const [branding, setBranding] = useState<{ name?: string; primaryColor?: string; logoUrl?: string; whiteLabel?: boolean } | null>(null);
  const [startError, setStartError] = useState('');
  // Scheduled-slot barrier: when a session has a future scheduledAt, the room is
  // locked behind a countdown lobby until (scheduledAt − EARLY_ENTRY_MS). null =
  // no schedule (plain link / demo) → no lobby. scheduleChecked gates the initial
  // render so we don't flash the permission gate before the slot is known.
  const [scheduledAtMs, setScheduledAtMs] = useState<number | null>(null);
  const [scheduleChecked, setScheduleChecked] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Live interviewer questions. "Lina" (the Convai/UE avatar) asks her own
  // questions; we surface what she ACTUALLY asked by polling the server
  // transcript (her tab-audio → Deepgram, speaker:'interviewer'). Only populated
  // while "Capture interviewer" is on; otherwise the premade blueprint questions
  // below are shown as a fallback.
  const [linaQuestions, setLinaQuestions] = useState<{ text: string; ts: number }[]>([]);
  const [linaIndex, setLinaIndex] = useState(0);
  const linaCountRef = useRef(0);

  useEffect(() => {
    if (sessionId === 'demo-session' || avatarCapture !== 'on') return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/interviews/${sessionId}/transcript`);
        if (!res.ok) return;
        const data = await res.json();
        // Group Lina's CONSECUTIVE speech into turns (a turn = everything she
        // said since the candidate last spoke) and show the FULL turn — so the
        // candidate sees the COMPLETE question with its lead-in, not just a
        // trailing fragment ("more specifically?") that sentence-splitting would
        // surface on its own. Candidate speech closes the current turn. Keep only
        // turns that actually contain a question.
        const looksLikeQuestion = (s: string) =>
          /\?/.test(s) ||
          /\b(what|why|how|when|where|which|who|can you|could you|would you|do you|have you|tell me|describe|walk me|explain|give me|share|talk me)\b/i.test(s);
        const qs: { text: string; ts: number }[] = [];
        let cur: { text: string; ts: number } | null = null;
        for (const e of (data.events || [])) {
          const sp = e?.speaker;
          if (sp === 'interviewer' && e?.source !== 'manual') {
            const t = String(e?.text || '').trim();
            if (!t) continue;
            if (cur) cur.text = `${cur.text} ${t}`.trim();
            else cur = { text: t, ts: e?.timestampMs ?? 0 };
          } else if (sp === 'candidate') {
            if (cur && cur.text.length > 8 && looksLikeQuestion(cur.text)) qs.push(cur);
            cur = null;
          }
        }
        if (cur && cur.text.length > 8 && looksLikeQuestion(cur.text)) qs.push(cur);
        if (!alive) return;
        if (qs.length > linaCountRef.current) {
          linaCountRef.current = qs.length;
          setLinaIndex(qs.length - 1); // jump to the newest question she asked
        }
        setLinaQuestions(qs);
      } catch { /* transient — ignore */ }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [sessionId, avatarCapture]);

  const avatarSrc = useMemo(() => withPixelStreamingParams(AVATAR_URL), []);

  // The dashboard's "Launch test interview" opens this room with ?sessionId=…
  // (the FastAPI test-session created from the job blueprint). Use it when
  // present; otherwise fall back to the keyless demo session below.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('sessionId') || params.get('session');
    if (queryId) setSessionId(queryId);
    const token = params.get('ih_invite') || params.get('token');
    if (token) inviteTokenRef.current = token;
  }, []);

  // Load per-job interview settings + company branding for a real session. Best
  // effort: on any failure we stay permissive so the interview still runs.
  useEffect(() => {
    if (!sessionId || sessionId === 'demo-session') return;
    let alive = true;
    (async () => {
      try {
        const tokenQS = inviteTokenRef.current ? `?token=${encodeURIComponent(inviteTokenRef.current)}` : '';
        const res = await fetch(`${API_URL}/api/interview/sessions/${sessionId}${tokenQS}`);
        if (res.status === 403) { if (alive) setStartError('This interview link is invalid or has expired.'); return; }
        if (!res.ok) return;
        const s = await res.json();
        if (!alive) return;
        setInterviewSettings(s?.settings || {});
        if (s?.company) setBranding({ name: s.company.name, primaryColor: s.company.primaryColor, logoUrl: s.company.logoUrl, whiteLabel: !!s?.settings?.whiteLabel });
        // Arm the scheduled-slot lobby if a future slot exists.
        const at = s?.scheduledAt ? new Date(s.scheduledAt).getTime() : NaN;
        if (Number.isFinite(at)) setScheduledAtMs(at);
      } catch {
        /* permissive on error */
      } finally {
        if (alive) setScheduleChecked(true);
      }
    })();
    return () => { alive = false; };
  }, [sessionId]);

  // Lobby heartbeat: drives the countdown and auto-unlocks the room the moment
  // the entry window opens. Only runs while genuinely waiting, so it stops once
  // the interview is reachable. Demo sessions never gate.
  const unlockAtMs = scheduledAtMs != null ? scheduledAtMs - EARLY_ENTRY_MS : null;
  const lobbyLocked = sessionId !== 'demo-session' && !startError && unlockAtMs != null && nowMs < unlockAtMs;
  useEffect(() => {
    if (!lobbyLocked) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lobbyLocked]);

  // --- Dynamic questions loading from session ---
  useEffect(() => {
    if (sessionId === 'demo-session') {
      setQuestions(QUESTIONS);
      return;
    }
    let alive = true;
    async function fetchSessionQuestions() {
      try {
        const tokenQS = inviteTokenRef.current ? `?token=${encodeURIComponent(inviteTokenRef.current)}` : '';
        const res = await fetch(`${API_URL}/api/interview/sessions/${sessionId}${tokenQS}`);
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data?.jobRole?.questions) {
          const activeQuestions = data.jobRole.questions
            .filter((q: any) => q.isActive !== false)
            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          if (activeQuestions.length > 0) {
            const mapped = activeQuestions.map((q: any) => ({
              text: q.text,
              tag: q.topicCategories?.[0] || 'Technical',
              hint: q.difficulty ? `${q.difficulty} difficulty. Take your time to answer.` : 'Think structured and explain with examples.',
            }));
            setQuestions(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic session questions:', err);
      }
    }
    fetchSessionQuestions();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  // --- WebSocket + demo session bootstrap (unchanged proctoring contract) ---
  useEffect(() => {
    let alive = true;
    async function bootstrapDemoSession() {
      if (sessionId !== 'demo-session') return;
      try {
        const res = await fetch(`${API_URL}/api/interview/demo-session`);
        if (!res.ok) return;
        const json = await res.json();
        if (alive && json?.sessionId) setSessionId(json.sessionId);
      } catch (error) {
        console.error('demo-session bootstrap failed', error);
      }
    }
    bootstrapDemoSession();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'register', role: 'candidate', sessionId, token: inviteTokenRef.current || undefined }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'error' && msg.code === 'INVALID_TOKEN') {
        setStartError('This interview link is invalid or has expired.');
        return;
      }
      if (msg.type === 'ai_response') {
        setMessages((m) => [...m, { speaker: 'ai', text: msg.text }]);
        markAiFinished();
        if (msg.text) transcript.recordEvent({ speaker: 'interviewer', text: msg.text, source: 'manual' });
      }
    };
    setSocket(ws);
    return () => {
      alive = false;
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // --- Proctoring engine (all features) ---
  const { videoRef, events, state, requestRequiredPermissions, startProctoringSession, endProctoringSession, getScreenAudioStream } = useProctoring(sessionId, socket, calibration);

  // --- Lock scroll to a fullscreen room while mounted ---
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // --- Proctoring debug overlay: toggle with Ctrl+Shift+D (or backtick `) ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') || e.key === '`') {
        e.preventDefault();
        setShowDebug((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Elapsed timer (starts once calibration is done) ---
  useEffect(() => {
    if (!calibration) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [calibration]);

  // --- Recording lifecycle ---
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recordingStatus, setRecordingStatus] = useState('Idle');

  function startRecording() {
    try {
      const original = videoRef.current?.srcObject as MediaStream | null;
      if (!original) {
        setRecordingStatus('Grant camera access first');
        return;
      }
      const mr = new MediaRecorder(original, { mimeType: 'video/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (ev: any) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const form = new FormData();
        form.append('file', blob, `recording-${Date.now()}.webm`);
        setRecordingStatus('Uploading recording…');
        try {
          await fetch(`${API_URL}/api/interview/sessions/${sessionId}/recording`, { method: 'POST', body: form });
          setRecordingStatus('Recording uploaded');
        } catch {
          setRecordingStatus('Recording upload failed');
        }
      };
      recorderRef.current = mr;
      mr.start();
      setRecordingStatus('Recording video + audio');
    } catch (err) {
      console.error('startRecording error', err);
    }
  }

  // --- Auto-start the recorded session once calibrated + connected ---
  useEffect(() => {
    if (!calibration || sessionStartedRef.current) return;
    if (socket?.readyState !== WebSocket.OPEN) return;
    sessionStartedRef.current = true;
    (async () => {
      try {
        setRecordingStatus('Starting session…');
        // Engage the engine's proctoring engine (gaze/face/object/tab/etc) and
        // its integrity scoring — detection is gated until this is called.
        startProctoringSession();
        // Honor the recruiter's interview settings enforced server-side at /start
        // (disabled / late / reattempt / CV required). On a block, surface the
        // message and stop instead of proceeding into a broken room.
        const startTokenQS = inviteTokenRef.current ? `?token=${encodeURIComponent(inviteTokenRef.current)}` : '';
        const startRes = await fetch(`${API_URL}/api/interview/sessions/${sessionId}/start${startTokenQS}`, { method: 'POST' });
        // Hard-block ONLY on a 4xx recruiter-policy gate (disabled / late /
        // no-reattempt / CV-required / invalid invite). On a 5xx or network
        // error, log and PROCEED into the interview instead of trapping the
        // candidate behind "Internal Server Error" — the room still runs on its
        // synced/blueprint questions, and a transient engine/session error must
        // not block a legitimately scheduled candidate.
        if (startRes.status >= 400 && startRes.status < 500) {
          let msg = 'This interview could not be started.';
          try { const j = await startRes.json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
          setStartError(msg);
          try { endProctoringSession(); } catch { /* noop */ }
          setRecordingStatus('');
          return;
        }
        if (!startRes.ok) {
          console.error(`Engine /start returned ${startRes.status}; proceeding into the interview anyway.`);
        }
        startRecording();
        // Transcript capture (markStart + browser STT + auto interviewer-audio
        // capture) is started in the calibration-gated effect below — NOT here —
        // so it never depends on the proctoring WebSocket being OPEN. A flaky WS
        // for a scheduled session used to block this whole effect, so candidate
        // STT never started and the interview captured zero transcript events.
      } catch (err) {
        console.error('startSession failed', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibration, socket]);

  // Start transcript capture as soon as calibration is done, independent of the
  // proctoring WebSocket. Candidate speech → browser STT. Interviewer (Lina) voice
  // → auto-attached to the audio ALREADY shared on the mandatory proctoring
  // screen-share, so it's captured without the candidate clicking anything (the
  // old flow required a manual "Capture interviewer" click that real candidates
  // skipped → no interviewer turns). If no audio was shared, the banner remains
  // for a manual click (a user gesture, which can open its own audio prompt).
  useEffect(() => {
    if (!calibration || captureStartedRef.current) return;
    captureStartedRef.current = true;
    transcript.markStart();
    transcript.startBrowserSTT();
    const sharedAudio = getScreenAudioStream?.() ?? null;
    if (sharedAudio) {
      const r = transcript.startAvatarCaptureFromStream(sharedAudio);
      if (r.ok) {
        setAvatarCapture('on');
        setAvatarCaptureMsg('Interviewer voice is being recorded for transcription.');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibration]);

  // Let the candidate enable interviewer-voice capture (a user gesture is
  // required for tab-audio sharing). They pick the interview tab and tick
  // "Share tab audio" — that audio is the avatar's voice (the mic is not in it).
  async function enableAvatarCapture() {
    // Reuse the audio already shared via the proctoring screen-share (single
    // prompt). Only if that share carried no audio do we fall back to a
    // dedicated getDisplayMedia prompt — so nothing breaks if the candidate
    // skipped the "share audio" checkbox earlier.
    const sharedAudio = getScreenAudioStream?.() ?? null;
    const r = sharedAudio
      ? transcript.startAvatarCaptureFromStream(sharedAudio)
      : await transcript.startAvatarCapture();
    if (r.ok) {
      setAvatarCapture('on');
      setAvatarCaptureMsg('Interviewer voice is being recorded for transcription.');
    } else {
      setAvatarCapture('error');
      setAvatarCaptureMsg(r.reason || 'Could not start interviewer audio capture.');
    }
  }

  // End → stop all capture, transcribe the avatar audio, finalize the .txt,
  // complete the session, and evaluate into the report. Fully automatic.
  async function endCall() {
    setEnded(true);
    setReportBusy(true);
    try {
      recorderRef.current?.stop();
      transcript.stopBrowserSTT();
      void transcript.flush();
      endProctoringSession();

      setReportStatus('Transcribing interviewer audio…');
      const audioRes = await transcript.stopAvatarCapture();
      if (audioRes?.error) setReportStatus(audioRes.error);

      setReportStatus('Building transcript…');
      const fin = await transcript.finalize();
      if (fin?.status === 'finalized' || fin?.status === 'empty') setTranscriptReady(true);

      await fetch(`${API_URL}/api/interview/sessions/${sessionId}/complete${inviteTokenRef.current ? `?token=${encodeURIComponent(inviteTokenRef.current)}` : ''}`, { method: 'POST' });

      setReportStatus('Generating report from transcript…');
      const eRes = await fetch(`${API_URL}/api/interviews/${sessionId}/report`, { method: 'POST' });
      const eJson = await eRes.json();
      if (eRes.ok && eJson?.evaluation) {
        setReport(eJson.evaluation);
        setReportStatus(`Report generated (engine: ${eJson.engine}).`);
      } else {
        setReportStatus(eJson?.error || 'Report generation failed.');
      }
    } catch (err) {
      console.error('endCall failed', err);
      setReportStatus(err instanceof Error ? err.message : 'Could not generate the report.');
    } finally {
      setReportBusy(false);
    }
  }

  function toggleMic() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const next = !micOn;
    stream?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }

  function toggleCam() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const next = !camOn;
    stream?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  }

  // --- Permission gate state ---
  const cameraReady = state.cameraActive && !state.permissionDenied;
  const screenShareReady = !state.screenShareSupported || state.screenShareReadyBeforeInterview;
  const permissionsReadyForCalibration = cameraReady && screenShareReady;

  // --- Live integrity computation ---
  const activeViolation = useMemo(() => {
    const high = events.find((e) => e.severity === 'HIGH' || e.severity === 'CRITICAL');
    return high || events[0] || null;
  }, [events]);

  const integrity = activeViolation
    ? { label: prettyEvent(activeViolation.eventType), tone: 'alert' as const }
    : state.gazeAwayDetected
    ? { label: `Looking ${state.gazeDirection ?? 'away'}`, tone: 'warn' as const }
    : { label: 'Monitored', tone: 'ok' as const };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const clock = `${mm}:${ss}`;
  // Prefer Lina's actually-asked questions (from the live transcript) over the
  // premade blueprint list; fall back to premade when none are captured yet.
  const useLina = linaQuestions.length > 0;
  const qList = useLina ? linaQuestions : questions;
  const qIdx = useLina ? Math.min(linaIndex, linaQuestions.length - 1) : questionIndex;
  const question = useLina
    ? { text: linaQuestions[qIdx]?.text || '…', tag: 'LINA · LIVE', hint: 'This is what your interviewer just asked.' }
    : (questions[questionIndex] || { text: 'No questions loaded.', tag: 'Interview', hint: 'Please wait.' });

  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const mobileBlocked = !!interviewSettings && interviewSettings.allowMobile === false && isMobileDevice;
  const wl = !!(interviewSettings && interviewSettings.whiteLabel && branding);

  if (mobileBlocked) {
    return (
      <>
        <style>{roomStyles}</style>
        <div className="gate">
          <div className="gate-card">
            <p className="gate-eyebrow">Desktop required</p>
            <h1 className="gate-title">Please switch to a desktop</h1>
            <p className="gate-sub">This interview must be taken on a desktop or laptop. Open this link on a computer to continue.</p>
          </div>
        </div>
      </>
    );
  }

  // Hold on a light loading gate until we know whether this session has a future
  // scheduled slot — avoids flashing the permission gate before the lobby appears.
  if (!startError && sessionId !== 'demo-session' && !scheduleChecked) {
    return (
      <>
        <style>{roomStyles}</style>
        <div className="gate">
          <div className="gate-card">
            <p className="gate-eyebrow">Interview lobby</p>
            <h1 className="gate-title">Preparing your interview…</h1>
            <p className="gate-sub">One moment while we load your session.</p>
          </div>
        </div>
      </>
    );
  }

  // Scheduled-slot barrier: locked until (scheduledAt − EARLY_ENTRY_MS).
  if (lobbyLocked && scheduledAtMs != null && unlockAtMs != null) {
    return (
      <>
        <style>{roomStyles}</style>
        <WaitingRoom scheduledAtMs={scheduledAtMs} unlockAtMs={unlockAtMs} nowMs={nowMs} brand={branding} />
      </>
    );
  }

  return (
    <>
      <style>{roomStyles}</style>

      {/* Interview blocked by the recruiter's settings (disabled / late / reattempt / CV) */}
      {startError && (
        <div className="gate">
          <div className="gate-card">
            <p className="gate-eyebrow">Interview unavailable</p>
            <h1 className="gate-title">Can&apos;t start this interview</h1>
            <p className="gate-sub">{startError}</p>
          </div>
        </div>
      )}

      {/* Pre-interview permission gate */}
      {!calibration && !permissionsReadyForCalibration && (
        <div className="gate">
          <div className="gate-card">
            <p className="gate-eyebrow">Pre-interview access</p>
            <h1 className="gate-title">Grant access before gaze calibration</h1>
            <p className="gate-sub">
              Camera and screen sharing are checked now. Gaze calibration starts only after these are ready.
            </p>
            <div className="gate-checks">
              {[
                {
                  label: 'Camera',
                  ok: cameraReady,
                  detail: state.permissionDenied
                    ? 'Permission denied'
                    : state.cameraActive
                    ? 'Ready'
                    : 'Waiting for browser permission',
                  Icon: Video,
                },
                {
                  label: 'Screen share',
                  ok: screenShareReady,
                  detail: !state.screenShareSupported
                    ? 'Unavailable in this browser'
                    : state.screenShareReadyBeforeInterview
                    ? 'Ready'
                    : 'Required before calibration',
                  Icon: MonitorUp,
                },
              ].map(({ label, ok, detail, Icon }) => (
                <div key={label} className="gate-check">
                  <div className="gate-check-l">
                    <Icon size={18} className={ok ? 'ok-ico' : 'wait-ico'} />
                    <div>
                      <p className="gate-check-label">{label}</p>
                      <p className="gate-check-detail">{detail}</p>
                    </div>
                  </div>
                  <span className={`gate-dot ${ok ? 'is-ok' : 'is-wait'}`} />
                </div>
              ))}
            </div>
            <button onClick={() => requestRequiredPermissions()} className="gate-btn">
              <ShieldCheck size={18} /> Grant required access
            </button>
            {state.permissionDenied && (
              <p className="gate-error">
                Camera access was denied. Allow camera access in your browser settings, then refresh this page.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gaze calibration */}
      {!calibration && permissionsReadyForCalibration && (
        <GazeCalibration
          videoRef={videoRef}
          onComplete={setCalibration}
          onSkip={() =>
            setCalibration({
              thresholdX: 0.18,
              thresholdY: 0.22,
              neutralX: 0,
              neutralY: 0,
              pointData: [],
              qualityScore: 0,
            })
          }
        />
      )}

      {/* ===== Interview room ===== */}
      <div className="room">
        <header className="topbar">
          <div className="brand">
            <div className="logo">{wl && branding?.logoUrl ? <img src={branding.logoUrl} alt="" style={{ height: 24, borderRadius: 6 }} /> : '✦'}</div>
            <div className="brand-name">
              {wl ? branding?.name : <>Intervie<span>Hire</span></>}
            </div>
            <div className="room-label">AI Interview Room</div>
          </div>
          <div className="job-pill">
            <i className="live-dot" />
            <strong>Associate Consultant Screening</strong>
            <span>Round 1</span>
          </div>
          <div className="connection">
            <span className={`integrity ${integrity.tone}`}>
              <ShieldCheck size={14} />
              {integrity.label}
            </span>
            {/* Live flagcheck: tier-1 AI-tone heuristics over the candidate's
                finalized speech. Only surfaces MEDIUM/HIGH; the server re-runs
                and blends an LLM pass on the saved transcript. */}
            {transcript.aiToneAssessment && transcript.aiToneAssessment.band !== 'LOW' && (
              <span
                title={transcript.aiToneAssessment.reasons.slice(0, 4).join(' · ')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 9999,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: transcript.aiToneAssessment.band === 'HIGH' ? '#ffe4e6' : '#fef3c7',
                  color: transcript.aiToneAssessment.band === 'HIGH' ? '#be123c' : '#b45309',
                }}
              >
                ⚠ AI-tone {transcript.aiToneAssessment.band} · {transcript.aiToneAssessment.score}
              </span>
            )}
            <span className="bars">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="connection-text">
              {socket?.readyState === WebSocket.OPEN ? 'Excellent connection' : 'Connecting…'}
            </span>
            <span className="timer">{clock}</span>
          </div>
        </header>

        {/* Prominent prompt: the interviewer's voice can only be recorded if the
            candidate shares the screen/tab WITH audio (browsers can't capture
            device audio silently). Shown until capture is active. */}
        {calibration && avatarCapture !== 'on' && (
          <div
            onClick={enableAvatarCapture}
            style={{
              position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 9000,
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              padding: '12px 18px', borderRadius: 12, maxWidth: '92vw',
              background: avatarCapture === 'error' ? 'linear-gradient(135deg,#7f1d1d,#b91c1c)' : 'linear-gradient(135deg,#0e7490,#0891b2)',
              color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)',
              animation: 'ihpulse 1.6s ease-in-out infinite',
            }}
            title="Record the interviewer's voice"
          >
            <style>{'@keyframes ihpulse{0%,100%{box-shadow:0 8px 24px rgba(8,145,178,0.35)}50%{box-shadow:0 8px 36px rgba(8,145,178,0.75)}}'}</style>
            <span style={{ fontSize: 22 }}>🎧</span>
            <div style={{ lineHeight: 1.35 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {avatarCapture === 'error' ? 'Interviewer audio not captured — click to retry' : 'Click to record the interviewer’s voice'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {avatarCaptureMsg || 'Pick “Entire Screen” or this tab and CHECK “Share system/tab audio”.'}
              </div>
            </div>
          </div>
        )}

        <main className="content">
          <section className="avatar-panel">
            <iframe
              className="pixel-frame"
              src={avatarSrc}
              title="Unreal Engine Pixel Streaming Avatar"
              allow="microphone; camera; autoplay; fullscreen; gamepad; xr-spatial-tracking"
              referrerPolicy="no-referrer"
            />
            <div className="avatar-overlay" />
            <div className="identity">
              <div className="identity-icon">✦</div>
              <div>
                <strong>Lina</strong>
                <span>AI Interviewer</span>
              </div>
            </div>
            <div className="status-pill">
              <i className="red-dot" /> Live · Associate
            </div>
            {/* Candidate camera as a Google-Meet-style PiP in the corner of Lina's
                panel, so the right column is free to show the full question. */}
            <section className="candidate-panel">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="candidate-video"
                style={{ opacity: calibration && camOn ? 1 : 0 }}
              />
              {!camOn && <div className="cam-off">Camera off</div>}
              <div className="you-pill">
                <i /> You
              </div>
              <div className="candidate-footer">
                <div className="mic">{micOn ? '🎙' : '🔇'}</div>
              </div>
            </section>
          </section>

          <aside className="right-stack">
            <section className="question-card">
              <div className="question-top">
                <div className="tag">{question.tag}</div>
              </div>
              <h2>{question.text}</h2>
              <div className="question-meta">
                {useLina ? 'Interviewer asked' : 'Question'} {String(qIdx + 1).padStart(2, '0')}/
                {String(qList.length).padStart(2, '0')}
              </div>
              <p>{question.hint}</p>
              <div className="question-actions">
                <button
                  className="circle-btn"
                  type="button"
                  disabled={qIdx === 0}
                  onClick={() => (useLina ? setLinaIndex((i) => Math.max(0, i - 1)) : setQuestionIndex((i) => Math.max(0, i - 1)))}
                >
                  ‹
                </button>
                <button
                  className="next-btn"
                  type="button"
                  onClick={() => (useLina ? setLinaIndex((i) => Math.min(qList.length - 1, i + 1)) : setQuestionIndex((i) => Math.min(qList.length - 1, i + 1)))}
                >
                  NEXT ›
                </button>
              </div>
            </section>
          </aside>
        </main>

        <footer className="controlbar">
          <div className="control-time">
            <i className="red-dot" />
            <span>{clock}</span>
            <span className="elapsed-label">Elapsed · {recordingStatus}</span>
            <button type="button" className="debug-toggle" onClick={() => setShowDebug((v) => !v)} title="Toggle proctoring debug (Ctrl+Shift+D or ` )">
              🐞 Debug
            </button>
          </div>
          <div className="control-actions">
            <button
              type="button"
              title={
                avatarCapture === 'on'
                  ? avatarCaptureMsg || 'Capturing the interviewer’s voice ✓'
                  : avatarCapture === 'error'
                  ? avatarCaptureMsg || 'Interviewer audio not captured — click to retry'
                  : 'Capture the interviewer’s voice for the transcript (share this tab with audio)'
              }
              onClick={enableAvatarCapture}
              disabled={avatarCapture === 'on'}
              style={{
                color: avatarCapture === 'on' ? '#34d399' : avatarCapture === 'error' ? '#f87171' : undefined,
              }}
            >
              🎧
            </button>
            <button type="button" title="Microphone" onClick={toggleMic} className={micOn ? '' : 'muted'}>
              {micOn ? '🎙' : '🔇'}
            </button>
            <button type="button" title="Camera" onClick={toggleCam} className={camOn ? '' : 'muted'}>
              {camOn ? '▣' : '◻'}
            </button>
            <button className="end" type="button" title="End call" onClick={endCall}>
              ☎
            </button>
          </div>
        </footer>

        {ended && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center',
              padding: 24, background: 'rgba(2,6,14,0.82)', backdropFilter: 'blur(6px)',
            }}
          >
            <div
              style={{
                width: 'min(760px, 94vw)', maxHeight: '90vh', overflow: 'auto', color: '#e6edff',
                background: 'linear-gradient(180deg,#0c1426,#080d1a)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 18, padding: '26px 28px', boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
              }}
            >
              <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7dd3fc' }}>
                Interview complete
              </p>
              <h2 style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 800 }}>
                {report ? 'Interview report' : 'Generating the interview report'}
              </h2>

              {!report ? (
                <>
                  <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.6, color: '#9fb2d4' }}>
                    The transcript was captured automatically — your speech via speech-to-text and the
                    interviewer's voice from the interview audio — then transcribed and scored. No paste needed.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid rgba(125,211,252,0.35)', borderTopColor: '#7dd3fc',
                        animation: reportBusy ? 'spin 0.8s linear infinite' : 'none', opacity: reportBusy ? 1 : 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: '#9fb2d4' }}>{reportStatus || 'Working…'}</span>
                    <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
                  </div>
                  {transcriptReady && (
                    <a
                      href={transcript.downloadUrl()}
                      download
                      style={{ display: 'inline-block', marginTop: 14, fontSize: 12.5, color: '#7dd3fc', textDecoration: 'underline' }}
                    >
                      ⬇ Download full interview transcript (.txt)
                    </a>
                  )}
                </>
              ) : (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ flex: '1 1 160px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px' }}>
                      <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', color: '#9fb2d4' }}>Overall</p>
                      <p style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800 }}>
                        {report.overallScore ?? '–'}<span style={{ fontSize: 14, color: '#7e90b2' }}>/100</span>
                      </p>
                    </div>
                    <div style={{ flex: '1 1 160px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px' }}>
                      <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', color: '#9fb2d4' }}>Recommendation</p>
                      <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, textTransform: 'capitalize' }}>
                        {String(report.recommendation ?? '–').replace(/_/g, ' ')}
                      </p>
                    </div>
                    {report.proctoringSummary && (
                      <div style={{ flex: '1 1 160px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px' }}>
                        <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', color: '#9fb2d4' }}>Proctoring</p>
                        <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>
                          {report.proctoringSummary.eventCount} events
                          <span style={{ color: '#f87171' }}> · {report.proctoringSummary.criticalOrHighCount} high</span>
                        </p>
                      </div>
                    )}
                  </div>
                  {report.summary && (
                    <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#c7d4ee' }}>{report.summary}</p>
                  )}
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12.5, color: '#7dd3fc' }}>View full report JSON</summary>
                    <pre style={{ marginTop: 8, maxHeight: 280, overflow: 'auto', fontSize: 11, lineHeight: 1.5, color: '#cbd5e1', background: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: 12 }}>
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </details>
                  {transcriptReady && (
                    <a
                      href={transcript.downloadUrl()}
                      download
                      style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, color: '#7dd3fc', textDecoration: 'underline' }}
                    >
                      ⬇ Download full interview transcript (.txt)
                    </a>
                  )}
                  <p style={{ marginTop: 12, fontSize: 12, color: '#9fb2d4' }}>{reportStatus} It also persists to the dashboard's Deep Analysis.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showDebug && (
          <div className="debug-panel">
            <div className="debug-head">
              <strong>Proctoring debug</strong>
              <button type="button" onClick={() => setShowDebug(false)} title="Close (Ctrl+Shift+D)">
                ✕
              </button>
            </div>

            <div className="debug-section-title">Pipeline</div>
            <div className="debug-grid">
              <DebugRow label="Session" value={sessionId} />
              <DebugRow label="WebSocket" value={wsLabel(socket)} ok={socket?.readyState === WebSocket.OPEN} />
              <DebugRow label="Calibrated" value={calibration ? `yes (q=${calibration.qualityScore})` : 'no'} ok={!!calibration} />
              <DebugRow label="Recording" value={recordingStatus} />
            </div>

            <div className="debug-section-title">Live proctoring state</div>
            <div className="debug-grid">
              {Object.entries(state).map(([k, v]) => (
                <DebugRow key={k} label={k} value={formatVal(v)} ok={toOk(k, v)} />
              ))}
            </div>

            <div className="debug-section-title">Integrity events ({events.length})</div>
            <div className="debug-events">
              {events.length ? (
                events
                  .slice(-30)
                  .reverse()
                  .map((e, i) => (
                    <div key={i} className={`debug-event sev-${(e.severity || 'LOW').toLowerCase()}`}>
                      <span className="debug-event-type">{e.eventType}</span>
                      <span className="debug-event-sev">{e.severity}</span>
                      {e.metadata ? (
                        <pre className="debug-event-meta">{JSON.stringify(e.metadata)}</pre>
                      ) : null}
                    </div>
                  ))
              ) : (
                <p className="debug-empty">No events flagged yet — proctoring is watching.</p>
              )}
            </div>

            <div className="debug-foot">Last AI msg: {messages[messages.length - 1]?.text?.slice(0, 80) ?? '—'}</div>
          </div>
        )}
      </div>
    </>
  );
}

function DebugRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="debug-row">
      <span className="debug-row-k">
        {ok === undefined ? null : <i className={`debug-dot ${ok ? 'is-ok' : 'is-bad'}`} />}
        {label}
      </span>
      <span className="debug-row-v">{value}</span>
    </div>
  );
}

function wsLabel(ws: WebSocket | null) {
  if (!ws) return 'none';
  return ['connecting', 'open', 'closing', 'closed'][ws.readyState] ?? String(ws.readyState);
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Green dot = healthy/desired; red dot = something flagged or inactive.
function toOk(key: string, v: unknown): boolean | undefined {
  if (typeof v !== 'boolean') return undefined;
  const badWhenTrue = /denied|away|detected|off|exited|stopped|hidden|switch/i.test(key);
  return badWhenTrue ? !v : v;
}

function prettyEvent(eventType: string) {
  return eventType
    .replace(/_DETECTED$/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
