/**
 * 記録シートの下部 (ボトムアクション) の共通部品。食材の記録シート (IdentityLogSheet) と
 * My食品の記録シート (MyFoodLogSheet) で同じ見た目・同じ流れにする (PRD §6.5.3 v1.18)。
 *
 *   [名前 / kcal / PFC]  [⭐️]  [記録ボタン (TallSheetScreen の primaryAction)]
 *
 * - LogFooterPreview: TallSheetScreen の `footerLeft` に渡す。kcal・PFC のプレビューと ⭐️ ボタン
 * - usePinNotice: ⭐️ を押した結果をシート内で伝える (`footerAccessory` に渡す)。
 *   ネイティブのシートの上にはアプリ全体のトーストが出ないため、シートの中に出す
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Callout, IconButton, Label, Toast, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import type { Macro } from '@/types/nutrition';

export type LogFooterPin = {
  /** ⭐️ に入れるものの名前 (kcal の上に出す) */
  label: string;
  pinned: boolean;
  onToggle: () => void;
  /** ⭐️ ボタンの中心 x (フッター行の左端から)。初回の吹き出しの尻尾を向けるのに使う */
  onCenterX?: (x: number) => void;
};

/**
 * `kcal` + `P/F/C` を主ボタンの隣に出す (EC のカート風)。量が決まっていないときは
 * 薄いプレースホルダを出し、フッターが空に見えないようにする。
 * pin を渡すと、名前を kcal の上に出し、保存ボタンのすぐ左に ⭐️ を置く
 * (「プレビューしたものを、⭐️ に入れるか、記録に追加するか」の流れ)。
 */
export function LogFooterPreview({
  macro,
  pin,
  testIDPrefix = 'ils',
}: {
  macro: Macro | null;
  pin?: LogFooterPin;
  testIDPrefix?: string;
}) {
  const t = useTheme();
  const tr = useT();
  const ready = !!macro && macro.kcal > 0;
  const preview = (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      {pin ? (
        <Label size="sm" tone="secondary" numberOfLines={1} testID={`${testIDPrefix}-preview-name`}>
          {pin.label}
        </Label>
      ) : null}
      <Text
        style={{
          fontSize: t.typography.fontSize.lg,
          fontWeight: '700',
          color: ready ? t.colors.content.primary : t.colors.content.tertiary,
        }}
        testID={`${testIDPrefix}-preview-kcal`}
      >
        {ready ? `${Math.round(macro!.kcal)} kcal` : '— kcal'}
      </Text>
      <Text
        style={{
          fontSize: t.typography.fontSize.xs,
          color: t.colors.content.secondary,
          marginTop: 2,
        }}
        testID={`${testIDPrefix}-preview-pfc`}
      >
        {ready
          ? `P${Math.round(macro!.protein)} · F${Math.round(macro!.fat)} · C${Math.round(macro!.carbs)}`
          : 'P— · F— · C—'}
      </Text>
    </View>
  );
  if (!pin) return preview;
  // 押せると分かるよう、枠つきの丸ボタン (入れたら塗り + 色)
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing['2'] }}>
      {preview}
      <View onLayout={(e) => pin.onCenterX?.(e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2)}>
        <IconButton
          icon={pin.pinned ? 'star' : 'starOutline'}
          size="lg"
          variant={pin.pinned ? 'filled' : 'outlined'}
          tone={pin.pinned ? 'action' : 'secondary'}
          onPress={pin.onToggle}
          accessibilityLabel={tr(pin.pinned ? 'identityLog.pin.removeA11y' : 'identityLog.pin.addA11y', { label: pin.label })}
          testID={`${testIDPrefix}-pin`}
        />
      </View>
    </View>
  );
}

export type PinNoticeKind = 'added' | 'addedFirst' | 'toast';

/**
 * ⭐️ に入れた結果をシート内で伝える。
 *   初めて入れたとき: 説明つきの吹き出し (生涯1回。約3秒)。⭐️ タブがまだ出ていない人には、タブが現れることも伝える
 *   2回目以降に入れたとき: 結果だけの短いトースト (1.6秒。何も出ないと押せたか気になる)
 *   はずしたとき: 何も出さない (星の塗りが消えるだけ)
 */
export function usePinNotice(testIDPrefix = 'ils') {
  const t = useTheme();
  const tr = useT();
  const [notice, setNotice] = useState<PinNoticeKind | null>(null);
  // 通知の主語 (何をお気に入りに追加したか)。通知が出ている間に別のものへ切り替えても、押した時点の名前のままにする
  const [label, setLabel] = useState('');
  // ⭐️ボタンの中心 x (フッター行の左端から)。初回の吹き出しの尻尾をボタンに向けるのに使う (トーストは中央のまま)
  const [centerX, setCenterX] = useState<number | null>(null);
  // フッター行の左余白 (spacing 5) と、吹き出し置き場の左余白 (spacing 4、TallSheetScreen) の差を足して、吹き出し置き場の座標にする
  const anchorX = centerX === null ? undefined : centerX + (t.spacing['5'] - t.spacing['4']);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  /**
   * ⭐️ を押した直後に呼ぶ。
   * firstEver: まだ一度もお気に入りに入れたことがない (settings.pinNoticeSeenAtISO が無い)
   * tabWasHidden: 押す前は⭐️タブが出ていなかった
   */
  const announce = useCallback(
    (opts: { adding: boolean; label: string; firstEver: boolean; tabWasHidden: boolean }) => {
      let next: PinNoticeKind | null = null;
      if (opts.adding && opts.firstEver) next = opts.tabWasHidden ? 'addedFirst' : 'added';
      else if (opts.adding) next = 'toast';
      setNotice(next);
      setLabel(opts.label);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (next) timerRef.current = setTimeout(() => setNotice(null), next === 'toast' ? 1600 : 3200);
    },
    [],
  );

  const callout = notice === 'added' || notice === 'addedFirst' ? notice : null;
  const accessory = (
    <>
      <Callout
        visible={callout !== null}
        title={callout ? tr(`identityLog.pin.notice.${callout}.title`, { label }) : undefined}
        message={callout ? tr(`identityLog.pin.notice.${callout}.message`) : ' '}
        titleEmphasis={label}
        arrowAlign="center"
        arrowOffset={anchorX}
        testID={`${testIDPrefix}-pin-notice`}
      />
      <Toast
        visible={notice === 'toast'}
        message={tr('identityLog.pin.notice.toast', { label })}
        emphasis={label}
        style={{ marginBottom: t.spacing['2'] }}
        testID={`${testIDPrefix}-pin-toast`}
      />
    </>
  );

  return { notice, announce, onCenterX: setCenterX, accessory };
}
