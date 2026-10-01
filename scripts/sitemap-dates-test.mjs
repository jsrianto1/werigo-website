import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { contentHistory, generateDates, prepareHistory } from './sitemap-dates.mjs';

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
  write('.git/shallow', git('rev-parse', 'HEAD').trim() + '\n');
  assert.throws(() => contentHistory(root), /full Git history/);
  console.log('PASS: stable rebuilds, unrelated commits, formatting, isolated content updates, new/removed/noindex pages, images, standalone packaging and shallow-history guard.');
} finally {
  // Only remove the exact temporary fixture directory created above.
  if (path.dirname(root) === tmpdir() && path.basename(root).startsWith('werigo-sitemap-')) rmSync(root, { recursive: true, force: true });
}
