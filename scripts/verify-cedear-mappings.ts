/**
 * Verifies that every IOL CEDEAR maps to the correct FMP ticker.
 *
 *  1. Fetches the full IOL CEDEAR panel.
 *  2. Classifies each symbol as base vs. currency-variant (using the C/D-pair
 *     heuristic that the rest of the codebase already uses).
 *  3. For each base, calls FMP twice: once with `toFmpTicker(base)` (current
 *     mapping) and once with `base` itself (raw).
 *  4. Compares the IOL `descripcion` with FMP's `companyName` and flags any
 *     mismatch where the raw lookup would have produced the right answer.
 *
 *  Usage:
 *    npx tsx scripts/verify-cedear-mappings.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ── Load .env.local manually (no dotenv dep) ────────────────────────────────
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

// Imports that depend on env vars must come AFTER the env-loading block.
import { iolClient } from '../src/lib/iol/client';
import { toFmpTicker } from '../src/lib/cedear-map';

const PROFILE_CACHE_PATH = join(process.cwd(), '.fmp-profile-cache.json');
const REPORT_PATH = join(process.cwd(), 'cedear-verification-report.json');
const PATCH_PATH = join(process.cwd(), 'cedear-verification-patch.txt');

interface FmpProfileLite {
  companyName: string | null;
  found: boolean;
  fetchedAt: string;
}

function loadProfileCache(): Record<string, FmpProfileLite> {
  if (!existsSync(PROFILE_CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(PROFILE_CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveProfileCache(cache: Record<string, FmpProfileLite>): void {
  writeFileSync(PROFILE_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Fetch one FMP profile. Distinguishes:
 *  - hard miss (HTTP 200 + empty array)  → cache as found:false (legitimate "not in FMP")
 *  - rate-limit / transient error        → throw, do NOT cache
 */
async function fetchFmpProfileOnce(ticker: string, apiKey: string): Promise<FmpProfileLite | 'transient'> {
  const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return 'transient';
  }
  if (res.status === 429 || res.status >= 500) return 'transient';
  if (!res.ok) {
    // 4xx other than 429 → likely auth or bad symbol; treat as not-found
    return { companyName: null, found: false, fetchedAt: new Date().toISOString() };
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return 'transient';
  }
  // FMP sometimes returns { "Error Message": "Limit Reach..." } as JSON object
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const msg = (obj['Error Message'] || obj['error'] || obj['message']) as string | undefined;
    if (typeof msg === 'string' && /limit|rate|exceed|premium/i.test(msg)) return 'transient';
    return { companyName: null, found: false, fetchedAt: new Date().toISOString() };
  }
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>;
    if (typeof first.companyName === 'string' && first.companyName.trim()) {
      return { companyName: first.companyName, found: true, fetchedAt: new Date().toISOString() };
    }
  }
  // Empty array → genuine not-found
  return { companyName: null, found: false, fetchedAt: new Date().toISOString() };
}

async function fetchFmpProfile(
  ticker: string,
  cache: Record<string, FmpProfileLite>,
  apiKey: string,
): Promise<FmpProfileLite> {
  if (ticker in cache) return cache[ticker];
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = await fetchFmpProfileOnce(ticker, apiKey);
    if (r !== 'transient') {
      cache[ticker] = r;
      return r;
    }
    const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
    if (attempt === 1) console.warn(`[FMP] transient on "${ticker}" — backing off`);
    await sleep(backoffMs);
  }
  console.warn(`[FMP] giving up on "${ticker}" after ${maxAttempts} attempts (NOT cached)`);
  // Return a sentinel that we WON'T cache, so re-runs retry
  return { companyName: null, found: false, fetchedAt: new Date().toISOString() };
}

