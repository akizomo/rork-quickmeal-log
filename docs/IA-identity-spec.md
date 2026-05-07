# 食事入力IA — Identity辞書 仕様 v1.2

> 関連: [PRD.md](./PRD.md) / [IA-catalog.xlsx](./IA-catalog.xlsx)
> ステータス: 確定版
> 最終更新: 2026-05-01
>
> **v1.2 変更点 (2026-05-01)**
> - 評価軸を **modal-set内のPFC収束** に再定義 (§1.4)。「bucket全体PFC収束」前提を改訂し、bucket内全Identity収束は要件としない
> - 汁物4 Identity (`miso_soup` `tonjiru` `soup_western` `soup_creamy`) を **veggies → misc_dish** へ移送 (「スープ=料理」観点)
> - 食材バケット6 ラベル: 「野菜・汁物」→ **「野菜」**
> - 一皿料理バケット9 ラベル: 「定食・単品」→ **「定食・単品・汁」**
> - default Identity 並び替え:
>   - fatty_protein: `beef_pork` → **`chicken_thigh`** (modal-set F median)
>   - fruit: `apple_pear` → **`banana`** (NHNS摂取量第1位 + median)
> - snack_drink bucket に **`quickTapDisabled: true`** 追加 (modal特定不能のため長押し誘導)
> - **modal-set 1食量の整合化**:
>   - 脂P modal-set: `ham` `bacon_sausage` 除外 (主菜1食量ではなく副菜・トッピング扱い)
>   - 低脂P modal-set: `canned_lean_fish` 除外 (1缶=サブ食材スケール、主菜1食量ではない)
>   - `white_fish` `seafood_lean` の default amount を **80g→100g 化** (chicken_lean/red_meat と1食量を揃える)
>   - `red_meat` に Attribute 部位分岐追加 (もも・ヒレ default / 肩ロース赤身)。default 135→**130/22/4/0** (牛豚もも・ヒレ中央値)
>   - 結果: 脂P modal-set kcal±7%/F幅4.5g、低脂P modal-set kcal±37%/F幅3.3g (density由来の幅)
>
> **v1.1 変更点 (2026-04-26)**
> - 食材タブ バケット2/4 のラベル統一: 「肉魚(低脂肪)」/「脂あり肉魚」
> - 一皿料理タブ バケット9 のラベル変更: **「定食・単品」** (旧「おかず・単品」改名)
> - misc_dish に **teishoku / bento** Identity を追加 (10→12 chip)
> - Add-on設計を「クロスバケット・アドオン (Identity流用)」に刷新
> - §6 量Grammar セクション新設 (2パターン: 個数=chipなし / g・ml・factor=chipあり)

---

## 1. 設計思想

### 1.1 5つの根幹

| # | 思想 | 概要 |
|---|---|---|
| ① | 9ボタン×2タブ構成 | 短押し=modal Identity代表値で即記録、長押し=long-tail Identity含む詳細調整 |
| ② | modal-set軸 (食材タブ) | bucket内 modal-set (日本人として日常的に食べるIdentity) のkcal/PFCが類似。long-tail Identityは長押し前提なので bucket全体収束は要件としない |
| ③ | ジャンル・スタイル軸 (一皿料理タブ) | 組合せでPFCが崩れる料理は、ジャンル + スタイル単位で代表値を担保 |
| ④ | 情報過多回避 | 水・お茶・ブラックコーヒー・塩・醤油等の無カロリーは記録対象外 |
| ⑤ | 専門用語排除 | 「低脂P」ではなく「鶏むね魚」のような直感ラベル (5〜6文字以内) |

### 1.2 入力階層 (Identity → Attribute → Style → Add-on)

| 階層 | 役割 | 例 |
|---|---|---|
| **Identity** | 素材の正体 (UI subcategory chip と1対1) | 鶏むね、米、ジャガイモ |
| **Attribute** | 素材の性質を決定づけ、PFCの基礎単価を変える | 皮なし/皮あり、白米/玄米、無糖/加糖 |
| **Style** | 調理法。PFCを動的加算 or 強制バケット移動 | 生 / あっさり / 油あり / 揚げ |
| **Add-on** | 1単位でPFC 3〜5g以上動くトッピング | 卵、チーズ、マヨ |

### 1.3 多義性と外れ値の処理

- **PFC崩壊遮断**: Style/Attribute選択でPFCが大きく崩れる場合、内部的に別バケット (主に misc_dish) に強制移動。例: ジャガイモ + 揚げ → misc_dish/fries
- **マルチエントランス**: primary Home以外のバケットからも検索ヒット可。chipには出さない。例: プロテインバーは脂P primary だが、おやつ甘飲タブで検索すればヒット

### 1.4 統合判定ルール (modal-set基準)

> **bucket内 modal-set のkcal差±20%以内 AND F差±3g以内 (1サービング比較) を維持する**
>
> modal-set = 日本人として日常的に食べるIdentityの集合 (NHNS摂取量シェア等の客観データで判定)

これにより、modal Identityを意図して短押ししたユーザーに対する1タップ代表値が栄養学的事実と±20%以内に収まる。

**なぜbucket全体ではなくmodal-set内基準なのか**:
- short-tap時のdefault Identityはbucket modal (ex: 主食=ごはん)
- non-modalユーザー (オートミール等) は最初から「これは特殊」と自覚し長押しで明示選択
- bucket内に long-tail Identityがあること自体は長押し時のリーチ性メリット
- 短押し精度の指標は「modal-set内収束 × default Identityの品質」であり、bucket内全Identity分散は短押し精度の指標として誤認

**default Identity の選定基準**:
- modal-set内の **median PFC** に近いIdentityを default 配置
- 摂取量シェア最大 (modal-frequency) も同等の重み
- bucket先頭Identity = default という暗黙ルールに依存しているため、配列順を意図的に管理

**modal-set内 PFC収束を満たさないbucket** (modal-set自体がPFC profile多様):
- snack_drink (chocolate/cookie/ice/snack/sweet_bread が拮抗) → `quickTapDisabled: true` で長押し誘導
- misc_dish (定食/弁当/汁/単品が混在) → 既に `quickTapDisabled: true`
- chinese_noodles, sushi, pizza → 既に `quickTapDisabled: true`

---

## 2. Identity辞書

### 2.1 食材タブ (合計 66 Identity)

#### バケット1 「ごはんパン麺」 (主食) — 10 Identity

