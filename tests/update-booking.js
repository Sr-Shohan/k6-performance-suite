// UpdateBooking - PUT /booking/:id (auth required, full replace).
//
// Each iteration creates a fresh booking, then fully updates it. Auth token is
// fetched once in setup() and reused. The update request is tagged
// `updateBooking` so you can isolate its latency in reports/dashboard.

import { sleep } from 'k6';
import { getProfile } from '../scenarios/profiles.js';
import { thresholds } from '../config/thresholds.js';
import { getToken } from '../lib/auth.js';
import { createBooking, updateBooking } from '../lib/booking.js';

const profile = getProfile(__ENV.TEST_TYPE || 'smoke');

export const options = {
  ...profile,
  thresholds: { ...thresholds, ...(profile.thresholds || {}) },
};

export { handleSummary } from '../lib/report.js';

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const { id } = createBooking();
  if (id !== undefined && data.token) {
    updateBooking(id, data.token);
  }
  sleep(1);
}
