'use client';

import { useCallback, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import {
  MIN_OPPOSITE_EDGE_GAP_X,
  MIN_V_BAND_WIDTH,
} from './proctoringGazeThresholdsV3';
import { evaluateCalibrationAcceptance, noseEyePitchDeg } from './gazeVerticalMath';

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// How many frames to sample per calibration point
const SAMPLES_PER_POINT = 20;
// ms between each sample
const SAMPLE_INTERVAL_MS = 80;

// A sample whose |iris offset| exceeds this on either axis is physically implausible
// for a face looking at the screen. It shows up when an eye is closed/blinking: the
// eyelid landmarks collapse, the vertical normaliser (eye-open height) shrinks to the
// clamp floor, and the offset explodes. Dropping these frames stops closed eyes from
// masquerading as valid calibration data.
const MAX_PLAUSIBLE_IRIS_OFFSET = 3.0;
// Minimum eye-open height (normalised, image-height units) below which the eye is
// treated as closed and the frame is dropped rather than dividing by the near-zero clamp.
const MIN_EYE_OPEN_HEIGHT = 0.005;

export type CalibrationPoint = {
  id: string;
  label: string;
  // 0..1 fractions of screen
  xFrac: number;
  yFrac: number;
};

// 8-point perimeter grid: corners and midpoints of each screen edge
export const CALIBRATION_POINTS: CalibrationPoint[] = [
  { id: 'tl',  label: 'Top-left',     xFrac: 0.0,  yFrac: 0.0 },
  { id: 'tc',  label: 'Top-center',   xFrac: 0.5,  yFrac: 0.0 },
  { id: 'tr',  label: 'Top-right',    xFrac: 1.0,  yFrac: 0.0 },
  { id: 'ml',  label: 'Middle-left',  xFrac: 0.0,  yFrac: 0.5 },
  { id: 'mr',  label: 'Middle-right', xFrac: 1.0,  yFrac: 0.5 },
  { id: 'bl',  label: 'Bottom-left',  xFrac: 0.0,  yFrac: 1.0 },
  { id: 'bc',  label: 'Bottom-center',xFrac: 0.5,  yFrac: 1.0 },
  { id: 'br',  label: 'Bottom-right', xFrac: 1.0,  yFrac: 1.0 },
];

// offsetX is the normalised iris-in-socket horizontal offset (the reliable calibration signal;
// offsetY is kept for debug only — its eyelid-coupled vertical reading is no longer used).
// eyeInHeadV is the blendshape vertical signal (eyeLookDown - eyeLookUp, >0 = down), the SAME
// quantity live detection uses, sampled here so the on-screen band can be personalised from where
// the candidate's eyes sit at the screen edges. headPitch is the deterministic nose-vs-eye head
// pitch (chin-down positive, degrees) so calibration and live share one vertical frame.
type IrisSample = { offsetX: number; offsetY: number; eyeInHeadV: number; headPitch: number };

type PointSamples = {
  pointId: string;
  samples: IrisSample[];
};

export type CalibrationResult = {
  // Personalised iris-offset thresholds
  thresholdX: number;
  thresholdY: number;
  // Neutral center offsets (subtracted before threshold test)
  neutralX: number;
  neutralY: number;
  // Per-point raw data (useful for debugging)
  pointData: PointSamples[];
  // Magnitude-aware quality 0-1: combines sample coverage with how far the eyes
  // actually swept across the dots. Unlike the old score, it is NOT scale-invariant.
  qualityScore: number;
  // Whether the calibration is trustworthy enough to proceed. False when a face was
  // not reliably present (no face / closed eyes) or the eyes did not actually move
  // across the dots. The UI blocks completion and asks for a recalibration.
  accepted: boolean;
  // Human-readable reason shown to the candidate when `accepted` is false.
  rejectionReason: string | null;
  // Measured iris sweep (max-min of per-dot mean offset) across the perimeter dots.
  // Surfaced for diagnosis/tuning against MIN_OPPOSITE_EDGE_GAP_X/Y.
  rangeX: number;
  rangeY: number;
  // Personalised on-screen vertical band edges: the world-vertical gaze signal (eyeLookDown - eyeLookUp)
  // measured while looking at the TOP and BOTTOM screen-edge dots. NO sign is assumed — for a
  // camera-at-top rig the whole screen is below the lens, so BOTH edges are typically positive with
  // vTopEdge < vBottomEdge. Live up/down detection is bounded by [vTopEdge, vBottomEdge] per candidate
  // (see buildSafeEightDotCalibration/deriveVerticalBand), replacing the global blendshape thresholds.
  vTopEdge: number;
  vBottomEdge: number;
  // Vertical sweep (vBottomEdge - vTopEdge): how far the eyes actually travelled vertically across the
  // dots. Gates acceptance (the eyes must sweep) and surfaces on the completion screen.
  vSweep: number;
  // Median deterministic head pitch (nose-vs-eye, chin-down positive, degrees) during calibration.
  // Live seeds its vertical head-pitch baseline from this so the band and live readings share a frame.
  headPitchDeg: number;
};

export type CalibrationPhase =
  | 'idle'
  | 'intro'          // explaining what's about to happen
  | 'waiting'        // countdown before a point activates
  | 'sampling'       // actively collecting iris data for this point
  | 'between'        // brief rest between points
  | 'done'
  | 'error';

export type CalibrationState = {
  phase: CalibrationPhase;
  currentPointIndex: number;
  samplesCollected: number;
  result: CalibrationResult | null;
  error: string | null;
};

function getFacePoint(
  landmarks: FaceLandmarkerResult['faceLandmarks'][number] | undefined,
  index: number,
) {
  return landmarks?.[index];
}

// Extracts a named blendshape score (0..1) from the first face's categories. Mirrors the live
// detector's lookup so the calibrated vertical thresholds and live worldVertical use identical units.
function blendshapeScore(
  categories: Array<{ categoryName?: string; displayName?: string; score?: number }> | undefined,
  name: string,
): number {
  return (
    categories?.find(
      (c) => (c.categoryName || c.displayName || '').toLowerCase() === name.toLowerCase(),
    )?.score ?? 0
  );
}

// Net vertical eye-in-head rotation from blendshapes: >0 looking down, <0 looking up. Uses the min
// of the two eyes for each direction (conservative), exactly like the live gaze detector.
function eyeInHeadVertical(result: FaceLandmarkerResult | null): number {
  const categories = (result as any)?.faceBlendshapes?.[0]?.categories as
    | Array<{ categoryName?: string; displayName?: string; score?: number }>
    | undefined;
  if (!categories?.length) return 0;
  const down = Math.min(blendshapeScore(categories, 'eyeLookDownLeft'), blendshapeScore(categories, 'eyeLookDownRight'));
  const up = Math.min(blendshapeScore(categories, 'eyeLookUpLeft'), blendshapeScore(categories, 'eyeLookUpRight'));
  return down - up;
}

function sampleIrisOffset(
  faceTask: FaceLandmarker,
  video: HTMLVideoElement,
): IrisSample | null {
  let result: FaceLandmarkerResult | null = null;
  try {
    result = (faceTask as any).detectForVideo(video, performance.now());
  } catch {
    return null;
  }
  const lm = result?.faceLandmarks?.[0];
  if (!lm) return null;

  const leftOuter  = getFacePoint(lm, 33);
  const leftInner  = getFacePoint(lm, 133);
  const leftIris   = getFacePoint(lm, 468);
  const rightInner = getFacePoint(lm, 362);
  const rightOuter = getFacePoint(lm, 263);
  const rightIris  = getFacePoint(lm, 473);

  if (!leftOuter || !leftInner || !leftIris || !rightInner || !rightOuter || !rightIris)
    return null;

  // Upper/lower lids for vertical normalisation. Without them we cannot measure
  // vertical gaze (or eye openness) reliably, so the frame is invalid.
  const lUp   = getFacePoint(lm, 159);
  const lDown = getFacePoint(lm, 145);
  const rUp   = getFacePoint(lm, 386);
  const rDown = getFacePoint(lm, 374);
  if (!lUp || !lDown || !rUp || !rDown) return null;

  const rawLeftH  = Math.abs(lUp.y - lDown.y);
  const rawRightH = Math.abs(rUp.y - rDown.y);
  // A collapsed eye-open height means the eye is closed/blinking. Dividing the vertical
  // offset by this near-zero height would explode the reading — which is exactly how
  // closed eyes used to slip through as "valid" calibration data.
  if (rawLeftH < MIN_EYE_OPEN_HEIGHT || rawRightH < MIN_EYE_OPEN_HEIGHT) return null;

  const leftW  = Math.max(Math.abs(leftOuter.x  - leftInner.x),  0.0001);
  const rightW = Math.max(Math.abs(rightOuter.x - rightInner.x), 0.0001);
  const leftH  = Math.max(rawLeftH,  0.0001);
  const rightH = Math.max(rawRightH, 0.0001);

  const leftMidX  = (leftOuter.x  + leftInner.x)  / 2;
  const rightMidX = (rightOuter.x + rightInner.x) / 2;
  const leftMidY  = (lUp.y + lDown.y) / 2;
  const rightMidY = (rUp.y + rDown.y) / 2;

  const lOffX = (leftIris.x  - leftMidX)  / (leftW  / 2);
  const rOffX = (rightIris.x - rightMidX) / (rightW / 2);
  const lOffY = (leftIris.y  - leftMidY)  / (leftH  / 2);
  const rOffY = (rightIris.y - rightMidY) / (rightH / 2);

  const offsetX = (lOffX + rOffX) / 2;
  const offsetY = (lOffY + rOffY) / 2;

  // Physically implausible magnitudes indicate a blink/closed eye or a bad landmark
  // frame — drop the sample so it neither inflates nor fabricates calibration data.
  if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;
  if (Math.abs(offsetX) > MAX_PLAUSIBLE_IRIS_OFFSET || Math.abs(offsetY) > MAX_PLAUSIBLE_IRIS_OFFSET) return null;

  // Deterministic head pitch (chin-down positive) so calibration and live share one vertical frame.
  const noseTip = getFacePoint(lm, 1);
  const forehead = getFacePoint(lm, 10);
  const chin = getFacePoint(lm, 152);
  const headPitch = noseEyePitchDeg(leftOuter, rightOuter, noseTip, forehead, chin) ?? 0;

  return { offsetX, offsetY, eyeInHeadV: eyeInHeadVertical(result), headPitch };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], average: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function pointMedian(
  allPointSamples: PointSamples[],
  pointId: string,
  axis: 'offsetX' | 'offsetY',
): number | null {
  const point = allPointSamples.find((p) => p.pointId === pointId);
  if (!point?.samples.length) return null;
  return median(point.samples.map((sample) => sample[axis]));
}

function averageFinite(values: Array<number | null | undefined>, fallback = 0): number {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (!finite.length) return fallback;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function averageFiniteOrNull(values: Array<number | null | undefined>): number | null {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (!finite.length) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function computeResult(allPointSamples: PointSamples[]): CalibrationResult {
  const allX = allPointSamples.flatMap((point) => point.samples.map((sample) => sample.offsetX));
  const allY = allPointSamples.flatMap((point) => point.samples.map((sample) => sample.offsetY));
  const fallbackNeutralX = median(allX);
  const fallbackNeutralY = median(allY);

  // If a center point exists, use it. The current 8-dot calibration does not sample
  // center, so infer neutral from opposite dot pairs instead.
  const centerData = allPointSamples.find((p) => p.pointId === 'mc');
  const neutralX = centerData
    ? median(centerData.samples.map((s) => s.offsetX))
    : averageFinite(
        [
          averageFiniteOrNull([pointMedian(allPointSamples, 'tl', 'offsetX'), pointMedian(allPointSamples, 'tr', 'offsetX')]),
          averageFiniteOrNull([pointMedian(allPointSamples, 'ml', 'offsetX'), pointMedian(allPointSamples, 'mr', 'offsetX')]),
          averageFiniteOrNull([pointMedian(allPointSamples, 'bl', 'offsetX'), pointMedian(allPointSamples, 'br', 'offsetX')]),
          pointMedian(allPointSamples, 'tc', 'offsetX'),
          pointMedian(allPointSamples, 'bc', 'offsetX'),
        ],
        fallbackNeutralX,
      );
  const neutralY = centerData
    ? median(centerData.samples.map((s) => s.offsetY))
    : averageFinite(
        [
          averageFiniteOrNull([pointMedian(allPointSamples, 'tl', 'offsetY'), pointMedian(allPointSamples, 'bl', 'offsetY')]),
          averageFiniteOrNull([pointMedian(allPointSamples, 'tc', 'offsetY'), pointMedian(allPointSamples, 'bc', 'offsetY')]),
          averageFiniteOrNull([pointMedian(allPointSamples, 'tr', 'offsetY'), pointMedian(allPointSamples, 'br', 'offsetY')]),
          pointMedian(allPointSamples, 'ml', 'offsetY'),
          pointMedian(allPointSamples, 'mr', 'offsetY'),
        ],
        fallbackNeutralY,
      );

  // For each non-center point, compute how far from neutral
  // Threshold = 70% of the smallest observed deviation across edge points
  // (conservative so normal head-with-eyes-center doesn't false-trigger)
  const edgeDeviationsX: number[] = [];
  const edgeDeviationsY: number[] = [];

  for (const pd of allPointSamples) {
    if (pd.pointId === 'mc') continue;
    const medX = median(pd.samples.map((s) => s.offsetX));
    const medY = median(pd.samples.map((s) => s.offsetY));
    edgeDeviationsX.push(Math.abs(medX - neutralX));
    edgeDeviationsY.push(Math.abs(medY - neutralY));
  }

  // Use 60th-percentile deviation as the threshold (not min, not max)
  edgeDeviationsX.sort((a, b) => a - b);
  edgeDeviationsY.sort((a, b) => a - b);
  const p60idx = Math.floor(edgeDeviationsX.length * 0.6);
  const rawThreshX = edgeDeviationsX[p60idx] ?? 0.18;
  const rawThreshY = edgeDeviationsY[p60idx] ?? 0.22;

  // Scale down slightly so off-screen gaze still triggers but on-screen edge points remain valid.
  const thresholdX = Math.max(rawThreshX * 0.92, 0.05);
  const thresholdY = Math.max(rawThreshY * 0.92, 0.05);

  // ── Trust decision (physically-meaningful signals; see gazeVerticalMath) ────
  // Acceptance is decided from absolute signals that cannot be faked by a still/closed/wrong gaze:
  //   1. coverage        — every dot has enough valid iris samples (no-face / closed-eyes drop frames);
  //   2. horizontal range— the eyes swept horizontally (iris offsetX, reliable under head rotation);
  //   3. vertical sweep  — the eyes swept vertically in the BLENDSHAPE frame (vBottomEdge − vTopEdge),
  //                        replacing the eyelid-corrupted iris-offsetY range/std that both
  //                        false-rejected honest down-lookers AND let horizontal-only movers through;
  //   4. steadiness      — per-dot gaze steady on iris-X and on the blendshape-vertical signal.
  // None assume which screen direction maps to +X or +v, so a mirrored/raw frame cannot flip it.
  const dotMeanX: number[] = [];
  const dotMeanY: number[] = [];
  let minValidSamples = Number.POSITIVE_INFINITY;
  let maxDotStdX = 0;
  let maxDotStdV = 0;
  for (const pd of allPointSamples) {
    if (pd.pointId === 'mc') continue;
    minValidSamples = Math.min(minValidSamples, pd.samples.length);
    if (!pd.samples.length) continue;
    const xs = pd.samples.map((s) => s.offsetX);
    const ys = pd.samples.map((s) => s.offsetY);
    const vs = pd.samples.map((s) => s.eyeInHeadV);
    const mx = mean(xs);
    dotMeanX.push(mx);
    dotMeanY.push(mean(ys));
    maxDotStdX = Math.max(maxDotStdX, standardDeviation(xs, mx));
    maxDotStdV = Math.max(maxDotStdV, standardDeviation(vs, mean(vs)));
  }
  if (!Number.isFinite(minValidSamples)) minValidSamples = 0;

  const rangeX = dotMeanX.length ? Math.max(...dotMeanX) - Math.min(...dotMeanX) : 0;
  const rangeY = dotMeanY.length ? Math.max(...dotMeanY) - Math.min(...dotMeanY) : 0;

  // ── On-screen vertical band edges (world-vertical gaze at the top/bottom dots) ──────────────
  // The blendshape vertical signal (eyeLookDown − eyeLookUp) is a far more reliable measure of
  // vertical eye travel than the eyelid-coupled iris offsetY. Their medians are this person's
  // on-screen top/bottom boundary. NO sign is assumed (camera-at-top ⇒ both usually positive).
  const topEyeInHead = allPointSamples
    .filter((p) => p.pointId === 'tl' || p.pointId === 'tc' || p.pointId === 'tr')
    .flatMap((p) => p.samples.map((s) => s.eyeInHeadV));
  const bottomEyeInHead = allPointSamples
    .filter((p) => p.pointId === 'bl' || p.pointId === 'bc' || p.pointId === 'br')
    .flatMap((p) => p.samples.map((s) => s.eyeInHeadV));
  const vTopEdge = topEyeInHead.length ? median(topEyeInHead) : 0;
  const vBottomEdge = bottomEyeInHead.length ? median(bottomEyeInHead) : 0;
  const vSweep = vBottomEdge - vTopEdge;

  // Median deterministic head pitch (chin-down positive, degrees). Live seeds its vertical
  // head-pitch baseline from this so the band and live readings share one frame.
  const allHeadPitch = allPointSamples.flatMap((p) => p.samples.map((s) => s.headPitch));
  const headPitchDeg = allHeadPitch.length ? median(allHeadPitch) : 0;

  const { accepted, reason } = evaluateCalibrationAcceptance({
    minValidSamples,
    rangeX,
    vTopEdge,
    vBottomEdge,
    maxDotStdX,
    maxDotStdV,
  });
  const rejectionReason =
    reason === 'coverage'
      ? 'We could not see your eyes clearly at every dot. Keep your face centered in the camera with your eyes open, then recalibrate.'
      : reason === 'horizontalRange'
      ? 'Your eyes barely moved between the dots. Follow each dot with your eyes (keep your head still), then recalibrate.'
      : reason === 'verticalSweep'
      ? 'Your eyes did not move up and down enough. Look right at the top and bottom dots with your eyes (keep your head still), then recalibrate.'
      : reason === 'steadiness'
      ? 'Your gaze was unsteady during calibration. Hold on each dot until it turns green, then recalibrate.'
      : null;

  // Magnitude-aware quality so the on-screen bar agrees with the trust decision.
  const coverageScore = Math.min(minValidSamples / SAMPLES_PER_POINT, 1);
  const rangeScoreX = Math.min(rangeX / (MIN_OPPOSITE_EDGE_GAP_X * 2), 1);
  const sweepScoreV = Math.min(vSweep / (MIN_V_BAND_WIDTH * 2), 1);
  const qualityScore = accepted
    ? Math.min(coverageScore, (rangeScoreX + sweepScoreV) / 2)
    : 0;

  return {
    thresholdX,
    thresholdY,
    neutralX,
    neutralY,
    pointData: allPointSamples,
    qualityScore,
    accepted,
    rejectionReason,
    rangeX,
    rangeY,
    vTopEdge,
    vBottomEdge,
    vSweep,
    headPitchDeg,
  };
}

export function useGazeCalibration(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [calState, setCalState] = useState<CalibrationState>({
    phase: 'idle',
    currentPointIndex: -1,
    samplesCollected: 0,
    result: null,
    error: null,
  });

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const abortRef = useRef(false);
  const allPointSamplesRef = useRef<PointSamples[]>([]);

  // Call this from the intro screen's "Start" button
  const startCalibration = useCallback(async () => {
    abortRef.current = false;
    allPointSamplesRef.current = [];

    setCalState({ phase: 'intro', currentPointIndex: -1, samplesCollected: 0, result: null, error: null });

    // Initialise MediaPipe if not already done
    if (!faceLandmarkerRef.current) {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_MODEL_URL },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
          // Blendshapes drive the personalised vertical (up/down) thresholds: we read
          // eyeLookUp/Down at the top/bottom dots to learn where this candidate's eyes sit at
          // their screen edges. Must be ON here so calibration and live detection use the same signal.
          outputFaceBlendshapes: true,
        });
      } catch (err) {
        setCalState((s) => ({ ...s, phase: 'error', error: 'Failed to load face model' }));
        return;
      }
    }
  }, []);

  // Call this when user clicks "Begin" after reading the intro
  const beginPoints = useCallback(async () => {
    const video = videoRef.current;
    const faceTask = faceLandmarkerRef.current;
    if (!video || !faceTask) return;

    for (let i = 0; i < CALIBRATION_POINTS.length; i++) {
      if (abortRef.current) return;

      const point = CALIBRATION_POINTS[i]!;

      // "waiting" phase: show the dot, give user 1.5s to move eyes to it
      setCalState((s) => ({
        ...s,
        phase: 'waiting',
        currentPointIndex: i,
        samplesCollected: 0,
      }));
      await sleep(1500);
      if (abortRef.current) return;

      // "sampling" phase: collect frames
      setCalState((s) => ({ ...s, phase: 'sampling' }));
      const samples: IrisSample[] = [];

      for (let j = 0; j < SAMPLES_PER_POINT; j++) {
        if (abortRef.current) return;
        const sample = sampleIrisOffset(faceTask, video);
        if (sample) samples.push(sample);
        setCalState((s) => ({ ...s, samplesCollected: samples.length }));
        await sleep(SAMPLE_INTERVAL_MS);
      }

      allPointSamplesRef.current.push({ pointId: point.id, samples });

      // "between" phase (skip after last point)
      if (i < CALIBRATION_POINTS.length - 1) {
        setCalState((s) => ({ ...s, phase: 'between' }));
        await sleep(600);
      }
    }

    if (abortRef.current) return;

    const result = computeResult(allPointSamplesRef.current);
    setCalState((s) => ({ ...s, phase: 'done', result }));
  }, [videoRef]);

  const abort = useCallback(() => {
    abortRef.current = true;
    setCalState({ phase: 'idle', currentPointIndex: -1, samplesCollected: 0, result: null, error: null });
  }, []);

  return { calState, startCalibration, beginPoints, abort };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
