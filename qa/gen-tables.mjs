// Build markdown pass/fail tables (with actual outputs) from qa/out/*.json → qa/out/tables.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const rd = (f) => JSON.parse(fs.readFileSync(path.join(here, 'out', f), 'utf8'));
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 260);
let md = '';
const unit = rd('unit.json');
md += `### Unit (black-box) — ${unit.filter((r) => r.ok).length}/${unit.length} PASS\n\n| # | Модуль | Проверка | Итог | Фактический вывод |\n|---|---|---|---|---|\n`;
unit.forEach((r, i) => { md += `| ${i + 1} | ${r.area} | ${esc(r.name)} | ${r.ok ? 'PASS' : '**FAIL**'} | ${esc(r.actual)} |\n`; });
const e2e = rd('e2e.json');
md += `\n### E2E (${e2e.chrome}, ${e2e.at}) — ${e2e.results.filter((r) => r.ok).length}/${e2e.results.length} PASS\n\n| # | Профиль | Проверка | Итог | Фактический вывод |\n|---|---|---|---|---|\n`;
e2e.results.forEach((r, i) => { md += `| ${i + 1} | ${r.profile} | ${esc(r.name)} | ${r.ok ? 'PASS' : '**FAIL**'} | ${esc(r.actual)} |\n`; });
const nc = rd('numbers-compare.json');
md += `\n### Числа: контрольный набор PLAN.md (yenReading)\n\n| n | app kana | app romaji | oracle kana | oracle romaji | Итог |\n|---|---|---|---|---|---|\n`;
for (const c of nc.control) md += `| ${c.n} | ${c.app} | ${c.appRomaji} | ${c.oracle} | ${c.oracleRomaji} | ${c.ok ? 'PASS' : '**FAIL**'} |\n`;
fs.writeFileSync(path.join(here, 'out', 'tables.md'), md);
console.log('tables.md written', md.length);
