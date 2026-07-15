// Local k6 test-runner UI - zero external dependencies (Node built-ins only).
//
// Serves a small web app that lists the test cases in tests/, lets you pick a
// test type + VUs + environment, runs k6 with the live web dashboard enabled,
// streams k6 output to the browser over Server-Sent Events, and links to the
// generated reports.
//
// Start with:  npm run ui   (or: node runner/server.js)

import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');
const REPORTS_DIR = path.join(ROOT, 'reports');
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = Number(process.env.UI_PORT || 8080);
const DASH_PORT = Number(process.env.DASH_PORT || 5665);
const K6 = process.env.K6 || 'k6';

const TEST_TYPES = ['smoke', 'load', 'stress', 'spike', 'soak', 'breakpoint'];
const ENVIRONMENTS = ['prod', 'staging', 'local'];

// State for the single active run. Only one k6 run at a time (they'd otherwise
// fight over the dashboard port).
let current = null; // { id, proc, meta, running }
const logBuffer = []; // recent output lines for late-joining SSE clients
const clients = new Set(); // active SSE response objects
const MAX_LOG_LINES = 2000;

function listTests() {
  try {
    return fs
      .readdirSync(TESTS_DIR)
      .filter((f) => f.endsWith('.js'))
      .map((f) => f.replace(/\.js$/, ''))
      .sort();
  } catch {
    return [];
  }
}

function listReports() {
  try {
    return fs
      .readdirSync(REPORTS_DIR)
      .filter((f) => f.endsWith('.html') || f.endsWith('.xml') || f.endsWith('.json'))
      .map((f) => {
        const stat = fs.statSync(path.join(REPORTS_DIR, f));
        return { name: f, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

function pushLog(line) {
  logBuffer.push(line);
  if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
  broadcast('log', { line });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

function startRun({ testFile, testType, vus, environment }) {
  if (current && current.running) {
    throw new Error('A run is already in progress. Stop it first.');
  }
  if (!listTests().includes(testFile)) {
    throw new Error(`Unknown test file: ${testFile}`);
  }
  if (!TEST_TYPES.includes(testType)) {
    throw new Error(`Unknown test type: ${testType}`);
  }
  if (!ENVIRONMENTS.includes(environment)) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  if (vus && !/^\d+$/.test(String(vus))) {
    throw new Error(`VUS must be a positive integer, got: ${vus}`);
  }

  const exportName = `${testFile}-${testType}-dashboard.html`;
  const env = {
    ...process.env,
    K6_WEB_DASHBOARD: 'true',
    K6_WEB_DASHBOARD_PORT: String(DASH_PORT),
    // The UI embeds the dashboard in an iframe, so don't auto-open a browser tab.
    K6_WEB_DASHBOARD_OPEN: 'false',
    K6_WEB_DASHBOARD_EXPORT: path.join('reports', exportName),
  };

  const args = [
    'run',
    '-e',
    `TEST_TYPE=${testType}`,
    '-e',
    `TEST_FILE=${testFile}`,
    '-e',
    `ENVIRONMENT=${environment}`,
  ];
  if (vus) {
    args.push('-e', `VUS=${vus}`);
  }
  args.push(path.join('tests', `${testFile}.js`));

  logBuffer.length = 0;
  const id = Date.now().toString(36);
  const meta = { id, testFile, testType, vus: vus || null, environment, exportName, startedAt: Date.now() };

  let proc;
  try {
    proc = spawn(K6, args, { cwd: ROOT, env });
  } catch (err) {
    throw new Error(`Failed to launch k6: ${err.message}`);
  }

  current = { id, proc, meta, running: true };
  broadcast('start', meta);
  pushLog(`$ ${K6} ${args.join(' ')}`);

  const onData = (buf) => {
    for (const line of buf.toString().split(/\r?\n/)) {
      if (line.length) pushLog(line);
    }
  };
  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  proc.on('error', (err) => {
    pushLog(`[runner] failed to start k6: ${err.message}`);
    if (current) current.running = false;
    broadcast('end', { id, code: -1, error: err.message });
  });

  proc.on('close', (code) => {
    if (current) current.running = false;
    pushLog(`[runner] k6 exited with code ${code}`);
    broadcast('end', { id, code, exportName });
  });

  return meta;
}

function stopRun() {
  if (current && current.running && current.proc) {
    // SIGINT lets k6 finish gracefully and write its dashboard export.
    current.proc.kill('SIGINT');
    pushLog('[runner] stop requested (SIGINT sent)');
    return true;
  }
  return false;
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API: config (tests, types, environments, dashboard port, current run)
  if (pathname === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, {
      tests: listTests(),
      testTypes: TEST_TYPES,
      environments: ENVIRONMENTS,
      dashboardUrl: `http://127.0.0.1:${DASH_PORT}/`,
      running: !!(current && current.running),
      current: current ? current.meta : null,
    });
  }

  // API: reports list
  if (pathname === '/api/reports' && req.method === 'GET') {
    return sendJson(res, 200, { reports: listReports() });
  }

  // API: start a run
  if (pathname === '/api/run' && req.method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const meta = startRun({
        testFile: body.testFile,
        testType: body.testType || 'smoke',
        vus: body.vus,
        environment: body.environment || 'prod',
      });
      return sendJson(res, 200, { ok: true, meta });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // API: stop the current run
  if (pathname === '/api/stop' && req.method === 'POST') {
    const stopped = stopRun();
    return sendJson(res, 200, { ok: stopped });
  }

  // API: live output stream (Server-Sent Events)
  if (pathname === '/api/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    // Replay recent log lines so a refreshed page shows history.
    for (const line of logBuffer) {
      res.write(`event: log\ndata: ${JSON.stringify({ line })}\n\n`);
    }
    if (current) {
      res.write(`event: ${current.running ? 'start' : 'end'}\ndata: ${JSON.stringify(current.meta)}\n\n`);
    }
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // Serve generated report files
  if (pathname.startsWith('/reports/')) {
    const rel = decodeURIComponent(pathname.replace('/reports/', ''));
    const filePath = path.join(REPORTS_DIR, rel);
    if (!filePath.startsWith(REPORTS_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const ext = path.extname(filePath);
    return serveStatic(res, filePath, CONTENT_TYPES[ext] || 'application/octet-stream');
  }

  // Static UI
  if (pathname === '/' || pathname === '/index.html') {
    return serveStatic(res, path.join(PUBLIC_DIR, 'index.html'), CONTENT_TYPES['.html']);
  }
  const staticPath = path.join(PUBLIC_DIR, pathname);
  if (staticPath.startsWith(PUBLIC_DIR) && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
    const ext = path.extname(staticPath);
    return serveStatic(res, staticPath, CONTENT_TYPES[ext] || 'application/octet-stream');
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  k6 test runner UI running at:  http://127.0.0.1:${PORT}`);
  console.log(`  Live dashboard (during runs):  http://127.0.0.1:${DASH_PORT}\n`);
});
