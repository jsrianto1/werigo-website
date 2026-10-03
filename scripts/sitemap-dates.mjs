import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { extractSitemapEntry } from '../src/lib/sitemap-content.ts';

const slash = value => value.replaceAll('\\', '/');
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];


const historyCachePath = 'scripts/sitemap-dates-cache.json';

/** A content fingerprint makes verified dates portable to hosting clones. */
export function historyFingerprint(root, inputs = []) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter(file => file && file !== historyCachePath &&
      (/^(src|public|scripts)\//.test(file) || /^(next\.config\.[cm]?[jt]s)$/.test(file))).sort();
  const hash = createHash('sha256');
  for (const file of files) {
    let bytes = readFileSync(path.join(root, file));
    if (/\.(?:[cm]?[jt]sx?|json|css|svg|md|txt|sql|ya?ml)$/.test(file)) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    const digest = createHash('sha256').update(bytes).digest();
    inputs.push({ file, hash: digest.toString('hex') });
    hash.update(file + '\0').update(digest);
  }
  return hash.digest('hex');
}

export function readHistoryCache(root) {
  const file = path.join(root, historyCachePath);
  if (!existsSync(file)) return null;
  try {
    const cache = JSON.parse(readFileSync(file, 'utf8'));
    const inputs = [];
    const fingerprint = historyFingerprint(root, inputs);
    if (cache.version !== 1 || !Object.keys(cache.dates ?? {}).length) return null;
    if (cache.fingerprint !== fingerprint) {
      const expected = new Map((cache.inputs ?? []).map(entry => [entry.file, entry.hash]));
      const changed = inputs.filter(entry => expected.get(entry.file) !== entry.hash).map(entry => entry.file);
      console.warn('Sitemap: snapshot mismatch in ' + changed.slice(0, 30).join(', '));
      return null;
    }
    if (Object.values(cache.dates).some(date => !Number.isFinite(Date.parse(date)) || Date.parse(date) > Date.now())) return null;
    return cache.dates;
  } catch { return null; }
}

/** Generate from full Git history locally, then commit the validated snapshot. */
export function writeHistoryCache(root) {
  const dates = generateDates(root, true);
  mkdirSync(path.dirname(path.join(root, historyCachePath)), { recursive: true });
  const inputs = [];
  const fingerprint = historyFingerprint(root, inputs);
  writeFileSync(path.join(root, historyCachePath), JSON.stringify({ version: 1, fingerprint, inputs, dates }, null, 2) + '\n');
  return dates;
}

function saveDates(root, result) {
  const destination = path.join(root, '.next/sitemap-dates.json');
  writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
  const standalone = path.join(root, '.next/standalone');
  if (existsSync(standalone)) {
    mkdirSync(path.join(standalone, '.next'), { recursive: true });
    copyFileSync(destination, path.join(standalone, '.next/sitemap-dates.json'));
  }
  console.log(`Sitemap: verified Git content dates for ${Object.keys(result).length} published pages.`);
  return result;
}

/** Hosting clones may be shallow; fetch history only, without changing the checkout. */
export function prepareHistory(root) {
  if (readHistoryCache(root)) {
    console.log('Sitemap: using verified content-history snapshot.');
    return;
  }
  const options = { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } };
  if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], options).trim() === 'true') {
    console.log('Sitemap: fetching complete source history for accurate modification dates.');
    try { execFileSync('git', ['fetch', '--unshallow', '--quiet', 'origin'], { ...options, timeout: 300000 }); }
    catch { throw new Error('Unable to fetch sitemap content history. Provide a full-history checkout or Git read access before building.'); }
  }
}

