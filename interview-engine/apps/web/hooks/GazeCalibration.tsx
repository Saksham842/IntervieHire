'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen 8-dot gaze calibration OVERLAY (proctoring setup).
//
// This is the pure PRESENTATION layer: it renders the intro instructions, the
// animated dot grid, the per-dot sampling ring, and the final quality/acceptance
// screen. All measurement, sequencing, and accept/reject logic lives in the
// companion hook useGazeCalibration.ts — this component only reflects `calState`
// (phase, current dot index, samples collected, result) and calls the hook's
// startCalibration / beginPoints / abort actions in response to user input.
//
// The candidate looks toward each screen-edge dot in turn while the hook records
// their world-vertical gaze `v` and iris-X sweep; the resulting per-person band +
// thresholds (see gazeVerticalMath.ts / proctoringGazeThresholdsV3.ts) drive live
// gaze-away detection. A REJECTED calibration (no face, closed eyes, or eyes that
// never swept to the dots) keeps the candidate on the quality screen with a reason
// and a Recalibrate button rather than proceeding — the anti-spoof gate.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { CALIBRATION_POINTS, useGazeCalibration, type CalibrationResult } from './useGazeCalibration';
import { MIN_OPPOSITE_EDGE_GAP_X, MIN_V_BAND_WIDTH } from './proctoringGazeThresholdsV3';

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onComplete: (result: CalibrationResult) => void;
  onSkip?: () => void;
};

// ── tiny helpers ────────────────────────────────────────────────────────────

/**
 * Horizontal quality meter for the final screen. Maps the 0–1 `qualityScore` to a
 * percentage plus a colour/label band (green ≥70 good, amber ≥40 fair, red poor) so
 * the candidate can self-assess whether to recalibrate before continuing.
 */
function QualityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const colour =
    pct >= 70 ? '#4ade80' :
    pct >= 40 ? '#facc15' : '#f87171';
  const label =
    pct >= 70 ? 'Good' :
    pct >= 40 ? 'Fair — consider recalibrating' : 'Poor — please recalibrate';

  return (
    <div style={{ width: '100%', maxWidth: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>Calibration quality</span>
        <span style={{ fontSize: 13, color: colour, fontFamily: 'monospace', fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ height: 6, background: '#1e293b', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: colour,
            borderRadius: 99,
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  );
}

/**
 * A single calibration target. `x`/`y` are fractional positions (0–1) within the
 * dot-grid container, mirroring CALIBRATION_POINTS' xFrac/yFrac; state props drive
 * appearance: `active` = current target (larger, blue, glowing), `done` = already
 * sampled (green), otherwise idle grey. `waiting` adds the ping ring that prompts
 * the candidate to fixate before sampling begins.
 */
function Dot({
  x, y, active, done, waiting,
}: {
  x: number; y: number; active: boolean; done: boolean; waiting: boolean;
}) {
  // Active dot is enlarged so the candidate's eyes are drawn to the true target.
  const size = active ? 28 : 16;
  return (
    <div
      style={{
        position: 'absolute',
        // fractional coords → percentage offsets within the grid container
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        borderRadius: '50%',
        background: done
          ? '#4ade80'
          : active
          ? '#38bdf8'
          : '#334155',
        border: active ? '2px solid #7dd3fc' : '2px solid #475569',
        boxShadow: active
          ? '0 0 0 6px rgba(56,189,248,0.18), 0 0 20px rgba(56,189,248,0.35)'
          : 'none',
        transition: 'all 0.25s ease',
        zIndex: active ? 10 : 1,
      }}
    >
      {waiting && active && (
        <div
          style={{
            position: 'absolute',
            inset: -10,
            borderRadius: '50%',
            border: '2px solid rgba(56,189,248,0.4)',
            animation: 'ping 1s ease-out infinite',
          }}
        />
      )}
    </div>
  );
}

/**
 * Circular progress ring overlaid on the active dot during the `sampling` phase.
 * `progress` is 0–1 (samples collected / target); the stroke sweeps clockwise from
 * 12 o'clock (rotate -90) via strokeDashoffset, giving the candidate a "hold your
 * gaze" cue for the fixed dwell window.
 */
function SamplingRing({ progress }: { progress: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <svg
      width={60}
      height={60}
      style={{ position: 'absolute', inset: 0, margin: 'auto', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <circle cx={30} cy={30} r={r} fill="none" stroke="#1e293b" strokeWidth={4} />
      <circle
        cx={30}
        cy={30}
        r={r}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />
    </svg>
  );
}

// ── main component ───────────────────────────────────────────────────────────

/**
 * Full-screen calibration overlay. Drives the candidate through the intro →
 * per-dot sampling → result sequence by rendering off the hook's `calState` and
 * dispatching its actions. Reports the finished CalibrationResult upward via
 * `onComplete` (only when accepted); `onSkip`, if provided, aborts and bypasses
 * calibration entirely.
 *
 * @param videoRef  live camera element the hook reads frames from
 * @param onComplete called once with an ACCEPTED result after the quality screen
 * @param onSkip     optional escape hatch shown on the intro screen
 */
export function GazeCalibration({ videoRef, onComplete, onSkip }: Props) {
  const { calState, startCalibration, beginPoints, abort } = useGazeCalibration(videoRef);
  // Guards the one-time MediaPipe kickoff below against StrictMode double-mount.
  const hasStarted = useRef(false);
  // A finished-but-untrusted result; gates the quality screen into recalibrate mode.
  const calibrationRejected = Boolean(calState.result && !calState.result.accepted);

  // Kick off MediaPipe load as soon as the component mounts (once — see hasStarted).
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startCalibration();
    }
  }, [startCalibration]);

  // When calibration finishes, surface result to parent
  useEffect(() => {
    if (calState.phase === 'done' && calState.result) {
      // Only proceed when the calibration is trustworthy. A rejected result (no face,
      // closed eyes, or eyes that never moved to the dots) keeps the candidate on the
      // quality screen with a reason and a Recalibrate button.
      if (!calState.result.accepted) return;
      // Give user a moment to see the quality screen before closing (auto-advance).
      const t = setTimeout(() => onComplete(calState.result!), 2200);
      return () => clearTimeout(t);
    }
  }, [calState.phase, calState.result, onComplete]);

  // The dot currently being sampled (index < 0 before the sequence starts).
  const currentPoint =
    calState.currentPointIndex >= 0
      ? CALIBRATION_POINTS[calState.currentPointIndex]
      : null;

  // Ring fill 0–1: 20 is the target sample count per dot (matches the hook's dwell).
  const samplingProgress =
    calState.phase === 'sampling'
      ? calState.samplesCollected / 20
      : 0;

  return (
    <>
      <style>{`
        @keyframes ping {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0a0f1a',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace",
          color: '#e2e8f0',
        }}
      >

        {/* ── INTRO ─────────────────────────────────────────────────── */}
        {calState.phase === 'intro' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 28,
              maxWidth: 520,
              padding: '0 24px',
              animation: 'fadeIn 0.4s ease',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 4, color: '#475569', textTransform: 'uppercase' }}>
              Eye Tracking Setup
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, textAlign: 'center', lineHeight: 1.3, color: '#f1f5f9' }}>
              Calibrate your gaze
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {[
                ['01', 'Eight dots will appear on screen one at a time.'],
                ['02', 'Look toward the edge of the screen, not directly at the dot. — keep your head still, move only your eyes.'],
                ['03', 'Wait for the dot to turn green before the next one appears.'],
                ['04', 'The whole process takes about 30 seconds.'],
              ].map(([n, text]) => (
                <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: '#38bdf8', minWidth: 22, paddingTop: 2 }}>{n}</span>
                  <span style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={beginPoints}
                style={{
                  padding: '12px 32px',
                  background: '#38bdf8',
                  color: '#0a0f1a',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: 1,
                }}
              >
                Begin calibration →
              </button>
              {onSkip && (
                <button
                  onClick={() => { abort(); onSkip(); }}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    color: '#475569',
                    border: '1px solid #1e293b',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── DOT GRID (waiting / sampling / between) ───────────────── */}
        {(calState.phase === 'waiting' || calState.phase === 'sampling' || calState.phase === 'between') && (
          <>
            {/* instruction strip */}
            <div
              style={{
                position: 'absolute',
                top: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 3, color: '#475569', textTransform: 'uppercase' }}>
                Eye Tracking Calibration
              </div>
              <div style={{ fontSize: 14, color: '#64748b' }}>
                {calState.phase === 'waiting' && 'Look at the blue dot'}
                {calState.phase === 'sampling' && 'Hold your gaze…'}
                {calState.phase === 'between' && 'Good — next point coming'}
              </div>
              <div style={{ fontSize: 12, color: '#334155' }}>
                Point {(calState.currentPointIndex ?? 0) + 1} of {CALIBRATION_POINTS.length}
              </div>
            </div>

            {/* dot grid — inset padding keeps edge dots off the very screen border so
                the candidate's eyes still sweep a real angle; Dot x/y fractions are
                relative to THIS box, so its bounds define the calibration geometry. */}
            <div style={{ position: 'absolute', inset: '80px 40px 60px 40px' }}>
              {CALIBRATION_POINTS.map((pt, idx) => (
                <Dot
                  key={pt.id}
                  x={pt.xFrac}
                  y={pt.yFrac}
                  active={idx === calState.currentPointIndex}
                  done={idx < (calState.currentPointIndex ?? 0)}
                  waiting={calState.phase === 'waiting' && idx === calState.currentPointIndex}
                />
              ))}

              {/* sampling progress ring on active dot */}
              {calState.phase === 'sampling' && currentPoint && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${currentPoint.xFrac * 100}%`,
                    top: `${currentPoint.yFrac * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 60,
                    height: 60,
                  }}
                >
                  <SamplingRing progress={samplingProgress} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── DONE ──────────────────────────────────────────────────── */}
        {/* Quality/acceptance screen. On acceptance it auto-advances (effect above);
            on rejection it shows the reason + a Recalibrate button and never proceeds.
            The metrics grid below colour-codes each measured sweep against its
            anti-spoof floor (green ok / red low) for transparency. */}
        {calState.phase === 'done' && calState.result && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
              animation: 'fadeIn 0.5s ease',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#052e16',
                border: '2px solid #4ade80',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              ✓
            </div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#f1f5f9' }}>Calibration complete</h2>
            <QualityBar score={calState.result.qualityScore} />
            {calibrationRejected && (
              <div style={{ maxWidth: 360, textAlign: 'center', fontSize: 13, lineHeight: 1.6, color: '#fca5a5' }}>
                {calState.result.rejectionReason ??
                  'Calibration could not be verified. Please keep your face in view, move only your eyes, and recalibrate.'}
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 24px',
                fontSize: 12,
                color: '#475569',
              }}
            >
              <span>Horizontal sweep</span>
              <span style={{ color: calState.result.rangeX >= MIN_OPPOSITE_EDGE_GAP_X ? '#4ade80' : '#f87171' }}>
                {calState.result.rangeX.toFixed(3)} ({calState.result.rangeX >= MIN_OPPOSITE_EDGE_GAP_X ? 'ok' : 'low'})
              </span>
              <span>Vertical sweep</span>
              <span style={{ color: calState.result.vSweep >= MIN_V_BAND_WIDTH ? '#4ade80' : '#f87171' }}>
                {calState.result.vSweep.toFixed(3)} ({calState.result.vSweep >= MIN_V_BAND_WIDTH ? 'ok' : 'low'})
              </span>
              <span>Vertical band</span>
              <span style={{ color: '#94a3b8' }}>
                [{calState.result.vTopEdge.toFixed(2)}, {calState.result.vBottomEdge.toFixed(2)}]
              </span>
              <span>Head pitch</span>
              <span style={{ color: '#94a3b8' }}>{calState.result.headPitchDeg.toFixed(1)}°</span>
              <span>Neutral / Threshold X</span>
              <span style={{ color: '#94a3b8' }}>
                {calState.result.neutralX.toFixed(2)} / {calState.result.thresholdX.toFixed(2)}
              </span>
            </div>
            {calibrationRejected ? (
              <button
                onClick={startCalibration}
                style={{
                  padding: '12px 28px',
                  background: '#38bdf8',
                  color: '#0a0f1a',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: 1,
                }}
              >
                Recalibrate
              </button>
            ) : (
              <div style={{ fontSize: 12, color: '#334155' }}>Applying settings…</div>
            )}
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────────────── */}
        {calState.phase === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 32 }}>⚠</div>
            <div style={{ color: '#f87171', fontSize: 15 }}>{calState.error}</div>
            <button
              onClick={startCalibration}
              style={{
                padding: '10px 24px',
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </>
  );
}
