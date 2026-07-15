// Full booking user journey: auth -> create -> read -> update -> patch -> delete.
//
// Test type (smoke/load/stress/spike/soak/breakpoint) is chosen via TEST_TYPE.
// This file stays thin: profile + thresholds + report come from shared code, and
// the booking operations come from lib/booking.js (same helpers the per-operation
// test files use).

import { group, sleep } from 'k6';
import { getProfile } from '../scenarios/profiles.js';
import { thresholds } from '../config/thresholds.js';
import { getToken } from '../lib/auth.js';
import {
  createBooking,
  getBooking,
  updateBooking,
  partialUpdateBooking,
  deleteBooking,
} from '../lib/booking.js';
import { flowDuration } from '../lib/metrics.js';

const profile = getProfile(__ENV.TEST_TYPE || 'smoke');

export const options = {
  ...profile,
  thresholds: { ...thresholds, ...(profile.thresholds || {}) },
};

export { handleSummary } from '../lib/report.js';

export default function () {
  const start = Date.now();

  const token = getToken();

  group('booking lifecycle', () => {
    const { id } = createBooking();
    if (id === undefined) {
      return; // Nothing to read/update/delete without an id.
    }

    getBooking(id);

    // Write operations require auth.
    if (token) {
      updateBooking(id, token);
      partialUpdateBooking(id, token);
      deleteBooking(id, token);
    }
  });

  flowDuration.add(Date.now() - start);
  sleep(1);
}
