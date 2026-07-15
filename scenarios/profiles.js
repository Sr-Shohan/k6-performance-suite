// Load profiles (test types) decoupled from test logic.
//
// Each profile returns a k6 `scenarios` block so the same test file can run as
// smoke / load / stress / spike / soak / breakpoint just by switching the
// `TEST_TYPE` env var. Durations for the long-running profiles (soak,
// breakpoint) can be shortened in CI via env overrides to keep pipelines fast.

import { breakpointThresholds } from '../config/thresholds.js';

// Allow CI to shorten long tests, e.g. `-e SOAK_DURATION=2m`.
const SOAK_DURATION = __ENV.SOAK_DURATION || '30m';

const profiles = {
  // Minimal traffic - verifies the script works and the API is up.
  smoke: () => ({
    scenarios: {
      smoke: {
        executor: 'constant-vus',
        vus: 1,
        duration: '30s',
        tags: { test_type: 'smoke' },
      },
    },
  }),

  // Average expected production traffic.
  load: () => ({
    scenarios: {
      load: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '30s', target: 20 },
          { duration: '1m', target: 20 },
          { duration: '2m', target: 50 },
          { duration: '1m', target: 50 },
          { duration: '30s', target: 0 },
        ],
        gracefulRampDown: '30s',
        tags: { test_type: 'load' },
      },
    },
  }),

  // Beyond normal traffic to find where performance degrades.
  stress: () => ({
    scenarios: {
      stress: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '1m', target: 50 },
          { duration: '2m', target: 100 },
          { duration: '2m', target: 200 },
          { duration: '2m', target: 300 },
          { duration: '1m', target: 0 },
        ],
        gracefulRampDown: '30s',
        tags: { test_type: 'stress' },
      },
    },
  }),

  // Sudden burst of traffic then a sharp drop.
  spike: () => ({
    scenarios: {
      spike: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '30s', target: 20 },
          { duration: '20s', target: 300 },
          { duration: '1m', target: 300 },
          { duration: '20s', target: 20 },
          { duration: '30s', target: 0 },
        ],
        gracefulRampDown: '30s',
        tags: { test_type: 'spike' },
      },
    },
  }),

  // Sustained moderate load over a long period to surface leaks/degradation.
  soak: () => ({
    scenarios: {
      soak: {
        executor: 'constant-vus',
        vus: 30,
        duration: SOAK_DURATION,
        tags: { test_type: 'soak' },
      },
    },
  }),

  // Ramp arrival rate until thresholds abort the run - finds the breaking point.
  breakpoint: () => ({
    scenarios: {
      breakpoint: {
        executor: 'ramping-arrival-rate',
        startRate: 10,
        timeUnit: '1s',
        preAllocatedVUs: 50,
        maxVUs: 500,
        stages: [{ duration: '10m', target: 500 }],
        tags: { test_type: 'breakpoint' },
      },
    },
    thresholds: breakpointThresholds,
  }),
};

// Optionally override the peak VU count via `-e VUS=<n>`.
//
// The profile's *shape* is preserved: ramping profiles are scaled so their peak
// target equals VUS (keeping the ramp-up/down proportions), constant profiles
// use VUS directly, and the rate-based breakpoint profile caps its VU pool.
function applyVusOverride(profile) {
  const raw = __ENV.VUS;
  if (!raw) {
    return profile;
  }

  const vus = parseInt(raw, 10);
  if (!Number.isFinite(vus) || vus <= 0) {
    throw new Error(`Invalid VUS "${raw}". Provide a positive integer, e.g. -e VUS=100`);
  }

  for (const key of Object.keys(profile.scenarios)) {
    const sc = profile.scenarios[key];

    if (sc.executor === 'constant-vus') {
      sc.vus = vus;
    } else if (sc.executor === 'ramping-vus' && Array.isArray(sc.stages)) {
      const peak = Math.max(...sc.stages.map((s) => s.target));
      if (peak > 0) {
        sc.stages = sc.stages.map((s) => ({
          ...s,
          // Keep 0-targets (ramp-down to zero); scale the rest proportionally.
          target: s.target === 0 ? 0 : Math.max(1, Math.round((s.target / peak) * vus)),
        }));
      }
    } else if (sc.executor === 'ramping-arrival-rate') {
      // Breakpoint is arrival-rate based; VUS caps the VU pool used to serve it.
      sc.maxVUs = vus;
      sc.preAllocatedVUs = Math.min(sc.preAllocatedVUs || vus, vus);
    }
  }

  return profile;
}

export function getProfile(type = 'smoke') {
  const factory = profiles[type];
  if (!factory) {
    throw new Error(
      `Unknown TEST_TYPE "${type}". Valid options: ${Object.keys(profiles).join(', ')}`
    );
  }
  return applyVusOverride(factory());
}

export const TEST_TYPES = Object.keys(profiles);
