// Health check: GET /ping should return 201 (Restful-Booker's health code).

import { sleep } from 'k6';
import { getProfile } from '../scenarios/profiles.js';
import { thresholds } from '../config/thresholds.js';
import { get } from '../lib/http.js';

const profile = getProfile(__ENV.TEST_TYPE || 'smoke');

export const options = {
  ...profile,
  thresholds: { ...thresholds, ...(profile.thresholds || {}) },
};

export { handleSummary } from '../lib/report.js';

export default function () {
  get('ping', '/ping', { expectedStatus: 201 });
  sleep(1);
}
