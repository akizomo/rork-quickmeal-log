# US版 食事DB — タクソノミ設計 v1.0

> 関連: [IA-identity-spec.md](./IA-identity-spec.md) / [PRD.md](./PRD.md) / [`expo/types/identity.ts`](../expo/types/identity.ts)
> ステータス: **タクソノミ確定（実装前）**
> 最終更新: 2026-06-06
>
> **v1.0 確定差分（アメリカ目線レビュー反映）**
> - バケット2 `italian` → **`pizza_pasta`「Pizza & Pasta」** に改名（mac & cheese が "Italian" に見える違和感を解消）
> - バケット1 に **`pbj`（PB&J）** 追加。primaryHome=Burgers & Sandwiches、`searchableFrom: ['breakfast']`（昼食本籍・朝食検索）
> - バケット5 American Plates に **`seafood_plate`**（fish & chips / fried shrimp / salmon dinner）追加。dishタブのシーフードの穴を補填
> - 食材タブ `snack_drink` に **アルコール明示クラスタ**（beer / wine / cocktail / hard_seltzer）。kcal独立保持を利用しP/F/Cと別に酒類kcalを表現
> - **§7 Add-on 設計（US版）追加** — Identity流用(asAddon) ＋ Pure Add-on pool（ranch/BBQ/guacamole/sour cream/gravy 等の米国ソース文化）＋ 高頻度Identityへの default/allowed 紐付け代表表
> - **§8 型・registry のロケール対応設計追加** — 「id解決=global / 入力面=active locale」分離、LocaleBundle＋buildRegistry、`us_`プレフィクスでadditive・移行不要、単位はフォーマッタ層。§9 未確定の 1/2/3 を確定化
> - **§3.10 default macro 較正済み一覧追加** — 全 dish Identity の defaultMacro(kcal/P/F/C) をチェーン公表値＋USDAで較正（出典明記）。食材タブ/アルコールは実装時較正
> - **§8.8 i18n基盤・ロケール判定 確定** — i18next + react-i18next + expo-localization、ハイブリッド判定（device検出＋設定上書き、measurementSystemで単位自動）。§9 未確定の 4/5 を確定化 → **未確定ゼロ**

アメリカ在住ユーザー向けに、米国の食生活へ接地した食事DBを構築するための設計仕様。
本ドキュメントは **タクソノミ（バケット/Identity体系）の設計** をスコープとし、実装（コード化）は次段階。

---

## 0. 方針（確定事項）

| 論点 | 決定 |
|---|---|
| 日本版との関係 | **ロケール切替で並存**。日本版DB (`dishes.ts` / `ingredients.ts`) はそのまま残し、US版を別ファイルで新規構築 |
| 言語 | **アプリ全体を i18n 化**。食事DBはその一部。ただし下記 §6 の通り、食事DB *content* はロケール単位で丸ごと差し替える方式 |
| 今回のスコープ | **設計（タクソノミ）優先**。実装は次段階 |
| 設計思想 | 日本版の根幹（modal-set の PFC 収束 / 9ボタン×2タブ / 短押し=代表値・長押し=詳細）を**踏襲**し、接地データのみ日本食→米国食に差し替え |

---

## 1. 設計思想の踏襲

[IA-identity-spec.md §1](./IA-identity-spec.md) の5根幹をそのまま継承する。

| # | 思想 | US版での解釈 |
|---|---|---|
| ① | 9ボタン×2タブ | dishタブ=9バケット / ingredientタブ=9バケット を維持 |
| ② | modal-set軸（食材タブ） | 「米国人が日常的に食べる集合」のkcal/PFCが類似するよう食材をクラスタ |
| ③ | ジャンル・スタイル軸（一皿料理タブ） | 米国の料理ジャンルで再構成（バーガー、ピザ＆パスタ、チキン…） |
| ④ | 無カロリー除外 | 水・ブラックコーヒー・ダイエットソーダ等は対象外 |
| ⑤ | 専門用語排除 | 平易な英語ラベル（"Cheeseburger" 等）。栄養用語は使わない |

**統合判定ルール（[§1.4](./IA-identity-spec.md) 踏襲）**: bucket内 modal-set の kcal差 ±20% / F差 ±3g（1サービング比較）を維持。
modal-set の判定根拠は §2 の米国データを用いる。

---

## 2. 接地データ（米国の食習慣）

日本版が NHNS（国民健康・栄養調査）を根拠にしたのに対し、US版は以下を公式根拠とする。

| データ源 | 役割 | 主な知見 |
|---|---|---|
| **NHANES / WWEIA**（What We Eat in America, USDA） | 摂取*頻度*・エネルギー/栄養源シェア | エネルギー源1位=パン・ロール 7.2%／ケーキ・クッキー・ペストリー 7.2%。タンパク質源=鶏 14.4%・牛 14.0%。乳製品がCa/VitD主要源 |
| **YouGov American Dishes (2026)** | 料理*人気度* | ハンバーガー/フライドポテト/グリルドチーズ/チーズバーガー/マッシュポテト/フライドチキン が上位 |
| **Grubhub 2025 most-ordered** | テイクアウト動向 | ピザ・バーガー・チキンナゲット/テンダー・卵サンド。豆類・ツナ缶が急伸（健康志向 "Foodmaxxing"） |
| **FMI / QuestionPro 2025** | 食行動 | 平日夕食は「速い・簡単・コンフォートフード」が62%。94%が夕食自炊、72%が週1テイクアウト |
| **NHANES breakfast / TasteAtlas** | 朝食文化 | パンケーキ・ベーコン&エッグ・アボカドトースト・シリアル・ワッフル・オートミール |

**四大ジャンル柱**: American comfort / Italian-American / Mexican-Tex-Mex / Asian-American。

> 実装時の最終 default macro は **USDA FoodData Central** および主要チェーン公表値（Chipotle, Chick-fil-A, McDonald's 等）で較正する。本ドキュメントの数値は**設計アンカー（概算）**。

---

## 3. 一皿料理タブ（dish）— 9バケット

日本版（rice_dish/ramen/udon/sushi/teishoku…）を**全面置換**。
バケットキーは US 専用に新設する（§6 参照）。

> 表記: `default` = 短押し時の代表 Identity。kcal は 1 serving の設計アンカー。
> `qTD` = quickTapDisabled（Identity分散が広く、長押しで Identity を選ばせる）。

