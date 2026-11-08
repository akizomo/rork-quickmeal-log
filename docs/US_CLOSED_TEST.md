# US クローズドテスト / Product Hunt 公開の手引き

> 2026-11-07 作成。目的: **US 版 (食事データ = American) を、英語圏のテスターに触ってもらい、辞書に無い語を集めてから Product Hunt に出す**。
> 背景と現況は [ROADMAP.md](./ROADMAP.md) の「US の食事データ・検索を日本版と同じ水準にする」、マクロの出典は [MACRO_SOURCES.md](./MACRO_SOURCES.md) §3.6。
> **これは私 (開発側) だけでは進められない。テスターを集めるのと、ビルドを配るのは人の作業。**

## 1. なぜ要るか (いまの数字)

| 指標 | 値 | 意味 |
|---|---|---|
| 外部基準 716語の名前着地 | 87% | **別名・辞書を、この一覧の未着地を見て書いたあとの値** (調整後) |
| ベンチマーク 1位正解 (調整用 / ホールドアウト) | 96% / 65% | ホールドアウトは何度か汚れた (経緯は ROADMAP) |
| 規則を固定したあとに書いた新しい語だけ (43語) | **55.8%** | 最も偏りの少ない汎化の値。**辞書・別名にない語の半分近くは、まだ望んだ食品がすぐ出ない** |
| 日本語版 | 87% | 目標 |

辞書・別名を私が書き足しても、**書いた本人の語にしか効かない**。足りないのは「アメリカ人が実際に打つ語」で、これは実ユーザーのデータでしか増やせない。

## 2. 公開の条件 (Product Hunt に出す前)

次を満たしたら出す。満たす前に出すと、初見の人が最初の数回の検索で離れる。

- [ ] 英語のテスター **5〜10人** が、US モードで 1週間以上 / 1人 20回以上の検索をした
- [ ] 集めた「見つからなかった食品」の語を、別名・語彙辞書・種類・Identity (IA-identity-spec §1.5 の順) で処理した
- [ ] **新しい語で測り直して**、1位正解が 80% 以上 (日本語版 87% に近づける)。ホールドアウトは、テスターの語から作り直す (私が書いた語は使わない)
- [ ] 設定の「Food List」を American にして、検索画面の候補チップ (`sloppy joe` と打つ) を **iOS シミュレーターか実機で目視**した (Web プレビューでは出ない)
- [ ] 主なチェーンの公式値との照合 (下の §5。API キー取得が要る)
- [ ] 英語のストアページ ([STORE_EN.md](./STORE_EN.md))・英語のスクリーンショット・価格 ($1.99 / $19.99 など切りのよい値) を設定した
- [ ] **EU を配信先に含めるなら DSA のトレーダー申告** (個人だと住所などが公開される)。含めないなら配信国から外す
- [ ] プライバシー: PostHog (使われ方の送信) を US/EU ユーザーに出すときの同意の取り方と、ストアのプライバシー表示を確認 ([ANALYTICS.md](./ANALYTICS.md))

## 3. テスターを集める

**配る先**: Reddit (r/loseit, r/CICO, r/fitness30plus など。ルールで宣伝が許される所だけ)、X、友人の紹介、日本在住の英語話者。**日本人の英語は参考にならない** (アメリカ人が打つ語が欲しい)。

**依頼文 (英語・そのまま使える)**

> Hi! I'm an indie developer building **Hachibu**, a calorie log where you log meals in 2–3 taps instead of searching and weighing — "roughly right, every day" instead of perfect once in a while.
>
> I'm testing the US food list and need real Americans to try to log what they actually eat. I'm looking for **5–10 testers for ~1 week**. Free (TestFlight / Google Play closed testing).
>
> What I'd ask: log your meals for a week, and when you search for something and **can't find it**, that's the most valuable thing to tell me.
>
> If you're in, reply with the email for TestFlight / your Google account for Play. Thank you!

**テスターへの案内 (配布時に添える)**

1. 設定 → **Food List** を **American** にする (端末が US 設定なら最初から American)
2. 1週間、食べたものを記録する。**見つからないとき、遠回りしたときは、そのまま困ってください** (数値入力で逃げる前に、探した語を覚えておくか、下の 3 へ)
3. 設定 → フィードバック → **Foods not found** (見つからなかった食品) を開き、**Share** で私に送る。送られるのは検索した語と回数だけで、食事の記録は含まれません
4. 気になった点があれば、設定のフィードバックのフォームへ

## 4. 集めたあとの回し方 (1週間ごと)

1. 届いた未ヒット語を [PROBLEMS.md](./PROBLEMS.md) に Signal として要旨で書く (**テスターの名前・原文は公開リポジトリに書かない**。語そのものは食品名なので書いてよいが、個人が特定される文脈は書かない)
2. 語を [IA-identity-spec.md](./IA-identity-spec.md) §1.5 の順に仕分ける: ① 別名 (`search-aliases.us.ts`) → ② 語彙辞書 (`vocabulary.us.ts`) → ③ 種類 → ④ トッピング → ⑤ 最後に Identity
3. **測り直す前に、ホールドアウトを新しい語で補充する**。テスターの語のうち、半分は別名・辞書に入れず、ホールドアウトに回す (入れた語の効果と、入れない語の汎化を分けて測るため)
4. `SEARCH_EVAL_PRINT=1 npx jest utils/search-benchmark.us` と `bun scripts/search-coverage-report-us.ts` で数字を出し、ROADMAP に書く

## 5. まだ足りないこと (私にできなかった / 人の作業が要る)

- **チェーン公式値との照合** (Big Mac・Chipotle・Olive Garden・Starbucks 等 = 料理の `defaultMacro` の基準): 公式サイトは JavaScript 描画で取得できなかった。USDA FoodData Central の **API キー** (無料・メール登録。DEMO_KEY は 10回/時間) があれば Branded Foods から引ける。キーの登録は私が代行しない。
- **料理 34件の FNDDS 照合** (組み合わせ料理・チェーン固有の料理): 比べる標準が無い。上の API で引けるチェーン商品か、テスターの実測が要る。
- **実機での確認**: US モードの検索の候補チップ、ヘルプの表、設定の「Food List」を実機で見る。
- **英語のテスター**: 上の §3。
