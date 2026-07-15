// CreateBooking - POST /booking (no auth required).
//
// Isolated test for the create operation so its throughput/latency can be
// measured on its own. Run type via TEST_TYPE (smoke/load/stress/...).

import { sleep } from 'k6';
import { getProfile } from '../scenarios/profiles.js';
import { thresholds } from '../config/thresholds.js';
import { createBooking } from '../lib/booking.js';

const profile = getProfile(__ENV.TEST_TYPE || 'smoke');

export const options = {
  ...profile,
  thresholds: { ...thresholds, ...(profile.thresholds || {}) },
};

export { handleSummary } from '../lib/report.js';

export default function () {
  createBooking();
  sleep(1);
}
