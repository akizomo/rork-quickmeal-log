/**
 * 診断データ (KPI計装 Layer 1) の型定義。
 *
 * 背景: 製品Analytics が未導入のため、まずは端末内に最小限の信号を貯め、
 * `/dev/diagnostics` からエクスポートしてクローズドテストの回答を得る。
 * Layer 2 (本番前) で同じ定義を解析ベンダーへ流す。
 * 詳細は docs/ROADMAP.md §3.0「次の一手: KPI計装」。
 *
 * 設計方針: N=数人では「率」は母数不足でノイズになるため、
 * **「内容」(何が起きたかのリスト) と「二値/回数」** を優先して持つ。
 */

/** 検索したがヒットしなかったクエリ。同一クエリは集約して回数で持つ。 */
export interface SearchMissEntry {
  /** ユーザーが実際に打った文字列 (正規化前・trim のみ)。 */
  q: string;
  /** 同一クエリでの累計発生回数。 */
  count: number;
  /** 最後に発生した時刻 (ISO)。上限超過時の破棄判定にも使う。 */
  lastAtISO: string;
  /**
   * カテゴリヒント (§F5a) が出ていたか。
   * true = 完全0件ではなく「カテゴリは推測できたが Identity が無い」状態。
   * DB拡張の優先度判断で、完全な未知語と区別するために持つ。
   */
  hadHints: boolean;
}

/**
 * 端末内に貯める診断データ。AppSettings.diagnostics に永続化される。
 * 全フィールドが「増える一方」で、ユーザー操作でのみリセットされる。
 */
export interface DiagnosticsData {
  /** 検索してヒットしなかったクエリ (回数降順で保持)。DB拡張順の一次ソース。 */
  searchMisses: SearchMissEntry[];
  /** 検索シートを開いた回数。検索そのものが使われているかの二値判定用。 */
  searchOpenCount: number;
  /** 「数値で入力する」(最終手段) を開いた回数。DB の穴の代理指標。 */
  directInputOpenCount: number;
  /** ウィジェット経由で記録が確定した件数。ウィジェットが実用されているかの判定用。 */
  widgetLogCount: number;
}
