#!/usr/bin/env python3
"""日本食品標準成分表 (八訂) の第2章 Excel から、指定した食品番号だけを JSON に抜き出す。

標準ライブラリのみ (信頼できない外部ファイルを `python3 -I` で読めるように、追加パッケージに依存しない)。
使い方: python3 -I seibun_extract.py <xlsx> <食品番号をカンマ区切り> <出力json>
"""
import json, re, sys, zipfile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'


def col_index(ref):
    n = 0
    for ch in re.match(r'[A-Z]+', ref).group(0):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def first_sheet_rows(path):
    z = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sheet = wb.find('m:sheets', NS)[0]
    target = rels[sheet.get(REL)]
    target = target if target.startswith('xl/') else 'xl/' + target.lstrip('/')
    rows = []
    for r in ET.fromstring(z.read(target)).iter('{%s}row' % NS['m']):
        cells = {}
        for c in r.findall('m:c', NS):
            v = c.find('m:v', NS)
            if v is None:
                continue
            cells[col_index(c.get('r'))] = shared[int(v.text)] if c.get('t') == 's' else v.text
        if cells:
            rows.append([cells.get(i) for i in range(max(cells) + 1)])
    return rows


def num(v):
    """成分表の記号: ( ) は推定値、Tr は微量、- は未測定、* は算出不能。"""
    if v is None:
        return None
    s = str(v).strip().replace('(', '').replace(')', '')
    if s in ('Tr', 'tr'):
        return 0.0
    if s in ('', '-', '*'):
        return None
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def main(xlsx, nos, out):
    wanted = set(nos.split(','))
    foods = {}
    for r in first_sheet_rows(xlsx):
        # 列: 1=食品番号 3=食品名 4=廃棄率 6=kcal 9=たんぱく質 12=脂質 20=炭水化物
        if len(r) > 20 and r[1] and re.fullmatch(r'\d{5}', str(r[1])) and str(r[1]) in wanted:
            name = re.sub(r'\s+', ' ', str(r[3]).replace('　', ' ')).strip()
            name = re.sub(r'^＜[^＞]*＞ ', '', name)
            foods[str(r[1])] = {
                'name': name, 'refuse': num(r[4]), 'kcal': num(r[6]),
                'protein': num(r[9]), 'fat': num(r[12]), 'carbs': num(r[20]),
            }
    missing = sorted(wanted - set(foods))
    if missing:
        sys.exit('見つからない食品番号: ' + ','.join(missing))
    json.dump(foods, open(out, 'w'), ensure_ascii=False, indent=1, sort_keys=True)
    print(f'{len(foods)} foods -> {out}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
