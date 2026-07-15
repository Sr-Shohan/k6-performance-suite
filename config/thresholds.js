// Shared SLA thresholds applied across tests.
//
// These are intentionally realistic for a free Heroku demo host (which can be
// slow or cold-starting). Tune per your real SLOs. Thresholds can be overridden
// per test type; `breakpoint` uses `abortOnFail` so the run stops once the API
// clearly degrades.

export const thresholds = {
  // 95% of requests should complete under 2s, 99% under 4s.
  http_req_duration: ['p(95)<2000', 'p(99)<4000'],
  // Less than 5% of HTTP requests should fail.
  http_req_failed: ['rate<0.05'],
  // At least 95% of functional checks should pass.
  checks: ['rate>0.95'],
  // Custom business-error rate should stay very low.
  business_errors: ['rate<0.05'],
};

// Stricter thresholds that abort the run early - used by the breakpoint profile
// so k6 stops ramping the moment the system is clearly failing.
export const breakpointThresholds = {
  http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '10s' }],
  http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '10s' }],
};
