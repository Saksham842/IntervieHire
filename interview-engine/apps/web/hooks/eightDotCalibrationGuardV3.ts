// ─────────────────────────────────────────────────────────────────────────────
// 8-dot calibration GUARD: raw calibration → sanitised SafeEightDotCalibration.
//
// A raw calibration is candidate-controlled input, so it is untrusted: a cheater can
// stare off-screen, feed a degenerate/static sweep, or plant a fake neutral to hide a
// large gaze offset. This module turns whatever the browser stored into a calibration
// that is SAFE to hand to live proctoring (useProctoring.ts), by:
//   • VALIDATING physical plausibility (validateEightDotCalibration) — dot coverage,
//     per-dot steadiness, neutral sanity, horizontal separation, vertical sweep — and
//     surfacing the verdict as `trusted`/`reason` metadata ONLY.
//   • SANITISING the numbers with hard caps regardless of the verdict
//     (buildSafeEightDotCalibration) so detection is never silently disabled by a failed
//     validation, yet a spoofed calibration cannot widen the live valid region.
//
// Policy: "sanitize, don't disable." Even an untrusted calibration yields a usable, clamped
// output; the caps (from proctoringGazeThresholdsV3.ts) are the real anti-cheat, not rejection.
// Coordinate contract (world-vertical band, iris offsetX sign, etc.) comes from gazeVerticalMath.ts.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CALIBRATION_THRESHOLD_SAFETY_FACTOR,
  FALLBACK_GAZE_THRESHOLD_X,
  FALLBACK_GAZE_THRESHOLD_Y,
  MAX_CALIBRATION_DOT_STD_X,
  MAX_SAFE_GAZE_THRESHOLD_X,
  MAX_SAFE_GAZE_THRESHOLD_Y,
  MAX_SAFE_NEUTRAL_X,
  MAX_SAFE_NEUTRAL_Y,
  MIN_DOT_DIRECTION_SEPARATION_X,
  MIN_OPPOSITE_EDGE_GAP_X,
  MIN_SAFE_GAZE_THRESHOLD_X,
  MIN_SAFE_GAZE_THRESHOLD_Y,
  MIN_SAMPLES_PER_CALIBRATION_DOT,
  MIN_V_BAND_WIDTH,
} from './proctoringGazeThresholdsV3';
import { deriveVerticalBand, DEFAULT_VERTICAL_BAND } from './gazeVerticalMath';

type UnknownRecord = Record<string, unknown>;

type CalibrationSampleLike = UnknownRecord;

type CalibrationPointLike = UnknownRecord & {
  id?: string;
  samples?: CalibrationSampleLike[];
};

type CalibrationLike = UnknownRecord & {
  thresholdX?: number;
  thresholdY?: number;
  neutralX?: number;
  neutralY?: number;
  pointData?: CalibrationPointLike[];
  vTopEdge?: number;
  vBottomEdge?: number;
  headPitchDeg?: number;
};

type DotAxisDirection = 'left' | 'center' | 'right' | 'up' | 'down';

type DotExpectation = {
  id: string;
  x: DotAxisDirection;
  y: DotAxisDirection;
};

type DotStats = {
  id: string;
  sampleCount: number;
  meanX: number;
  meanY: number;
  stdX: number;
  stdY: number;
};

export type EightDotCalibrationValidationResult = {
  accepted: boolean;
  reason: string;
  missingPointIds: string[];
  dotStats: DotStats[];
};

export type SafeEightDotCalibration = {
  thresholdX: number;
  thresholdY: number;
  neutralX: number;
  neutralY: number;
  // Personalised on-screen vertical band (signed world-vertical gaze units). Live detection flags
  // "down" when worldVertical > vBandBottom + margin and "up" when worldVertical < vBandTop - margin.
  // NO sign is assumed (camera-at-top ⇒ both edges usually positive with vBandTop < vBandBottom).
  vBandTop: number;
  vBandBottom: number;
  // Calibration head pitch (deterministic nose-vs-eye, chin-down positive, degrees) for seeding the
  // live vertical baseline; null when no calibration is present.
  headPitchDeg: number | null;
  trusted: boolean;
  reason: string;
  missingPointIds: string[];
  validation: EightDotCalibrationValidationResult;
};

