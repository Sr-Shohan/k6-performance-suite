// Reusable `handleSummary` that produces multiple report formats after a run.
//
// Emits:
//   - reports/<prefix>-summary.html  (rich HTML report, great as a CI artifact)
//   - reports/<prefix>-junit.xml     (JUnit, for CI test reporting)
//   - reports/<prefix>-summary.json  (raw metrics, for custom processing)
//   - stdout                         (human-readable text summary)
//
// The `<prefix>` embeds TEST_FILE + TEST_TYPE so parallel CI jobs don't collide.

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { jUnit } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

function reportPrefix() {
  const file = __ENV.TEST_FILE || 'test';
  const type = __ENV.TEST_TYPE || 'smoke';
  return `${file}-${type}`;
}

export function handleSummary(data) {
  const prefix = reportPrefix();
  return {
    [`reports/${prefix}-summary.html`]: htmlReport(data),
    [`reports/${prefix}-junit.xml`]: jUnit(data),
    [`reports/${prefix}-summary.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