// ── Name normalization ──────────────────────────────────────────────────────
const NAME_NOISE_RE = /\b(cedear|inc|incorporated|corp|corporation|co|company|s\.?a\.?b?\.?|ltd|limited|holdings?|group|grupo|plc|n\.?v\.?|the|class|cl|a|b|c)\b\.?/gi;
const PUNCT_RE = /[.,&'()\-/]/g;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(NAME_NOISE_RE, ' ')
    .replace(PUNCT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(iolDescription: string, fmpName: string): boolean {
  const iolNorm = normalizeName(iolDescription);
  const fmpNorm = normalizeName(fmpName);
  if (!iolNorm || !fmpNorm) return false;
  if (iolNorm === fmpNorm) return true;

  const iolWords = iolNorm.split(' ').filter(Boolean);
  const fmpWords = fmpNorm.split(' ').filter(Boolean);
  if (iolWords.length === 0 || fmpWords.length === 0) return false;

  // Strong overlap on first significant word
  if (iolWords[0] === fmpWords[0]) {
    if (iolWords.length === 1 || fmpWords.length === 1) return true;
    if (iolWords[1] === fmpWords[1]) return true;
  }
  // Containment fallback (e.g., "vale" vs "vale s.a.")
  if (iolNorm.includes(fmpNorm) || fmpNorm.includes(iolNorm)) return true;

  // Significant Jaccard on bigrams (cheap shape match)
  const jaccard = bigramJaccard(iolNorm, fmpNorm);
  return jaccard >= 0.5;
}

function bigramJaccard(a: string, b: string): number {
  const bigrams = (s: string): Set<string> => {
    const out = new Set<string>();
    const padded = ` ${s} `;
    for (let i = 0; i < padded.length - 1; i++) out.add(padded.slice(i, i + 2));
    return out;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ── Diagnosis ───────────────────────────────────────────────────────────────
type Status =
  | 'match'
  | 'mismatch_with_fix'
  | 'mismatch_no_fmp'
  | 'mapped_null_correct'
  | 'unknown';

interface Diagnosis {
  iolBase: string;
  iolDescription: string;
  currentFmpTicker: string | null;
  currentFmpName: string | null;
  rawFmpName: string | null;
  status: Status;
  suggestion: string | null;
}

async function main(): Promise<void> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.error('Missing FMP_API_KEY in env');
    process.exit(1);
  }
  if (!process.env.IOL_USERNAME || !process.env.IOL_PASSWORD) {
    console.error('Missing IOL_USERNAME/IOL_PASSWORD in env');
    process.exit(1);
  }

  console.log('[1/4] Fetching IOL CEDEAR panel…');
  const panel = await iolClient.getPanelQuotes('cedears');
  const titulos = panel.titulos ?? [];
  console.log(`      ${titulos.length} entries in panel`);

  const allSymbols = new Set(titulos.map(t => t.simbolo));

  console.log('[2/4] Classifying symbols (base vs. currency variant)…');
  // For each symbol, derive its "true" base using the C/D-pair heuristic.
  const baseToDescription = new Map<string, string>();
  const baseToVariants = new Map<string, string[]>();

  for (const t of titulos) {
    const sym = t.simbolo;
    let base = sym;
    if (sym.length > 1) {
      const last = sym.slice(-1);
      const prefix = sym.slice(0, -1);
      if (last === 'C' && allSymbols.has(`${prefix}D`)) base = prefix;
      else if (last === 'D' && allSymbols.has(`${prefix}C`)) base = prefix;
    }
    if (!baseToDescription.has(base)) {
      baseToDescription.set(base, t.descripcion);
    }
    const variants = baseToVariants.get(base) ?? [];
    variants.push(sym);
    baseToVariants.set(base, variants);
  }

  const bases = Array.from(baseToDescription.keys()).sort();
  console.log(`      ${bases.length} unique base CEDEARs`);

  const naturallyCD = bases.filter(b => /[CD]$/.test(b) && b.length > 1);
  console.log(`      ${naturallyCD.length} bases naturally ending in C/D: ${naturallyCD.join(', ') || '(none)'}`);

  // ── FMP lookups ────────────────────────────────────────────────────────────
  console.log('[3/4] Fetching FMP profiles (with disk cache)…');
  const cache = loadProfileCache();
  const initialCacheSize = Object.keys(cache).length;

  const fmpTickersToQuery = new Set<string>();
  for (const base of bases) {
    const mapped = toFmpTicker(base);
    if (mapped) fmpTickersToQuery.add(mapped);
    fmpTickersToQuery.add(base);
  }
  const tickersToFetch = Array.from(fmpTickersToQuery).filter(t => !(t in cache));
  console.log(`      ${tickersToFetch.length} new FMP profiles to fetch (${initialCacheSize} cached)`);

  const concurrency = 4;
  const interBatchDelayMs = 250;
  let done = 0;
  for (let i = 0; i < tickersToFetch.length; i += concurrency) {
    const batch = tickersToFetch.slice(i, i + concurrency);
    await Promise.all(batch.map(t => fetchFmpProfile(t, cache, apiKey)));
    done += batch.length;
    if (done % 40 === 0 || done === tickersToFetch.length) {
      console.log(`      fetched ${done}/${tickersToFetch.length}`);
      saveProfileCache(cache);
    }
    if (i + concurrency < tickersToFetch.length) await sleep(interBatchDelayMs);
  }
  saveProfileCache(cache);

  // ── Diagnose ───────────────────────────────────────────────────────────────
  console.log('[4/4] Comparing names…');
  const diagnoses: Diagnosis[] = [];
  for (const base of bases) {
    const iolDescription = baseToDescription.get(base)!;
    const mappedTicker = toFmpTicker(base);
    const currentName = mappedTicker ? cache[mappedTicker]?.companyName ?? null : null;
    const rawName = cache[base]?.companyName ?? null;

    const matchesCurrent = currentName ? namesMatch(iolDescription, currentName) : false;
    const matchesRaw = rawName ? namesMatch(iolDescription, rawName) : false;

    let status: Status;
    let suggestion: string | null = null;

    if (mappedTicker === null) {
      status = 'mapped_null_correct';
    } else if (matchesCurrent) {
      status = 'match';
    } else if (matchesRaw && rawName) {
      status = 'mismatch_with_fix';
      suggestion = `'${base}': '${base}',  // ${rawName}`;
    } else if (!currentName && !rawName) {
      status = 'mismatch_no_fmp';
      suggestion = `'${base}': null,  // ${iolDescription} — no FMP profile found`;
    } else {
      status = 'unknown';
      const cur = currentName ?? '(no profile)';
      const raw = rawName ?? '(no profile)';
      suggestion = `// MANUAL '${base}' — IOL: "${iolDescription}" | toFmpTicker→"${mappedTicker}" → "${cur}" | raw "${base}" → "${raw}"`;
    }

    diagnoses.push({
      iolBase: base,
      iolDescription,
      currentFmpTicker: mappedTicker,
      currentFmpName: currentName,
      rawFmpName: rawName,
      status,
      suggestion,
    });
  }

  // ── Print report ───────────────────────────────────────────────────────────
  const matches = diagnoses.filter(d => d.status === 'match');
  const fixes = diagnoses.filter(d => d.status === 'mismatch_with_fix');
  const noFmp = diagnoses.filter(d => d.status === 'mismatch_no_fmp');
  const mappedNull = diagnoses.filter(d => d.status === 'mapped_null_correct');
  const unknown = diagnoses.filter(d => d.status === 'unknown');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  CEDEAR Mapping Verification Report');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  Total bases:            ${diagnoses.length}`);
  console.log(`  ✓ Correct:              ${matches.length}`);
  console.log(`  ✗ Need whitelist fix:   ${fixes.length}`);
  console.log(`  • Already mapped null:  ${mappedNull.length}`);
  console.log(`  ⚠ No FMP equivalent:    ${noFmp.length}`);
  console.log(`  ? Unknown / manual:     ${unknown.length}`);
  console.log('');

  if (fixes.length > 0) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  ✗ MISMATCHES — current map resolves wrong; raw symbol works');
    console.log('───────────────────────────────────────────────────────────────');
    for (const d of fixes) {
      console.log(`\n  ${d.iolBase}:`);
      console.log(`    IOL desc:     "${d.iolDescription}"`);
      console.log(`    Current map:  toFmpTicker("${d.iolBase}") = "${d.currentFmpTicker}"`);
      console.log(`    Current FMP:  "${d.currentFmpName}"  ❌`);
      console.log(`    Raw FMP:      "${d.rawFmpName}"  ✅`);
      console.log(`    Suggested:    ${d.suggestion}`);
    }
    console.log('');
  }

  if (unknown.length > 0) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  ? UNKNOWN — neither lookup matches IOL desc; manual review');
    console.log('───────────────────────────────────────────────────────────────');
    for (const d of unknown) {
      console.log(`\n  ${d.iolBase}:`);
      console.log(`    IOL desc:     "${d.iolDescription}"`);
      console.log(`    Current map:  "${d.currentFmpTicker}" → "${d.currentFmpName ?? '(none)'}"`);
      console.log(`    Raw lookup:   "${d.iolBase}" → "${d.rawFmpName ?? '(none)'}"`);
    }
    console.log('');
  }

  if (noFmp.length > 0) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  ⚠ NO FMP EQUIVALENT — likely no US-listed stock for this base');
    console.log('───────────────────────────────────────────────────────────────');
    for (const d of noFmp) {
      console.log(`  ${d.iolBase.padEnd(8)} "${d.iolDescription}"`);
    }
    console.log('');
  }

  // ── Save full report and patch suggestions ────────────────────────────────
  writeFileSync(REPORT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), diagnoses }, null, 2), 'utf-8');
  console.log(`Full report:        ${REPORT_PATH}`);

  const patchLines: string[] = [
    '// Suggested entries to add to IOL_TO_FMP in src/lib/cedear-map.ts',
    '// Generated: ' + new Date().toISOString(),
    '',
    '// ── FIXES (raw symbol matches IOL description) ────────────────────────',
  ];
  for (const d of fixes) patchLines.push(`  ${d.suggestion}`);
  if (unknown.length > 0) {
    patchLines.push('', '// ── MANUAL REVIEW (neither lookup matches) ─────────────────────────────');
    for (const d of unknown) patchLines.push(`  ${d.suggestion}`);
  }
  if (noFmp.length > 0) {
    patchLines.push('', '// ── NO FMP EQUIVALENT (consider mapping to null) ──────────────────────');
    for (const d of noFmp) patchLines.push(`  ${d.suggestion}`);
  }
  writeFileSync(PATCH_PATH, patchLines.join('\n') + '\n', 'utf-8');
  console.log(`Patch suggestions:  ${PATCH_PATH}\n`);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
