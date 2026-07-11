// Price-list import (Quotation Maintenance) — the legacy price DB
// spreadsheet, one row per price rule. Mirrors the JO legacy import:
// positional columns, per-line errors, re-import safe.

export type PriceImportRowError = { line: number; message: string };

export type PriceImportSummaryDto = {
  productsCreated: number;
  /** Products whose rules were replaced from the file. */
  productsUpdated: number;
  rulesCreated: number;
  errors: PriceImportRowError[];
};

/** Header row of the import template (also used for the CSV download). */
export const PRICE_LIST_COLUMNS = [
  "Product",
  "Category",
  "Unit",
  "Type",
  "Label",
  "Unit Price",
  "Min Qty",
  "Min Charge",
  "Amount",
  "Percent",
  "Notes",
] as const;
