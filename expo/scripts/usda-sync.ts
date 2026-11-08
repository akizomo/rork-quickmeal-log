/**
 * usda-sync.ts — USDA FoodData Central (SR Legacy) の CSV から、us-usda-links.ts が参照する食品だけを
 * constants/reference/usda-sr-legacy.json に抜粋する。
 *
 * 使い方: bun scripts/usda-sync.ts <FoodData_Central_sr_legacy_food_csv_2018-04 を展開したフォルダ>
 * 元データ: https://fdc.nal.usda.gov/download-datasets (SR Legacy, CSV)
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { USDA_LINKS } from '@/constants/identity/us-usda-links';

const dir = process.argv[2];
if (!dir) { console.error('usage: bun scripts/usda-sync.ts <csv dir>'); process.exit(1); }

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const table = (f: string) => {
  const [head, ...rest] = parseCsv(readFileSync(join(dir, f), 'utf-8'));
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
};

const want = new Set(USDA_LINKS.map((l) => String(l.fdcId)));
const NID: Record<string, 'kcal' | 'protein' | 'fat' | 'carbs'> = { '1008': 'kcal', '1003': 'protein', '1004': 'fat', '1005': 'carbs' };
const out: Record<string, { name: string; per100g: Record<string, number>; portions: { desc: string; grams: number }[] }> = {};
for (const f of table('food.csv')) if (want.has(f.fdc_id)) out[f.fdc_id] = { name: f.description, per100g: {}, portions: [] };
for (const n of table('food_nutrient.csv')) if (out[n.fdc_id] && NID[n.nutrient_id]) out[n.fdc_id].per100g[NID[n.nutrient_id]] = Number(n.amount);
for (const p of table('food_portion.csv')) {
  if (out[p.fdc_id]) out[p.fdc_id].portions.push({ desc: `${p.amount} ${p.modifier || p.portion_description}`.trim(), grams: Number(p.gram_weight) });
}
const missing = [...want].filter((id) => !out[id]);
if (missing.length) { console.error('見つからない fdcId:', missing.join(', ')); process.exit(1); }
writeFileSync(
  new URL('../constants/reference/usda-sr-legacy.json', import.meta.url),
  JSON.stringify({ source: 'USDA FoodData Central, SR Legacy (April 2018)', url: 'https://fdc.nal.usda.gov/download-datasets', retrievedAt: '2026-11-07', foods: out }, null, 1),
);
console.log(`wrote ${Object.keys(out).length} foods`);
