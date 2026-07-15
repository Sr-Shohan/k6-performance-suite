// Environment configuration.
// Select with `-e ENVIRONMENT=<name>` (default: prod).
//
// Restful-Booker is a public demo API, so all environments point to the same
// host by default. The structure lets you add real staging/local hosts later
// without touching test logic.

const environments = {
  prod: {
    baseUrl: 'https://restful-booker.herokuapp.com',
  },
  staging: {
    baseUrl: __ENV.STAGING_BASE_URL || 'https://restful-booker.herokuapp.com',
  },
  local: {
    baseUrl: __ENV.LOCAL_BASE_URL || 'http://localhost:3001',
  },
};

// Default demo credentials for Restful-Booker (documented publicly).
const credentials = {
  username: __ENV.API_USERNAME || 'admin',
  password: __ENV.API_PASSWORD || 'password123',
};

export function getEnvironment() {
  const name = __ENV.ENVIRONMENT || 'prod';
  const env = environments[name];
  if (!env) {
    throw new Error(
      `Unknown ENVIRONMENT "${name}". Valid options: ${Object.keys(environments).join(', ')}`
    );
  }
  return { name, ...env, credentials };
}

export const BASE_URL = getEnvironment().baseUrl;
