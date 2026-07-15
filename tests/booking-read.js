// Read-heavy scenario: list booking ids, then fetch a random one.
//
// Useful for testing cache/read performance separately from write paths.

import { sleep, check } from 'k6';
import { getProfile } from '../scenarios/profiles.js';
import { thresholds } from '../config/thresholds.js';
import { get } from '../lib/http.js';
import { randomItem } from '../lib/utils.js';
import { flowDuration } from '../lib/metrics.js';

const profile = getProfile(__ENV.TEST_TYPE || 'smoke');

export const options = {
  ...profile,
  thresholds: { ...thresholds, ...(profile.thresholds || {}) },
};

export { handleSummary } from '../lib/report.js';

export default function () {
  const start = Date.now();

  const listRes = get('listBookings', '/booking', { expectedStatus: 200 });

  let ids = [];
  try {
    ids = listRes.json().map((b) => b.bookingid);
  } catch (e) {
    ids = [];
  }
  check(listRes, { 'listBookings: non-empty list': () => ids.length > 0 });

  if (ids.length > 0) {
    const id = randomItem(ids);
    get('getBooking', `/booking/${id}`, { expectedStatus: 200 });
  }

  flowDuration.add(Date.now() - start);
  sleep(1);
}