| ID | 表示名 | Attribute | Style (special) | 代表PFC (kcal/P/F/C) | Migration |
|---|---|---|---|---|---|
| `rice` | ごはん | 白米/玄米/雑穀 | 丼化, カレーかけ, 鍋焼化, 雑炊化 | 234/3.8/0.5/56 (150g) | 丼化→rice_dish, カレー→curry, 鍋焼→misc_dish/nabe_light |
| `onigiri` | おにぎり | 塩・梅/鮭/ツナマヨ/おかか | – | 170-235/3-5/0.5-8.5/32-38 (1個) | – |
| `okayu` | おかゆ・雑炊 | – | – | 140-220/2.4-4/0.3-2/33-44 (1杯) | – |
| `bread` | パン (普通) | 食パン/全粒/ライ麦/ベーグル/ナン | サンド化 | 158/5.3/2.5/28 (60g食パン) | サンド化→sandwich |
| `bread_rich` | パン (リッチ) | クロワッサン/デニッシュ | – | 200/3.8/11/21 (45g) | – |
| `oatmeal` | オートミール | – | – | 105/4/2/20 (30g) | – |
| `cereal` | シリアル | プレーン/グラノーラ/加糖 | – | 110-225/2.5-4.5/0.5-8/25-35 (30-50g) | – |
| `mochi` | 餅 | – | – | 117/2/0.3/25 (1個50g) | – |
| `potato` | じゃがいも・里芋 | – | 揚げ★, サラダ化★ | 76/1.9/0.1/17 (100g) | 揚げ→misc_dish/fries, サラダ化(マヨ)→veggies/side_creamy |
| `sweet_potato` | さつまいも | – | 焼き蜜★, 揚げ蜜★ | 130/1.2/0.2/32 (100g) | 焼き蜜・揚げ蜜→snack_drink/wagashi |

#### バケット2 「肉魚(低脂肪)」 (低脂P) — 7 Identity

| ID | 表示名 | Attribute | Style (special) | 代表PFC | Migration |
|---|---|---|---|---|---|
| `chicken_lean` | 鶏むね・ささみ | 皮なし(default)/皮あり | 揚げ★ | 105/23/1.5/0 (100g 皮なし) | 揚げ→misc_dish/fried_main(Attr=唐揚げ) |
| `salad_chicken` | サラダチキン | – | – | 110/25/1.7/0.5 (1パック) | – |
| `white_fish` | 白身魚・赤身魚 | – | 衣付揚げ★ | 75/16/0.7/0 (100g) | 衣付揚げ→misc_dish/fried_main(Attr=魚介揚げ) |
| `seafood_lean` | イカ・タコ・エビ・貝 | – | 衣付揚げ★ | 88/17.5/0.8/1 (100g) | 衣付揚げ→misc_dish/fried_main(Attr=エビフライ) |
| `red_meat` | 赤身肉 (牛・豚) | もも・ヒレ(default)/肩ロース赤身 | – | 130/22/4/0 (もも・ヒレ100g)、肩ロース系 150/22/6.8/0 | – |
| `canned_lean_fish` | 缶詰魚 (水煮) | – | – | 50/11/0.5/0.1 (1缶70g) | – |
| `protein_drink` | プロテイン (ドリンク・プリン) | ドリンク市販/パウダー水溶/シェイク自家製/プリン | – | 100-160/11-25/0.5-2/5-12 (1食) | searchable from snack_drink, dairy_soy |
| `jerky` | ジャーキー類 | – | – | 80-90/14-15/1-3/3-4 (30g) | – |

#### バケット3 「卵」 — 1 Identity

| ID | 表示名 | Attribute | Style | 代表PFC | Migration |
|---|---|---|---|---|---|
| `egg` | 卵 | 全卵/卵白/卵黄 | 生/ゆで/目玉/卵焼き(油)/茶碗蒸し | 75/6.2/5.2/0.2 (1個) | – |

#### バケット4 「脂あり肉魚」 (脂P) — 9 Identity

> v1.2 で default を `chicken_thigh` (modal-set F median 14g/100g) に変更。`beef_pork` (F16.5g) は modal-set 内では F最大寄り、`chicken_thigh` の方が短押し時の F誤差を縮める。

| ID | 表示名 | Attribute | Style (special) | 代表PFC | Migration |
|---|---|---|---|---|---|
| `chicken_thigh` ⭐default | 鶏もも・手羽 | 皮あり(default)/皮なし★ | 揚げ★ | 200/17/14/0 (100g 皮あり) | Attribute=皮なし→食材/lean_protein 側で記録 (PFC 130/21/5/0), Style=揚げ→misc_dish/fried_main(Attr=唐揚げ) |
| `beef_pork` | 牛・豚 (普通脂) | 牛/豚 (default) | 衣付揚げ★ | 220-240/17-18/15-18/0 (100g) | 衣付揚げ(豚)→misc_dish/fried_main(Attr=とんかつ), 衣付揚げ(牛)→misc_dish/fried_main(Attr=メンチカツ) |
| `beef_pork_fatty` | 牛・豚 (高脂) | バラ/サーロイン/ホルモン/タン | – | 320-470/14-21/20-46/0 (100g) | – |
| `fatty_fish` | 脂魚 | – | – | 160-290/16-23/9-24/0-3 (1切) | – |
| `canned_fatty_fish` | 缶詰魚 (脂魚) | – | – | 180-380/18-38/11-22/0.4-0.7 (1缶) | searchable from lean_protein |
| `ham` | ハム | – | – | 40/5/2.5/1 (2枚20g) | – |
| `bacon_sausage` | ベーコン・ソーセージ | – | – | 80-180/3-8/7.5-15/0-1.5 (2枚〜3本) | – |
| `liver` | レバー | – | – | 130/20/3.5/2.5 (100g) | – |
| `protein_bar` | プロテインバー | – | – | 160/15/5/15 (40g) | searchable from snack_drink |

#### バケット5 「乳・大豆」 — 9 Identity

| ID | 表示名 | Attribute | Style | 代表PFC | Migration |
|---|---|---|---|---|---|
| `milk` | 牛乳 | 普通/低脂 | – | 134/6.6/7.6/9.6 (200ml 普通) | – |
| `yogurt` | ヨーグルト | 無糖/加糖/ギリシャ/飲む | – | 62-130/3.6-10/0.3-3/4.9-16 (100g or 200ml) | – |
| `soy_milk` | 豆乳 | 無調整/調整 | – | 92-110/7-7.2/4-4.6/6-8 (200ml) | – |
| `cheese` | チーズ | スライス/モッツァレラ/6P/パルメザン/クリーム | – | 60-100/3-5/5-10/0-1 (1枚-30g) | – |
| `cheese_low_fat` | チーズ (低脂) | カッテージ | – | 32/4/1.4/1 (30g) | – |
| `tofu` | 豆腐 | 絹/木綿/高野 | – | 83-110/7.5-10/4.5-6.5/2-3 (半丁150g) | – |
| `aburaage` | 油揚げ系 | 油揚げ/厚揚げ/がんもどき | – | 75-175/4-12/7-13/0-1 (1枚) | – |
| `natto` | 納豆 | – | – | 80/6.6/4/5 (1パック40g) | – |
| `edamame_soy` | 大豆・枝豆 | 枝豆/大豆水煮 | – | 65-70/6-7/3-4.5/3-4 (50g) | – |

