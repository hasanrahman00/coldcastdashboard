// harden-ext.mjs — make the STAGED extension opaque before it is zipped.
//
// Called by pack-extension.ps1 with the stage dir as argv[2], AFTER files are
// copied in and BEFORE the zip is written. Two passes, both fail-safe:
//
//   1. JS: strip comments + whitespace from every .js with esbuild
//      (minifyWhitespace ONLY — identifiers, imports/exports, syntax and the
//      runtime string literals are all preserved, so behavior is byte-for-byte
//      identical; only the explanatory blueprints in the comments are removed).
//   2. manifest.json: drop every `_comment*` key and neutralize name/description
//      so the manifest no longer narrates what the extension does.
//
// If esbuild can't be loaded the JS pass is skipped (manifest still scrubbed) and
// the pack continues — this must NEVER break the build.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const stage = process.argv[2];
if (!stage) { console.error('  harden: no stage dir given'); process.exit(2); }

async function walk(dir, out = []) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

let esbuild = null;
try { esbuild = await import('esbuild'); } catch { /* optional — never fatal */ }

const files = await walk(stage);
let minified = 0, skipped = 0;

if (esbuild) {
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    try {
      const code = await readFile(f, 'utf8');
      const out = await esbuild.transform(code, {
        minifyWhitespace: true,      // remove comments + whitespace
        minifyIdentifiers: false,    // keep names → cross-file imports still resolve
        minifySyntax: false,         // no syntax transforms → zero behavior risk
        legalComments: 'none',
        loader: 'js',
      });
      await writeFile(f, out.code, 'utf8');
      minified++;
    } catch (e) {
      // esbuild couldn't parse it → leave the original untouched (safe), just note it.
      skipped++;
      console.warn('  harden: left as-is (parse skip):', f, String(e && e.message || e));
    }
  }
} else {
  console.warn('  harden: esbuild not found — JS left un-minified (manifest still scrubbed)');
}

// Scrub the manifest: strip _comment* keys anywhere, neutralize name + description.
try {
  const mp = join(stage, 'manifest.json');
  const m = JSON.parse(await readFile(mp, 'utf8'));
  const strip = (o) => {
    if (Array.isArray(o)) { o.forEach(strip); return; }
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        if (/^_comment/i.test(k)) delete o[k];
        else strip(o[k]);
      }
    }
  };
  strip(m);
  m.name = 'Coldcast';
  m.description = 'Coldcast companion - connects your browser to your Coldcast dashboard.';
  await writeFile(mp, JSON.stringify(m), 'utf8');   // compact, comment-free JSON
  console.log('  harden: manifest scrubbed (name/description neutralized, _comment removed)');
} catch (e) {
  console.warn('  harden: manifest scrub failed:', String(e && e.message || e));
}

console.log(`  harden: minified ${minified} js file(s), skipped ${skipped}`);
