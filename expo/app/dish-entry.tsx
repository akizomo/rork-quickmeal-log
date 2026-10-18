/**
 * 一皿料理のクイック記録シート (ネイティブ formSheet)。中身は components/DishQuickEntrySheet.tsx。
 *
 * 状態は app-state の dishQuickEntryKey (setDishQuickEntryKey(key) が状態を立ててこのルートを push する)。
 *   - 保存・× で key が null になったら → 画面を戻す
 *   - スワイプ等でシートが閉じられたら (key はまだ残っている) → key を null にする
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';

import { DishQuickEntrySheet } from '@/components/DishQuickEntrySheet';
import { useAppState } from '@/providers/app-state-provider';

export default function DishEntryRoute() {
  const router = useRouter();
  const { dishQuickEntryKey, setDishQuickEntryKey } = useAppState();
  const open = Boolean(dishQuickEntryKey);
  const wasOpenRef = useRef(open);
  const latestRef = useRef({ open, setDishQuickEntryKey });
  useEffect(() => {
    latestRef.current = { open, setDishQuickEntryKey };
  });

  useEffect(() => {
    if (wasOpenRef.current && !open) router.back();
    wasOpenRef.current = open;
  }, [open, router]);

  useEffect(() => {
    return () => {
      if (latestRef.current.open) latestRef.current.setDishQuickEntryKey(null);
    };
  }, []);

  return <DishQuickEntrySheet />;
}