#### バケット6 「野菜」 — 5 Identity

> v1.2で汁物4 Identity (`miso_soup` `tonjiru` `soup_western` `soup_creamy`) を misc_dish へ移送。「スープ=料理」観点で素材ベース食品から分離。
>
> default = `salad_raw` (modal-set: salad_raw/veg_cooked/side_seasoned/pickles で modal適合・kcal min側だが日本人modal)

| ID | 表示名 | Attribute | Style (special) | 代表PFC | Migration |
|---|---|---|---|---|---|
| `salad_raw` | サラダ・生野菜 | – | – | 6-30/0.3-1/0.1-0.3/1-7 (50-100g) | – |
| `veg_cooked` | 温野菜・蒸し野菜 | – | 衣付揚げ★ | 12-95/0.5-2/0.1-0.5/2-21 (50-100g) | 衣付揚げ→misc_dish/fried_main(Attr=天ぷら) |
| `side_seasoned` | 副菜 (煮物・和え) | – | – | 50-65/1.5-2/2-3.5/4-8 (50g) | – |
| `side_creamy` | 副菜 (クリーミー) | ポテサラ/マカロニ/コールスロー | – | 50-145/0.7-3/3.5-8/4-15 (50-100g) | – |
| `pickles` | 漬物 | キムチ/梅干し/浅漬け | – | 12-35/0.5-1.5/0.1-0.2/2-7 (30g) | – |

#### バケット7 「果物」 — 5 Identity

> v1.2 で default を `banana` (NHNS摂取量第1位 + modal-set kcal median) に変更。`apple_pear` (135kcal) は kcal 上限側、`banana` (86kcal) は modal{citrus 50, banana 86, apple 135} の median。

| ID | 表示名 | Attribute | Style | 代表PFC | Migration |
|---|---|---|---|---|---|
| `banana` ⭐default | バナナ | – | – | 86/1.1/0.2/22 (1本100g) | – |
| `apple_pear` | りんご・梨 | – | – | 135/0.5/0.5/35 (1個250g) | – |
| `citrus` | 柑橘 | – | – | 36-70/0.6-1.4/0.1-0.2/9-17 (1個) | – |
| `berry` | ベリー | いちご/ブルベリ/ぶどう | – | 25-30/0.2-0.7/0.1-0.2/6-8 (50g) | – |
| `fruit_other` | カットフルーツ・他 | パイン/マンゴー/キウイ/桃/柿/すいか | – | 50-90/0.6-1/0.1-0.3/9-22 (100-150g) | – |

#### バケット8 「油・調味」 — 5 Identity

| ID | 表示名 | Attribute | Style | 代表PFC | Migration |
|---|---|---|---|---|---|
| `oil` | オイル | オリーブ/ごま/MCT/ココナッツ | – | 100-125/0/11.7-14/0 (大さじ1) | – |
| `butter_cream` | バター・生クリーム | – | – | 60-75/0.1-0.3/6.4-8.1/0-0.5 (10-15g) | – |
| `mayo` | マヨネーズ | – | – | 80/0.2/8.8/0.5 (大さじ1 12g) | – |
| `dressing` | ドレッシング | 油あり/ノンオイル | – | 15-60/0-0.2/0-5/2-3 (大さじ1) | – |
| `avocado` | アボカド | – | – | 180/2/18/1 (半個100g) | searchable from fruit |

#### バケット9 「おやつ甘飲」 — 11 Identity

> v1.2 で **`quickTapDisabled: true`** 追加。modal-set内 (chocolate/cookie/ice/snack/sweet_bread) の F幅 12.5g、kcal±49% で modal-set収束未達。短押しで default 1個に丸めると誤差が大きく、長押しでIdentity明示選択する運用が誠実。

| ID | 表示名 | Attribute | Style | 代表PFC | Migration |
|---|---|---|---|---|---|
| `chocolate` | チョコ | 普通/ハイカカオ | – | 165-180/2-3.5/10-15/8-17 (30g) | – |
| `wagashi` | 和菓子・米菓 | 大福/どら焼き/羊羹/団子/せんべい/大学いも/焼き芋 | – | 75-240/1.4-4/0.1-3/17-50 (1個・1枚) | – |
| `cake` | ケーキ・洋菓子 | ショート/チーズ/シュー/プリン/ゼリー | – | 75-330/2-7/0-21/16-42 (1切・1個) | – |
| `ice` | アイス | アイス/ソフト/ジェラート | – | 200-230/3.5-4/9-11/25-28 (1個・100g) | – |
| `cookie` | クッキー・焼菓子 | – | – | 100-150/1.5-2/4-7/13-18 (20-30g) | – |
| `snack` | スナック菓子 | – | – | 230-320/3-4/11-18/30-36 (50-60g) | – |
| `sweet_bread` | 菓子パン | メロン/あん/クリーム | – | 280-350/6/5-12/45-55 (1個) | – |
| `nuts` | ナッツ | 素焼/塩入/ロースト | – | 180-185/6/15-16/5 (30g) | – |
| `dried_fruit` | ドライフルーツ | – | – | 90/1/0.2/22 (30g) | searchable from fruit |
| `sweet_drink` | 甘飲料 | – | – | 90-175/0-4/0-4/21-35 (200-500ml) | – |
| `sweet_drink_rich` | 甘飲料 (こってり) | フラペチーノ/タピオカ/加糖ミルクティー | – | 175-350/4-5/3-12/30-75 (1杯) | – |

---

### 2.2 一皿料理タブ (合計 48 Identity)

#### バケット1 「どんぶり」 — 5 Identity

| ID | 表示名 | 含まれる例 | 代表PFC |
|---|---|---|---|
| `gyudon_class` | 牛丼系 | 牛丼/親子丼/ねぎとろ丼/中華丼/麻婆丼/ローストビーフ丼/ガパオ/ロコモコ | 600-720/22-28/15-22/82-95 |
| `kaisendon` | 海鮮丼 | 海鮮丼/鉄火丼 | 560-600/25-28/8-12/85-90 |
| `fried_rice_omurice` | チャーハン・オムライス | チャーハン/オムライス | 680-770/18-22/24-28/92-96 |
| `katsudon_tendon` | カツ丼・天丼 (揚げ系) | カツ丼/天丼 | 800-900/22-32/28-30/108-110 |
| `bibimbap` | ビビンバ・エスニック丼 | ビビンバ/石焼ビビンバ | 600-700/22-24/15-18/90-100 |

