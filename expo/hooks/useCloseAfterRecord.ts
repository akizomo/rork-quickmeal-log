/**
 * 記録シートで「新しく記録した」あとの閉じ方を決める。
 *
 * 検索ページ経由で開いたシート (スタックに `search` がある) なら、シートと検索ページを
 * **1回のナビゲーションでまとめて** ホームまで戻す。検索ページに留まると、記録できたのか分からない
 * (トーストは画面下でキーボードの裏に隠れる)。ホームなら合計カロリーの更新と取り消しトーストで結果が見える。
 * それ以外 (ホームの9ボタン・⭐️・My食品ページなど) はシートを閉じるだけ。
 *
 * 以前は「シートを router.back() → 検索ページがフォーカスを取り戻したら dismissTo('/')」の2段で戻していた。
 * JS 側のフォーカスはネイティブのシートが閉じ終わる前に戻るので、シートの退場アニメの最中に
 * 検索ページの pop が重なり、遷移がガタつき、ときどきクラッシュしていた (2026-10-31)。
 *
 * 編集・削除・キャンセルでは使わない (router.back() のまま)。
 */
import { useNavigation, useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useCloseAfterRecord() {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback(() => {
    const routes = navigation.getState()?.routes ?? [];
    if (routes.some((r) => r.name === 'search')) router.dismissTo('/');
    else router.back();
  }, [navigation, router]);
}
