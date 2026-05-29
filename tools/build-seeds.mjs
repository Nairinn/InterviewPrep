// Build seed bank JSON from inline problem definitions.
// Run: node tools/build-seeds.mjs
// Produces: public/seed/{bug_hunt,feature,debug}.json
//
// Design rule for every problem:
//   - 9-12 tests
//   - Every single test must FAIL on day-0 code (unfixed bugs / unimplemented stubs)
//   - Code must run on Pyodide (Python 3.11+) with only this stdlib:
//     os, sys, io, json, datetime, collections, itertools, functools, re, math, unittest

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bugHunt1, bugHunt2 } from './seeds/bug_hunt.mjs';
import { feature1, feature2 } from './seeds/feature.mjs';
import { debug1, debug2 } from './seeds/debug.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'seed');
fs.mkdirSync(outDir, { recursive: true });

const banks = {
  bug_hunt: [bugHunt1, bugHunt2],
  feature: [feature1, feature2],
  debug: [debug1, debug2],
};

for (const [mode, problems] of Object.entries(banks)) {
  const out = path.join(outDir, `${mode}.json`);
  fs.writeFileSync(out, JSON.stringify(problems, null, 2));
  console.log(`✓ ${out} (${problems.length} problems)`);
  for (const p of problems) {
    const testCount = (p.test_file.content.match(/def test_/g) || []).length;
    const bugCount = (p.bugs || []).length;
    const stubCount = (p.stubs || []).length;
    console.log(`  • ${p.id}: ${p.domain} — tests=${testCount} bugs=${bugCount} stubs=${stubCount}`);
  }
}
