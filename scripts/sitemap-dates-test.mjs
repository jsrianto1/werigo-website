import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { contentHistory, generateDates, prepareHistory, writeHistoryCache, readHistoryCache } from './sitemap-dates.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'werigo-sitemap-'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
function write(file, text) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
}
function commit(date) {
  git('add', '.');
  execFileSync('git', ['commit', '-qm', 'Fixture change'], {
    cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
}
const first = '2026-01-01T10:00:00Z';
function output(routes) {
  write('.next/prerender-manifest.json', JSON.stringify({ routes }));
  for (const route of Object.keys(routes)) {
    write(`.next/server/app/${route === '/' ? 'index' : route.slice(1)}.html`, `<link rel="canonical" href="https://werigo.co${route}"><img src="/media/a.webp" alt="Scooter">`);
  }
}
try {
  git('init', '-q'); git('config', 'user.name', 'Sitemap Test'); git('config', 'user.email', 'sitemap@example.test');
  write('.gitignore', '.next/\n');
  write('src/app/page.tsx', 'export default function Page() { return <h1>Home</h1>; }\r\n');
  write('src/app/a/page.tsx', 'export default function Page() { return <h1>First</h1>; }\n');
  write('src/app/b/page.tsx', 'export default function Page() { return <h1>Second</h1>; }\n');
  write('public/media/a.webp', 'image fixture');
  write('next.config.ts', 'export default { output: \"standalone\" };\n');
  write('public/media/.htaccess', '# Authored media serving configuration\n');
  commit(first);
  output({ '/a': { srcRoute: '/a' }, '/b': { srcRoute: '/b' } });
  const baseline = generateDates(root);
  assert.deepEqual(baseline, { '/a': first, '/b': first });
  assert.deepEqual(generateDates(root), baseline, 'rebuild must preserve dates');
  write('README.md', 'Unrelated deployment note'); commit('2026-02-01T10:00:00Z');
  assert.deepEqual(generateDates(root), baseline, 'unrelated commit must not refresh pages');
  write('src/app/a/page.tsx', '// Comment only\nexport default function Page(){return <h1>First</h1>;}\n');
  commit('2026-03-01T10:00:00Z');
  assert.deepEqual(generateDates(root), baseline, 'comments/formatting must preserve dates');
  write('src/app/a/page.tsx', 'export default function Page() { return <h1>New offer</h1>; }\n');
  assert.throws(() => generateDates(root), /Uncommitted content changes/);
  const changed = '2026-04-01T10:00:00Z'; commit(changed);
  assert.deepEqual(generateDates(root), { '/a': changed, '/b': first }, 'only changed page advances');
  write('src/app/c/page.tsx', 'export default function Page() { return <h1>New page</h1>; }\n');
  commit('2026-05-01T10:00:00Z');
  output({ '/a': { srcRoute: '/a' }, '/b': { srcRoute: '/b' }, '/c': { srcRoute: '/c' } });
  assert.equal(generateDates(root)['/c'], '2026-05-01T10:00:00Z');
  output({ '/a': { srcRoute: '/a' }, '/c': { srcRoute: '/c' } });
  assert.equal(generateDates(root)['/b'], undefined, 'removed/unpublished page disappears');
  write('.next/server/app/c.html', '<link rel="canonical" href="https://werigo.co/c"><meta name="robots" content="noindex">');
  assert.equal(generateDates(root)['/c'], undefined, 'noindex page disappears');
  write('public/media/a.webp', 'updated image'); commit('2026-06-01T10:00:00Z');
  mkdirSync(path.join(root, '.next/standalone'), { recursive: true });
  assert.equal(generateDates(root)['/a'], '2026-06-01T10:00:00Z', 'image change advances page');
  assert.equal(readFileSync(path.join(root, '.next/sitemap-dates.json'), 'utf8'), readFileSync(path.join(root, '.next/standalone/.next/sitemap-dates.json'), 'utf8'));
  output({ '/': { srcRoute: '/' }, '/b': { srcRoute: '/b', initialHeaders: { 'x-robots-tag': 'noindex' } } });
  assert.deepEqual(generateDates(root), { '/': '2026-06-01T10:00:00Z' }, 'homepage path, CRLF normalization and header noindex');
  const shallowRoot = path.join(root, '.next/shallow-checkout');
  git('clone', '--quiet', '--depth', '1', pathToFileURL(root).href, shallowRoot);
  assert.equal(execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: shallowRoot, encoding: 'utf8' }).trim(), 'true');
  prepareHistory(shallowRoot);
  assert.equal(contentHistory(shallowRoot).modified('src/app/b/page.tsx'), first, 'hosting shallow clone recovers original content date');

  // A committed, fingerprinted snapshot works without network in a shallow clone.
  const cachedDates = writeHistoryCache(root);
  commit('2026-07-01T10:00:00Z');
  const cachedRoot = path.join(root, '.next/cached-checkout');
  git('clone', '--quiet', '--depth', '1', pathToFileURL(root).href, cachedRoot);
  mkdirSync(path.join(cachedRoot, '.next/server/app'), { recursive: true });
  writeFileSync(path.join(cachedRoot, '.next/prerender-manifest.json'), readFileSync(path.join(root, '.next/prerender-manifest.json')));
  writeFileSync(path.join(cachedRoot, '.next/server/app/index.html'), readFileSync(path.join(root, '.next/server/app/index.html')));
  prepareHistory(cachedRoot);
  assert.equal(execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: cachedRoot, encoding: 'utf8' }).trim(), 'true', 'valid snapshot must avoid network history fetch');
  assert.deepEqual(generateDates(cachedRoot), cachedDates, 'snapshot preserves original Git dates');
  const cachedSource = path.join(cachedRoot, 'src/app/page.tsx');
  const sourceBytes = readFileSync(cachedSource, 'utf8');
  writeFileSync(cachedSource, sourceBytes.replace(/\r?\n/g, '\r\n'));
  assert.deepEqual(readHistoryCache(cachedRoot), cachedDates, 'CRLF checkout remains valid');
  // Hosting mutations retain verified Git dates without a second network fetch.
  writeFileSync(path.join(cachedRoot, 'next.config.ts'), 'export default { output: "standalone", images: { unoptimized: true } };\n');
  writeFileSync(path.join(cachedRoot, 'public/media/.htaccess'), '# Hosting-generated media configuration\n');
  assert.deepEqual(readHistoryCache(cachedRoot), cachedDates, 'generated settings must verify committed bytes');
  prepareHistory(cachedRoot);
  assert.equal(execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: cachedRoot, encoding: 'utf8' }).trim(), 'true', 'hosting mutations must not trigger history fetch');
  writeFileSync(cachedSource, sourceBytes + '\n// changed source');
  assert.equal(readHistoryCache(cachedRoot), null, 'source change must invalidate cached dates');
  writeFileSync(cachedSource, sourceBytes);
  execFileSync('git', ['add', 'next.config.ts', 'public/media/.htaccess'], { cwd: cachedRoot });
  execFileSync('git', ['-c', 'user.name=Sitemap Test', '-c', 'user.email=sitemap@example.test', 'commit', '-qm', 'Authored settings change'], {
    cwd: cachedRoot, env: { ...process.env, GIT_AUTHOR_DATE: '2026-08-01T10:00:00Z', GIT_COMMITTER_DATE: '2026-08-01T10:00:00Z' },
  });
  assert.equal(readHistoryCache(cachedRoot), null, 'authored configuration changes must invalidate old snapshots');


  write('.git/shallow', git('rev-parse', 'HEAD').trim() + '\n');
  assert.throws(() => contentHistory(root), /full Git history/);
  console.log('PASS: stable rebuilds, unrelated commits, formatting, isolated content updates, new/removed/noindex pages, images, standalone packaging and shallow-history guard.');
} finally {
  // Only remove the exact temporary fixture directory created above.
  if (path.dirname(root) === tmpdir() && path.basename(root).startsWith('werigo-sitemap-')) rmSync(root, { recursive: true, force: true });
}