#### バケット2 「カレー」 — 4 Identity

| ID | 表示名 | 含まれる例 | 代表PFC |
|---|---|---|---|
| `curry_class` | カレー・シチュー系 | カレーライス/キーマ/ドライ/シチュー/ハッシュド | 670-750/18-24/20-25/94-104 |
| `katsu_curry` | カツカレー | カツカレー | 980/29/38/126 |
| `butter_chicken` | バターチキン | バターチキン | 780/22/40/72 |
| `soup_curry` | スープカレー・グリーン | スープカレー/グリーンカレー | 600/18-25/15-28/68-80 |

#### バケット3 「ラーメン中華麺」 — 7 Identity

| ID | 表示名 | 含まれる例 | 代表PFC |
|---|---|---|---|
| `ramen_light` | ラーメン (あっさり) | 中華そば/塩 | 600-720/25/12-14/90-104 |
| `ramen_heavy` | ラーメン (こってり) | 味噌/とんこつ/家系 | 900-1150/28-35/30-55/90-108 |
| `ramen_jiro` | 二郎系 | 二郎系 | 1500/55/75/150 |
| `tsukemen` | つけ麺・まぜそば | つけ麺/まぜそば | 900-950/32/28-38/115-126 |
| `tantanmen` | 担々麺 | 担々麺 | 780/25/30/90 |
| `fried_noodles` | 焼そば | 焼そば/あんかけ焼そば | 800-820/22-24/28-30/108-112 |
| `cold_noodles` | 冷やし中華・冷麺 | 冷やし中華/冷麺 | 600-720/22-24/8-18/104-108 |

#### バケット4 「うどん蕎麦」 — 5 Identity

| ID | 表示名 | Attribute | 代表PFC |
|---|---|---|---|
| `udon` | うどん | かけ/ぶっかけ/きつね/月見/釜揚げ | 470-590/14-20/7-12/90-95 |
| `soba` | そば | かけ/ざる/山かけ | 410-500/15-18/4-6/84-90 |
| `tempura_noodle` | 天ぷら麺 | 天そば/天うどん/鍋焼きうどん | 650-680/22-25/15-18/98 |
| `yaki_udon` | 焼うどん | – | 560/18/16/86 |
| `somen` | そうめん | そうめん/ひやむぎ | 430/12/4/86 |

#### バケット5 「パスタ」 — 5 Identity

| ID | 表示名 | 含まれる例 | 代表PFC |
|---|---|---|---|
| `pasta_tomato` | トマト系 | ナポリタン/ペスカトーレ/アラビアータ | 650-720/18-26/16-22/96-108 |
| `pasta_oil` | オイル系 | ペペロンチーノ/ボンゴレ/ジェノベーゼ | 580-700/18-22/12-32/80-92 |
| `pasta_cream` | クリーム系 | カルボナーラ/クリームパスタ | 780-800/24-28/36-42/72-86 |
| `pasta_meat` | ミート系 | ミートソース | 690/26/22/96 |
| `pasta_japanese` | 和風 | たらこ/きのこ | 620/20/20/88 |

#### バケット6 「寿司」 — 4 Identity

| ID | 表示名 | 単位 | 代表PFC |
|---|---|---|---|
| `sushi_plate` | 回転寿司 (皿) | 1皿 | 110/6/2.4/16.4 |
| `sushi_piece` | セット寿司 (貫) | 1貫 | 55/3/1.2/8.2 |
| `chirashi` | ちらし寿司 | 1人前 | 600/28/14/90 |
| `maki` | 巻き・いなり・手巻き | 1個 | 80-200/3-7/1-4/16-30 |

#### バケット7 「サンドバーガー」 — 5 Identity

| ID | 表示名 | 含まれる例 | 代表PFC |
|---|---|---|---|
| `cold_sand` | 冷サンド | たまごサンド/ツナサンド/ハム・BLT | 330-360/13-14/16-20/30-31 |
| `hot_sand` | ホットサンド | ホットサンド | 420/18/22/36 |
| `burger` | バーガー (普通) | ハンバーガー/チーズバーガー | 460-530/22-25/24-28/39-42 |
| `burger_heavy` | バーガー (こってり) | ベーコンバーガー/ダブル | 600+/28+/32+/42 |
| `hot_dog_pita` | ホットドッグ・他 | ホットドッグ/バインミー/ピタ | 350-400/14-17/12-18/32-48 |

#### バケット8 「ピザ」 — 3 Identity

| ID | 表示名 | 含まれる例 | 代表PFC (1切) |
|---|---|---|---|
| `pizza_light` | 薄め | マルゲリータ | 95/4/3/12 |
| `pizza_regular` | ふつう | ペペロニ/クアトロ/シーフード | 150-180/6-7/6-8/18-20 |
| `pizza_heavy` | こってり | テリヤキチキン/厚切り | 230-240/10/11-12/22 |

#### バケット9 「定食・単品・汁」 (★misc_dish) — 16 Identity

> 注: `teishoku` / `bento` を**先頭に配置**して頻度高い1日入力 (定食・コンビニ弁当) を即タップで取れるようにする。
>
> v1.2 で汁物4 Identity (`miso_soup` `tonjiru` `soup_western` `soup_creamy`) を **veggies から移送**。「スープは食材ではなく料理」の整理に基づく。本バケットは `quickTapDisabled: true` のため、汁物単独ログは長押しシートから miso_soup 等を選ぶ運用。

