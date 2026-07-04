// ─────────────────────────────────────────────────────────────────────────────
// Pure, dependency-free VERTICAL gaze math.
//
// Shared by the three services that must agree on ONE coordinate contract:
//   • useGazeCalibration.ts  — measures the on-screen band + calibration acceptance
//   • eightDotCalibrationGuardV3.ts — sanitises the band for live use
//   • useProctoring.ts       — classifies live gaze up/down against the band
//
// No React, no MediaPipe, no DOM — every function is a pure transform of numbers, so the
// geometry can be unit-tested in isolation (see gazeVerticalMath.test.ts).
//
// THE COORDINATE (`v`, "world-vertical gaze"):
//   eyeInHeadV = min(eyeLookDownL, eyeLookDownR) − min(eyeLookUpL, eyeLookUpR)   // >0 down, <0 up
//   v = eyeInHeadV + comp(gazePitchDeltaDeg) · PITCH_TO_BLENDSHAPE_FACTOR
// where gazePitchDeltaDeg is the head pitch relative to the calibration/session baseline, in
// degrees, POSITIVE when the chin tilts DOWN (deterministic from nose-vs-eye landmark geometry —
// see noseEyePitchDeg). Folding head pitch in this way makes v approximate the TRUE world gaze
// angle independent of head pose: chin-down ADDS (recovers a look-down performed with the head
// tilted, e.g. glancing at a phone in the lap), chin-up SUBTRACTS (cancels the eye counter-rotation
// that otherwise reads as a false "down"). Head pitch is non-saturating, so it also extends v past
// the ~1.0 blendshape ceiling for deep downward gaze.
//
// THE DECISION: the on-screen vertical range is a per-person BAND [vBandTop, vBandBottom] measured
// at the top/bottom screen-edge dots. Gaze is "up" below vBandTop−marginUp and "down" above
// vBandBottom+marginDown. No sign is assumed for the band edges (for a camera-at-top-of-screen rig
// the whole screen is below the lens, so both edges are typically positive).
// ─────────────────────────────────────────────────────────────────────────────

import {
  PITCH_TO_BLENDSHAPE_FACTOR,
  V_PITCH_COMP_START_DEG,
  V_PITCH_COMP_MAX_DEG,
  V_MARGIN_UP,
  V_MARGIN_DOWN,
  V_CORROBORATION_MARGIN,
  DEFAULT_V_BAND_TOP,
  DEFAULT_V_BAND_BOTTOM,
  MIN_V_BAND_WIDTH,
  V_TOP_CLAMP_MIN,
  V_TOP_CLAMP_MAX,
  V_BOTTOM_CLAMP_MIN,
  V_BOTTOM_CLAMP_MAX,
  MAX_CAL_DOT_STD_V,
  MIN_SAMPLES_PER_CALIBRATION_DOT,
  MIN_OPPOSITE_EDGE_GAP_X,
  MAX_CALIBRATION_DOT_STD_X,
} from './proctoringGazeThresholdsV3';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type Pointish = { x?: number; y: number } | null | undefined;

/**
 * Deterministic head-pitch proxy in degrees from face landmarks, POSITIVE when the chin tilts down.
 *
 * Uses nose-tip vs eye-line offset normalised by face height. Its sign is fixed by image coordinates
 * (y increases downward): as the chin tucks down, the forward-protruding nose rotates further below
 * the eye line, so (noseTip.y − eyeMidY) increases. This avoids the device-dependent sign of the
 * Euler/matrix pitch (the reason the previous code used an unreliable "reduce-only" compensation).
 *
 * Returns null if any required landmark is missing.
 */
export function noseEyePitchDeg(
  leftEyeOuter: Pointish,
  rightEyeOuter: Pointish,
  noseTip: Pointish,
  forehead: Pointish,
  chin: Pointish,
): number | null {
  if (!leftEyeOuter || !rightEyeOuter || !noseTip || !forehead || !chin) return null;
  const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const faceHeight = Math.max(Math.abs(chin.y - forehead.y), 1e-4);
  const value = ((noseTip.y - eyeMidY) / faceHeight) * 90;
  return Number.isFinite(value) ? value : null;
}

