// Reusable Restful-Booker booking operations.
//
// These wrap the raw HTTP wrapper with the correct endpoint, method, auth, and
// expected status for each CRUD action, and add a light response check. Keeping
// them here lets the per-operation test files stay thin and consistent, and
// ensures every test measures the operation with the same request `name` tag.

import { check } from 'k6';
import { get, post, put, patch, del } from './http.js';
import { authHeaders } from './auth.js';
import {
  buildBooking,
  buildUpdatedBooking,
  buildPartialBooking,
} from '../data/bookings.js';

// CreateBooking - POST /booking (no auth). Returns { res, id }.
export function createBooking(booking = buildBooking()) {
  const res = post('createBooking', '/booking', { body: booking, expectedStatus: 200 });
  let id;
  try {
    id = res.json('bookingid');
  } catch (e) {
    id = undefined;
  }
  check(res, { 'createBooking: id returned': () => id !== undefined });
  return { res, id };
}

// GetBooking - GET /booking/:id (no auth).
export function getBooking(id) {
  return get('getBooking', `/booking/${id}`, { expectedStatus: 200 });
}

// UpdateBooking - PUT /booking/:id (auth required, full replace).
export function updateBooking(id, token, booking = buildUpdatedBooking()) {
  return put('updateBooking', `/booking/${id}`, {
    body: booking,
    headers: authHeaders(token),
    expectedStatus: 200,
  });
}

// PartialUpdateBooking - PATCH /booking/:id (auth required, partial update).
export function partialUpdateBooking(id, token, partial = buildPartialBooking()) {
  return patch('partialUpdateBooking', `/booking/${id}`, {
    body: partial,
    headers: authHeaders(token),
    expectedStatus: 200,
  });
}

// DeleteBooking - DELETE /booking/:id (auth required). Restful-Booker returns 201.
export function deleteBooking(id, token) {
  return del('deleteBooking', `/booking/${id}`, {
    headers: authHeaders(token),
    expectedStatus: [200, 201],
  });
}