| ID | 表示名 | Attribute | 含まれる例 | 代表PFC |
|---|---|---|---|---|
| `teishoku` | 定食 | 焼魚/焼肉/唐揚げ/トンカツ/生姜焼き/ハンバーグ | 焼魚定食/焼肉定食/唐揚げ定食 etc. | 700-1000/30-35/18-40/95-110 |
| `bento` | 弁当 | コンビニ/手作り/幕の内/駅弁 | コンビニ弁当/手作り弁当 etc. | 600-750/20-25/18-22/92-105 |
| `okonomi` | 粉もの | お好み焼き/たこ焼き/もんじゃ/広島 | 420-850/12-32/15-32/50-108 |
| `tenshin` | 中華点心 | 餃子/シューマイ/春巻/小籠包/水餃子 | 220-280/9-11/7-14/22-32 |
| `fried_main` | 揚げもの単品 | 唐揚げ/とんかつ/メンチカツ/エビフライ/コロッケ/天ぷら盛/魚介揚げ | 200-500 (Attribute変動) |
| `yakitori` | 焼鳥・串もの | 焼鳥盛り/串もの | 350/32/16/8 |
| `meat_solo` | 肉単品 | ハンバーグ/ステーキ | 380-420/22-32/22-30/2-18 |
| `nabe_heavy` | 鍋もの (こってり) | すき焼き/しゃぶしゃぶ/もつ鍋 | 650-750/32-35/30-40/40-42 |
| `nabe_light` | 鍋もの (あっさり) | 寄せ鍋/おでん/水炊き | 250-550/15-35/8-18/25-55 |
| `sashimi` | 刺身盛り | 刺身盛り合わせ/カルパッチョ | 250/30/8/4 |
| `grilled_fish_solo` | 焼魚単品 | 焼魚 (ご飯なし) | 180/21/9/0.5 |
| `fries` | フライドポテト | フライドポテト | 320/3.8/15/40 |
| `miso_soup` | 味噌汁・お吸い物 | 具薄/具沢山 | 味噌汁・吸い物 | 35-80/2.5-5/1-3/3.5-8 (1杯) |
| `tonjiru` | 豚汁・けんちん汁 | – | 豚汁・けんちん汁 | 150-180/7-9/7-9/15 (1杯) |
| `soup_western` | 洋風スープ (薄) | – | コンソメ・ミネストローネ等 | 36-70/1.2-3/0.8-2/6-10 (1杯) |
| `soup_creamy` | クリームスープ | コーン/ポタージュ | コーン・ポタージュ等 | 130-150/3/5-7/18 (1杯) |

---

## 3. PFC崩壊遮断ルール一覧

ユーザーがStyleやAttributeを選んだとき、内部的に別バケットに強制移動するルール。UIでは違和感なく完結し、データはPFC収束を保つ。

### 3.1 Style → 強制移動

| 起点 Identity | Style選択 | 移動先バケット/Identity | 例 |
|---|---|---|---|
| `rice` | 丼化 | rice_dish/(該当sub) | 牛丼/親子丼など |
| `rice` | カレーかけ | curry/curry_class | カレーライス |
| `rice` | 鍋焼き化・雑炊化 | misc_dish/nabe_light | おじや等 |
| `bread` | サンド化 | sandwich/(該当sub) | たまごサンド等 |
| `potato` | 揚げ | misc_dish/fries | フライドポテト |
| `potato` | サラダ化 (マヨ) | veggies/side_creamy | ポテトサラダ |
| `sweet_potato` | 焼き蜜・揚げ蜜 | snack_drink/wagashi | 大学いも・焼き芋 |
| `chicken_lean` | 揚げ | misc_dish/fried_main (Attr=唐揚げ) | 唐揚げ |
| `chicken_thigh` | 揚げ | misc_dish/fried_main (Attr=唐揚げ) | 唐揚げ |
| `beef_pork` | 衣付揚げ (豚) | misc_dish/fried_main (Attr=とんかつ) | とんかつ |
| `beef_pork` | 衣付揚げ (牛) | misc_dish/fried_main (Attr=メンチカツ) | メンチカツ |
| `white_fish` | 衣付揚げ | misc_dish/fried_main (Attr=魚介揚げ) | アジフライ等 |
| `seafood_lean` | 衣付揚げ | misc_dish/fried_main (Attr=エビフライ) | エビフライ |
| `veg_cooked` | 衣付揚げ | misc_dish/fried_main (Attr=天ぷら) | 天ぷら盛 |

### 3.2 Attribute → 強制移動

| 起点 Identity | Attribute選択 | 内部記録先 | 補正PFC | 補足 |
|---|---|---|---|---|
| `chicken_thigh` | 皮なし | lean_protein バケット (chip非表示) | 130/21/5/0 (-35% kcal, -9g F) | UIは脂Pバケットのまま、データは低脂P側 |

### 3.3 実装メモ

- ユーザーには **「フライドポテトとして記録します」** などの軽い確認だけ表示
- ログDB側では `categoryKey` / `subTypeKey` が **移動先のID** で記録される (rice_dishのfried_riceとして等)
- 起点Identityはメタとして `originIdentityKey` で保持 (検索・履歴学習に利用可)

---

## 4. マルチエントランス検索辞書

primary Home以外のバケットからも検索ヒットさせる Identity 一覧。chipには出さないが、検索バーで該当キーワードを打つとヒット → 選択時はprimary Homeで記録。

| Identity | Primary Home | Search可能タブ・タグ | 想定動線 |
|---|---|---|---|
| `protein_bar` | fatty_protein | おやつ甘飲, "プロテイン", "バー" | おやつ甘飲タブで「プロテイン」検索 → ヒット → 脂Pで記録 |
| `protein_drink` | lean_protein | おやつ甘飲, 乳・大豆, "プロテイン", "シェイク", "ドリンク" | 同上 |
| `avocado` | added_fat | 果物, "アボカド" | 果物タブで「アボカド」検索 → ヒット → 油・調味で記録 |
| `dried_fruit` | snack_drink | 果物, "ドライ" | 果物タブで「ドライ」検索 → ヒット → おやつ甘飲で記録 |
| `canned_fatty_fish` | fatty_protein | 鶏むね魚 (低脂P), "鯖缶", "缶" | 鶏むね魚タブで「鯖缶」検索 → ヒット → 脂Pで記録 |
| `aburaage` | dairy_soy | "油揚げ", "厚揚げ" | (内部検索のみ) |

> **マルチエントランスの実装範囲はあくまで「検索ヒット」のみ**。chipの2バケット重複露出はしない (UI混乱防止)。

---

## 5. Add-on (クロスバケット・アドオン設計)

### 5.1 設計思想

- **Identity を Add-on としても流用** — 卵/アボカド/チーズ/納豆/ナッツ等は単体Identityでもあり、他Identityのトッピングでもある
- **Add-on専用ID** は Identity化しない調味・補強系 (タレ/ソース/明太子/しらす等) のみ
- **PFC閾値**: 1単位あたり P/F/C のいずれかが ±3g 以上動くものを採用

### 5.2 Identity流用 Add-on (asAddon フィールドを持つ)

主要Identityに `asAddon` 定義を追加し、別Identityの allowedAddonIds から呼び出す。

