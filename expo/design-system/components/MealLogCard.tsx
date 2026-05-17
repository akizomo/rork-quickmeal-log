/**
 * MealLogCard — 食事ログ用のスロット型カード。
 *
 * 構成:
 *   <MealLogCard onPress={...}>
 *     <MealLogCard.Header title bucket? kcal time onDelete />
 *     <MealLogCard.Body amount subtitle? addons? protein fat carbs />
 *   </MealLogCard>
 *
 * - 高さは常に 2 行 (Header + Body) に揃え、ログ一覧のリズムを保つ
 * - 削除はゴミ箱アイコンで Header 右端に同居 (独立行を作らない)
 * - PFC マクロは MacroChip atom で意味付き hue (terracotta / kogecha / seagrass)
 * - 全カラー・spacing・radius は useTheme() 由来 (hex 直書きゼロ)
 */

import React from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Badge } from './Badge';
import { Card } from './Card';
import { MacroChip } from './MacroChip';

// ---------- Root ----------

export type MealLogCardProps = {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function MealLogCardRoot({ onPress, children, style, testID }: MealLogCardProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        {
          opacity: pressed && onPress ? 0.85 : 1,
          borderRadius: t.radius['2xl'],
        },
        style,
      ]}
    >
      <Card variant="raised" style={{ gap: t.spacing['2'] }}>
        {children}
      </Card>
    </Pressable>
  );
}

// ---------- Header ----------

export type MealLogCardHeaderProps = {
  title: string;
  bucket?: string | null | undefined;
  kcal: number;
  time: string;
  onDelete?: () => void;
  deleteTestID?: string;
};

function MealLogCardHeader({
  title,
  bucket,
  kcal,
  time,
  onDelete,
  deleteTestID,
}: MealLogCardHeaderProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: t.spacing['3'],
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing['2'],
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontSize: t.typography.fontSize.md,
            lineHeight: t.typography.lineHeight.md,
            fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
            color: t.colors.content.primary,
          }}
        >
          {title}
        </Text>
        {bucket ? (
          <Badge tone="neutral" size="sm">
            {bucket}
          </Badge>
        ) : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing['2'],
        }}
      >
        <Text
          style={{
            fontSize: t.typography.fontSize.sm,
            lineHeight: t.typography.lineHeight.sm,
            fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
            color: t.colors.action.primary.default,
          }}
        >
          {Math.round(kcal)} kcal
        </Text>
        <Text
          style={{
            fontSize: t.typography.fontSize.xs,
            lineHeight: t.typography.lineHeight.xs,
            color: t.colors.content.tertiary,
          }}
        >
          · {time}
        </Text>
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="削除"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            testID={deleteTestID}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            {({ pressed }) => (
              <Trash2
                size={18}
                color={
                  pressed
                    ? t.colors.status.danger
                    : t.colors.content.tertiary
                }
              />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ---------- Body ----------

export type MealLogCardBodyProps = {
  amount: string;
  subtitle?: string | null | undefined;
  addons?: string | null | undefined;
  protein: number;
  fat: number;
  carbs: number;
  subtitleTestID?: string;
  addonsTestID?: string;
};

function MealLogCardBody({
  amount,
  subtitle,
  addons,
  protein,
  fat,
  carbs,
  subtitleTestID,
  addonsTestID,
}: MealLogCardBodyProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: t.spacing['3'],
      }}
    >
      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          fontSize: t.typography.fontSize.sm,
          lineHeight: t.typography.lineHeight.sm,
          color: t.colors.content.secondary,
        }}
      >
        <Text style={{ color: t.colors.content.tertiary }}>{amount}</Text>
        {subtitle ? (
          <Text
            testID={subtitleTestID}
            style={{
              color: t.colors.content.secondary,
              fontWeight: t.typography.fontWeight.medium as TextStyle['fontWeight'],
            }}
          >
            {` · ${subtitle}`}
          </Text>
        ) : null}
        {addons ? (
          <Text
            testID={addonsTestID}
            style={{
              color: t.colors.action.text.default,
              fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
            }}
          >
            {` · ${addons}`}
          </Text>
        ) : null}
      </Text>
      <View style={{ flexDirection: 'row', gap: t.spacing['1'] }}>
        <MacroChip kind="protein" value={protein} />
        <MacroChip kind="fat" value={fat} />
        <MacroChip kind="carbs" value={carbs} />
      </View>
    </View>
  );
}

// ---------- Compound export ----------

export const MealLogCard = Object.assign(MealLogCardRoot, {
  Header: MealLogCardHeader,
  Body: MealLogCardBody,
});
