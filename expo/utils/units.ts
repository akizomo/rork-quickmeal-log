export type UnitSystem = 'metric' | 'imperial';

const KG_PER_LB = 0.453592;
const CM_PER_IN = 2.54;

export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}
export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = cm / CM_PER_IN;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn % 12);
  if (inch === 12) return { ft: ft + 1, inch: 0 };
  return { ft, inch };
}
export function ftInToCm(ft: number, inch: number): number {
  return (ft * 12 + inch) * CM_PER_IN;
}
export function weightSuffix(unitSystem: UnitSystem): string {
  return unitSystem === 'imperial' ? 'lbs' : 'kg';
}
/** kg値を表示単位の数値に変換 (lbs or kg) */
export function toDisplayWeight(kg: number, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? kgToLbs(kg) : kg;
}
/** 表示単位の数値をkgに変換 */
export function fromDisplayWeight(display: number, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? lbsToKg(display) : display;
}
/** 表示用の体重文字列 (例: "154.3") — 単位ラベルは別途 weightSuffix() で */
export function formatDisplayWeight(kg: number, unitSystem: UnitSystem, fractionDigits = 1): string {
  return toDisplayWeight(kg, unitSystem).toFixed(fractionDigits);
}
