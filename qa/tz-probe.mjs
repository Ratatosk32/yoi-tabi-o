// Child process for unit.mjs: runs srs.js date helpers under the TZ given in env.
const S = await import(process.argv[2]);
const fails = []; let checks = 0;
const eq = (name, a, b) => { checks++; if (a !== b) fails.push(`${name}: ${a} != ${b}`); };
// local day boundary
eq('23:59 local', S.todayStr(new Date(2026, 10, 18, 23, 59, 59)), '2026-11-18');
eq('00:00 local', S.todayStr(new Date(2026, 10, 19, 0, 0, 0)), '2026-11-19');
// walk every day of 2026-2027 with addDays(+1) and addDays(+7) from local midnight (DST transitions included)
let d = '2026-01-01';
for (let i = 0; i < 730; i++) {
  const n = S.addDays(d, 1);
  const [y, m, dd] = d.split('-').map(Number);
  const exp = new Date(Date.UTC(y, m - 1, dd + 1)).toISOString().slice(0, 10);
  eq('addDays+1 ' + d, n, exp);
  const n7 = S.addDays(d, 7); const exp7 = new Date(Date.UTC(y, m - 1, dd + 7)).toISOString().slice(0, 10);
  eq('addDays+7 ' + d, n7, exp7);
  const w = S.studyWeek('2026-01-01', d); eq('studyWeek day ' + d, w.day, i + 1);
  d = n;
}
// grade chain over DST
let st; let day = '2026-10-20';
for (let i = 0; i < 6; i++) { st = S.grade(st, 'good', day); day = st.due; }
eq('chain over DST', day, '2026-11-17');
const utc1530 = S.todayStr(new Date(Date.UTC(2026, 10, 18, 15, 30)));
console.log(JSON.stringify({ tzSeen: Intl.DateTimeFormat().resolvedOptions().timeZone, checks, fails: fails.slice(0, 10), utc1530 }));
