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
    900: '#264F44', // legacy: palette.text
  },

  // Ivory — 温かみのあるオフホワイト〜warm near-black。
  //   ライト側: 紙のような surface
  //   ダーク側: warm dark surface (dark mode の surface.default 用)
  // 50-600 は legacy palette と互換性を保つ。700-900 は dark mode 用に拡張。
  ivory: {
    50: '#FFFDF7',
    100: '#FBF8F2', // legacy: palette.surface
    200: '#F6F3EC', // legacy: palette.background
    300: '#F3EEE4', // legacy: palette.sheet
    400: '#EFE9DD', // legacy: palette.card
    500: '#E2DCCF', // legacy: palette.cardStrong
    600: '#DDD5C7', // legacy: palette.border
    700: '#8F8A7A', // mid-dark warm gray
    800: '#403A2E', // dark warm brown
    900: '#1D1913', // warm near-black (dark mode surface.default)
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
