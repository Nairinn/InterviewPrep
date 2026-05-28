import fs from 'fs';
import path from 'path';

const seedDir = 'seed';
const outFile = 'functions/lib/seed-data.js';

const modes = ['bug_hunt', 'feature', 'debug'];
let output = '';

for (const mode of modes) {
  const jsonPath = path.join(seedDir, `${mode}.json`);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  output += `export const ${mode}_seeds = ${JSON.stringify(data)};\n`;
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, output);
console.log(`Wrote ${outFile}`);