/** Git commit dates describe authored changes, never build/file-copy times. */
export function contentHistory(root) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trimEnd();
  if (git(['rev-parse', '--is-shallow-repository']) !== 'false') {
    throw new Error('Sitemap dates require full Git history. Fetch with git fetch --unshallow before building.');
  }
  const tracked = new Set(git(['ls-files']).split('\n'));
  const dirty = new Set(git(['diff', '--name-only', 'HEAD']).split('\n'));
  const cache = new Map();
  // Read media history once instead of spawning Git separately for 900+ images.
  const mediaDates = new Map();
  let mediaDate;
  for (const line of git(['-c', 'core.quotepath=false', 'log', '--format=DATE:%cI', '--name-only', '--', 'public']).split('\n')) {
    if (line.startsWith('DATE:')) mediaDate = line.slice(5);
    else if (line && !mediaDates.has(line)) mediaDates.set(line, mediaDate);
  }
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  function semantic(file, source) {
    source = source.replace(/\r\n/g, "\n").trimEnd();
    if (file.endsWith('.json')) return JSON.stringify(JSON.parse(source));
    if (!/\.[cm]?[jt]sx?$/.test(file)) return source;
    return printer.printFile(ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true));
  }
  function modified(file) {
    file = slash(file);
    if (cache.has(file)) return cache.get(file);
    if (!tracked.has(file)) throw new Error(`Commit content before publishing sitemap dates: ${file}`);
    const isSource = /\.(?:[cm]?[jt]sx?|json)$/.test(file);
    const commits = isSource ? git(['log', '--format=%H %cI', '--', file]).split('\n').filter(Boolean) : [];
    let date = isSource ? commits[0]?.slice(41) : mediaDates.get(file);
    if (!date) throw new Error(`No content history for ${file}`);
    // Skip comment/format-only commits for source files, retaining authored text.
    if (isSource) {
      const current = semantic(file, git(['show', `HEAD:${file}`]));
      if (semantic(file, readFileSync(path.join(root, file), 'utf8')) !== current) {
        throw new Error(`Uncommitted content changes in ${file}; commit them before the release build.`);
      }
      for (let i = 1; i < commits.length; i++) {
        let previous;
        try { previous = semantic(file, git(['show', `${commits[i].slice(0, 40)}:${file}`])); }
        catch { break; } // A rename/deletion is itself a recorded change.
        if (previous !== current) break;
        date = commits[i].slice(41);
      }
    }
    if (!isSource && dirty.has(file)) throw new Error(`Uncommitted media changes in ${file}; commit before publishing.`);
    if (!Number.isFinite(Date.parse(date)) || Date.parse(date) > Date.now()) throw new Error(`Invalid Git date for ${file}: ${date}`);
    cache.set(file, date);
    return date;
  }
  function dependencies(entry, found = new Set()) {
    entry = slash(entry);
    if (found.has(entry) || /\/analytics\//.test(entry)) return found;
    found.add(entry);
    if (entry.endsWith('.json')) return found;
    const source = ts.createSourceFile(entry, readFileSync(path.join(root, entry), 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      const spec = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier;
      if (spec && ts.isStringLiteral(spec) && !node.importClause?.isTypeOnly && !node.isTypeOnly) {
        const name = spec.text;
        const base = name.startsWith('@/') ? `src/${name.slice(2)}` : name.startsWith('.') ? slash(path.join(path.dirname(entry), name)) : null;
        if (base) {
          const target = [base, ...extensions.map(ext => base + ext), ...extensions.map(ext => `${base}/index${ext}`)]
            .find(candidate => extensions.some(ext => candidate.endsWith(ext)) && existsSync(path.join(root, candidate)));
          if (target) dependencies(target, found);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    return found;
  }
  return { modified, dependencies, tracked };
}

export function generateDates(root, forceHistory = false) {
  const cached = forceHistory ? null : readHistoryCache(root);
  if (cached) return saveDates(root, cached);
  const history = contentHistory(root);
  const manifest = JSON.parse(readFileSync(path.join(root, '.next/prerender-manifest.json'), 'utf8'));
  const origin = 'https://werigo.co';
  const result = {};
  for (const [route, info] of Object.entries(manifest.routes)) {
    if (Object.entries(info.initialHeaders ?? {}).some(([key, value]) => key.toLowerCase() === 'location' || (key.toLowerCase() === 'x-robots-tag' && /\b(noindex|none)\b/i.test(value)))) continue;
    const htmlPath = path.join(root, '.next/server/app', route === '/' ? 'index.html' : `${route.slice(1)}.html`);
    if (!existsSync(htmlPath)) continue;
    const html = readFileSync(htmlPath, 'utf8');
    const entry = extractSitemapEntry(route, html, origin, info.initialStatus ?? 200);
    if (!entry) continue;
    const sourceRoute = info.srcRoute ?? route;
    const sourceDir = slash(path.join('src/app', sourceRoute)).replace(/\/$/, '');
    const page = extensions.map(ext => `${sourceDir}/page${ext}`).find(file => existsSync(path.join(root, file)));
    if (!page) throw new Error(`No source page for ${route}`);
    const inputs = history.dependencies(page);
    let dir = sourceDir;
    while (dir.startsWith('src/app')) {
      for (const ext of extensions) {
        const layout = `${dir}/layout${ext}`;
        if (existsSync(path.join(root, layout))) history.dependencies(layout, inputs);
      }
      dir = slash(path.dirname(dir));
    }
    // Only images actually used on this page; binary changes keep their Git dates.
    for (const image of entry.images) {
      const file = `public${decodeURIComponent(new URL(image).pathname)}`;
      if (existsSync(path.join(root, file))) inputs.add(file);
    }
    const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    for (const match of document.matchAll(/(?:src|poster)=["'](\/media\/[^"'?]+)(?:[^"']*)["']/gi)) {
      const file = `public${decodeURIComponent(match[1])}`;
      if (existsSync(path.join(root, file))) inputs.add(file);
    }
    const dates = [...inputs].map(file => history.modified(file));
    if (entry.lastModified) dates.push(entry.lastModified);
    result[route] = dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  }
  if (!Object.keys(result).length) throw new Error('No published pages found for sitemap dates.');
  return saveDates(root, result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write-cache')) writeHistoryCache(process.cwd());
  else { prepareHistory(process.cwd()); generateDates(process.cwd()); }
}
