// Authentication helper for Restful-Booker.
//
// POST /auth returns a token used as a cookie (`Cookie: token=<token>`) for
// write operations (PUT/PATCH/DELETE).

import { check } from 'k6';
import { post } from './http.js';
import { getEnvironment } from '../config/environments.js';

// Fetch an auth token. Returns the token string, or null on failure.
export function getToken() {
  const { credentials } = getEnvironment();
  const res = post('auth', '/auth', {
    body: { username: credentials.username, password: credentials.password },
    expectedStatus: 200,
  });

  let token = null;
  try {
    token = res.json('token');
  } catch (e) {
    token = null;
  }

  check(res, { 'auth: token received': () => !!token });
  return token;
}

// Build headers carrying the auth token for write operations.
export function authHeaders(token) {
  return { Cookie: `token=${token}` };
}