### 1. Burgers & Sandwiches  `burger_sandwich`
ハンディ系の最大バケット。YouGov 上位群＋テイクアウト最頻。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `cheeseburger` *(default)* | piece | ~550 (P30/F30/C40) | Attribute: single / double / bacon |
| `hamburger` | piece | ~480 | プレーン |
| `chicken_sandwich` | piece | ~600 | Attribute: grilled / crispy |
| `deli_sub` | piece(6") | ~500 | Attribute: turkey / ham / italian / veggie |
| `grilled_cheese` | piece | ~400 | |
| `blt` | piece | ~480 | |
| `hot_dog` | piece | ~300 | Attribute: plain / chili-cheese / corn dog |
| `wrap` | piece | ~450 | chicken caesar / buffalo 等 |
| `pbj` | piece | ~380 | PB&J。`searchableFrom: ['breakfast']`（昼食本籍・朝食検索） |

### 2. Pizza & Pasta  `pizza_pasta`
**ピザ＋パスタを統合**（既存 `sushi` バケットが plate/piece/percent を同居させる前例に倣う）。
ラベルは "Italian" ではなく **"Pizza & Pasta"**（mac & cheese を米国人は Italian と認識しないため）。
default を `pizza_pepperoni` にすることで、最頻アイテムのピザは短押し1タップを維持。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `pizza_pepperoni` *(default)* | slice (既定2切) | ~600 (2切) | Attribute: cheese / pepperoni / supreme(meat) / veggie |
| `pizza_cheese` | slice | ~570 (2切) | ※pepperoniのAttributeに内包も可 |
| `pasta_tomato` | percent | ~650 | spaghetti / marinara |
| `pasta_alfredo` | percent | ~900 | クリーム系 |
| `pasta_meat` | percent | ~700 | meat sauce / meatballs |
| `mac_cheese` | percent | ~600 | コンフォート定番 |
| `lasagna` | percent | ~700 | baked / ziti |

### 3. Chicken  `chicken`
鶏=タンパク質源1位。テイクアウト急増層。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `fried_chicken` *(default)* | piece (既定2) | ~500 (2pc) | Attribute: original / spicy |
| `tenders_nuggets` | piece (既定4) | ~450 | tenders / nuggets |
| `wings` | piece (既定6) | ~600 | Attribute: buffalo / bbq / plain |
| `rotisserie_grilled` | percent (¼羽) | ~350 | ヘルシー寄り |
| `chicken_and_waffles` | percent | ~800 | |

### 4. Mexican / Tex-Mex  `mexican`  *(qTD)*
第1エスニック。burrito(~1000) と taco(~200) の振れが大きく qTD。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `burrito` *(default)* | piece | ~950 | Chipotle級。Attribute: chicken/beef/carnitas/veggie |
| `tacos` | piece (既定3) | ~450 (3個) | street / crunchy |
| `quesadilla` | piece | ~600 | |
| `nachos` | percent | ~700 | |
| `burrito_bowl` | percent | ~700 | 米なし/ダブル肉で振れる |
| `enchiladas` | piece (既定2) | ~600 | |
| `fajitas` | percent | ~650 | |

### 5. American Plates  `american_plate`  *(qTD)*
「主菜＋サイド2品」の夕食型。steak と meatloaf で振れるため qTD。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `steak_potato` *(default)* | percent | ~800 | steak 8oz + baked potato |
| `meatloaf_mash` | percent | ~700 | |
| `bbq_plate` | percent | ~850 | pulled pork / ribs / brisket + サイド |
| `roast_plate` | percent | ~650 | turkey / ham / pot roast |
| `pot_pie` | piece | ~550 | chicken pot pie |
| `casserole` | percent | ~600 | green bean / tuna / hotdish |
| `seafood_plate` | percent | ~600 | fish & chips / fried shrimp / salmon dinner。Attribute: fried / grilled |

### 6. Soups, Stews & Chili  `soup_stew`
**soup/stew/chili を統合**。chili は技術的に stew で、ボウル/カップ量グラマーが共通。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `chili` *(default)* | percent (1 bowl) | ~400 (P25/F18/C30) | con carne / turkey / veggie |
| `soup_light` | percent (1 bowl) | ~150 | chicken noodle / vegetable / tomato |
| `soup_creamy` | percent (1 bowl) | ~350 | clam chowder / broccoli cheddar |
| `stew_gumbo` | percent (1 bowl) | ~400 | beef stew / gumbo / jambalaya |

### 7. Bowls & Salads  `bowl_salad`
健康志向（Foodmaxxing）の伸びを反映。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `entree_salad` *(default)* | percent | ~450 | Cobb / Caesar / Greek（ドレッシング込み） |
| `grain_bowl` | percent | ~600 | quinoa / Buddha bowl |
| `poke_bowl` | percent | ~600 | |
| `protein_salad` | percent | ~400 | chicken / tuna / egg salad over greens |

### 8. Asian Takeout  `asian_takeout`  *(qTD)*
中華系を中心に多様。テイクアウト主要層。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `chinese_combo` *(default)* | percent | ~900 | orange/General Tso chicken + fried rice |
| `lo_mein_fried_rice` | percent | ~700 | 麺/飯炒め |
| `teriyaki_bowl` | percent | ~650 | chicken/beef teriyaki + rice |
| `pad_thai` | percent | ~700 | タイ |
| `sushi_roll` | piece (既定8切) | ~500 | California / spicy tuna 等 |
| `ramen_pho` | percent | ~550 | ramen / pho |
| `curry_asian` | percent | ~650 | thai green / indian + rice |

### 9. Breakfast  `breakfast`  *(qTD)*
米国は朝食文化が強い。pancakes と oatmeal で振れるため qTD。

| Identity | 量単位 | kcal アンカー | 備考 |
|---|---|---|---|
| `eggs_bacon` *(default)* | percent | ~500 | eggs + bacon/sausage + toast |
| `pancakes_waffles` | percent | ~650 | + syrup。Attribute: pancakes / waffles / french toast |
| `breakfast_sandwich` | piece | ~450 | egg/cheese on biscuit / muffin |
| `breakfast_burrito` | piece | ~600 | |
| `oatmeal` | percent | ~300 | |
| `avocado_toast` | piece | ~350 | |
| `biscuits_gravy` | percent | ~600 | |

### 3.10 default macro 較正済み一覧（dish・実装値）

上記バケット表は概念ビュー。以下が **実装用の較正済み `defaultMacro`**（1 default serving）。
出典: 主要チェーン公表値 ＋ USDA。`src` = 主出典（`-adj`=他値で按分調整、`-typ`=USDA/汎用典型値）。
**kcal が一次アンカー**（composite料理は kcal≠4P+9F+4C のことがある＝§4.1 と同じく kcal 独立保持）。

| Identity | kcal | P | F | C | src |
|---|---|---|---|---|---|
| **burger_sandwich** | | | | | |
| `cheeseburger` | 520 | 30 | 28 | 40 | McDonald's QPC 513 |
| `hamburger` | 430 | 25 | 19 | 42 | McDonald's QP 417 |
| `chicken_sandwich` | 540 | 30 | 25 | 46 | CFA420/Popeyes700-adj |
| `deli_sub` | 400 | 22 | 14 | 46 | Subway 6"-typ |
| `grilled_cheese` | 400 | 15 | 25 | 33 | USDA-typ |
| `blt` | 480 | 17 | 30 | 35 | USDA-typ |
| `hot_dog` | 290 | 11 | 17 | 24 | USDA-typ (1本+バンズ) |
| `wrap` | 510 | 28 | 24 | 45 | USDA-typ (chicken) |
| `pbj` | 380 | 12 | 16 | 48 | USDA-typ |
| **pizza_pasta** | | | | | |
| `pizza_pepperoni` (2切) | 480 | 20 | 22 | 50 | Domino's 210/切-adj |
| `pizza_cheese` (2切) | 430 | 18 | 17 | 50 | Domino's-typ |
| `pasta_tomato` | 600 | 20 | 18 | 90 | Olive Garden 480-690 |
| `pasta_alfredo` | 900 | 22 | 62 | 66 | Olive Garden 920 |
| `pasta_meat` | 800 | 35 | 43 | 69 | Olive Garden 800 |
| `mac_cheese` | 560 | 20 | 30 | 52 | USDA-typ (restaurant) |
| `lasagna` | 520 | 29 | 28 | 36 | Olive Garden 500 |
| **chicken** | | | | | |
| `fried_chicken` (2pc) | 550 | 45 | 35 | 18 | Popeyes breast 380-adj |
| `tenders_nuggets` | 400 | 30 | 20 | 22 | CFA 8ct 250-adj |
| `wings` (6) | 500 | 40 | 35 | 6 | Buffalo Wild Wings |
| `rotisserie_grilled` (¼) | 350 | 40 | 20 | 2 | USDA-typ |
| `chicken_and_waffles` | 800 | 35 | 38 | 80 | USDA-typ |
| **mexican** | | | | | |
| `burrito` | 1000 | 45 | 38 | 110 | Chipotle 1010 |
| `tacos` (3) | 510 | 24 | 30 | 36 | Taco Bell 170×3 |
| `quesadilla` | 600 | 28 | 33 | 46 | USDA-typ |
| `nachos` | 720 | 26 | 42 | 58 | USDA-typ (loaded) |
| `burrito_bowl` | 700 | 40 | 25 | 75 | Chipotle bowl-adj |
| `enchiladas` (2) | 600 | 26 | 32 | 50 | USDA-typ |
| `fajitas` | 650 | 40 | 30 | 50 | USDA-typ (chicken) |
| **american_plate** | | | | | |
| `steak_potato` | 750 | 50 | 38 | 50 | sirloin+baked-adj |
| `meatloaf_mash` | 700 | 35 | 38 | 52 | USDA-typ |
| `bbq_plate` | 850 | 45 | 45 | 62 | USDA-typ (+2 sides) |
| `roast_plate` | 650 | 45 | 30 | 45 | USDA-typ |
| `pot_pie` | 550 | 20 | 33 | 42 | USDA-typ (1 serving) |
| `casserole` | 600 | 28 | 32 | 48 | USDA-typ |
| `seafood_plate` | 650 | 30 | 35 | 55 | fish&chips800/salmon450-adj |
| **soup_stew** (1 bowl) | | | | | |
| `chili` | 350 | 25 | 15 | 30 | USDA chili-adj |
| `soup_light` | 160 | 8 | 5 | 20 | USDA-typ |
| `soup_creamy` | 350 | 10 | 22 | 28 | clam chowder bowl-adj |
| `stew_gumbo` | 400 | 25 | 18 | 35 | USDA beef stew-adj |
| **bowl_salad** | | | | | |
| `entree_salad` | 500 | 30 | 32 | 24 | Cobb+ranch-typ |
| `grain_bowl` | 600 | 25 | 25 | 68 | USDA-typ |
| `poke_bowl` | 600 | 35 | 18 | 75 | USDA-typ |
| `protein_salad` | 400 | 30 | 24 | 16 | USDA-typ |
| **asian_takeout** | | | | | |
| `chinese_combo` | 890 | 26 | 40 | 107 | Panda 橙鶏+炒飯 890 |
| `lo_mein_fried_rice` | 650 | 18 | 22 | 95 | Panda chow mein/rice-adj |
| `teriyaki_bowl` | 650 | 38 | 15 | 90 | USDA-typ |
| `pad_thai` | 750 | 28 | 25 | 100 | USDA-typ |
| `sushi_roll` (8切) | 500 | 18 | 14 | 78 | USDA-typ (Cali/spicy tuna) |
| `ramen_pho` | 550 | 28 | 18 | 70 | USDA-typ |
| `curry_asian` | 650 | 25 | 28 | 75 | USDA-typ (thai/indian+rice) |
| **breakfast** | | | | | |
| `eggs_bacon` | 500 | 26 | 32 | 28 | USDA-typ (2egg+bacon+toast) |
| `pancakes_waffles` | 600 | 14 | 22 | 88 | IHOP 3stack 410+syrup-adj |
| `breakfast_sandwich` | 470 | 21 | 30 | 28 | McD Saus.EggMcMuffin 473 |
| `breakfast_burrito` | 600 | 24 | 32 | 52 | USDA-typ (loaded) |
| `oatmeal` | 300 | 10 | 8 | 50 | USDA-typ (w/toppings) |
| `avocado_toast` | 350 | 10 | 20 | 34 | USDA-typ |
| `biscuits_gravy` | 600 | 14 | 38 | 52 | USDA-typ (2 biscuits) |

> **Attribute factor は本 default を基準に相対計算**（例: `cheeseburger` の double / bacon、`pizza_pepperoni` の cheese/supreme/veggie）。factor 値は実装時に各 Attribute の絶対値から逆算。
> **未較正**: 食材タブ Identity（USDA per-100g で機械的に確定可・実装時）／アルコール（§4.1 のkcalアンカーで確定済）。
> **実装時の最終確認**: Chipotle/Chick-fil-A 等は公式 nutrition calculator で再確認し、`brandChips` 化も検討。

---

## 4. 食材タブ（ingredient）— 9バケット

PFC収束軸は**普遍的**なので、9バケットの**キーは日本版と共有**し（§6）、中身（Identity）のみ差し替える。

| バケットキー | ラベル(US) | Identity（差し替え後・主なもの） |
|---|---|---|
| `staple` | Grains & Bread | bread, rice, pasta, potato, oatmeal, tortilla, bagel, cereal |
| `lean_protein` | Lean Meat & Fish | chicken breast, turkey, white fish (cod/tilapia), shrimp, canned tuna, deli turkey |
| `egg` | Eggs | eggs |
| `fatty_protein` | Fatty Meat & Fish | ground beef, steak, pork, bacon, sausage, salmon |
| `dairy_soy` | Dairy & Soy | milk, cheese, yogurt (Greek), cottage cheese, tofu, plant milk |
| `veggies` | Vegetables | salad greens, broccoli, **beans/legumes (急伸)**, corn, mixed veg |
| `fruit` | Fruit | banana, apple, berries, orange, grapes, melon |
| `added_fat` | Fats & Sauces | butter, olive oil, mayo, ranch/dressing, peanut butter |
| `snack_drink` | Snacks & Drinks | chips, cookies, ice cream, candy, soda, protein bar, crackers, **specialty coffee** (latte/frappuccino), **energy drink**, **smoothie**, sweet tea, **アルコール (下記)** |

> default Identity 選定は §2 の NHANES 摂取シェアに従う（例: staple 既定=bread、fatty_protein 既定=ground beef）。

### 4.1 アルコール明示クラスタ（`snack_drink` 内）

新バケットは作らず（9ボタングリッド維持）、`snack_drink`（`quickTapDisabled`）内に酒類 Identity を明示クラスタ化。
「ビールを記録し忘れる」対策。

| Identity | 1単位 | kcal アンカー | Attribute |
|---|---|---|---|
| `beer` | 1缶/瓶 (12oz) | ~150 | regular / light(~100) / IPA・craft(~200+) |
| `wine` | 1杯 (5oz) | ~120 | red / white / rosé |
| `cocktail` | 1杯 | ~200 | margarita(~300) / vodka-soda(~100) / spirits neat |
| `hard_seltzer` | 1缶 | ~100 | White Claw等 |

**kcal モデリング**: アルコールのカロリー(7kcal/g)は P/F/C のいずれでもない。本DBの `Macro` は
**kcal を P/F/C と独立に保持**する（例: `gyudon` kcal 660 ≠ 4P+9F+4C）ため、酒類は
**kcal を明示値で入れ、P/F/C は残糖分(carbs)のみ**で正しく表現する。

---

## 5. 量グラマー（単位）

| 方針 | 内容 |
|---|---|
| **内部は metric** | 栄養計算・保存は g / ml で統一（マクロ計算ロジックを分岐させない） |
| **表示・入力は US customary** | ロケール表示層で oz / cup / tbsp / fl oz に変換。chip「6 oz」→裏で170g |
| **複合料理は `percent` 踏襲** | 1 serving = 100。ロケール非依存。バーガー/ピザ/サンドは piece / slice 据え置き |
| **食材タブの単位感覚** | タンパク質=oz / 乳・液体=cup・fl oz / 穀物=cup / パン=slice / 卵=count / 油脂=**tbsp** / 果物=piece・cup |
| **default macro 再較正** | 米国分量へ引き直す（¼ポンドパティ=113g、ソーダ12–20oz 等）。「翻訳」ではなく「数値の引き直し」 |
| **将来拡張** | `brandChips` に主要チェーン（Chipotle / Chick-fil-A 等）公表値 |

`AmountUnit` の拡張案: 既存 `g / ml / piece / percent / plate / slice / cut` に **`oz` / `cup` / `tbsp`** を追加、
または **ロケール表示フォーマッタ層**で metric↔customary を変換（後者が i18n 的に望ましい）。→ §8 の未確定。

---

## 6. i18n / ロケール並存アーキテクチャ

**重要**: 食事DB content とアプリUI文言は別レイヤーで扱う。

```
ロケール解決 (device / ユーザー設定)
   ├─ アプリUI文言   → i18n辞書 (ボタン/見出し/設定 等) … 全画面に影響
   └─ 食事DB content → ロケール単位で丸ごと差し替え
                         ja: dishes.ts / ingredients.ts / addons.ts
                         en-US: us-dishes.ts / us-ingredients.ts / us-addons.ts
```

- 食事DBは **ロケールごとに別ファイル**を用意し、registry 構築時にロケールで選択。
  → 各ファイルのラベルは**その言語のリテラルで直書きしてよい**（food label を i18n キー化する必要はない）。
- **バケットキーの扱い**:
  - **ingredient バケット = キー共有**（`staple` 等、PFC軸は普遍）。ラベルとメンバー Identity のみロケール差し替え。
  - **dish バケット = ロケール固有キー**（US: `burger_sandwich` 等 vs JP: `rice_dish` 等）。`DishBucketKey` をロケール別に定義 or union 拡張。
- `Identity.id` はグローバル一意。US Identity は `us_` プレフィクス等で衝突回避（実装時決定）。
- 既存 FoodLog（保存済みログ）との互換: ロケール切替で過去ログの Identity 参照が解決できるよう、両ロケールの registry を lookup 可能にする（マイグレーション設計は別途）。

---

## 7. Add-on 設計（US版）

日本版（[`addons.ts`](../expo/constants/identity/addons.ts)）の2層モデルを踏襲する。

- **IDENTITY_ADDON_REFS**: ベース Identity が add-on も兼ねる（macro は各 Identity の `asAddon` に持つ）
- **PURE_ADDONS**: 独立トッピング/ソース（自前 macro ＋ `allowedIdentityIds`）

> **米国の最大差分はソース/コンディメント文化**（ranch・BBQ・ketchup・sour cream・guacamole・gravy）。
> ここが日本版（醤油・ソース・ラー油・天かす）と最も置き換わる。
> macro は 1 単位あたりの設計アンカー（実装時 USDA FDC で較正）。

### 7.1 Identity流用 Add-on（`asAddon`）

| ref id | 1単位 | addedMacro (kcal/P/F/C) | 主な付き先 |
|---|---|---|---|
| `cheese` | 1 slice / ¼cup shred (28g) | 100 / 6 / 8 / 1 | burger・pizza・pasta・mexican・salad・eggs ほぼ全域 |
| `egg` | 1 large (fried) | 90 / 6 / 7 / 1 | burger・breakfast・ramen_pho・salad・avocado_toast |
| `bacon` | 2 strips (16g) | 90 / 6 / 7 / 0 | burger・sandwich・salad・breakfast・baked potato |
| `avocado` | ¼ fruit (50g) | 80 / 1 / 7 / 4 | sandwich・burrito・salad・toast・eggs |
| `sausage_patty` | 1 patty | 100 / 5 / 9 / 0 | breakfast・pizza |
| `ham_deli` | 2 slices | 60 / 9 / 2 / 1 | grilled_cheese・deli_sub・eggs |
| `butter` | 1 tbsp (14g) | 100 / 0 / 11 / 0 | bread・pancakes・potato・oatmeal・seafood |
| `nuts` | 1 tbsp (14g) | 90 / 3 / 8 / 3 | salad・oatmeal・yogurt・pad_thai(crushed) |
| `grilled_chicken_add` | 3 oz (85g) | 140 / 26 / 3 / 0 | entree_salad・grain_bowl・wrap |

### 7.2 Pure Add-ons（US ソース/トッピング pool）

| id | 1単位 | macro (kcal/P/F/C) | 主な付き先 |
|---|---|---|---|
| `ketchup` | 1 tbsp (17g) | 15 / 0 / 0 / 4 | burger・hot_dog・tenders・eggs・seafood |
| `ranch` | 2 tbsp (30g) | 130 / 1 / 14 / 2 | entree_salad・wings・pizza・tenders・wrap |
| `bbq_sauce` | 2 tbsp (36g) | 60 / 0 / 0 / 14 | wings・bbq_plate・tenders・burger |
| `buffalo_sauce` | 2 tbsp (30g) | 40 / 0 / 4 / 1 | wings・tenders・chicken_sandwich |
| `honey_mustard` | 1 tbsp (15g) | 50 / 0 / 3 / 5 | tenders・chicken_sandwich・deli_sub |
| `guacamole` | 2 tbsp (30g) | 50 / 1 / 4.5 / 3 | mexican 全般・burger・sandwich |
| `sour_cream` | 2 tbsp (30g) | 60 / 1 / 6 / 1 | mexican・chili・baked potato・soup |
| `salsa` | 2 tbsp (30g) | 10 / 0 / 0 / 2 | mexican・eggs・breakfast_burrito（低cal慣用） |
| `queso` | ¼ cup (60g) | 110 / 4 / 9 / 4 | nachos・burrito_bowl・fries |
| `gravy` | ¼ cup (60g) | 40 / 1 / 2 / 4 | meatloaf・biscuits_gravy・roast・fried_chicken |
| `cream_cheese` | 1 tbsp (15g) | 50 / 1 / 5 / 1 | bagel・breakfast_sandwich |
| `tartar_sauce` | 1 tbsp (15g) | 70 / 0.4 / 7 / 2 | seafood_plate |
| `cocktail_sauce` | 2 tbsp (30g) | 30 / 0 / 0 / 7 | seafood_plate |
| `maple_syrup` | 1 tbsp (20g) | 50 / 0 / 0 / 13 | pancakes・french toast・oatmeal・chicken&waffles |
| `whipped_cream` | 2 tbsp | 25 / 0 / 2 / 2 | pancakes・specialty coffee・desserts |
| `jam` | 1 tbsp (18g) | 50 / 0 / 0 / 13 | toast・pbj・oatmeal |
| `honey` | 1 tbsp (21g) | 60 / 0 / 0 / 16 | toast・oatmeal・yogurt・pizza_cheese |
| `peanut_butter` | 1 tbsp (15g) | 95 / 3.5 / 8 / 3 | toast・pbj・oatmeal |
| `croutons` | 5g | 25 / 0.7 / 1 / 4 | entree_salad・soup |
| `berry_top` | 50g | 25 / 0.4 / 0.2 / 6 | oatmeal・yogurt・pancakes・cereal |
| `banana_slice` | 50g (½本) | 45 / 0.5 / 0.1 / 11 | oatmeal・yogurt・pbj・cereal |
| `extra_patty` | 1 (beef) | 200 / 14 / 15 / 0 | cheeseburger・hamburger |
| `extra_meat_scoop` | 3 oz (85g) | 150 / 18 / 8 / 1 | burrito_bowl・tacos・nachos |

> 低cal慣用品（salsa・hot sauce 等）は IA-spec ④ の例外として、米国の記録慣習上 chip に出すが macro は最小。
> 純無カロリー（yellow mustard・pickles・soy sauce・wasabi）は対象外。

### 7.3 dish Identity への default / allowed 紐付け（代表）

`defaultAddonIds`（短押し帯に先頭表示・4〜6個）／`allowedAddonIds`（長押しの全許可）。高頻度 Identity の代表値：

| Identity | defaultAddonIds | 追加 allowed |
|---|---|---|
| `cheeseburger` | cheese, bacon, ketchup, extra_patty | egg, avocado, ranch, bbq_sauce, guacamole |
| `chicken_sandwich` | cheese, bacon, ranch | honey_mustard, buffalo_sauce, avocado |
| `pizza_pepperoni` | cheese, ranch | honey, bacon, sausage_patty |
| `tenders_nuggets` | ranch, bbq_sauce, honey_mustard, ketchup | buffalo_sauce |
| `wings` | ranch, buffalo_sauce, bbq_sauce | — |
| `burrito` / `burrito_bowl` | guacamole, sour_cream, cheese, salsa | extra_meat_scoop, queso |
| `nachos` | queso, guacamole, sour_cream | salsa, extra_meat_scoop |
| `steak_potato` | butter, sour_cream, cheese, bacon | gravy |
| `meatloaf_mash` | gravy, butter | cheese |
| `seafood_plate` | tartar_sauce, cocktail_sauce | ketchup, ranch |
| `chili` | cheese, sour_cream | croutons |
| `soup_creamy` | croutons, cheese, bacon | — |
| `entree_salad` | ranch, cheese, croutons, bacon, grilled_chicken_add | avocado, nuts, egg |
| `eggs_bacon` | cheese, ketchup, salsa | avocado |
| `pancakes_waffles` | maple_syrup, butter, whipped_cream, berry_top | banana_slice |
| `breakfast_burrito` | salsa, cheese, sour_cream, guacamole | egg |
| `oatmeal` | maple_syrup, peanut_butter, banana_slice, berry_top | nuts, honey |

> 全 Identity の完全な紐付けは `us-dishes.ts` 実装時に確定。本表は設計意図のアンカー。

---

## 8. 型・registry のロケール対応設計

現状（[`constants/identity/index.ts`](../expo/constants/identity/index.ts)）は **JP固定のシングルトン**:
モジュール読込時に `IDENTITY_REGISTRY` / `BY_ID` / `DISH_BUCKETS` 等を1回構築し、helper が直接参照。
これをロケール対応にする。

### 8.1 核心原則 — 「解決」と「入力面」の分離

| 用途 | スコープ | 理由 |
|---|---|---|
| **id→Identity 解決**（`getIdentity`） | **全ロケール横断（global）** | 保存済み FoodLog が参照する Identity.id は、現在のロケールに関係なく常に解決できる必要がある（JPログ→US切替後も表示・集計可） |
| **入力面**（バケット一覧・bucket内Identity・検索・quick-log chip） | **アクティブロケールのみ** | ユーザーが今記録するのは自分のロケールの食事だけ |

> これが設計の肝。`byId` は union、`byBucket`/`buckets`/`search` は active locale。

### 8.2 Locale 型と config

```ts
export type Locale = 'ja' | 'en-US';

export interface LocaleConfig {
  locale: Locale;
  unitSystem: 'metric' | 'us';   // §5 表示単位の切替に接続
  // 将来: 日付/数値フォーマット等
}
```

### 8.3 LocaleBundle と registry builder

各ロケールは **データ束（bundle）** を export し、純粋関数 `buildRegistry` で registry 化する。

```ts
export interface LocaleBundle {
  locale: Locale;
  buckets: BucketDef[];                       // そのロケールの dish/ingredient バケット
  identities: Identity[];                      // dishes + ingredients
  identitiesByBucket: Record<BucketKey, Identity[]>;
  pureAddons: Record<string, Addon>;
  identityAddonRefs: string[];
}

function buildRegistry(bundle: LocaleBundle): IdentityRegistry { /* 現 index.ts のロジックを bundle 駆動に */ }

const REGISTRIES: Record<Locale, IdentityRegistry> = {
  'ja':    buildRegistry(JA_BUNDLE),
  'en-US': buildRegistry(US_BUNDLE),
};

// global 解決用: 全ロケールの byId をマージ（id 衝突は §8.6 の命名規約で回避）
const GLOBAL_BY_ID: Record<string, Identity> =
  Object.assign({}, REGISTRIES['ja'].byId, REGISTRIES['en-US'].byId);
```

### 8.4 ファイル構成

```
constants/identity/
  index.ts            ← locale-aware aggregator（buildRegistry / REGISTRIES / GLOBAL_BY_ID / active state）
  locale.ts           ← Locale 型・LocaleConfig・active locale state・getRegistry(locale)
  ja/  dishes.ts ingredients.ts addons.ts buckets.ts   ← 既存を移設（or 現状の flat 維持）
  us/  dishes.ts ingredients.ts addons.ts buckets.ts   ← 新規（§3/§4/§7）
```
> flat 維持なら `us-dishes.ts` 等。サブフォルダ化すると JP/US の対称性が明確。**サブフォルダ推奨**。

### 8.5 アクティブロケール機構（call-site 影響）

ハイブリッド方式を推奨（call-site 改修を最小化しつつ reactive）:

| API | 実装 | 用途 |
|---|---|---|
| `getIdentity(id)` | **global 関数**（`GLOBAL_BY_ID` 参照、ロケール非依存） | ログ集計・履歴表示など非React文脈でも使える。**既存シグネチャ維持＝改修ゼロ** |
| `useIdentityRegistry()` | **React hook**（app-state-provider の `locale` を購読し active registry を返す） | 入力UI（バケット/検索/chip）。ロケール切替で再レンダー |
| `getActiveRegistry()` | 非React用の active registry getter | 必要時のみ |

- `locale` は [`providers/app-state-provider.tsx`](../expo/providers/app-state-provider.tsx) が保持（§9 のロケール判定で初期化）。
- 既存の `getIdentitiesInBucket` / `searchIdentities` 等は **registry メソッド化**し、hook 経由で active registry のものを使う。bare 関数版は global byId にのみ依存する `getIdentity` を残す。

### 8.6 id 命名規約と FoodLog 互換（破壊的移行なし）

- **JP Identity id は現状維持**（bare: `gyudon_class` 等）。既存ログは無改修で解決継続。
- **US Identity id は `us_` プレフィクス**（`us_cheeseburger` 等）。→ JP と衝突しないので `GLOBAL_BY_ID` マージが安全。
- バケットキー: **`DishBucketKey` union を US キーで拡張**（`'rice_dish' | … | 'burger_sandwich' | 'pizza_pasta' | …`）。
  `BucketDef` に **`locale: Locale`** を付与し、入力面は active locale で filter。
  ingredient バケットキーは **共有**（PFC軸は普遍）なので `BucketDef.locale` は省略可＝全ロケール表示。
- `Identity` に **`locale?: Locale`** を任意付与（ファイル単位で一括設定、global filter 補助）。id プレフィクスがあるので必須ではない。
- **マイグレーション不要（additive）**: US 追加は既存 JP データ・ログに一切触れない。
  唯一の考慮 = JPログ保有ユーザーがUSへ切替えた場合、履歴は `getIdentity`(global) で表示でき、新規記録はUS面で行う（混在ログは id プレフィクスで区別可能）。

### 8.7 単位表示の接続（§5）

`AmountUnit` には **`oz` / `cup` / `tbsp` を追加せず**、内部は metric 据え置き。
表示・入力は **`LocaleConfig.unitSystem` 駆動のフォーマッタ層**で metric↔US customary 変換（§5 推奨に一致）。
→ §9-1 を「フォーマッタ層」で確定。

### 8.8 i18n 基盤・ロケール判定（確定）

| 項目 | 決定 |
|---|---|
| **i18n ライブラリ** | **i18next + react-i18next**。`useTranslation` hook でロケール切替時に自動再レンダー（§8.5 の `useIdentityRegistry` hook と同じ reactive モデル）。UI文言のみ担当（食事DBは §6 のロケール差替） |
| **device 検出** | **expo-localization**。`getLocales()` の locale / regionCode / **measurementSystem** を取得。measurementSystem が §8.7 の `unitSystem`(metric/us) を自動決定（US端末→USフード＋oz/cup表示が自動） |
| **判定方式** | **ハイブリッド**: device 検出を初期値にし、既存 [`settings.tsx`](../expo/app/settings.tsx) で上書き可。UI言語はオンボ描画前に device locale から確定（鶏卵回避）、食事DBロケールは既定で UI に追従＋設定で変更可 |
| **v1 の単純化** | UI言語・食事DBロケール・単位系を **単一の `locale` で束ねる**（`ja`→JP/metric、`en-US`→US/customary）。将来デカップリング可 |
| **永続化** | 選択ロケールは [`app-state-provider`](../expo/providers/app-state-provider.tsx) に保持＋ストレージ永続化（再起動で device 再検出に戻さない） |

---

## 9. 未確定事項 / 次ステップ

**未確定（実装前に決める）**: ✅ **全て確定**
1. ~~`AmountUnit` 拡張 vs フォーマッタ層~~ → **フォーマッタ層**で確定（§8.7）
2. ~~dish バケットキーの型定義方式~~ → **union 拡張 ＋ `BucketDef.locale`** で確定（§8.6）
3. ~~`Identity.id` 命名規約と FoodLog 互換~~ → **`us_` プレフィクス・additive・移行不要**で確定（§8.6）
4. ~~i18n 基盤の選定~~ → **i18next + react-i18next + expo-localization**で確定（§8.8）
5. ~~ロケール判定~~ → **ハイブリッド（device検出＋設定上書き）**で確定（§8.8）

**次ステップ案**:
1. ~~本タクソノミのレビュー・確定~~ ✅ v1.0 確定
2. ~~Add-on 設計（US版）~~ ✅ §7 で確定（完全紐付けは実装時）
3. ~~型・registry のロケール対応設計~~ ✅ §8 で確定
4. ~~default macro の USDA FDC / チェーン値較正~~ ✅ §3.10 で dish 較正完了（食材タブは実装時）
5. registry リファクタ実装（buildRegistry 化）＋ `us/` データ実装着手。
6. 食材タブ Identity の完全列挙＋ USDA per-100g 較正（実装時）。
7. §10 栄養タグ層の実装（`NutritionTag` 定義＋ dish タグ付け表＋リゾルバ＋レポートビュー）。

---

## 10. 質リフレクション層（栄養タグ）— マクロの次のスモールステップ

> ステータス: **設計確定（栄養監修レビュー済み・実装前）** / 最終更新: 2026-06-08
> スコープ: **ja / en-US 共有層**（ingredient バケット軸が PFC普遍＝§4・§6 によりロケール非依存。本層は両ロケールに同時適用）

### 10.0 目的と科学的スタンス

マクロ管理（量）の次の段として、**食事の「質」への気づき**を、**ユーザー操作を1mmも増やさず**提供する。
栄養素カウント（繊維◯g・VitC◯mg）ではなく、**食品群の presence／傾向**で映す。これは現代の栄養科学（DGAの食事パターン重視・地中海/DASH・食の多様性と腸内細菌叢）と整合し、単押しユーザーに対して**偽の精度**を出さないための一次原則である。

- **量は出さない。傾向だけ。** 単押し＝標準サービングの推定にすぎないため、断定的な数値は扱わない。
- **質はマクロの代替ではなく二次レイヤー。** エネルギー収支は依然としてマクロ層が一次。質タグが「balanced」に見えても hypercaloric はありうる。
- **繊維は `veg / legume / whole_grain / fruit` の和集合として表現する**（意図的設計。繊維はエビデンス最強級の質レバーだが、単押しでg測定不能なため源の網羅で代理する）。

### 10.1 タグ語彙（`NutritionTag`）

裏側（タクソノミ）はリッチ、前面（レポート）は数個に絞る**二層**。

```ts
// constants/identity/nutrition-tags.ts （ロケール非依存・全ロケール共有）
export type NutritionTag =
  // 育てたい（presence・加算）
  | 'protein' | 'veg' | 'fish' | 'legume' | 'fermented'
  | 'whole_grain' | 'fruit' | 'unsat_fat' | 'dairy'
  // 見守り（中立フラグ・赤にしない・羞恥に転化しない）
  | 'refined_carb' | 'high_sodium' | 'sweet' | 'fried' | 'alcohol';
```

> `unsat_fat`（旧称 good_fat から改名）: 不飽和脂肪の便益は主に**飽和脂肪の置換**から来る。レポートコピーは「脂質を足すほど良い」と読めないようにする。

### 10.2 スキーマ変更（additive・マイグレーション不要 ＝ §8.6 思想に一致）

```ts
interface Identity { nutritionTags?: NutritionTag[]; }  // 「既定構成」の食品群
interface Addon    { nutritionTags?: NutritionTag[]; }  // トッピングも持つ
```

食材タブは **bucket→基本タグの自動マップ**で大半カバー、例外のみ Identity 個別上書き：

| bucket | 自動タグ | 個別上書き例 |
|---|---|---|
| lean_protein / egg | `protein` | — |
| fatty_protein | `protein` | salmon → `+fish +unsat_fat` |
| veggies | `veg` | beans → `+legume` |
| dairy_soy | `dairy` | yogurt → `+fermented` / tofu → `legume` |
| fruit | `fruit` | — |
| staple | （曖昧・既定 `refined_carb`） | oatmeal・全粒 → `whole_grain` |
| added_fat | （中立） | olive oil / nuts / PB → `unsat_fat` / butter・mayo → なし |
| snack_drink | `sweet` | alcohol系 → `alcohol` |

dish は明示タグ（キュレーションの本体・各料理1行）。例：

```
cheeseburger   → [protein, refined_carb, high_sodium]
entree_salad   → [veg, protein, unsat_fat]
burrito        → [protein, refined_carb, legume]      // §10.5 寛容度ルールに従う
poke_bowl      → [protein, fish, veg]
oatmeal        → [whole_grain]
soup_light     → [veg, protein]
fried_chicken  → [protein, fried]
seafood_plate(fried) → [protein, fish, fried]          // fish と fried を共存させる
```

### 10.3 リゾルバ（T0→T1 を層で読む）

```ts
function resolveNutritionTags(log: FoodLog): Set<NutritionTag> {
  const tags = new Set(getIdentity(log.identityId)?.nutritionTags ?? []); // T0: 既定構成だけで成立
  for (const a of log.appliedAddons ?? [])                                 // T1: トッピングは union のみ
    resolveAddon(a.refId)?.nutritionTags?.forEach(t => tags.add(t));
  return tags;
}
```

**肝**: base identity のタグ**だけで単押しが成立**。トッピングは union（加算）するだけで、**基本タグのゲートにはしない** → 「足さなくても損しない＝非強制」を実装レベルで保証（litmus test 突破）。

### 10.4 多様性の再定義（一皿料理問題が消える）

多様性 = 期間内に覆った **distinct `NutritionTag` 数**（distinct Identity 数**ではない**）。
→ カレーを1料理で記録しても食材4品で記録しても**タグ集合は同じ＝記録粒度に不変**。一皿料理でも食品群分カウントされる。

### 10.5 寛容度ルール（キュレーション判断をDB側に隔離）

> positive タグは**標準サービングで「主役級の量」を含むときのみ**付ける。バーガーの飾りレタス1枚 → `veg` を付けない。ブリトーの豆 → `legume` を付ける。token garnish は無視。
> **ロケールごとに再較正する**（和定食の野菜は実体、米国コンボの野菜はトークンになりがち）。

### 10.6 レポートのティア（全て既存フィールドに対応）

```
T0 wasShortTap のみ : 継続(既存log日付) + タグ網羅(多様性) + 正タグ頻度(veg/protein/fishに会えた回数)
T1 appliedAddons 有 : 同じ軸が少し正確に（下位ティアからは見えない＝invisible from below）
T2 mealSlot 有       : 「時間帯・欠食傾向」が“新規セクション出現”（withheld版ではない）
T3 amountValue 有    : ここで初めて“量”の話が解禁
```

- `wasShortTap` のログには **deficit を言わない**（欠落＝未記録の可能性＝冤罪回避）。presence-only で寄与。
- 既存 `AppSettings.mealStyleBySlot`（自炊/外食/中食）も**ゼロ入力で**「自炊傾向」軸に流用可。
- ティアは**餌(carrot)ではなく結果(consequence)**。上位を下位に宣伝しない。任意入力は新カテゴリを足すのではなく**既存軸を精緻化**する。

### 10.7 栄養監修ノート（不可侵の設計制約）

1. **ヘルスウォッシング防止**: positive タグだけで「balanced」に見せない。watch タグ（`refined_carb/high_sodium/fried/sweet/alcohol`）は**責めないが消さない**。質はエネルギー収支の代替ではない（マクロが一次）。
2. **非臨床フレーミング**: general wellness であって医療助言ではない旨を明記。タグは集団一般向けで、腎疾患・糖尿病・妊娠（魚の水銀）・アレルギー等では個別に逆になりうる。
3. **機序的健康効果を断定しない**: 特に `fermented`×腸はエビデンスが新しく弱い。中立な観測に留める（「発酵に会えた回数」等）。
4. **摂食障害（オルトレキシア）安全性**: 点数化しない／順位化しない／継続を「罰」にしない／watch を羞恥に転化しない。これらを不可侵ルールとする。
5. **`unsat_fat` は置換志向**: 「足すほど良い」と読ませない。
6. **`whole_grain` はスパースになりうる**（既定が refined に倒れる保守設計）。許容。

### 10.8 タグ付与基準（criteria）— 再現可能なキュレーション規約

> 原則: **「主役級の量を含むか」**で判断（§10.5）。飾り・薬味・少量コンディメントは付けない。

| tag | 付与条件 |
|---|---|
| `protein` | 肉/魚/卵/豆/乳が**主菜役**のたんぱく源。脇役チーズ(grilled_cheese P15)等は付けない |
| `veg` | 野菜/きのこ/海藻が**主役級の量**。バーガーの飾りレタス・薬味は除外 |
| `fish` | 魚介が主たんぱく（鮭/白身/エビ/ツナ/寿司ネタ）。**揚げでも付与し `fried` と共存**。`fish`は常に`protein`と共起 |
| `legume` | 豆/大豆が主役級（チリ・ブリトーの豆・豆腐） |
| `fermented` | 発酵食品が主役級（ヨーグルト/キムチ/味噌）。**機序的健康効果は主張しない**（§10.7-3） |
| `whole_grain` | 未精製穀物が主炭水化物源（オートミール/玄米/全粒/キヌア）。`refined_carb`と**主炭水化物について排他** |
| `fruit` | 果物が主役級 |
| `unsat_fat` | 不飽和脂肪源が主役級（魚/種実/オリーブ油/アボカド/PB）。**バター/マヨ/ラードは付けない**（置換志向 §10.7-5） |
| `dairy` | 乳製品が主要素（ピザ/グラチーズのチーズは主要素→付与。少量薬味チーズは除外） |
| `refined_carb` | 精製穀物/白米/白パン/麺/砂糖が主炭水化物源 |
| `high_sodium` | ファストフード/加工肉/缶スープ/アジアン外食の醤油系/メキシカン等、明らかな高ナトリウム |
| `sweet` | 砂糖添加が主（甘味飲料/菓子/シロップ/甘ソース） |
| `fried` | 主たる調理が揚げ |
| `alcohol` | アルコール飲料 |

> **じゃがいも（ベイクド/マッシュ）は starchy side** として `refined_carb`/`whole_grain`/`veg` のいずれも付けない（中間扱い）。→ `steak_potato`=`[protein]` は意図的。

### 10.9 dish Identity タグ付け表（US・実装値）

> §3.10 の全 dish Identity に対する `nutritionTags`。**設計アンカー**（実装時に献立サンプルでヘルスウォッシング QA → §11 監視項目）。

| Identity | nutritionTags |
|---|---|
| **burger_sandwich** | |
| `cheeseburger` | protein, refined_carb, high_sodium |
| `hamburger` | protein, refined_carb, high_sodium |
| `chicken_sandwich` | protein, refined_carb, fried, high_sodium |
| `deli_sub` | protein, refined_carb, high_sodium |
| `grilled_cheese` | refined_carb, dairy |
| `blt` | protein, refined_carb, high_sodium |
| `hot_dog` | protein, refined_carb, high_sodium |
| `wrap` | protein, refined_carb, high_sodium |
| `pbj` | refined_carb, unsat_fat, sweet |
| **pizza_pasta** | |
| `pizza_pepperoni` | protein, refined_carb, dairy, high_sodium |
| `pizza_cheese` | refined_carb, dairy, high_sodium |
| `pasta_tomato` | refined_carb |
| `pasta_alfredo` | refined_carb, dairy |
| `pasta_meat` | protein, refined_carb |
| `mac_cheese` | refined_carb, dairy |
| `lasagna` | protein, refined_carb, dairy |
| **chicken** | |
| `fried_chicken` | protein, fried, high_sodium |
| `tenders_nuggets` | protein, fried, high_sodium |
| `wings` | protein, fried, high_sodium |
| `rotisserie_grilled` | protein |
| `chicken_and_waffles` | protein, refined_carb, fried, sweet |
| **mexican** | |
| `burrito` | protein, refined_carb, legume, high_sodium |
| `tacos` | protein, refined_carb, high_sodium |
| `quesadilla` | protein, refined_carb, dairy, high_sodium |
| `nachos` | protein, refined_carb, fried, dairy, high_sodium |
| `burrito_bowl` | protein, refined_carb, legume, veg, high_sodium |
| `enchiladas` | protein, refined_carb, dairy, high_sodium |
| `fajitas` | protein, veg, refined_carb, high_sodium |
| **american_plate** | |
| `steak_potato` | protein |
| `meatloaf_mash` | protein, high_sodium |
| `bbq_plate` | protein, high_sodium |
| `roast_plate` | protein |
| `pot_pie` | protein, refined_carb, veg, high_sodium |
| `casserole` | protein, refined_carb, high_sodium |
| `seafood_plate` | protein, fish, fried, refined_carb, high_sodium |
| **soup_stew** | |
| `chili` | protein, legume, veg, high_sodium |
| `soup_light` | veg, high_sodium |
| `soup_creamy` | dairy, high_sodium |
| `stew_gumbo` | protein, veg, high_sodium |
| **bowl_salad** | |
| `entree_salad` | veg, protein |
| `grain_bowl` | protein, veg, whole_grain |
| `poke_bowl` | protein, fish, veg, refined_carb |
| `protein_salad` | protein, veg |
| **asian_takeout** | |
| `chinese_combo` | protein, refined_carb, fried, sweet, high_sodium |
| `lo_mein_fried_rice` | refined_carb, veg, high_sodium |
| `teriyaki_bowl` | protein, refined_carb, sweet, high_sodium |
| `pad_thai` | protein, refined_carb, high_sodium |
| `sushi_roll` | protein, fish, refined_carb |
| `ramen_pho` | protein, refined_carb, high_sodium |
| `curry_asian` | protein, refined_carb, high_sodium |
| **breakfast** | |
| `eggs_bacon` | protein, refined_carb, high_sodium |
| `pancakes_waffles` | refined_carb, sweet |
| `breakfast_sandwich` | protein, refined_carb, dairy, high_sodium |
| `breakfast_burrito` | protein, refined_carb, dairy, high_sodium |
| `oatmeal` | whole_grain |
| `avocado_toast` | refined_carb, unsat_fat |
| `biscuits_gravy` | refined_carb, high_sodium |

> Attribute（crispy/grilled 等）による補正は将来拡張。本表は **default attribute** を前提（例: `chicken_sandwich`/`seafood_plate` は既定 crispy/fried で `fried` 付与）。grilled 選択時に `fried` を外すのは Attribute 対応フェーズ（§11 Phase C）で。

### 10.10 食材バケット・Add-on タグ付け表

**食材タブ（bucket→基本タグ ＋ 個別上書き）**:

| bucket | 基本タグ | 個別上書き |
|---|---|---|
| `lean_protein` | protein | white fish/cod/tilapia/shrimp/canned tuna → +fish |
| `egg` | protein | — |
| `fatty_protein` | protein | salmon → +fish +unsat_fat / bacon・sausage → +high_sodium |
| `dairy_soy` | dairy | Greek yogurt → +fermented / tofu → legume(dairy外す) |
| `veggies` | veg | beans/legumes → +legume |
| `fruit` | fruit | — |
| `staple` | refined_carb | oatmeal/全粒/玄米/キヌア → whole_grain(refined外す) |
| `added_fat` | （なし=中立） | olive oil/nuts/peanut butter → unsat_fat（butter/mayo/ranchはなし） |
| `snack_drink` | （Identity別） | cookies/candy/ice cream/soda/sweet tea/frappuccino → sweet / chips → refined_carb+fried / protein bar → protein+sweet / beer/wine/cocktail/hard_seltzer → alcohol |

**Add-on（`nutritionTags`。無タグ＝食品群を主役級に持たないコンディメント）**:

| addon | tags | addon | tags |
|---|---|---|---|
| `cheese` | dairy | `peanut_butter` | unsat_fat |
| `egg` | protein | `nuts` | unsat_fat |
| `bacon` | protein, high_sodium | `avocado` | unsat_fat |
| `sausage_patty` | protein, high_sodium | `guacamole` | unsat_fat |
| `ham_deli` | protein, high_sodium | `berry_top` | fruit |
| `grilled_chicken_add` | protein | `banana_slice` | fruit |
| `extra_patty` | protein | `maple_syrup` | sweet |
| `extra_meat_scoop` | protein | `whipped_cream` | sweet |
| `butter` | （なし） | `jam` / `honey` | sweet |
| ketchup/ranch/bbq_sauce/buffalo_sauce/honey_mustard/sour_cream/salsa/queso/gravy/cream_cheese/tartar_sauce/cocktail_sauce/croutons | （なし） | | |

> Add-on は **union で精緻化（T1）**。例: `oatmeal`[whole_grain] + `berry_top` → +fruit、`entree_salad`[veg,protein] + `avocado` → +unsat_fat。**基本タグのゲートにはしない**（足さなくても損しない）。

### 10.11 実装範囲チェックリスト（これで実装可能）

- [x] `NutritionTag` 語彙確定（§10.1・育てたい9＋見守り5）
- [x] タグ付与基準確定（§10.8）
- [x] 全 US dish Identity タグ付け（§10.9）
- [x] 食材バケット map ＋ Add-on タグ（§10.10）
- [x] リゾルバ仕様（§10.3）／多様性定義（§10.4）／ティア定義（§10.6）／監修ガードレール（§10.7）
- [x] **JP dish タグ付け表**（§10.12・55品）
- [ ] 実装（型・リゾルバ・レポートビュー）

### 10.12 dish Identity タグ付け表（JP・`constants/identity/dishes.ts` 55品）

> §10.8 基準を**日本食の寛容度で再較正**して付与。和食は醤油/味噌/出汁文化で `high_sodium` が広めに付くのが実態（QA時に過剰でないか確認 → §11）。
> 特徴的判断: そば=`whole_grain`（蕎麦＝未精製）／味噌汁・豚汁=`fermented`／定食・弁当・鍋=`veg`を主役級にカウント／白米・うどん・素麺=`refined_carb`。

| Identity | label | nutritionTags |
|---|---|---|
| **rice_dish** | | |
| `gyudon_class` | 牛丼系 | protein, refined_carb, high_sodium |
| `kaisendon` | 海鮮丼 | protein, fish, refined_carb |
| `fried_rice_omurice` | チャーハン・オムライス | protein, refined_carb |
| `katsudon_tendon` | カツ丼・天丼 | protein, refined_carb, fried, high_sodium |
| `gapao_rice` | ガパオライス・エスニックライス | protein, refined_carb, high_sodium |
| `bibimbap` | ビビンバ | protein, veg, refined_carb |
| **curry** | | |
| `curry_class` | カレー・シチュー系 | protein, refined_carb, high_sodium |
| `katsu_curry` | カツカレー | protein, refined_carb, fried, high_sodium |
| `butter_chicken` | バターチキン | protein, refined_carb, dairy |
| `soup_curry` | スープカレー・グリーン | protein, veg, refined_carb |
| **chinese_noodles** | | |
| `ramen_light` | ラーメン(あっさり) | protein, refined_carb, high_sodium |
| `ramen_heavy` | ラーメン(こってり) | protein, refined_carb, high_sodium |
| `ramen_jiro` | 二郎系 | protein, veg, refined_carb, high_sodium |
| `tsukemen` | つけ麺・まぜそば | protein, refined_carb, high_sodium |
| `tantanmen` | 担々麺 | protein, refined_carb, high_sodium |
| `fried_noodles` | 焼そば | refined_carb, veg, high_sodium |
| `cold_noodles` | 冷やし中華・冷麺 | refined_carb, veg, high_sodium |
| **japanese_noodles** | | |
| `udon` | うどん | refined_carb, high_sodium |
| `soba` | そば | whole_grain, high_sodium |
| `tempura_noodle` | 天ぷら麺 | refined_carb, fried, high_sodium |
| `yaki_udon` | 焼うどん | refined_carb, veg, high_sodium |
| `somen` | そうめん | refined_carb, high_sodium |
| **pasta** | | |
| `pasta_tomato` | トマト系パスタ | refined_carb |
| `pasta_oil` | オイル系パスタ | refined_carb, unsat_fat |
| `pasta_cream` | クリーム系パスタ | refined_carb, dairy |
| `pasta_meat` | ミート系パスタ | protein, refined_carb |
| `pasta_japanese` | 和風パスタ | refined_carb |
| **sushi** | | |
| `sushi_plate` | 回転寿司(皿) | protein, fish, refined_carb |
| `sushi_piece` | セット寿司(貫) | protein, fish, refined_carb |
| `chirashi` | ちらし寿司 | protein, fish, refined_carb |
| `maki` | 巻き・いなり・手巻き | protein, fish, refined_carb |
| **sandwich** | | |
| `cold_sand` | サンドイッチ | protein, refined_carb |
| `hot_sand` | ホットサンド | protein, refined_carb, dairy |
| `burger` | バーガー | protein, refined_carb, high_sodium |
| `burrito_taco` | ブリトー・タコス | protein, refined_carb, high_sodium |
| `hot_dog_pita` | ホットドッグ・他 | protein, refined_carb, high_sodium |
| **pizza** | | |
| `pizza_simple` | マルゲリータ系 | refined_carb, dairy, high_sodium |
| `pizza_meat` | 肉系ピザ | protein, refined_carb, dairy, high_sodium |
| `pizza_cheese` | チーズ系ピザ | refined_carb, dairy, high_sodium |
| `pizza_seafood` | シーフード系ピザ | protein, fish, refined_carb, dairy, high_sodium |
| **misc_dish** | | |
| `teishoku` | 定食 | protein, veg, refined_carb, high_sodium |
| `bento` | 弁当 | protein, veg, refined_carb, high_sodium |
| `okonomi` | 粉もの | protein, veg, refined_carb, high_sodium |
| `tenshin` | 中華点心 | protein, refined_carb, high_sodium |
| `fried_main` | 揚げもの単品 | protein, fried, high_sodium |
| `yakitori` | 焼鳥・串もの | protein, high_sodium |
| `meat_solo` | 肉単品(ハンバーグ・ステーキ) | protein |
| `nabe_heavy` | 鍋もの(こってり) | protein, veg, high_sodium |
| `nabe_light` | 鍋もの(あっさり) | protein, veg |
| `sashimi` | 刺身盛り | protein, fish |
| `fresh_roll` | 生春巻き | protein, fish, veg |
| `miso_soup` | 味噌汁・お吸い物 | fermented, high_sodium |
| `tonjiru` | 豚汁・けんちん汁 | protein, veg, fermented, high_sodium |
| `soup_western` | 洋風スープ(薄) | veg, high_sodium |
| `soup_creamy` | クリームスープ | dairy, high_sodium |

> subType（親子丼/中華丼、塩/味噌、かけ/きつね 等）による補正は Attribute フェーズ（§11 Phase C）。本表は **default subType** 前提。
> JP 食材タブ・JP Add-on のタグ付けは実装時（US の §10.10 と同方式：bucketキー共有なので食材 bucket→基本タグ map はそのまま流用可）。

---

## 11. 実装優先度・ロードマップ

> 原則: **価値が高く・コストが低く・リスクが低い順**。質レイヤーは presence-only ほどリスクが低く、量を扱うほど（ED/医療）リスクが上がる。

### 重要な前提：質レイヤーは **JP-first で先行できる**

§10 は ja/en-US 共有層。**ja の dish データは既にコードにある**（`dishes.ts`）ため、質レイヤーMVPは **US-DB実装（§9 step5-6）を待たずに JP で先行リリース・検証可能**。US 分は `us-dishes.ts` 実装時に §10.9 のタグを同梱する。
→ JP dish タグ付け表は **§10.12 で作成済み（55品）**。残るは実装本体（型・リゾルバ・レポートビュー）＋ JP食材/Add-onタグ（実装時・bucket map流用）のみ。

### Phase A — 質MVP（最優先・低リスク）

| # | 項目 | 依存 | 備考 |
|---|---|---|---|
| A1 | `NutritionTag`型 ＋ 食材bucket→基本タグmap ＋ `resolveNutritionTags`（純ロジック） | — | UIなし。テスト容易 |
| A2 | dish タグ付け（**JP先行** → US は us-dishes同梱） | A1 | JPはタグ表作成が残タスク |
| A3 | **T0レポート**: 継続 ＋ 多様性(タグ網羅) ＋ 正タグ頻度。1リフレクション画面 | A1,A2 | presence-only・スコアなし。単押しユーザーに質の価値が届く |

→ **A だけで「マクロの次のスモールステップ」が成立**。

### Phase B — 精緻化（A検証後・低コスト）

| # | 項目 | 依存 | 備考 |
|---|---|---|---|
| B1 | Add-on タグ（§10.10）→ リゾルバが自動 union（T1） | A1 | レポートは自動で精緻化 |
| B2 | 見守りタグの傾向表示（refined_carb/high_sodium/fried/sweet/alcohol） | A3 | **羞恥に転化しない**・赤を出さない（§10.7-4） |

### Phase C — 任意ティア（需要が出たら・要再レビュー）

| # | 項目 | 依存 | 備考 |
|---|---|---|---|
| C1 | Attribute補正（crispy/grilled で fried 切替 等） | A2 | §10.9 注記参照 |
| C2 | `mealSlot` 任意入力（編集面のみ・クイック経路外）→ T2 時間帯/欠食 | A3 | invisible from below |
| C3 | 分量 → T3 量の解禁 | — | **最もリスク高（ED/医療）→ 栄養監修 再レビュー必須** |

### 横断（全フェーズ遵守）

- §10.7 監修ガードレール（スコアなし/順位なし/継続を罰にしない/deficit言わない）。
- **ヘルスウォッシング QA**: サンプル献立（例: 毎日バーガー週）で「positiveタグだけで緑塗れにならないか」をレビュー。`high_sodium` の過剰付与チェック。
- ロケール別タグ較正（JP/US で寛容度を別判断）。
