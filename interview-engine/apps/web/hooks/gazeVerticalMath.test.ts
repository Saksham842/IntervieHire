// Pure-math unit tests for the vertical-gaze redesign.
// Run with:  node --test hooks/gazeVerticalMath.test.ts   (Node ≥ 22 strips the TS types).
// No test framework / extra deps — uses the built-in node:test + node:assert.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  noseEyePitchDeg,
  compVerticalPitch,
  computeWorldVertical,
  deriveVerticalBand,
  classifyVertical,
  combineGazeDirection,
  evaluateCalibrationAcceptance,
  DEFAULT_VERTICAL_BAND,
} from './gazeVerticalMath';

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

// ── noseEyePitchDeg sign (the linchpin: chin-down must be POSITIVE) ───────────
test('noseEyePitchDeg: chin-down yields a larger (more positive) pitch than chin-up', () => {
  // faceHeight = |chin.y - forehead.y| = 1.0 in all three; eyeMidY = 0.4.
  const neutral = noseEyePitchDeg({ y: 0.4 }, { y: 0.4 }, { y: 0.5 }, { y: 0.0 }, { y: 1.0 })!;
  const chinDown = noseEyePitchDeg({ y: 0.4 }, { y: 0.4 }, { y: 0.6 }, { y: 0.0 }, { y: 1.0 })!; // nose lower vs eyes
  const chinUp = noseEyePitchDeg({ y: 0.4 }, { y: 0.4 }, { y: 0.45 }, { y: 0.0 }, { y: 1.0 })!; // nose closer to eyes
  assert.ok(chinDown > neutral, 'chin-down > neutral');
  assert.ok(neutral > chinUp, 'neutral > chin-up');
  assert.ok(approx(neutral, ((0.5 - 0.4) / 1.0) * 90), 'neutral = 9deg');
  assert.equal(noseEyePitchDeg(null, { y: 0.4 }, { y: 0.5 }, { y: 0 }, { y: 1 }), null);
});

// ── compVerticalPitch: deadzone + cap + sign ─────────────────────────────────
test('compVerticalPitch: deadzone, sign, and cap', () => {
  assert.equal(compVerticalPitch(2), 0); // inside 2.5deg deadzone
  assert.equal(compVerticalPitch(-2.5), 0);
  assert.ok(approx(compVerticalPitch(15), 12.5)); // 15 - 2.5
  assert.ok(approx(compVerticalPitch(-20), -17.5)); // sign preserved
  assert.ok(approx(compVerticalPitch(40), 25.5)); // capped at 28 - 2.5
  assert.equal(compVerticalPitch(NaN), 0);
});

test('computeWorldVertical folds pitch with factor 0.04', () => {
  assert.ok(approx(computeWorldVertical(0.3, 0), 0.3));
  assert.ok(approx(computeWorldVertical(1.0, -20), 1.0 - 17.5 * 0.04)); // 0.30 (S4 chin-up)
  assert.ok(approx(computeWorldVertical(0.8, 15), 0.8 + 12.5 * 0.04)); // 1.30 (down-with-tilt)
});

// ── deriveVerticalBand: guards ───────────────────────────────────────────────
test('deriveVerticalBand: personalises a real band, falls back on degenerate/inverted/narrow', () => {
  assert.deepEqual(deriveVerticalBand(0.1, 0.62), { vBandTop: 0.1, vBandBottom: 0.62 });
  // inverted (vBottom < vTop) → default
  assert.deepEqual(deriveVerticalBand(0.5, 0.2), DEFAULT_VERTICAL_BAND);
  // too narrow (< 0.12) → default
  assert.deepEqual(deriveVerticalBand(0.10, 0.15), DEFAULT_VERTICAL_BAND);
  // missing → default
  assert.deepEqual(deriveVerticalBand(null, 0.5), DEFAULT_VERTICAL_BAND);
  assert.deepEqual(deriveVerticalBand(NaN, 0.5), DEFAULT_VERTICAL_BAND);
  // A high-mounted (camera-below) rig has a negative bottom edge; the V_BOTTOM_CLAMP_MIN floor (0.20)
  // deliberately lifts it — DOWN sensitivity is intentionally reduced on that rare setup (documented
  // residual: the band model biases to the common camera-at-top case). vTop passes through unclamped.
  assert.deepEqual(deriveVerticalBand(-0.6, -0.2), { vBandTop: -0.6, vBandBottom: 0.2 });
});

// ── classifyVertical: the 6-symptom scenarios (band vTop=0.10, vBottom=0.60) ──
const BAND = { vBandTop: 0.1, vBandBottom: 0.6 };
const V = (eyeInHeadV: number, gazePitchDeltaDeg: number, downBlend: number, upBlend: number) =>
  classifyVertical({ ...BAND, eyeInHeadV, gazePitchDeltaDeg, downBlend, upBlend });

test('#1 on-screen center → not away', () => {
  const r = V(0.3, 0, 0.3, 0.02);
  assert.equal(r.downAway, false);
  assert.equal(r.upAway, false);
  assert.equal(r.direction, 'center');
});

