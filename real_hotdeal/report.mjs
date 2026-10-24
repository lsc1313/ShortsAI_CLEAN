import fs from 'node:fs';
import { evaluateCandidate } from './evaluate.mjs';
// Usage: node real_hotdeal/report.mjs candidates.json observations.json
// Input is explicitly supplied evidence. This command makes no network requests.
const [candidateFile, observationFile] = process.argv.slice(2);
if (!candidateFile || !observationFile) { console.error('Usage: node real_hotdeal/report.mjs candidates.json observations.json'); process.exit(2); }
const candidates = JSON.parse(fs.readFileSync(candidateFile, 'utf8'));
const observations = JSON.parse(fs.readFileSync(observationFile, 'utf8'));
if (!Array.isArray(candidates) || !Array.isArray(observations)) throw new Error('Inputs must be JSON arrays');
const report = candidates.map(candidate => ({ productId: candidate?.productId ?? null, title: candidate?.title ?? null, ...evaluateCandidate(candidate, observations) }));
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), total: report.length, approved: report.filter(x => x.approved).length, results: report }, null, 2));
