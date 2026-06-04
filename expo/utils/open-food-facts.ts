/**
 * Open Food Facts API クライアント
 * https://world.openfoodfacts.org/
 *
 * バーコード (EAN-13/EAN-8/UPC-A 等) から食品情報を取得し、
 * アプリ内の手動ログ用 PFC に正規化して返す。
 */

export interface FoodFactsResult {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** 取得単位: 100g あたりの値 */
  per100g: boolean;
  /** 元の serving size 文字列 (参考表示用) */
  servingSize: string | null;
}

export type FoodFactsError =
  | 'not_found'
  | 'no_nutrition'
  | 'network_error';

export interface FoodFactsResponse {
  result: FoodFactsResult | null;
  error: FoodFactsError | null;
}

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

export async function fetchByBarcode(barcode: string): Promise<FoodFactsResponse> {
  try {
    const res = await fetch(
      `${BASE_URL}/${barcode}.json?fields=product_name,nutriments,serving_size`,
      { headers: { 'User-Agent': 'Hachibu/1.0 (contact@akizony.com)' } }
    );

    if (!res.ok) {
      return { result: null, error: 'network_error' };
    }

    const json = await res.json();

    if (json.status !== 1 || !json.product) {
      return { result: null, error: 'not_found' };
    }

    const product = json.product;
    const n = product.nutriments ?? {};

    const kcal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null;
    const protein = n['proteins_100g'] ?? n['proteins'] ?? null;
    const fat = n['fat_100g'] ?? n['fat'] ?? null;
    const carbs = n['carbohydrates_100g'] ?? n['carbohydrates'] ?? null;

    if (kcal == null || protein == null || fat == null || carbs == null) {
      return { result: null, error: 'no_nutrition' };
    }

    const name: string =
      product.product_name_ja ??
      product.product_name ??
      '不明な食品';

    return {
      result: {
        name,
        kcal: Math.round(kcal),
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        per100g: true,
        servingSize: product.serving_size ?? null,
      },
      error: null,
    };
  } catch {
    return { result: null, error: 'network_error' };
  }
}
