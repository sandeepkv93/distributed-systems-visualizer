import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const exportDir = resolve(process.argv[2] ?? './out');

const EXPECTED_ROUTES = [
  '/',
  '/duel',
  '/map',
  '/bench',
  '/incidents',
  '/bibliography',
  '/advisor',
  '/systems',
  '/exam',
  '/latency',
  '/consistency',
  '/drills',
  '/clocks',
  '/studio',
  '/runbooks',
  '/glossary',
  '/theorems',
  '/queueing',
  '/storage',
  '/interviews',
  '/isolation',
  '/caching',
  '/streaming',
  '/cap-theorem',
  '/chandy-lamport',
  '/consensus-variants',
  '/consistent-hashing',
  '/crdts',
  '/distributed-locking',
  '/distributed-transactions',
  '/eventual-consistency',
  '/failure-detectors',
  '/gossip-anti-entropy',
  '/lamport-clocks',
  '/load-balancing',
  '/merkle-anti-entropy',
  '/network-partitions',
  '/paxos',
  '/pbft',
  '/quorum-replication',
  '/raft',
  '/replication-log',
  '/sharding-rebalancing',
  '/two-phase-commit',
  '/vector-clocks',
];

function resolveRouteHtmlPath(dir, route) {
  if (route === '/') {
    return join(dir, 'index.html');
  }
  const clean = route.replace(/^\/+/, '');
  const trailingSlashPath = join(dir, clean, 'index.html');
  if (existsSync(trailingSlashPath)) {
    return trailingSlashPath;
  }
  return join(dir, `${clean}.html`);
}

const errors = [];

if (!existsSync(exportDir)) {
  console.error(`FAIL: Static export directory does not exist: ${exportDir}`);
  process.exit(1);
}

// 1. Verify all 26 primary application routes
for (const route of EXPECTED_ROUTES) {
  const htmlPath = resolveRouteHtmlPath(exportDir, route);
  if (!existsSync(htmlPath)) {
    errors.push(`Missing exported HTML for route "${route}" (checked ${htmlPath})`);
    continue;
  }

  const size = statSync(htmlPath).size;
  if (size < 4096) {
    errors.push(`Exported HTML for route "${route}" is unexpectedly small (${size} bytes)`);
    continue;
  }

  const html = readFileSync(htmlPath, 'utf8');
  if (!html.includes('DS ATLAS')) {
    errors.push(`Route "${route}" HTML does not contain expected "DS ATLAS" masthead`);
  }
  if (html.includes('__next_error__') || html.includes('NEXT_HTTP_ERROR_FALLBACK')) {
    errors.push(`Route "${route}" HTML contains Next.js error boundary markers`);
  }
}

// 2. Verify 404 page exists
const notFoundPath = existsSync(join(exportDir, '404.html'))
  ? join(exportDir, '404.html')
  : join(exportDir, '404', 'index.html');
if (!existsSync(notFoundPath)) {
  errors.push('Missing exported 404.html page');
}

// 3. Verify self-hosted .woff2 typography assets exist under _next/static/media
const mediaDir = join(exportDir, '_next', 'static', 'media');
if (!existsSync(mediaDir)) {
  errors.push(`Missing static font media directory: ${mediaDir}`);
} else {
  const woff2Files = readdirSync(mediaDir).filter((file) => file.endsWith('.woff2'));
  if (woff2Files.length === 0) {
    errors.push(`Expected self-hosted .woff2 fonts in ${mediaDir}, found 0`);
  } else {
    console.log(
      `OK: Found ${woff2Files.length} self-hosted .woff2 font assets under _next/static/media/`
    );
  }
}

if (errors.length > 0) {
  console.error(`\nStatic export smoke test FAILED with ${errors.length} error(s):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `PASS: Verified all ${EXPECTED_ROUTES.length} routes + 404.html + self-hosted fonts in ${exportDir}`
);
