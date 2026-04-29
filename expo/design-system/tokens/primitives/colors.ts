/**
 * Primitive color tokens — 生の色スケール。
 *
 * ここには「意味」を持たせない。意味付けは semantic 層で行う。
 * カラー名は **hue (色相) のみ** を表す。
 *   NG: `danger`, `success`, `accent`, `primary` — これらは役割
 *   OK: `sage`, `clay`, `moss`, `tan`, `amber`, `slate` — これらは色相
 *
 * 10段階 (50/100/200/300/400/500/600/700/800/900) を基本とする。
 *
 * 設計根拠:
 * - 既存 palette の値 (`#B9C9B1` 等) を破壊せず、300/400/500 などに配置
 * - iOS HIG / Material いずれにも対応するため、中性度を高めに取る
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

  // Lavender — muted / dusty lavender hue (accent 専用)。
  // cinnamon (fat) / amber (warning) / clay (danger) など暖色系と hue family を
  // 分離するため cool 側 (~H=270°) を採用。ネオンにならないよう低彩度。
  lavender: {
    50: '#F5F2FA',
    100: '#E6DEF3', // accent.subtle
    200: '#D1C4E8',
    300: '#B6A2D4', // accent.default (大人しい紫)
    400: '#977CBE',
    500: '#7A5FA3',
    600: '#5F4880',
    700: '#45335D',
    800: '#2C203A',
    900: '#16101D',
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

  // Slate — 青みがかったブルーグレー hue。
  slate: {
    50: '#EDF3F6',
    100: '#D1E0E8',
    200: '#ABC6D4',
    300: '#81A9BD',
    400: '#5A8BA3',
    500: '#406F87',
    600: '#32586B',
    700: '#26424F',
    800: '#192C35',
    900: '#0D171C',
  },

  // Rose — pink-red hue (nutrition.protein 専用)。clay (status.danger) と区別。
  rose: {
    50: '#FBEDEF',
    100: '#F5CDD4',
    200: '#EAA2AD',
    300: '#D97583',
    400: '#C35362',
    500: '#A84A5A',
    600: '#863848',
    700: '#622733',
    800: '#3F1820',
    900: '#200C11',
  },

  // Cinnamon — red-brown hue (nutrition.fat 専用)。
  // amber (status.warning) のクリアな黄金とは別 hue family (赤みの強い茶色)。
  cinnamon: {
    50: '#FAEDE3',
    100: '#F0CCAD',
    200: '#E3A675',
    300: '#CE7A40',
    400: '#AD571E',
    500: '#8B3E14',
    600: '#6B2E0E',
    700: '#4E2009',
    800: '#301305',
    900: '#180902',
  },

  // Olive — yellow-green hue (nutrition.carbs 専用)。moss (status.success) と区別。
  olive: {
    50: '#F6F6E1',
    100: '#E7E8AE',
    200: '#D0D278',
    300: '#B1B548',
    400: '#8C9128',
    500: '#6E7519',
    600: '#565B13',
    700: '#3E430C',
    800: '#272A07',
    900: '#131502',
  },

  // Absolutes
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = typeof colors;
export type ColorShade = keyof typeof colors.sage;