/**
 * Sign-aware, deadzoned, capped head-pitch contribution (in "effective degrees").
 * Below the deadzone we ignore natural jitter; above the cap the head-movement alarm owns it.
 */
export function compVerticalPitch(deltaDeg: number): number {
  if (!Number.isFinite(deltaDeg)) return 0;
  const abs = Math.abs(deltaDeg);
  if (abs <= V_PITCH_COMP_START_DEG) return 0;
  return Math.sign(deltaDeg) * (Math.min(abs, V_PITCH_COMP_MAX_DEG) - V_PITCH_COMP_START_DEG);
}

/**
 * World-vertical gaze `v` from the eye-in-head vertical signal and the head-pitch delta (degrees,
 * chin-down positive). Calibration and live MUST call this identically so the band and the live
 * reading live in the same frame.
 */
export function computeWorldVertical(eyeInHeadV: number, gazePitchDeltaDeg: number): number {
  return eyeInHeadV + compVerticalPitch(gazePitchDeltaDeg) * PITCH_TO_BLENDSHAPE_FACTOR;
}

export type VerticalBand = { vBandTop: number; vBandBottom: number };

export const DEFAULT_VERTICAL_BAND: VerticalBand = {
  vBandTop: DEFAULT_V_BAND_TOP,
  vBandBottom: DEFAULT_V_BAND_BOTTOM,
};

/**
 * Build the sanitised on-screen band from the calibration edge medians (v at the top/bottom dots).
 * NO sign assumption. Falls back to the default band when the edges are missing, inverted, or the
 * sweep is below the trust floor, and re-checks the floor after the reachability clamps.
 */
export function deriveVerticalBand(vTopEdge: unknown, vBottomEdge: unknown): VerticalBand {
  const top = typeof vTopEdge === 'number' && Number.isFinite(vTopEdge) ? vTopEdge : null;
  const bottom = typeof vBottomEdge === 'number' && Number.isFinite(vBottomEdge) ? vBottomEdge : null;
  if (top === null || bottom === null || bottom - top < MIN_V_BAND_WIDTH) {
    return { ...DEFAULT_VERTICAL_BAND };
  }
  const vBandTop = clamp(top, V_TOP_CLAMP_MIN, V_TOP_CLAMP_MAX);
  const vBandBottom = clamp(bottom, V_BOTTOM_CLAMP_MIN, V_BOTTOM_CLAMP_MAX);
  if (vBandBottom - vBandTop < MIN_V_BAND_WIDTH) return { ...DEFAULT_VERTICAL_BAND };
  return { vBandTop, vBandBottom };
}

export type VerticalClassification = {
  worldVertical: number;
  downAway: boolean;
  upAway: boolean;
  direction: 'up' | 'down' | 'center';
  /** Distance past the crossed edge, in margin units (≥1 means away); 0 when on-screen. */
  strength: number;
};

/**
 * Classify a single frame's vertical gaze against the band. Requires both the band crossing AND
 * blendshape corroboration (the eyes actually point that way) so a pure compensation artefact
 * cannot fabricate a direction.
 */
export function classifyVertical(args: {
  eyeInHeadV: number;
  gazePitchDeltaDeg: number;
  vBandTop: number;
  vBandBottom: number;
  downBlend: number;
  upBlend: number;
}): VerticalClassification {
  const worldVertical = computeWorldVertical(args.eyeInHeadV, args.gazePitchDeltaDeg);
  const downAway =
    worldVertical > args.vBandBottom + V_MARGIN_DOWN &&
    args.downBlend > args.upBlend + V_CORROBORATION_MARGIN;
  const upAway =
    worldVertical < args.vBandTop - V_MARGIN_UP &&
    args.upBlend > args.downBlend + V_CORROBORATION_MARGIN;
  const direction = downAway ? 'down' : upAway ? 'up' : 'center';
  const strength = downAway
    ? (worldVertical - args.vBandBottom) / V_MARGIN_DOWN
    : upAway
    ? (args.vBandTop - worldVertical) / V_MARGIN_UP
    : 0;
  return { worldVertical, downAway, upAway, direction, strength };
}

