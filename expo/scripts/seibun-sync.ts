/**
 * seibun-sync.ts — constants/reference/seibun-2023.json を再生成する。
 *
 * 手順 (docs/MACRO_SOURCES.md):
 *   1. 文科省の第2章 (データ) Excel を、専用の空ディレクトリにダウンロードする
 *      https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html
 *   2. bun scripts/seibun-sync.ts <ダウンロードしたxlsx>
 *
 * seibun-links.ts が指す食品だけを抜き出して同梱する (全 2,538 食品は同梱しない)。
 * 外部ファイルは python3 -I (分離モード・標準ライブラリのみ) で読む。
 */
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

import { SEIBUN_LINKS } from '@/constants/identity/seibun-links';

const xlsx = process.argv[2];
if (!xlsx) throw new Error('使い方: bun scripts/seibun-sync.ts <第2章xlsx>');

const nos = [...new Set(SEIBUN_LINKS.map((l) => l.foodNo))].sort().join(',');
const tmp = join(tmpdir(), `seibun-${process.pid}.json`);
execFileSync('python3', ['-I', resolve(__dirname, 'seibun_extract.py'), resolve(xlsx), nos, tmp], { stdio: 'inherit' });

const foods = JSON.parse(readFileSync(tmp, 'utf8'));
unlinkSync(tmp);
const sha256 = createHash('sha256').update(readFileSync(xlsx)).digest('hex');

const out = {
  _meta: {
    source: '文部科学省 日本食品標準成分表（八訂）増補2023年 第2章（データ）',
    url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html',
    note: '令和8年3月27日付正誤表を反映した版。値は可食部100gあたり。この抜粋は scripts/seibun-sync.ts で生成する (手で編集しない)',
    license: '文部科学省ウェブサイトの利用規約に従い、出典を明記して利用 (政府標準利用規約準拠)',
    fileSha256: sha256,
    retrievedAt: new Date().toISOString().slice(0, 10),
  },
  foods,
};
writeFileSync(resolve(__dirname, '../constants/reference/seibun-2023.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`written: ${Object.keys(foods).length} foods, sha256=${sha256.slice(0, 12)}…`);