| Identity | unit (Add-on時) | addedPFC | 主に出る Identity |
|---|---|---|---|
| `egg` | 1個 | 75/6.2/5.2/0.3 | rice, bread, oatmeal, udon, soba, ramen_*, gyudon_class, salad_raw, curry_class |
| `cheese` | 1単位 (約20g) | 80/5/6/1 | bread, pasta_*, gyudon_class, curry_class, salad_raw, sandwich, pizza_* |
| `mayo` | 大さじ1 (12g) | 80/0.2/8.8/0.5 | sandwich, salad_raw, gyudon_class, fried_main, white_fish |
| `butter_cream` (バター) | 10g | 75/0.1/8.1/0 | rice, bread, oatmeal, udon, soba, ramen_* |
| `natto` | 1パック40g | 80/6.6/4/5 | rice, soba, udon |
| `avocado` | 1/4個 50g | 90/1/9/0.5 | bread, salad_raw, sandwich, gyudon_class, oatmeal |
| `nuts` | 15g | 90/3/8/2 | salad_raw, yogurt, oatmeal |
| `kimchi` (← `pickles` 内) | 30g | 14/0.5/0.1/2 | rice, gyudon_class, ramen_*, fatty_protein |
| `salad_chicken` | 50g (刻み) | 55/12/0.7/0.2 | salad_raw |
| `canned_lean_fish` (ツナ) | 35g (半缶) | 25/5.5/0.3/0.05 | salad_raw, bread |
| `bacon_sausage` (1枚) | 10g | 40/2/3.5/0.2 | bread, salad_raw, sandwich, breakfast |
| `ham` (2枚) | 20g | 40/5/2.5/1 | bread, sandwich |
| `kanikama` (※将来追加) | 5本50g | 45/6/0.4/5 | salad_raw |
| `oil` (オイル) | 大さじ1 14g | 110/0/12/0 | salad_raw, pasta_* |
| `dressing` | 大さじ1 15ml | 60/0.1/5/2 | salad_raw |
| `apple_pear` / `banana` / `berry` (フルーツ追加) | 50g | 25-45/0.4-1/0.1-0.2/6-11 | yogurt, oatmeal |

### 5.3 Add-on専用ID (Identity化しない補強・調味系)

| Add-on ID | 表示名 | unit | addedPFC | 主に出る Identity |
|---|---|---|---|---|
| `mentaiko` | 明太子・たらこ | 大さじ1 | 25/5/1.5/0.3 | rice |
| `shirasu` | しらす | 15g | 25/4/0.5/0.1 | rice, salad_raw |
| `salmon_flake` | 鮭フレーク | 大さじ1 | 30/4.5/1.5/0.2 | rice, oatmeal |
| `katsuobushi` | 削り節 | 5g | 18/3.5/0.3/0 | rice, veg_cooked, side_seasoned |
| `nori_furikake` | 海苔・ふりかけ | 5g | 15/1/0.3/2 | rice |
| `jam` | ジャム | 大さじ1 | 50/0/0/13 | bread, oatmeal, yogurt |
| `honey` | はちみつ | 大さじ1 | 60/0/0/16 | bread, oatmeal, yogurt, milk |
| `peanut_butter` | ピーナッツバター | 大さじ1 15g | 95/3.5/8/3 | bread, oatmeal |
| `maple_syrup` | メープルシロップ | 大さじ1 | 50/0/0/13 | bread, oatmeal |
| `granola_top` | グラノーラ追加 | 大さじ2 25g | 120/2/5/18 | yogurt, oatmeal, milk |
| `tartar` | タルタル | 大さじ1 | 70/0.4/7/2 | fried_main, white_fish |
| `seabura` | 背脂 | 大さじ1 | 50/0/5.5/0 | ramen_* |
| `rayu` | ラー油 | 小さじ1 | 35/0/4/0 | ramen_*, gyudon_class, tenshin |
| `tororo` | とろろ | 50g | 30/2/0.2/6.4 | soba, gyudon_class |
| `crouton` | クルトン | 5g | 25/0.7/1/4 | salad_raw |
| `corn_top` | コーン | 30g | 30/1/0.5/7 | salad_raw, soup_creamy |
| `seasoned_egg` | 味玉 | 1個 | 85/6.5/6/1 | ramen_*, tsukemen |
| `chashu` | チャーシュー | 1人前 30g | 120/8/9/1 | ramen_*, tsukemen |
| `tempura_top` | 天ぷら追加 | 1個 | 140/4/9/11 | udon, soba, gyudon_class |
| `kitsune_top` | きつね (油揚げ) | 1枚 | 110/5/7/8 | udon, soba |
| `katsu_add` | カツ追加 | 1枚 | 250/14/16/14 | curry_class, gyudon_class, udon |
| `karaage_add` | 唐揚げ追加 | 2個 | 180/11/10/7 | gyudon_class, set_meal |
| `berry_top` | ベリー追加 | 50g | 25/0.4/0.2/6 | yogurt, oatmeal |
| `banana_slice` | バナナ追加 | 1/2本 50g | 45/0.5/0.1/11 | oatmeal, yogurt |

### 5.4 セット提案ロジック (defaultAddonIds)

各 Identity に **頻出 Add-on を 4-6個** プリセットする (初期固定)。利用ログ蓄積後は頻度学習で並び替え。

例:

```
rice:
  defaultAddonIds: [natto, egg, kimchi, salmon_flake, mentaiko, nori_furikake]
  allowedAddonIds: [全許可Add-on...]

salad_raw:
  defaultAddonIds: [avocado, canned_lean_fish, nuts, dressing, salad_chicken]
  allowedAddonIds: [...]

bread:
  defaultAddonIds: [butter_cream, jam, honey, peanut_butter, cheese, avocado]
  allowedAddonIds: [...]

ramen_*:
  defaultAddonIds: [seasoned_egg, chashu, kitsune_top, seabura, rayu]
  allowedAddonIds: [...]

yogurt:
  defaultAddonIds: [honey, granola_top, berry_top, banana_slice, nuts, peanut_butter]
  allowedAddonIds: [...]
```

### 5.5 PFCインパクト原則

- 1単位で P/F/C のいずれかが ±3g 未満のもの (醤油/塩/七味/わさび/生姜/おろしポン酢/ステーキソース) は Add-on対象外。**「#無視可」原則** に従い記録から除外。

---

---

## 6. 量Grammar

### 6.1 設計原則

- **数値直接入力が主役**。default値が代表値で初期表示される
- **chip はショートカット** (補助)。網羅性は不要
- **chipが必要なのは g/ml/容量/factor/半端単位 のみ** — 個数で素直に数えるものは chipなし

### 6.2 入力パターン

