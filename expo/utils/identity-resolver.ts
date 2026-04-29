/**
 * Identity-first resolver — translates a user's selection (Identity + Attribute
 * + Style + Add-ons + amount) into a final IdentityLogDraft, applying:
 *
 *   1. PFC migration (Style > Attribute priority)
 *   2. Multiplicative attribute / style factors
 *   3. Amount scaling against the recordIdentity's default
 *   4. Add-on macro accumulation (pure Addon or Identity流用 asAddon)
 *
 * Spec: docs/IA-identity-spec.md §3 (migrations), §5 (add-ons), §6 (amount)
 */

import { Macro } from '@/types/nutrition';
import {
  AppliedAddon,
  AttributeOption,
  Identity,
  IdentityLogDraft,
  MacroFactor,
  MigrationTarget,
  StyleOption,
} from '@/types/identity';
import { getIdentity, resolveAddonRef } from '@/constants/identity';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ResolveAddonInput {
  refId: string;
  refType: 'identity' | 'addon';
  units: number;
}

export interface ResolveInput {
  /** Origin Identity (the chip the user tapped). */
  originIdentityId: string;
  /** User-selected attribute key on the origin Identity, if any. */
  attributeKey?: string;
  /** User-selected style key on the origin Identity, if any. */
  styleKey?: string;
  /** Amount in the Identity's unit. Falls back to `Identity.amount.default`. */
  amountValue?: number;
  /** Add-ons stacked on top of the base. */
  addons?: ResolveAddonInput[];
}

export interface ResolveResult extends IdentityLogDraft {
  /** UI confirmation message — populated only when migration carried one. */
  confirmMessage?: string;
}

/**
 * Pure resolver. No side effects, no I/O — safe to call from `useMemo`.
 *
 * Throws when `originIdentityId` (or a migration target) is missing from the
 * registry — this signals a data-integrity bug, not a runtime user error.
 */
export function resolveLog(input: ResolveInput): ResolveResult {
  const origin = requireIdentity(input.originIdentityId);

  // 1. Resolve migration (Style > Attribute > none)
  const styleMigration = findMigrationOnStyle(origin, input.styleKey);
  const attributeMigration = styleMigration
    ? undefined
    : findMigrationOnAttribute(origin, input.attributeKey);
  const migration = styleMigration ?? attributeMigration;

  // 2. Determine the recordIdentity and the effective attribute/style on it
  const recordIdentity = migration ? requireIdentity(migration.identityKey) : origin;

  const effectiveAttributeKey = migration
    ? migration.attributeKey ?? defaultKeyOf(recordIdentity.attributes)
    : input.attributeKey ?? defaultKeyOf(recordIdentity.attributes);

  const effectiveStyleKey = migration
    ? defaultKeyOf(recordIdentity.styles)
    : input.styleKey ?? defaultKeyOf(recordIdentity.styles);

  // 3. Compute base macro: defaultMacro × attribute factor × style factor × amount factor
  let macro: Macro = { ...recordIdentity.defaultMacro };

  const attributeOption = findOption(recordIdentity.attributes, effectiveAttributeKey);
  if (attributeOption?.factor) {
    macro = applyFactor(macro, attributeOption.factor);
  }

  const styleOption = findOption(recordIdentity.styles, effectiveStyleKey);
  if (styleOption?.factor) {
    macro = applyFactor(macro, styleOption.factor);
  }

  // Amount handling:
  //   - With migration: the user's amountValue was sized for the *origin*
  //     Identity (e.g. 100g of 鶏もも) and becomes meaningless once we route to
  //     an Identity in a different unit (e.g. fried_main is "piece"). Always
  //     use the recordIdentity's default in that case.
  //   - Without migration: honor the caller's amountValue if provided.
  const amountValue = migration
    ? recordIdentity.amount.default
    : input.amountValue ?? recordIdentity.amount.default;
  const amountFactor = amountValue / recordIdentity.amount.default;
  if (amountFactor !== 1) {
    macro = multiplyMacro(macro, amountFactor);
  }

  const baseMacro = roundMacro(macro);

  // 4. Add-ons
  const appliedAddons: AppliedAddon[] = (input.addons ?? [])
    .map((a) => resolveSingleAddon(a))
    .filter((x): x is AppliedAddon => x !== undefined);

  const addonsMacro = appliedAddons.reduce<Macro>(
    (acc, a) => addMacro(acc, a.addedMacro),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const totalMacro = roundMacro(addMacro(baseMacro, addonsMacro));

  return {
    originIdentityId: origin.id,
    recordIdentityId: recordIdentity.id,
    attributeKey: effectiveAttributeKey,
    styleKey: migration ? undefined : input.styleKey ?? effectiveStyleKey,
    amountValue,
    baseMacro,
    addons: appliedAddons.length > 0 ? appliedAddons : undefined,
    totalMacro,
    confirmMessage: migration?.confirmMessage,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireIdentity(id: string): Identity {
  const found = getIdentity(id);
  if (!found) {
    throw new Error(`identity-resolver: unknown Identity id "${id}"`);
  }
  return found;
}

function findMigrationOnStyle(identity: Identity, styleKey?: string): MigrationTarget | undefined {
  if (!styleKey) return undefined;
  const opt = findOption(identity.styles, styleKey);
  return opt?.migration;
}

function findMigrationOnAttribute(
  identity: Identity,
  attributeKey?: string
): MigrationTarget | undefined {
  if (!attributeKey) return undefined;
  const opt = findOption(identity.attributes, attributeKey);
  return opt?.migration;
}

function findOption<T extends AttributeOption | StyleOption>(
  options: T[] | undefined,
  key: string | undefined
): T | undefined {
  if (!options || !key) return undefined;
  return options.find((o) => o.key === key);
}

function defaultKeyOf<T extends AttributeOption | StyleOption>(options?: T[]): string | undefined {
  if (!options || options.length === 0) return undefined;
  return options.find((o) => o.isDefault)?.key ?? options[0].key;
}

function applyFactor(macro: Macro, factor: MacroFactor): Macro {
  return {
    kcal: macro.kcal * (factor.kcal ?? 1),
    protein: macro.protein * (factor.protein ?? 1),
    fat: macro.fat * (factor.fat ?? 1),
    carbs: macro.carbs * (factor.carbs ?? 1),
  };
}

function multiplyMacro(macro: Macro, k: number): Macro {
  return {
    kcal: macro.kcal * k,
    protein: macro.protein * k,
    fat: macro.fat * k,
    carbs: macro.carbs * k,
  };
}

function addMacro(a: Macro, b: Macro): Macro {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
  };
}

function roundMacro(m: Macro): Macro {
  return {
    kcal: round1(m.kcal),
    protein: round1(m.protein),
    fat: round1(m.fat),
    carbs: round1(m.carbs),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function resolveSingleAddon(input: ResolveAddonInput): AppliedAddon | undefined {
  const ref = resolveAddonRef(input.refId);
  if (!ref) return undefined;

  const units = Math.max(0, input.units);
  if (units === 0) return undefined;

  if (ref.type === 'addon') {
    return {
      refId: input.refId,
      refType: 'addon',
      units,
      addedMacro: roundMacro(multiplyMacro(ref.data.addedMacro, units)),
    };
  }

  // Identity-flavored asAddon
  const identity = getIdentity(ref.identityId);
  const asAddon = identity?.asAddon;
  if (!asAddon) return undefined;

  return {
    refId: input.refId,
    refType: 'identity',
    units,
    addedMacro: roundMacro(multiplyMacro(asAddon.addedMacro, units)),
  };
}