// 8 fixed perimeter dots. No randomized dots are required.
// Center ('mc') is optional. If present, it is used as a stronger neutral check.
const EIGHT_DOT_EXPECTATIONS: DotExpectation[] = [
  { id: 'tl', x: 'left', y: 'up' },
  { id: 'tc', x: 'center', y: 'up' },
  { id: 'tr', x: 'right', y: 'up' },
  { id: 'ml', x: 'left', y: 'center' },
  { id: 'mr', x: 'right', y: 'center' },
  { id: 'bl', x: 'left', y: 'down' },
  { id: 'bc', x: 'center', y: 'down' },
  { id: 'br', x: 'right', y: 'down' },
];

const POINT_ID_ALIASES: Record<string, string> = {
  'top-left': 'tl',
  topleft: 'tl',
  top_left: 'tl',
  tl: 'tl',

  'top-center': 'tc',
  topcenter: 'tc',
  top_center: 'tc',
  tm: 'tc',
  tc: 'tc',

  'top-right': 'tr',
  topright: 'tr',
  top_right: 'tr',
  tr: 'tr',

  'middle-left': 'ml',
  middleleft: 'ml',
  middle_left: 'ml',
  'mid-left': 'ml',
  midleft: 'ml',
  ml: 'ml',

  'middle-center': 'mc',
  middlecenter: 'mc',
  middle_center: 'mc',
  'mid-center': 'mc',
  midcenter: 'mc',
  center: 'mc',
  c: 'mc',
  mc: 'mc',

  'middle-right': 'mr',
  middleright: 'mr',
  middle_right: 'mr',
  'mid-right': 'mr',
  midright: 'mr',
  mr: 'mr',

  'bottom-left': 'bl',
  bottomleft: 'bl',
  bottom_left: 'bl',
  bl: 'bl',

  'bottom-center': 'bc',
  bottomcenter: 'bc',
  bottom_center: 'bc',
  bm: 'bc',
  bc: 'bc',

  'bottom-right': 'br',
  bottomright: 'br',
  bottom_right: 'br',
  br: 'br',
};

// Accepted field aliases for the iris horizontal/vertical offset, in preference order. Different
// calibration builds name the same signal differently; firstFiniteNumber picks the first present.
const SAMPLE_X_KEYS = [
  'offsetX',
  'gazeX',
  'rawOffsetX',
  'adjOffsetX',
  'irisOffsetX',
  'eyeOffsetX',
  'x',
];

const SAMPLE_Y_KEYS = [
  'offsetY',
  'gazeY',
  'rawOffsetY',
  'adjOffsetY',
  'irisOffsetY',
  'eyeOffsetY',
  'y',
];

const POINT_MEAN_X_KEYS = ['meanX', 'avgX', 'averageX', 'medianX', 'offsetX', 'gazeX', 'rawOffsetX'];
const POINT_MEAN_Y_KEYS = ['meanY', 'avgY', 'averageY', 'medianY', 'offsetY', 'gazeY', 'rawOffsetY'];

// Normalise a stored dot id to a canonical id ('tl'..'br','mc'). Accepts the many naming
// conventions different calibration UIs emit so a valid sweep is never rejected as "missing"
// merely because it labelled dots "top-left" vs "tl". Unknown ids pass through unchanged.
function canonicalPointId(id: unknown) {
  if (typeof id !== 'string') return '';
  const normalized = id.trim().toLowerCase().replace(/\s+/g, '-');
  return POINT_ID_ALIASES[normalized] ?? POINT_ID_ALIASES[normalized.replace(/-/g, '')] ?? normalized;
}