export type GazeDirection = 'left' | 'right' | 'up' | 'down' | 'center';

/**
 * Combine the (unchanged) horizontal verdict with the vertical classification into one direction.
 * When both axes are away, the stronger axis wins, with a slight bias toward horizontal (iris X is
 * the more reliable signal). This only labels the single GAZE_AWAY alert; it does not gate firing.
 */
export function combineGazeDirection(args: {
  horizontalAway: boolean;
  horizontalDir: 'left' | 'right';
  horizontalStrength: number;
  vertical: VerticalClassification;
  bias?: number;
}): { away: boolean; direction: GazeDirection } {
  const verticalAway = args.vertical.downAway || args.vertical.upAway;
  const away = args.horizontalAway || verticalAway;
  if (!away) return { away: false, direction: 'center' };

  const bias = args.bias ?? 1.15;
  let direction: GazeDirection;
  if (!verticalAway) {
    direction = args.horizontalDir;
  } else if (!args.horizontalAway) {
    direction = args.vertical.direction === 'center' ? args.horizontalDir : args.vertical.direction;
  } else {
    direction =
      args.horizontalStrength * bias >= args.vertical.strength
        ? args.horizontalDir
        : args.vertical.direction === 'center'
        ? args.horizontalDir
        : args.vertical.direction;
  }
  return { away, direction };
}

export type CalibrationAcceptanceReason =
  | 'coverage'
  | 'horizontalRange'
  | 'verticalSweep'
  | 'steadiness'
  | null;

/**
 * Calibration acceptance from physically-meaningful signals only:
 *   • coverage        — enough valid iris samples at every dot (no-face / closed-eyes drop frames)
 *   • horizontalRange — the eyes actually swept horizontally (iris offsetX, reliable)
 *   • verticalSweep   — the eyes actually swept vertically in the BLENDSHAPE frame (vBottom−vTop);
 *                       replaces the corrupted iris-offsetY range/std that both false-rejected honest
 *                       down-lookers AND let horizontal-only movers through
 *   • steadiness      — per-dot gaze was steady on both the iris-X and the blendshape-vertical signal
 * The vertical sweep is sign-aware (requires vBottom > vTop), so it doubles as the "looked at the
 * dots, not just wagged the eyes" anti-spoof for the vertical axis.
 */
export function evaluateCalibrationAcceptance(args: {
  minValidSamples: number;
  rangeX: number;
  vTopEdge: number;
  vBottomEdge: number;
  maxDotStdX: number;
  maxDotStdV: number;
}): { accepted: boolean; reason: CalibrationAcceptanceReason } {
  if (!(args.minValidSamples >= MIN_SAMPLES_PER_CALIBRATION_DOT)) {
    return { accepted: false, reason: 'coverage' };
  }
  if (!(args.rangeX >= MIN_OPPOSITE_EDGE_GAP_X)) {
    return { accepted: false, reason: 'horizontalRange' };
  }
  const vSweep = args.vBottomEdge - args.vTopEdge;
  if (!(vSweep >= MIN_V_BAND_WIDTH)) {
    return { accepted: false, reason: 'verticalSweep' };
  }
  if (args.maxDotStdX > MAX_CALIBRATION_DOT_STD_X || args.maxDotStdV > MAX_CAL_DOT_STD_V) {
    return { accepted: false, reason: 'steadiness' };
  }
  return { accepted: true, reason: null };
}
