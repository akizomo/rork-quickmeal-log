/**
 * 画面の中で計算した値をネイティブ formSheet ルートへ渡すための小さな受け渡し場所。
 *
 * formSheet はナビゲーションの画面なので、旧 BottomSheet のように props で値やコールバックを渡せない。
 * URL パラメータに載せにくいもの (計算済みのオブジェクトや操作の関数) は、呼び出し元の画面が
 * `useProvideSheetProps(key, value)` で置き、シート側が `useSheetProps(key)` で読む。
 * 呼び出し元が再計算すれば、開いているシートにもそのまま反映される。
 */
import { useEffect } from 'react';
import { create } from 'zustand';

type SheetPropsStore = {
  props: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
};

const useSheetPropsStore = create<SheetPropsStore>((set) => ({
  props: {},
  set: (key, value) => set((state) => ({ props: { ...state.props, [key]: value } })),
}));

/** 呼び出し元の画面で、シートに渡す最新の値を置く */
export function useProvideSheetProps<T>(key: string, value: T): void {
  useEffect(() => {
    useSheetPropsStore.getState().set(key, value);
  }, [key, value]);
}

/** シート側で値を読む。呼び出し元がまだ置いていなければ undefined */
export function useSheetProps<T>(key: string): T | undefined {
  return useSheetPropsStore((state) => state.props[key] as T | undefined);
}
