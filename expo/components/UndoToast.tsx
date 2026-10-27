/**
 * UndoToast — ホームで食事を記録・削除した直後に出す「取り消す」付きトースト。
 * 見た目と動きは design-system の Toast。ここは app-state の undoState とつなぎ、画面下に置くだけ。
 */
import React, { memo, useState } from 'react';

import { Toast, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { getLogDisplayInfo } from '@/utils/log-display';

export const UndoToast = memo(function UndoToast() {
  const { undoState, undoLastLog, dismissUndo, settings } = useAppState();
  const t = useTheme();
  const tr = useT();
  // 消えていくアニメーションの間も文面を残すため、最後に出した内容を持っておく
  const [content, setContent] = useState<typeof undoState>(null);
  if (undoState && undoState !== content) setContent(undoState);
  const active = undoState ?? content;
  if (!active) return null;

  const label = getLogDisplayInfo(active.log, settings.uiLanguage).title;
  return (
    <Toast
      visible={!!undoState}
      message={tr(active.kind === 'delete' ? 'undoToast.deleted' : 'undoToast.recorded', { label })}
      emphasis={label}
      action={{ label: tr('undoToast.undo'), onPress: undoLastLog, testID: 'undo-button' }}
      onDismiss={dismissUndo}
      style={{ position: 'absolute', left: t.spacing['5'], right: t.spacing['5'], bottom: t.spacing['6'] }}
      testID="undo-toast"
    />
  );
});
