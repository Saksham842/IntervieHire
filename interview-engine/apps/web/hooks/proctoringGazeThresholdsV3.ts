// Anti-spoofing thresholds for 8-dot gaze calibration and live gaze detection.
//
// HORIZONTAL (left/right) detection is unchanged: it uses the iris-in-socket offsetX,
// which is stable under head rotation because the eye corners are rigid landmarks.
//
// VERTICAL (up/down) detection was rebuilt from first principles (see gazeVerticalMath.ts).
// The old scheme mixed an eyelid-corrupted iris-offsetY path with a blendshape path under a
// wrong-sign assumption; it could never flag "above the screen", false-fired "down" on chin-up,
// and had no single workable sensitivity. The replacement models one signal — the world-vertical
// gaze `v` (head-pitch-compensated eyeLookDown−eyeLookUp) — against a per-person on-screen BAND
// [vBandTop, vBandBottom] learned from the top/bottom calibration dots, with NO sign assumptions.

export const FALLBACK_GAZE_THRESHOLD_X = 0.32;
// Legacy vertical iris-offset threshold. Retained ONLY so the stored value keeps flowing to the
// debug/calibration readouts; it is NOT used by vertical detection anymore (the band model is).
export const FALLBACK_GAZE_THRESHOLD_Y = 0.34;

// Keep the minimum low. A high minimum makes gaze-away impossible for users whose
// calibrated eye-offset range is naturally small.
export const MIN_SAFE_GAZE_THRESHOLD_X = 0.08;
export const MIN_SAFE_GAZE_THRESHOLD_Y = 0.08;

// Hard maximums: these are the anti-cheat caps. Even if a user looks outside the
// screen during calibration, the live valid region cannot grow past these values.
export const MAX_SAFE_GAZE_THRESHOLD_X = 0.34;
// Legacy thresholdY cap (debug-only now; see FALLBACK_GAZE_THRESHOLD_Y).
export const MAX_SAFE_GAZE_THRESHOLD_Y = 0.20;

// Use almost the calibrated threshold. The anti-cheat protection is mainly the
// maximum cap above, not shrinking the threshold so aggressively that detection breaks.
export const CALIBRATION_THRESHOLD_SAFETY_FACTOR = 0.95;

// If neutral is too far from raw eye center, clamp it so fake neutral calibration
// cannot hide large gaze offsets.
export const MAX_SAFE_NEUTRAL_X = 0.22;
export const MAX_SAFE_NEUTRAL_Y = 0.22;

// Per-dot quality checks. These validate the 8-dot calibration but do not disable
// live gaze detection. Live detection still runs with sanitized thresholds.
export const MIN_SAMPLES_PER_CALIBRATION_DOT = 8;
export const MAX_CALIBRATION_DOT_STD_X = 0.24;

// Expected 8-dot geometry separation from neutral/center (horizontal).
export const MIN_DOT_DIRECTION_SEPARATION_X = 0.06;
// Minimum horizontal iris sweep (max-min of per-dot mean offsetX) required across the perimeter
// dots for a calibration to be trusted. A static/ignored calibration sweeps only ~noise (~0.03)
// horizontally and is rejected here. This is the PRIMARY anti-spoof gate (staring-straight,
// no-face, closed-eyes-with-still-head all fail it).
export const MIN_OPPOSITE_EDGE_GAP_X = 0.08;

// ── Vertical (up/down) world-gaze BAND model ─────────────────────────────────────────────────
// The on-screen vertical range is a per-person gaze ANGLE (a function of screen size, seating
// distance, camera position, aspect ratio), so no single global threshold fits everyone. We learn
// the band from where the candidate's world-vertical gaze `v` sits at the TOP and BOTTOM screen-edge
// dots and flag past those edges. `v` is in blendshape units (eyeLookDown−eyeLookUp, >0 = down),
// folded with head pitch so head tilt cannot masquerade as gaze (see gazeVerticalMath.ts).

// Converts effective head-pitch DEGREES into `v` (blendshape) units. MediaPipe's eyeLookUp/Down
// blendshapes read ~1.0 at ~25° of eye rotation, and holding gaze while the head tilts requires eye
// counter-rotation equal to the tilt, so ~1/25 ≈ 0.04 per degree recovers true world gaze from the
// eye-in-head signal. This is the single biggest lever on chin-up suppression vs chin-down catch.
export const PITCH_TO_BLENDSHAPE_FACTOR = 0.04;
// Head-pitch compensation deadzone / cap (degrees). Below START we ignore tiny natural pitch jitter;
// above MAX the dedicated head-movement alarm (23°) takes over, so we stop trusting the pitch fold.
export const V_PITCH_COMP_START_DEG = 2.5;
export const V_PITCH_COMP_MAX_DEG = 28;

// Margins past the learned screen edge before up/down fires (~2.5–3° of gaze). Sustained
// confirmation (GAZE_CONFIRM_MS) + cooldown absorb the ~±0.05 blendshape frame noise.
export const V_MARGIN_UP = 0.10;
export const V_MARGIN_DOWN = 0.12;
// The eyes must actually point the flagged way: the dominant blendshape (down for DOWN, up for UP)
// must beat the other by at least this, so a compensation artefact alone cannot trigger a direction.
export const V_CORROBORATION_MARGIN = 0.06;

// Zero-config default band (camera-at-top laptop): top row sits ≈ eye level (v≈0), bottom edge is a
// large downward angle (v≈0.58). Retires the old absolute 0.35 up/down magnitudes that caused S2.
export const DEFAULT_V_BAND_TOP = -0.05;
export const DEFAULT_V_BAND_BOTTOM = 0.58;

// Trust floor for a personalised band, and simultaneously the calibration vertical-sweep acceptance
// floor: (vBottomEdge − vTopEdge) below this ⇒ the eyes did not sweep vertically (head-mover / spoof)
// ⇒ reject calibration and fall back to the default band. Honest sweeps run ≥ ~0.30, so 0.12 leaves
// ~2.5× margin. Do NOT raise past ~0.20 (would reject small-screen / far-seated honest users).
export const MIN_V_BAND_WIDTH = 0.12;

// Reachability clamps on the learned band edges. Blendshape eye rotation saturates near ±1.0, so an
// UP boundary below ~−0.9 is unreachable; keep vBandTop above V_TOP_CLAMP_MIN so "above screen" can
// cross it. A genuinely positive top edge (low-mounted screen) up to V_TOP_CLAMP_MAX is legitimate.
export const V_TOP_CLAMP_MIN = -0.80;
export const V_TOP_CLAMP_MAX = 0.55;
// Floor so a tiny sweep cannot hair-trigger DOWN; ceiling below saturation so the bottom row still
// has headroom before the DOWN boundary.
export const V_BOTTOM_CLAMP_MIN = 0.20;
export const V_BOTTOM_CLAMP_MAX = 0.95;

// Per-dot stability cap for the vertical blendshape signal (eyeInHeadV std within a dot). Held gaze
// runs ~0.03–0.06; random wander runs ~0.2. Replaces the old iris-offsetY std gate (corrupted).
export const MAX_CAL_DOT_STD_V = 0.10;
