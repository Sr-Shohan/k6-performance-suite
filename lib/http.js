// Thin HTTP wrapper that standardizes tagging, checks, and custom metrics.
//
// Every request made through `request()` is tagged with a logical `name` so k6
// groups metrics per operation (instead of per-URL, which would explode with
// booking ids). It also records business errors and operation counts.

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config/environments.js';
import { businessErrors, operationCount } from './metrics.js';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// Core request helper.
//   name:     logical operation name (used as metric tag + in checks)
//   method:   HTTP verb
//   path:     path appended to the base URL
//   options:  { body, headers, params, expectedStatus }
export function request(name, method, path, options = {}) {
  const { body, headers = {}, params = {}, expectedStatus = 200 } = options;

  const url = `${BASE_URL}${path}`;
  const reqParams = {
    headers: { ...DEFAULT_HEADERS, ...headers },
    tags: { name, ...(params.tags || {}) },
    ...params,
  };

  const payload = body !== undefined ? JSON.stringify(body) : null;
  const res = http.request(method, url, payload, reqParams);

  operationCount.add(1, { name });

  const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  const statusOk = check(res, {
    [`${name}: status is ${expected.join('/')}`]: (r) => expected.includes(r.status),
  });

  // A failed status check counts as a business error.
  businessErrors.add(!statusOk, { name });

  return res;
}

export const get = (name, path, options) => request(name, 'GET', path, options);
export const post = (name, path, options) => request(name, 'POST', path, options);
export const put = (name, path, options) => request(name, 'PUT', path, options);
export const patch = (name, path, options) => request(name, 'PATCH', path, options);
export const del = (name, path, options) => request(name, 'DELETE', path, options);
