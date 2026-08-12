import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/design-system';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';

export function MiniProgressBar({ letter, label, current, target, textColor, graphicColor, trackColor }: {
  letter: string;
  label: string;
  current: number;
  target: number;
  /** P/F/C の文字色。AA コントラスト確認済みの nutrition.*.text を渡す。 */
  textColor: string;
  /** バー塗り色。nutrition.*.graphic (text より彩度高め) を渡す。 */
  graphicColor: string;
  /** 空バーの下地色。nutrition.*.background (マクロごとの薄いトーン) を渡す。 */
  trackColor: string;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  return (
    <View style={styles.miniBarItem}>
      <Text style={styles.miniBarLabel}>
        <Text style={[styles.miniBarLetter, { color: textColor }]}>{letter}</Text>
        {' '}
        {label}
      </Text>
      <View style={[styles.miniBarTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.miniBarFill, { width: `${progress * 100}%`, backgroundColor: graphicColor }]} />
      </View>
      <Text style={styles.miniBarValue}>
        {Math.round(current)}
        <Text style={styles.miniBarValueTarget}> / {Math.round(target)} g</Text>
      </Text>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  miniBarItem: { flex: 1, gap: 4 },
  miniBarLabel: { fontSize: fs.sm, color: t.colors.content.secondary, fontWeight: '600' },
  miniBarLetter: { fontWeight: '700' },
  miniBarTrack: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: radius.full },
  miniBarValue: { fontSize: fs.sm, color: t.colors.content.primary, fontWeight: '600' },
  miniBarValueTarget: { color: t.colors.content.secondary, fontWeight: '600' },
});
