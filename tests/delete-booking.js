// DeleteBooking - DELETE /booking/:id (auth required).
//
// Each iteration creates a fresh booking, then deletes it. Auth token is fetched
// once in setup() and reused. The delete request is tagged `deleteBooking` for
// isolated metrics.

import { sleep } from 'k6';
import { getProfile } from '../scenarios/profiles.js';
import { thresholds } from '../config/thresholds.js';
import { getToken } from '../lib/auth.js';
import { createBooking, deleteBooking } from '../lib/booking.js';

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
    deleteBooking(id, data.token);
  }
  sleep(1);
}
