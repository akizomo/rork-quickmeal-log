/**
 * 食材・料理の記録シート (ネイティブ formSheet)。中身は components/IdentityLogSheet.tsx。
 *
 * 開閉の状態は従来どおり app-state の identityLogSheet が持つ (openIdentityLogSheet が状態を立てて
 * このルートを push する)。このルートは状態とナビゲーションの橋渡しだけをする:
 *   - 保存・削除・× などで状態が閉じたら → 画面を戻す
 *   - スワイプ・背景タップでシートが閉じられたら (状態はまだ開いている) → 状態を閉じる (onDismiss も発火)
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';

import { IdentityLogSheet } from '@/components/IdentityLogSheet';
import { useAppState } from '@/providers/app-state-provider';

export default function LogIdentityRoute() {
  const router = useRouter();
  const { identityLogSheet, closeIdentityLogSheet } = useAppState();
  const visible = identityLogSheet.visible;
  const wasVisibleRef = useRef(visible);
  const latestRef = useRef({ visible, closeIdentityLogSheet });
  useEffect(() => {
    latestRef.current = { visible, closeIdentityLogSheet };
  });

  useEffect(() => {
    if (wasVisibleRef.current && !visible) router.back();
    wasVisibleRef.current = visible;
  }, [visible, router]);

  useEffect(() => {
    return () => {
      // ネイティブ側で閉じられた (状態は開いたまま) 場合だけ、状態を閉じる
      if (latestRef.current.visible) latestRef.current.closeIdentityLogSheet();
    };
  }, []);

  return <IdentityLogSheet />;
}
