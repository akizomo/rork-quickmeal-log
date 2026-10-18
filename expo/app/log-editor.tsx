/**
 * 旧式ログ (ingredient / dish) の編集シート (ネイティブ formSheet)。中身は components/LogEditorSheet.tsx。
 *
 * 状態は app-state の editorLogId (setEditorLogId(id) が状態を立ててこのルートを push する)。
 *   - 追加・完了・削除で id が null になったら → 画面を戻す
 *   - スワイプ等でシートが閉じられたら (id はまだ残っている) → 「閉じる」と同じ扱い
 *     (編集前の仮ログなら取り消し、既存ログなら変更はその場で保存済み)
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';

import { LogEditorSheet } from '@/components/LogEditorSheet';
import { useAppState } from '@/providers/app-state-provider';

export default function LogEditorRoute() {
  const router = useRouter();
  const { editorLog, editorIsPending, setEditorLogId, cancelPendingLog } = useAppState();
  const open = editorLog != null;
  const wasOpenRef = useRef(open);
  const latestRef = useRef({ editorLog, editorIsPending, setEditorLogId, cancelPendingLog });
  useEffect(() => {
    latestRef.current = { editorLog, editorIsPending, setEditorLogId, cancelPendingLog };
  });

  useEffect(() => {
    if (wasOpenRef.current && !open) router.back();
    wasOpenRef.current = open;
  }, [open, router]);

  useEffect(() => {
    return () => {
      const { editorLog: log, editorIsPending: pending, setEditorLogId: setId, cancelPendingLog: cancel } = latestRef.current;
      if (!log) return;
      if (pending) cancel(log.id);
      setId(null);
    };
  }, []);

  return <LogEditorSheet />;
}
