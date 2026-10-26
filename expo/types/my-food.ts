/**
 * My食品 (PRD §6.5.4)。数値入力した名前つきの食品を、次から選べるように残したもの。
 *
 * Identity 辞書の外に置く (Identity / Attribute / Add-on ではない)。記録は現行の数値直接入力と同じ形
 * (Identity なし・名前と数値の写し) なので、My食品を編集・削除しても過去の記録は変わらない。
 */
export interface MyFood {
  id: string;
  name: string;
  /** 1回に食べる量あたり (記録の「× 倍率」の基準) */
  kcal: number;
  /** 未入力は null (直接入力と同じく PFC は任意) */
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  /** 「1本」「1杯」などの任意の単位名。無ければ単位は書かず kcal だけ表示する */
  unitLabel?: string;
  createdAtISO: string;
  /** 記録・保存のたびに更新。「最近使った順」の並びに使う */
  lastUsedAtISO: string;
}

/** My食品を作る・直すときの入力 (id・時刻を除く)。 */
export interface MyFoodInput {
  name: string;
  kcal: number;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  unitLabel?: string;
}

/** 「最近」に出す、検索から選んで記録したもの (PRD §6.5.4)。 */
export interface SearchRecent {
  kind: 'identity' | 'myFood';
  /** Identity ID または MyFood の id */
  id: string;
  atISO: string;
}
