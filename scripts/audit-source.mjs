import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['node_modules', '.git', 'dist', '.vercel', 'build', 'Pods', '.gradle']);
const rules = {
  embedded_secret: /sk-(?:or-v1-|proj-)?[a-zA-Z0-9_-]{20,}|sb_secret_[a-zA-Z0-9_-]{20,}|[a-f0-9]{8}-[a-f0-9-]{27}:[a-f0-9]{28,}|OR_KEY_B64\s*=\s*['"][A-Za-z0-9+/]{20,}/,
  service_role_key: {test(line){return [...line.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)].some(m=>{try{return JSON.parse(Buffer.from(m[0].split('.')[1],'base64url').toString()).role==='service_role';}catch{return false;}});}},
  frontend_secret: /VITE_(?:OPENAI|OPENROUTER|FAL|STRIPE_SECRET|SUPABASE_SERVICE)/,
  fabricated_result: /returning mock|Mock for |compatibility[_S]core:\s*\d|compatibility_score:\s*\d|has_person:\s*true.*quality_ok:\s*true/,
  permissive_policy: /(?:USING|WITH CHECK)\s*\(true\)|DISABLE ROW LEVEL SECURITY/i,
  runtime_sql: /rpc\(['"]exec_sql|CREATE POLICY|ALTER TABLE/,
  demo_ui: /\b(?:mockData|demoData|fakeData|simulatePayment|MOCK_\w+|DEMO_\w+)\b|Math\.random\(\)/,
};
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (skip.has(entry.name) || entry.name.startsWith('.env')) return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : /\.(?:[cm]?[jt]sx?|sql)$/.test(entry.name) ? [file] : [];
  });
}
const findings = [];
const files = walk(root).filter(file => !file.includes(`${path.sep}scripts${path.sep}`));
for (const file of files) {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
    for (const [rule, pattern] of Object.entries(rules)) {
      if (pattern.test(line)) findings.push({ rule, file: path.relative(root, file).replaceAll('\\', '/'), line: index + 1 });
    }
  });
}
const summary = Object.fromEntries(Object.keys(rules).map(rule => [rule, findings.filter(f => f.rule === rule).length]));
const report = { scannedAt: new Date().toISOString(), files: files.length, summary, findings };
fs.mkdirSync(path.join(root, 'docs', 'audit'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'audit', 'source-findings.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ files: report.files, summary, critical: findings.filter(f => ['embedded_secret', 'frontend_secret','service_role_key'].includes(f.rule)) }, null, 2));