| パターン | UI | chip | 適用条件 | 例 |
|---|---|---|---|---|
| **A. 個数入力 (chipなし)** | 数値入力欄 + ±ボタン | なし | unit が piece/plate/slice で代表値=default に設定可能 | 卵, バナナ, 餃子, 寿司, ピザ, 焼鳥 |
| **B. 重量・容量・factor (chipあり)** | chip [小/普通/大/特] + 数値入力 | あり (3-5個) | unit が g/ml/serving、または半端単位 | ごはん, 鶏むね, 牛丼, 麺類, 豆腐, お好み焼き |

### 6.3 AmountSpec 型

```typescript
interface AmountSpec {
  unit: 'g' | 'ml' | 'piece' | 'serving' | 'plate' | 'slice' | 'cut';
  default: number;          // 即記録時のプリセット値
  chips?: Array<{           // パターンBのみ存在
    label: string;          // "小 100g" "並" など
    value: number;          // 100 / 1.0 など
  }>;
  // 将来拡張 (P2): ブランド・チェーン店プリセット
  brandChips?: Array<{
    label: string;          // "並盛 (吉野家)"
    brandKcal: number;      // ブランド固有のkcal上書き
    source: string;
  }>;
}
```

### 6.4 各 Identity の量定義

#### 食材タブ — パターンA (chipなし)

| Identity | unit | default |
|---|---|---|
| `egg` | piece | 1 |
| `natto` | piece | 1 (パック) |
| `mochi` | piece | 1 |
| `onigiri` | piece | 1 |
| `banana` | piece | 1 (本) |
| `apple_pear` | piece | 1 |
| `citrus` | piece | 1 |
| `fruit_other` | piece | 1 |
| `aburaage` | piece | 1 (枚) |
| `salad_chicken` | piece | 1 (パック) |

#### 食材タブ — パターンB (chipあり)

| Identity | unit | default | chips |
|---|---|---|---|
| `rice` | g | 150 | [小 100g, 普通 150g, 大 220g] |
| `okayu` | g | 200 | [普通 200g, 大盛 280g] |
| `bread` | g | 60 | [1枚 60g, 2枚 120g] |
| `bread_rich` | piece | 1 | [1個, 2個] |
| `oatmeal` | g | 30 | [30g, 50g] |
| `cereal` | g | 40 | [30g, 40g, 50g] |
| `potato` | g | 100 | [小 70g, 1個 100g, 大 180g] |
| `sweet_potato` | g | 100 | [小 70g, 100g, 大 200g] |
| `chicken_lean` | g | 100 | [100g, 150g, 200g] |
| `white_fish` | g | 100 | [1切 80g, 1食 100g, 2切 160g] |
| `seafood_lean` | g | 100 | [80g, 1食 100g, 150g] |
| `red_meat` | g | 100 | [100g, 150g, 200g] |
| `canned_lean_fish` | piece | 1 | [半缶, 1缶, 2缶] |
| `protein_drink` | piece | 1 | [1食, 2食] |
| `jerky` | g | 30 | [20g, 30g, 50g] |
| `beef_pork` | g | 100 | [100g, 150g, 200g] |
| `beef_pork_fatty` | g | 100 | [100g, 150g, 200g] |
| `chicken_thigh` | g | 100 | [100g, 150g, 1枚 250g] |
| `fatty_fish` | g | 80 | [1切 80g, 100g, 2切 160g] |
| `canned_fatty_fish` | piece | 1 | [半缶, 1缶] |
| `ham` | piece | 2 | [2枚, 4枚] |
| `bacon_sausage` | piece | 2 | [2枚, 1パック 100g] |
| `liver` | g | 100 | [100g, 150g] |
| `protein_bar` | piece | 1 | [1本, 2本] |
| `milk` | ml | 200 | [コップ 100ml, 200ml, 500ml] |
| `yogurt` | g | 100 | [100g, 150g, 200ml (飲む)] |
| `soy_milk` | ml | 200 | [コップ 100ml, 200ml] |
| `cheese` | g | 20 | [スライス1枚, 30g, 50g] |
| `cheese_low_fat` | g | 30 | [30g, 50g, 100g] |
| `tofu` | piece | 0.5 | [半丁, 1丁] |
| `edamame_soy` | g | 50 | [小皿 50g, 100g] |
| `salad_raw` | g | 100 | [小 50g, 普通 100g, 大 150g] |
| `veg_cooked` | g | 100 | [小 50g, 普通 100g, 大 150g] |
| `side_seasoned` | g | 50 | [小鉢 50g, 1皿 100g] |
| `side_creamy` | g | 100 | [小 50g, 100g] |
| `pickles` | g | 30 | [少 15g, 小皿 30g] |
| `berry` | g | 50 | [50g, 100g] |
| `oil` | ml | 15 | [小さじ 5, 大さじ 15] |
| `butter_cream` | g | 10 | [5g, 10g, 大さじ 15g] |
| `mayo` | ml | 12 | [小さじ 5, 大さじ 12] |
| `dressing` | ml | 15 | [小さじ 5, 大さじ 15] |
| `avocado` | piece | 0.5 | [1/4個, 半個, 1個] |
| `chocolate` | g | 30 | [小 15g, 30g, 1枚 50g] |
| `wagashi` | piece | 1 | [小 0.5, 1個, 大 1.5] |
| `cake` | piece | 1 | [小 0.5, 1切] |
| `ice` | piece | 1 | [小 0.5, 1個] |
| `cookie` | g | 30 | [3枚 30g, 大袋 60g] |
| `snack` | g | 60 | [半袋 30g, 1袋 60g] |
| `sweet_bread` | piece | 1 | [半分, 1個] |
| `nuts` | g | 30 | [一掴み 15g, 30g, 50g] |
| `dried_fruit` | g | 30 | [30g, 50g] |
| `sweet_drink` | ml | 350 | [200ml, 350ml, 500ml] |
| `sweet_drink_rich` | ml | 350 | [Tall 350ml, Grande 470ml] |

#### 一皿料理タブ — パターンA (chipなし)

| Identity | unit | default |
|---|---|---|
| `tenshin` (餃子・シューマイ等) | piece | 5 |
| `yakitori` | piece | 5 (本) |
| `sushi_plate` | plate | 8 |
| `sushi_piece` | piece | 10 (貫) |
| `pizza_light` / `pizza_regular` / `pizza_heavy` | slice | 2 |
| `sashimi` | piece | 5 (切) |
| `grilled_fish_solo` | piece | 1 (切) |
| `cold_sand` / `hot_sand` | piece | 1 |
| `burger` / `burger_heavy` | piece | 1 |
| `hot_dog_pita` | piece | 1 |

#### 一皿料理タブ — パターンB (chipあり)