// Untrusted-input guard: only accept a real finite number. Rejects NaN/Infinity/strings so a
// malformed calibration field falls through to a fallback rather than poisoning downstream math.
function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstFiniteNumber(record: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = finiteNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function standardDeviation(values: number[], average: number) {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildPointLookup(points: CalibrationPointLike[] = []) {
  const lookup = new Map<string, CalibrationPointLike>();
  for (const point of points) {
    const id = canonicalPointId(point.id);
    if (id && !lookup.has(id)) lookup.set(id, point);
  }
  return lookup;
}

/**
 * Reduce one calibration dot's raw samples to {mean,std} on the iris X/Y offset signal.
 * Prefers per-sample data (so std reflects real steadiness); only pairs a sample when BOTH
 * axes are finite. Returns null when no usable coordinate exists, which upstream treats as a
 * missing/failed dot rather than fabricating a zero reading.
 */
function getDotStats(point: CalibrationPointLike | undefined, id: string): DotStats | null {
  if (!point) return null;

  const samples = Array.isArray(point.samples) ? point.samples : [];
  const xs: number[] = [];
  const ys: number[] = [];

  for (const sample of samples) {
    const sampleX = firstFiniteNumber(sample, SAMPLE_X_KEYS);
    const sampleY = firstFiniteNumber(sample, SAMPLE_Y_KEYS);

    if (sampleX !== null && sampleY !== null) {
      xs.push(sampleX);
      ys.push(sampleY);
    }
  }

  if (xs.length > 0 && ys.length > 0) {
    const meanX = mean(xs);
    const meanY = mean(ys);
    return {
      id,
      sampleCount: Math.min(xs.length, ys.length),
      meanX,
      meanY,
      stdX: standardDeviation(xs, meanX),
      stdY: standardDeviation(ys, meanY),
    };
  }

  // Fallback for calibration implementations that store aggregate values on the point itself.
  // We intentionally do not read generic point.x / point.y here because those are often screen coordinates.
  const pointMeanX = firstFiniteNumber(point, POINT_MEAN_X_KEYS);
  const pointMeanY = firstFiniteNumber(point, POINT_MEAN_Y_KEYS);
  if (pointMeanX !== null && pointMeanY !== null) {
    return {
      id,
      sampleCount: samples.length || MIN_SAMPLES_PER_CALIBRATION_DOT,
      meanX: pointMeanX,
      meanY: pointMeanY,
      stdX: 0,
      stdY: 0,
    };
  }

  return null;
}

/**
 * Per-dot quality gate: rejects dots with too few valid samples (frames dropped for no-face /
 * closed eyes) or an unstable horizontal iris signal. Returns a reason string on the first
 * failure, or null when every dot passes. Defends against ignored/spoofed calibrations.
 */
function validateDotQuality(stats: DotStats[]) {
  for (const stat of stats) {
    if (stat.sampleCount < MIN_SAMPLES_PER_CALIBRATION_DOT) {
      return `Calibration dot ${stat.id} has too few valid samples`;
    }

    // Vertical stability is validated on the blendshape sweep (see the band-width check in
    // validateEightDotCalibration); the iris stdY is eyelid-corrupted, so only gate on stdX here.
    if (stat.stdX > MAX_CALIBRATION_DOT_STD_X) {
      return `Calibration dot ${stat.id} was unstable`;
    }
  }

  return null;
}

/**
 * Neutral sanity gate. A neutral offset far from raw eye-center means the calibration baseline
 * itself is skewed — a cheater could plant it to make an off-screen gaze read as "centered". Reject
 * when neutral exceeds the safe cap, or (if a center dot exists) when the two disagree by more than
 * the cap. Returns a reason on failure, null when plausible.
 */
function validateNeutral(neutralX: number, neutralY: number, centerStats: DotStats | null) {
  if (Math.abs(neutralX) > MAX_SAFE_NEUTRAL_X || Math.abs(neutralY) > MAX_SAFE_NEUTRAL_Y) {
    return 'Neutral gaze is too far from center';
  }

  if (!centerStats) return null;

  if (Math.abs(centerStats.meanX - neutralX) > MAX_SAFE_NEUTRAL_X || Math.abs(centerStats.meanY - neutralY) > MAX_SAFE_NEUTRAL_Y) {
    return 'Center calibration does not match neutral gaze';
  }

  return null;
}

/**
 * Horizontal geometry / anti-spoof gate. Confirms the eyes actually swept sideways: every "left"
 * dot must sit clearly left of center and every "right" dot clearly right (per-dot separation), and
 * the left-column vs right-column averages must be separated by a minimum gap. A static stare, a
 * no-face, or a head-only mover fails here. Vertical separation is NOT checked (iris meanY is
 * eyelid-corrupted); it is validated on the blendshape band width in validateEightDotCalibration.
 */
function validateDotGeometry(statsById: Map<string, DotStats>, centerX: number) {
  for (const expected of EIGHT_DOT_EXPECTATIONS) {
    const stat = statsById.get(expected.id);
    if (!stat) return `Missing calibration dot ${expected.id}`;

    if (expected.x === 'left' && stat.meanX <= centerX + MIN_DOT_DIRECTION_SEPARATION_X) {
      return `Calibration dot ${expected.id} does not look left enough`;
    }

    if (expected.x === 'right' && stat.meanX >= centerX - MIN_DOT_DIRECTION_SEPARATION_X) {
      return `Calibration dot ${expected.id} does not look right enough`;
    }
  }

  const leftAverage = mean(['tl', 'ml', 'bl'].map((id) => statsById.get(id)?.meanX ?? centerX));
  const rightAverage = mean(['tr', 'mr', 'br'].map((id) => statsById.get(id)?.meanX ?? centerX));

  // Horizontal iris convention: positive X = looking left. Vertical dot separation is validated on
  // the blendshape band width (vBottomEdge − vTopEdge) in validateEightDotCalibration, because the
  // iris meanY is eyelid-corrupted and unreliable for vertical.
  if (leftAverage - rightAverage < MIN_OPPOSITE_EDGE_GAP_X) {
    return 'Left and right calibration dots are not separated enough';
  }

  return null;
}

/**
 * Full acceptance pipeline for a raw calibration, run purely for its trust verdict (it does NOT
 * mutate or produce the live values — buildSafeEightDotCalibration does that). Fails fast, in
 * cheapest-first order: presence of point data → all 8 dots present → per-dot quality → neutral
 * sanity → horizontal geometry → vertical blendshape sweep. `accepted` becomes the `trusted` flag;
 * `reason` explains the first failure for the debug readout. Never throws on malformed input.
 */
export function validateEightDotCalibration(calibration: CalibrationLike | null | undefined): EightDotCalibrationValidationResult {
  if (!calibration?.pointData || calibration.pointData.length === 0) {
    return {
      accepted: false,
      reason: 'No calibration point data available',
      missingPointIds: EIGHT_DOT_EXPECTATIONS.map((point) => point.id),
      dotStats: [],
    };
  }

  const pointLookup = buildPointLookup(calibration.pointData);
  const missingPointIds = EIGHT_DOT_EXPECTATIONS
    .map((point) => point.id)
    .filter((id) => !pointLookup.has(id));

  const dotStats = EIGHT_DOT_EXPECTATIONS
    .map((point) => getDotStats(pointLookup.get(point.id), point.id))
    .filter((stats): stats is DotStats => Boolean(stats));

  if (missingPointIds.length > 0) {
    return {
      accepted: false,
      reason: `Missing required 8-dot calibration points: ${missingPointIds.join(', ')}`,
      missingPointIds,
      dotStats,
    };
  }

  const qualityFailure = validateDotQuality(dotStats);
  if (qualityFailure) {
    return {
      accepted: false,
      reason: qualityFailure,
      missingPointIds: [],
      dotStats,
    };
  }

  // Neutral source of truth, best-available: stored neutral → optional center dot mean → 0.
  const centerStats = getDotStats(pointLookup.get('mc'), 'mc');
  const neutralX = finiteNumber(calibration.neutralX) ?? centerStats?.meanX ?? 0;
  const neutralY = finiteNumber(calibration.neutralY) ?? centerStats?.meanY ?? 0;

  const neutralFailure = validateNeutral(neutralX, neutralY, centerStats);
  if (neutralFailure) {
    return {
      accepted: false,
      reason: neutralFailure,
      missingPointIds: [],
      dotStats,
    };
  }

  const statsById = new Map(dotStats.map((stat) => [stat.id, stat]));
  // Reference X for the left/right separation checks: the measured center dot if present, else neutral.
  const centerX = centerStats?.meanX ?? neutralX;
  const geometryFailure = validateDotGeometry(statsById, centerX);

  if (geometryFailure) {
    return {
      accepted: false,
      reason: geometryFailure,
      missingPointIds: [],
      dotStats,
    };
  }

  // Vertical trust: the eyes must have swept vertically in the blendshape frame. Uses the same
  // band-width floor as live personalisation, so `trusted` stays consistent with the live band.
  const vTop = finiteNumber(calibration.vTopEdge);
  const vBottom = finiteNumber(calibration.vBottomEdge);
  if (vTop === null || vBottom === null || vBottom - vTop < MIN_V_BAND_WIDTH) {
    return {
      accepted: false,
      reason: 'Top and bottom calibration dots are not separated enough',
      missingPointIds: [],
      dotStats,
    };
  }

  return {
    accepted: true,
    reason: '8-dot calibration accepted',
    missingPointIds: [],
    dotStats,
  };
}

/**
 * The guard's public entry point: produce the SafeEightDotCalibration consumed by live proctoring.
 *
 * Threat model / policy: the raw calibration is candidate-controlled, so every numeric field is
 * clamped to a hard safe range before it can influence detection. Crucially, a FAILED validation
 * does NOT disable detection — it only sets `trusted`/`reason` metadata; live gaze still runs on the
 * sanitised values ("sanitize, don't disable"). This prevents the trivial cheat of deliberately
 * botching calibration to switch proctoring off, while the caps prevent a widened valid region.
 * With no calibration at all, returns the neutral defaults (untrusted) so proctoring still functions.
 */
export function buildSafeEightDotCalibration(calibration: CalibrationLike | null | undefined): SafeEightDotCalibration {
  const validation = validateEightDotCalibration(calibration);

  // No calibration present: fall back to zero-config defaults (default band, no head-pitch seed),
  // marked untrusted. Detection still runs against the population-default band from gazeVerticalMath.
  if (!calibration) {
    return {
      thresholdX: FALLBACK_GAZE_THRESHOLD_X,
      thresholdY: FALLBACK_GAZE_THRESHOLD_Y,
      neutralX: 0,
      neutralY: 0,
      vBandTop: DEFAULT_VERTICAL_BAND.vBandTop,
      vBandBottom: DEFAULT_VERTICAL_BAND.vBandBottom,
      headPitchDeg: null,
      trusted: false,
      reason: validation.reason,
      missingPointIds: validation.missingPointIds,
      validation,
    };
  }

  // Signed on-screen band from the top/bottom edge medians — NO sign assumption. deriveVerticalBand
  // falls back to the default band when the sweep is degenerate/inverted/narrow, so live detection
  // never hair-triggers on an untrustworthy calibration (mirrors the pre-existing "sanitize, don't
  // disable" policy for the horizontal thresholds below).
  const { vBandTop, vBandBottom } = deriveVerticalBand(calibration.vTopEdge, calibration.vBottomEdge);

  const rawThresholdX = finiteNumber(calibration.thresholdX) ?? FALLBACK_GAZE_THRESHOLD_X;
  const rawThresholdY = finiteNumber(calibration.thresholdY) ?? FALLBACK_GAZE_THRESHOLD_Y;
  const rawNeutralX = finiteNumber(calibration.neutralX) ?? 0;
  const rawNeutralY = finiteNumber(calibration.neutralY) ?? 0;

  // Critical fix (horizontal, unchanged):
  // Do NOT disable live gaze detection just because the 8-dot validation failed.
  // Always use the current calibration values after sanitizing them with hard caps. The validation
  // result is only exposed as metadata through `trusted` and `reason`. (thresholdY is legacy/debug —
  // vertical detection now uses the band above, not thresholdY.)
  return {
    // Shrink slightly (SAFETY_FACTOR≈0.95, keeps detection responsive) then hard-cap: MAX is the
    // anti-cheat ceiling (an off-screen calibration can't grow the valid region), MIN guarantees
    // small-eyed / narrow-range users can still trigger gaze-away.
    thresholdX: clamp(
      rawThresholdX * CALIBRATION_THRESHOLD_SAFETY_FACTOR,
      MIN_SAFE_GAZE_THRESHOLD_X,
      MAX_SAFE_GAZE_THRESHOLD_X,
    ),
    thresholdY: clamp(
      rawThresholdY * CALIBRATION_THRESHOLD_SAFETY_FACTOR,
      MIN_SAFE_GAZE_THRESHOLD_Y,
      MAX_SAFE_GAZE_THRESHOLD_Y,
    ),
    // Symmetric ±cap on the neutral baseline so a planted far-off neutral can't hide a large
    // standing gaze offset (a shifted origin would make an off-axis stare read as centered).
    neutralX: clamp(rawNeutralX, -MAX_SAFE_NEUTRAL_X, MAX_SAFE_NEUTRAL_X),
    neutralY: clamp(rawNeutralY, -MAX_SAFE_NEUTRAL_Y, MAX_SAFE_NEUTRAL_Y),
    vBandTop,
    vBandBottom,
    headPitchDeg: finiteNumber(calibration.headPitchDeg),
    trusted: validation.accepted,
    reason: validation.accepted ? validation.reason : `Calibration sanitized: ${validation.reason}`,
    missingPointIds: validation.missingPointIds,
    validation,
  };
}
