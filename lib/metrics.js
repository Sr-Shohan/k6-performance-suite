// Custom metrics shared across tests.
//
// These complement k6's built-in http_* metrics with business-level signals so
// reports show more than raw HTTP timing.

import { Trend, Rate, Counter } from 'k6/metrics';

// Rate of application-level errors (e.g. unexpected status, bad payload).
export const businessErrors = new Rate('business_errors');

// Count of each logical operation performed (tagged by name).
export const operationCount = new Counter('operations_total');

// Latency of full user journeys / grouped flows, separate from single requests.
export const flowDuration = new Trend('flow_duration', true);