| Identity | unit | default | chips |
|---|---|---|---|
| `gyudon_class` | serving | 1.0 | [小盛 0.7, 並 1.0, 大盛 1.5, 特盛 2.0] |
| `kaisendon` | serving | 1.0 | [小盛 0.7, 並 1.0, 大盛 1.5] |
| `fried_rice_omurice` | serving | 1.0 | [小 0.7, 1人前 1.0, 大盛 1.5] |
| `katsudon_tendon` | serving | 1.0 | [並 1.0, 大盛 1.5] |
| `bibimbap` | serving | 1.0 | [並 1.0, 大盛 1.5] |
| `curry_class` | serving | 1.0 | [並 1.0, 大盛 1.5, 特盛 2.0] |
| `katsu_curry` | serving | 1.0 | [並 1.0, 大盛 1.5] |
| `butter_chicken` | serving | 1.0 | [並 1.0, 大盛 1.5] |
| `soup_curry` | serving | 1.0 | [並 1.0, 大盛 1.5] |
| `ramen_light` | serving | 1.0 | [小さめ 0.75, 普通 1.0, 大盛 1.5] |
| `ramen_heavy` | serving | 1.0 | [小さめ 0.75, 普通 1.0, 大盛 1.5] |
| `ramen_jiro` | serving | 1.0 | [麺少 0.75, 小 1.0, 大 1.5] |
| `tsukemen` | serving | 1.0 | [小さめ 0.75, 普通 1.0, 大盛 1.5] |
| `tantanmen` | serving | 1.0 | [普通 1.0, 大盛 1.5] |
| `fried_noodles` | serving | 1.0 | [小 0.75, 1人前 1.0, 大盛 1.5] |
| `cold_noodles` | serving | 1.0 | [小 0.75, 1人前 1.0, 大盛 1.5] |
| `udon` / `soba` / `tempura_noodle` / `yaki_udon` / `somen` | serving | 1.0 | [小 0.5, 1人前 1.0, 大盛 1.5, 特盛 2.0] |
| `pasta_*` | serving | 1.0 | [小 0.5, 1皿 1.0, 大盛 1.5, しっかり 2.0] |
| `chirashi` | serving | 1.0 | [並 1.0, 大盛 1.5] |
| `maki` | piece | 1 | [1個, 1本] |
| `okonomi` | serving | 1.0 | [半分 0.5, 1枚 1.0] |
| `meat_solo` | g | 150 | [100g, 150g, 200g] |
| `nabe_heavy` / `nabe_light` | serving | 1.0 | [軽め 0.7, 1人前 1.0, しっかり 1.5] |
| `fried_main` | piece | 3 | [1個, 3個, 5個] (Attribute=種類で base 変動) |
| `fries` | g | 150 | [S 100g, M 150g, L 200g] |
| `teishoku` (定食) | serving | 1.0 | [軽め 0.7, 1食 1.0, しっかり 1.5] |
| `bento` (弁当) | serving | 1.0 | [軽め 0.7, 1食 1.0, しっかり 1.5] |
| `miso_soup` (味噌汁) | piece | 1 | [1杯, 大 (1.5)] |
| `tonjiru` (豚汁) | piece | 1 | [1杯, 大 (1.5)] |
| `soup_western` (洋風スープ) | ml | 200 | [200ml, 大 300ml] |
| `soup_creamy` (クリームスープ) | ml | 200 | [200ml, 大 300ml] |

### 6.5 UI実装ガイドライン

- **パターンA**: bottom sheet 内の量セクションは「数値入力欄 + ±ボタン」のみ。シンプル
- **パターンB**: bottom sheet 内に「chip 横並び (横スクロール可) + 数値入力欄」。chipタップで数値反映、直接編集も可
- chip は **控えめサイズ** (主役は数値入力)
- defaultが妥当な代表値で初期表示されるので、即記録ユーザーは何も触らずに保存可能

---

## 7. 集計

| タブ | バケット数 | Identity合計 |
|---|---|---|
| 食材 | 9 | 62 (汁物4移送後) |
| 一皿料理 | 9 | 52 (汁物4追加後) |
| **合計** | **18** | **114** |

> 注: v1.2 で食材バケット6から一皿料理バケット9へ汁物4 Identity移送。タブ別 Identity 数は変動するが合計は移送なので不変。
>
> 参考: 現状実装は 食材47 sub + 一皿料理~30 sub = 約77個。新案で +37個 (主に「ない物」追加 + PFC収束のための分離 + misc_dish刷新 + teishoku/bento保持)。

---

## 8. 残論点

### 8.1 実装着手前に解消推奨

1. **`burger_heavy` と `burger`**: kcal差±20%以上だが、Attribute=[普通/こってり] で吸収する案もあり (chip 1つに統合)
2. **`hot_sand` と `cold_sand`**: kcal差25% で境界。統合余地あり
3. **`canned_lean_fish` (ツナ水煮単独)**: 油漬は鯖缶等と一緒に脂P側に行くのか、低脂P内に Attribute=[水煮/油漬] として吸収するのか

### 8.2 仕様としてストック (将来再考)

4. **「乳・大豆」が動物性+植物性同居**: メンタルモデル的に違和感あるが、9枠制約のため現行維持。次バージョンで再考
5. **アボカドの果物→油・調味移動**: マルチエントランス検索 + 果物バケット内サジェストで補完。初見ユーザー学習コストは要観測

### 8.3 実装後の改善

6. **misc_dish (定食・単品) 12 chip → 将来3バケット分割**: 他バケット (3-7) より多い。MVP後の利用ログで頻度上位を見て、自然な切り口で分割:
   - **粉もの・点心** (`okonomi`, `tenshin`)
   - **単品おかず** (`fried_main`, `yakitori`, `meat_solo`, `sashimi`, `grilled_fish_solo`, `fries`)
   - **定食・弁当・鍋** (`teishoku`, `bento`, `nabe_heavy`, `nabe_light`)
7. **「ハンバーグ単品」と「ハンバーグ定食」**: 同一 misc_dish 内で `meat_solo` (380kcal) vs `teishoku` Attribute=ハンバーグ定食 (850kcal) で識別。マルチエントランス検索でも補完可能
8. **データ移行プラン**: 既存ユーザーの FoodLog を旧→新IDマッピングで移行。旧 `set_meal/teishoku` → 新 `teishoku` Attribute=焼魚定食 等にマップ (実装フェーズで設計)
9. **チェーン店メニュー対応 (P2)**: AmountSpec の `brandChips` 拡張を活用、外部DB or ユーザー学習で各 Identity に「並盛 (吉野家) / 並盛 (松屋)」のような選択肢を追加
