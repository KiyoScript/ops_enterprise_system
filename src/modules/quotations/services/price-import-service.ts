import { ValidationError } from "@/lib/errors";
import { type Actor } from "@/lib/authz";
import { assertCan } from "@/lib/ability";
import { PriceRuleType } from "@/generated/prisma/enums";
import type { IActivityLogRepository } from "@/modules/shared/repositories/activity-log-repository";
import type {
  IPriceListRepository,
  RuleCreateData,
} from "../repositories/price-list-repository";
import type {
  PriceImportRowError,
  PriceImportSummaryDto,
} from "../schemas/price-list";

// Price-list import — the quotation counterpart of the JO legacy import.
// One spreadsheet row per price rule (columns A–K, see PRICE_LIST_COLUMNS):
//   Product | Category | Unit | Type | Label | Unit Price | Min Qty |
//   Min Charge | Amount | Percent | Notes
//
//   • Products are found case-insensitively or created (category/unit/
//     basePrice apply only on create — the app owns them afterwards).
//   • Type VARIANT needs a Unit Price; ADDON needs Amount and/or Percent;
//     blank Type = VARIANT when a Unit Price is present, else the row just
//     ensures the product exists.
//   • Rules of every product in the file are REPLACED from the file — the
//     spreadsheet stays the source of truth, so re-imports are safe.

const COL = {
  product: 0,
  category: 1,
  unit: 2,
  type: 3,
  label: 4,
  unitPrice: 5,
  minQty: 6,
  minCharge: 7,
  amount: 8,
  pct: 9,
  notes: 10,
} as const;

type ParsedRule = { line: number; rule: RuleCreateData | null };

type ParsedProduct = {
  name: string;
  category: string;
  unit: string;
  rows: ParsedRule[];
};

const cell = (row: string[], index: number): string =>
  String(row[index] ?? "").trim();

/** "₱1,500.00" → 1500 (legacy sheets carry currency formatting). */
const parseMoney = (raw: string): number | null => {
  if (!raw) return null;
  const cleaned = raw.replace(/[₱,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export class PriceImportService {
  constructor(
    private readonly priceList: IPriceListRepository,
    private readonly activity: IActivityLogRepository
  ) {}

  /** `rows` are positional cells from fileToRows — CSV or XLSX. */
  async import(actor: Actor, rows: string[][]): Promise<PriceImportSummaryDto> {
    assertCan(actor, "maintain", "Maintenance");

    const errors: PriceImportRowError[] = [];
    const products = new Map<string, ParsedProduct>(); // keyed lowercased name

    rows.forEach((row, index) => {
      const line = index + 1;
      const name = cell(row, COL.product);
      if (!name) return; // blank/spacer row
      if (line === 1 && name.toLowerCase() === "product") return; // header

      const key = name.toLowerCase();
      let product = products.get(key);
      if (!product) {
        product = {
          name,
          category: cell(row, COL.category) || "Uncategorized",
          unit: cell(row, COL.unit) || "pcs",
          rows: [],
        };
        products.set(key, product);
      }

      try {
        product.rows.push({ line, rule: parseRule(row, product.rows.length) });
      } catch (err) {
        errors.push({
          line,
          message: err instanceof Error ? err.message : "Invalid row.",
        });
      }
    });

    if (products.size === 0) {
      throw new ValidationError(
        "No product rows found — check the file against the template."
      );
    }

    let productsCreated = 0;
    let productsUpdated = 0;
    let rulesCreated = 0;

    await this.priceList.withTransaction(async (tx) => {
      for (const product of products.values()) {
        const rules = product.rows
          .map((r) => r.rule)
          .filter((r): r is RuleCreateData => r !== null);

        const ref = await this.priceList.findOrCreateProduct(
          {
            name: product.name,
            category: product.category,
            unit: product.unit,
            // Prefill from the first variant so the picker shows a price
            // even before a variant is chosen; the app owns it afterwards.
            basePrice:
              rules.find((r) => r.type === PriceRuleType.VARIANT)?.unitPrice ??
              "0",
            createdById: actor.id,
          },
          tx
        );
        if (ref.created) productsCreated++;

        if (rules.length > 0) {
          await this.priceList.replaceRules(ref.id, rules, tx);
          rulesCreated += rules.length;
          if (!ref.created) productsUpdated++;
        }
      }

      await this.activity.log(
        {
          userId: actor.id,
          entityType: "Product",
          entityId: "price-list-import",
          action: "import",
          payload: {
            products: products.size,
            productsCreated,
            rulesCreated,
            errors: errors.length,
          },
        },
        tx
      );
    });

    return { productsCreated, productsUpdated, rulesCreated, errors };
  }
}

/** One spreadsheet row → one rule (or null for a product-only row). */
function parseRule(row: string[], sortOrder: number): RuleCreateData | null {
  const typeRaw = cell(row, COL.type).toUpperCase();
  const label = cell(row, COL.label);
  const unitPrice = parseMoney(cell(row, COL.unitPrice));
  const amount = parseMoney(cell(row, COL.amount));
  const pct = parseMoney(cell(row, COL.pct));
  const minCharge = parseMoney(cell(row, COL.minCharge));
  const minQtyRaw = cell(row, COL.minQty);
  const minQty = minQtyRaw ? parseInt(minQtyRaw, 10) : 1;
  const notes = cell(row, COL.notes) || null;

  const type =
    typeRaw === "ADDON"
      ? PriceRuleType.ADDON
      : typeRaw === "VARIANT" || unitPrice !== null
        ? PriceRuleType.VARIANT
        : null;
  if (type === null) return null; // product-only row

  if (typeRaw && typeRaw !== "VARIANT" && typeRaw !== "ADDON") {
    throw new Error(`Unknown Type "${cell(row, COL.type)}" — use VARIANT or ADDON.`);
  }
  if (!Number.isFinite(minQty) || minQty < 1) {
    throw new Error(`Invalid Min Qty "${minQtyRaw}".`);
  }

  if (type === PriceRuleType.VARIANT) {
    if (unitPrice === null) {
      throw new Error("A VARIANT row needs a Unit Price.");
    }
    return {
      type,
      label: label || "Standard rate",
      unitPrice: unitPrice.toFixed(2),
      minQty,
      minCharge: minCharge !== null ? minCharge.toFixed(2) : null,
      notes,
      sortOrder,
    };
  }

  if (amount === null && pct === null) {
    throw new Error("An ADDON row needs an Amount and/or Percent.");
  }
  if (!label) throw new Error("An ADDON row needs a Label.");
  return {
    type,
    label,
    minQty: 1,
    amount: amount !== null ? amount.toFixed(2) : null,
    pct: pct !== null ? pct.toFixed(2) : null,
    notes,
    sortOrder,
  };
}
