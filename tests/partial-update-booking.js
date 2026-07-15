// PartialUpdateBooking - PATCH /booking/:id (auth required, partial update).
//
// Each iteration creates a fresh booking, then patches a subset of fields. Auth
// token is fetched once in setup() and reused. The patch request is tagged
// `partialUpdateBooking` for isolated metrics.

import { sleep } from 'k6';
import { getProfile } from '../scenarios/profiles.js';
import { thresholds } from '../config/thresholds.js';
import { getToken } from '../lib/auth.js';
import { createBooking, partialUpdateBooking } from '../lib/booking.js';

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
    partialUpdateBooking(id, data.token);
  }
  sleep(1);
}
