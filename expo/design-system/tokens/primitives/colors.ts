/**
 * Primitive color tokens — 生の色スケール。
 *
 * ここには「意味」を持たせない。意味付けは semantic 層で行う。
 * カラー名は **hue (色相) のみ** を表す。
 *   NG: `danger`, `success`, `accent`, `primary` — これらは役割
 *   OK: `sage`, `ai`, `fog`, `tan`, `amber`, `slate` — これらは色相
 *
 * 10段階 (50/100/200/300/400/500/600/700/800/900) を基本とする。
 *
 * 設計根拠:
 * - 既存 palette の値 (`#B9C9B1` 等) を破壊せず、300/400/500 などに配置
 * - iOS HIG / Material いずれにも対応するため、中性度を高めに取る
 * - 案A · 藍 (Ai): accent=ai(藍), info=fog(霧), PFC=terracotta/kogecha/seagrass
 */

export const colors = {
  // Sage — 落ち着いた緑。ブランドの基調。
  sage: {
    50: '#F2F6EF',
    100: '#E1EADD',
    200: '#C9D8C2',
    300: '#B9C9B1', // legacy: palette.sage
    400: '#9AB594',
    500: '#82A280',
    600: '#6D8D76', // legacy: palette.sageStrong
    700: '#54736C',
    800: '#355E52', // legacy: palette.sageDeep
    900: '#264F44', // legacy: palette.text — light の pressed/onContainer 用に留める
    // sage[900](L*30.5)は他色相の900(L*4〜10.5)と比べて突出して明るく、
    // dark action.primary.container に転用すると通常ボタン並みに目立ちすぎた
    // (2026-08-07指摘)。light の container(sage[100]) が背景比CR1.11〜1.21の
    // 「薄い色付け」に留まっているのに合わせ、同程度のCR(1.18)になる専用の
    // 深い段を追加。sage[900]自体はlight側の役割を壊さないよう変更しない。
    950: '#022E24',
  },

  // Ivory — 温かみのあるオフホワイト〜warm near-black。
  //   ライト側: 紙のような surface
  //   ダーク側: warm dark surface (dark mode の surface.default 用)
  // 50-600 は legacy palette と互換性を保つ。700-950 は dark mode 用に拡張。
  // 番号が上がるほど暗い**絶対**スケール (テーマ相対ではない)。
  //
  // surface スタックは「層が上がるほど明るい」で light/dark 共通。
  // light は明るい端に 300 → 200 → 50、dark は暗い端に 950 → 900 → 850 と、
  // それぞれ密な梯子を作る (2026-08-06、ΔL* を実測して鏡像化)。
  // 850/950 は 900 を動かさずに梯子を通すための追加段。
  //
  // sunken (300/950) は「凹み」の自己コントラストが弱すぎる問題があった:
  //   旧 light 300 '#F3EEE4' は default(200) 比 CR1.04、
  //   旧 dark  950 '#191510' は default(900) 比 CR1.04 で、単体ではほぼ
  //   視認できなかった (2026-08-06 指摘)。light は CR1.19 まで暗くした
  //   値に、dark も同じ CR1.19 になる値に作り直した。dark は輝度が非線形
  //   なため CR1.19 を満たすには L*0.4 (ほぼ純黒) まで暗くする必要があった —
  //   これは「黒すぎて嫌」ではなく「コントラストとして正しい」ので許容する。
  //   (raised(850)比のCRも1.12→1.28まで自然に強化された)
  //
  // 700/800 は中間トーン専用 (disabled 塗り・inverse border 等)。旧値は
  // legacy palette からの寄せ集めで、600(L*85.5)→700(L*57.5)→800(L*24.7)と
  // 前後に対して1桁違うジャンプがあり、色相もH87.4°→96.5°→87.4°とジグザグ
  // していた (2026-08-06 に発覚)。600と825を固定アンカーに、L*・色相・彩度
  // (Lab の L*/hue/C*) を3等分で同時補間し、単調ランプに作り直した。
  ivory: {
    50: '#FFFDF7',
    100: '#FBF8F2', // legacy: palette.surface
    200: '#F6F3EC', // legacy: palette.background
    300: '#E5E0D7', // sunken用 (旧'#F3EEE4'はdefault比CR1.04で自己コントラストが弱すぎたため2026-08-06に強化、CR1.19)
    400: '#EFE9DD', // legacy: palette.card
    500: '#E2DCCF', // legacy: palette.cardStrong
    600: '#DDD5C7', // legacy: palette.border
    700: '#9E978B', // L*62.7 (600→825を3等分)
    800: '#645E53', // L*40.1 (600→825を3等分) — dark border.default
    825: '#2F2A21', // dark border.subtle   (L*17.3)
    850: '#242019', // dark surface.raised  (L*12.5)
    900: '#1D1913', // dark surface.default (L* 9.0) — warm near-black
    950: '#080000', // dark surface.sunken (L*0.4、旧'#191510'はdefault比CR1.04で弱すぎたため2026-08-06に強化、CR1.19)
  },

  // Stone — 青みのないニュートラルグレー。
  stone: {
    50: '#F7F7F6',
    100: '#ECECEA',
    200: '#D8D8D4',
    300: '#BFBFB9',
    400: '#9FA09A',
    500: '#80817A',
    600: '#6E776E', // legacy: palette.textMuted
    700: '#4C534B',
    800: '#30352F',
    900: '#1C1C1A',
  },

  // Ai (藍) — 伝統的な藍染めの indigo blue。accent 専用。
  // 暖色系 PFC (terracotta/kogecha) と hue family を分離するため cool 側 (~H=220°) を採用。
  // 彩度を抑えた大人しい藍。
  ai: {
    50:  '#EDF0FA',
    100: '#D0D9F5', // accent.subtle
    200: '#ADBAE9',
    300: '#8498D8',
    400: '#617AC4',
    500: '#4660AF',
    600: '#374E98', // accent.default
    700: '#2A3C7E', // Badge fg
    800: '#1D2C5E',
    900: '#101840',
  },

  // Clay — 土っぽい赤。sage と同じウェルネス感の中で使える warm red。
  clay: {
    50: '#FBF0EE',
    100: '#F2D6D1',
    200: '#E5AEA6',
    300: '#D18076',
    400: '#A8645E', // legacy: palette.danger
    500: '#8E4B47',
    600: '#72352F',
    700: '#561F1C',
    800: '#3A1110',
    900: '#200808',
  },

  // Moss — sage より鮮やかな緑。肯定/達成の表現で使える hue。
  moss: {
    50: '#EEF6ED',
    100: '#D6E8D2',
    200: '#B4D3AE',
    300: '#8EBB87',
    400: '#6D9F65',
    500: '#52864B',
    600: '#3E6B38',
    700: '#2E522A',
    800: '#1F391D',
    900: '#112010',
  },

  // Amber — 黄金色/蜂蜜色の hue。
  amber: {
    50: '#FDF5E4',
    100: '#FAE6B8',
    200: '#F4D07E',
    300: '#EBB44A',
    400: '#D89A27',
    500: '#B57E18',
    600: '#8E6111',
    700: '#68460C',
    800: '#452D07',
    900: '#261903',
  },

  // Fog (霧) — 霞がかった青みグレー。info/中性情報 専用。
  // slate より低彩度・もやがかった印象。H≈205°
  fog: {
    50:  '#EDF3F7',
    100: '#CDD9E3', // info bg
    200: '#A4BFD0',
    300: '#7AA3BB',
    400: '#5488A5',
    500: '#3C6F8A',
    600: '#2E5770',
    700: '#224055', // info fg
    800: '#162B3A',
    900: '#0B1820',
  },

  // Terracotta (テラコッタ) — 煉瓦・肌色の warm red-orange。nutrition.protein 専用。
  // clay (status.danger) より orange 寄りの H≈14°。
  terracotta: {
    50:  '#FCF0EC',
    100: '#F5D3C5',
    200: '#ECAD98',
    300: '#E07F66',
    400: '#C75A3E',
    500: '#A5402A',
    600: '#83301D',
    700: '#612213',
    800: '#41150B',
    900: '#220A05',
  },

  // Kogecha (焦茶) — 焦げ茶色。nutrition.fat 専用。
  // amber (status.warning) より赤みが強く暗い brown。H≈24°
  kogecha: {
    50:  '#FAF0E6',
    100: '#F0D0AB',
    200: '#E2A870',
    300: '#CC7A3B',
    400: '#AB5B1C',
    500: '#8A4413',
    600: '#6C310D',
    700: '#4F2208',
    800: '#321404',
    900: '#1A0A02',
  },

  // Seagrass (海草) — 海草・海浜植物の blue-green。nutrition.carbs 専用。
  // moss (status.success, H≈120°) と区別するため teal 側 (~H=160°) を採用。
  seagrass: {
    50:  '#EAFAF5',
    100: '#C5EFE2',
    200: '#96DDCA',
    300: '#64C7B0',
    400: '#3EAF97',
    500: '#2D8F7A',
    600: '#237162',
    700: '#1A564B',
    800: '#113B34',
    900: '#08201C',
  },

  // Absolutes
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = typeof colors;
export type ColorShade = keyof typeof colors.sage;
