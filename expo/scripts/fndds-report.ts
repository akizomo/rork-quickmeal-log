/** fndds-report.ts — US 料理の既定値と FNDDS の幅の比較。使い方: bun scripts/fndds-report.ts */
import { buildRegistry } from '@/constants/identity';
import { FNDDS_LINKS } from '@/constants/identity/us-fndds-links';
import ref from '@/constants/reference/fndds.json';

const reg = buildRegistry('en-US', 'en-US');
const byId = new Map(Object.values(reg.byBucket).flat().map((i) => [i.id, i]));
for (const l of FNDDS_LINKS) {
  const kc = l.refs.map((r) => ((ref as any).foods[String(r.fdcId)].per100g.kcal * r.grams) / 100);
  const lo = Math.min(...kc), hi = Math.max(...kc);
  const db = byId.get(l.key)!.defaultMacro.kcal;
  const ok = db >= lo * 0.8 && db <= hi * 1.35;
  console.log(`${ok ? ' ' : '✗'} ${l.key.padEnd(24)} db ${String(db).padStart(5)} | fndds ${lo.toFixed(0).padStart(4)}–${hi.toFixed(0).padEnd(4)} | allowed ${(lo * 0.8).toFixed(0)}–${(hi * 1.35).toFixed(0)}`);
}