test('#2 look above screen → up', () => {
  const r = V(-0.3, 0, 0.01, 0.35);
  assert.equal(r.upAway, true);
  assert.equal(r.downAway, false);
  assert.equal(r.direction, 'up');
});

test('#3 look below screen (blendshape saturated) → down', () => {
  const r = V(1.0, 0, 0.95, 0.0);
  assert.equal(r.downAway, true);
  assert.equal(r.direction, 'down');
});

test('#6 chin-up while on-screen → NOT down (S4 fixed)', () => {
  const r = V(1.0, -20, 0.95, 0.0); // eyes counter-rotate down; head tilted up
  assert.ok(approx(r.worldVertical, 0.3));
  assert.equal(r.downAway, false, 'chin-up must not read as down');
  assert.equal(r.direction, 'center');
});

test('#7 genuine look-down with head tilted down → down (phone-in-lap caught)', () => {
  const r = V(0.8, 15, 0.85, 0.0);
  assert.ok(approx(r.worldVertical, 1.3));
  assert.equal(r.downAway, true);
  assert.equal(r.direction, 'down');
});

test('corroboration required: band crossed but eyes not pointing that way → not away', () => {
  // worldVertical above the down boundary, but down/up blendshapes tied → no corroboration
  const r = V(0.9, 0, 0.5, 0.5);
  assert.equal(r.downAway, false);
});

// ── combineGazeDirection: horizontal vs vertical labelling ────────────────────
const thrX = 0.3;
const hStrength = (useX: number) => Math.abs(useX) / thrX;

test('#4/#5 pure horizontal → left / right', () => {
  const center = V(0.3, 0, 0.3, 0.02);
  const left = combineGazeDirection({ horizontalAway: true, horizontalDir: 'left', horizontalStrength: hStrength(0.4), vertical: center });
  const right = combineGazeDirection({ horizontalAway: true, horizontalDir: 'right', horizontalStrength: hStrength(0.4), vertical: center });
  assert.deepEqual(left, { away: true, direction: 'left' });
  assert.deepEqual(right, { away: true, direction: 'right' });
});

test('#8 corner down+left → stronger axis (down) wins', () => {
  const down = V(1.0, 0, 0.95, 0.0); // strength = (1.0-0.6)/0.12 = 3.33
  const r = combineGazeDirection({ horizontalAway: true, horizontalDir: 'left', horizontalStrength: hStrength(0.4), vertical: down });
  // hStrength(0.4)=1.33 * 1.15 = 1.53 < 3.33 → vertical wins
  assert.deepEqual(r, { away: true, direction: 'down' });
});

test('combine: neither axis away → center', () => {
  const center = V(0.3, 0, 0.3, 0.02);
  const r = combineGazeDirection({ horizontalAway: false, horizontalDir: 'left', horizontalStrength: 0, vertical: center });
  assert.deepEqual(r, { away: false, direction: 'center' });
});

// ── evaluateCalibrationAcceptance: accept honest, reject fakes ────────────────
const accept = (o: Partial<Parameters<typeof evaluateCalibrationAcceptance>[0]>) =>
  evaluateCalibrationAcceptance({
    minValidSamples: 18, rangeX: 0.4, vTopEdge: 0.1, vBottomEdge: 0.62, maxDotStdX: 0.05, maxDotStdV: 0.04, ...o,
  });

test('#9 real sweep → accept', () => {
  assert.deepEqual(accept({}), { accepted: true, reason: null });
});
test('#10 no face → reject (coverage)', () => {
  assert.deepEqual(accept({ minValidSamples: 0 }), { accepted: false, reason: 'coverage' });
});
test('#11 closed eyes (frames dropped) → reject (coverage)', () => {
  assert.deepEqual(accept({ minValidSamples: 1 }), { accepted: false, reason: 'coverage' });
});
test('#12 staring straight → reject (horizontalRange)', () => {
  assert.deepEqual(accept({ rangeX: 0.03, vTopEdge: 0.0, vBottomEdge: 0.01 }), { accepted: false, reason: 'horizontalRange' });
});
test('#13 honest small-vertical (small screen / far) → accept', () => {
  assert.deepEqual(accept({ minValidSamples: 15, rangeX: 0.15, vTopEdge: -0.16, vBottomEdge: 0.16, maxDotStdX: 0.06, maxDotStdV: 0.05 }), { accepted: true, reason: null });
});
test('#14 horizontal-only mover (no vertical sweep) → reject (verticalSweep)', () => {
  assert.deepEqual(accept({ vTopEdge: 0.1, vBottomEdge: 0.13 }), { accepted: false, reason: 'verticalSweep' });
});
test('#15 random wander (unsteady vertical) → reject (steadiness)', () => {
  assert.deepEqual(accept({ rangeX: 0.3, vTopEdge: 0.1, vBottomEdge: 0.25, maxDotStdV: 0.2 }), { accepted: false, reason: 'steadiness' });
});
