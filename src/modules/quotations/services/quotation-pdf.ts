import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { format } from "date-fns";
import type { QuotationDetailDto } from "../schemas/quotation";

// Quotation printable — the ops_fusion successor of the legacy
// Quotation.html A4 document (header / customer / items / totals with
// downpayment & balance). Pre-approval statuses carry a DRAFT banner so an
// unapproved quote is never mistaken for a final offer.

const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;
const MARGIN = 48;
const BRAND = rgb(0.72, 0.06, 0.13); // brand crimson
const GRAY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.92, 0.9, 0.87);

// StandardFonts are WinAnsi — no ₱ glyph, so amounts print as "PHP".
const money = (value: string): string => {
  const n = parseFloat(value);
  return isNaN(n)
    ? value
    : `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
};

const dateStr = (iso: string | null): string =>
  iso ? format(new Date(iso), "MMMM d, yyyy") : "—";
const dateOnlyStr = (value: string | null): string =>
  value ? format(new Date(`${value}T00:00:00`), "MMMM d, yyyy") : "—";

const NOT_FINAL = ["DRAFT", "PENDING_APPROVAL", "REJECTED"];

export async function renderQuotationPdf(
  quote: QuotationDetailDto
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 60) newPage();
  };
  const text = (
    value: string,
    opts: {
      x?: number;
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
    } = {}
  ) => {
    page.drawText(value, {
      x: opts.x ?? MARGIN,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? font,
      color: opts.color ?? rgb(0.1, 0.1, 0.1),
    });
  };
  const rightText = (value: string, rightX: number, size: number, f: PDFFont) =>
    page.drawText(value, {
      x: rightX - f.widthOfTextAtSize(value, size),
      y,
      size,
      font: f,
      color: rgb(0.1, 0.1, 0.1),
    });
  const line = (yy: number, color = LIGHT) =>
    page.drawLine({
      start: { x: MARGIN, y: yy },
      end: { x: PAGE_W - MARGIN, y: yy },
      thickness: 1,
      color,
    });

  // ——— header ———
  text("ORMOC PRINTSHOPPE", { size: 16, font: bold, color: BRAND });
  y -= 14;
  text("OPS Fusion — Fully Unified System Integrating Operations & Inventory", {
    size: 8,
    color: GRAY,
  });
  const docType = "QUOTATION";
  page.drawText(docType, {
    x: PAGE_W - MARGIN - bold.widthOfTextAtSize(docType, 14),
    y: PAGE_H - MARGIN,
    size: 14,
    font: bold,
    color: BRAND,
  });
  page.drawText(quote.quoteNumber, {
    x: PAGE_W - MARGIN - bold.widthOfTextAtSize(quote.quoteNumber, 11),
    y: PAGE_H - MARGIN - 16,
    size: 11,
    font: bold,
  });
  y -= 18;
  line(y);
  y -= 20;

  // ——— draft banner (pre-approval statuses) ———
  if (NOT_FINAL.includes(quote.status)) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 8,
      width: PAGE_W - MARGIN * 2,
      height: 24,
      color: rgb(1, 0.95, 0.78),
      borderColor: rgb(0.85, 0.65, 0.13),
      borderWidth: 1,
    });
    const banner = "DRAFT — PENDING SUPERVISOR APPROVAL";
    page.drawText(banner, {
      x: (PAGE_W - bold.widthOfTextAtSize(banner, 12)) / 2,
      y: y - 1,
      size: 12,
      font: bold,
      color: rgb(0.55, 0.4, 0),
    });
    y -= 36;
  }

  // ——— quote info ———
  const info: [string, string][] = [
    ["Customer", quote.customer.name],
    ["Date", dateStr(quote.createdAt)],
    ["Valid until", quote.validUntil ? dateOnlyStr(quote.validUntil) : "30 days from date"],
    ["Prepared by", quote.createdByName],
  ];
  if (quote.approvedByName) {
    info.push(["Approved by", quote.approvedByName]);
  }
  for (const [label, value] of info) {
    text(label.toUpperCase(), { size: 7, color: GRAY });
    text(value, { x: MARGIN + 110, size: 10 });
    y -= 15;
  }
  y -= 6;

  // ——— items table ———
  const cols = { n: MARGIN, desc: MARGIN + 24, qty: 330, unit: 380, amount: 470 };
  line(y + 10, GRAY);
  y -= 4;
  text("#", { x: cols.n, size: 8, font: bold, color: GRAY });
  text("DESCRIPTION", { x: cols.desc, size: 8, font: bold, color: GRAY });
  text("QTY", { x: cols.qty, size: 8, font: bold, color: GRAY });
  text("UNIT PRICE", { x: cols.unit, size: 8, font: bold, color: GRAY });
  text("AMOUNT", { x: cols.amount, size: 8, font: bold, color: GRAY });
  y -= 6;
  line(y, GRAY);
  y -= 14;

  quote.items.forEach((item, index) => {
    const descLines = wrap(item.description, font, 9, cols.qty - cols.desc - 12);
    const hasDiscount = parseFloat(item.discount) > 0;
    const blockHeight = descLines.length * 11 + (hasDiscount ? 11 : 0) + 8;
    ensure(blockHeight);

    text(String(index + 1), { x: cols.n, size: 9 });
    for (const dl of descLines) {
      text(dl, { x: cols.desc, size: 9 });
      y -= 11;
    }
    if (hasDiscount) {
      text(`Less ${money(item.discount)}`, {
        x: cols.desc,
        size: 7,
        color: GRAY,
      });
      y -= 11;
    }
    const rowTop = y + descLines.length * 11 + (hasDiscount ? 11 : 0);
    page.drawText(String(item.qty), {
      x: cols.qty,
      y: rowTop - 11,
      size: 9,
      font,
    });
    page.drawText(money(item.unitPrice), {
      x: cols.unit,
      y: rowTop - 11,
      size: 9,
      font,
    });
    page.drawText(money(item.lineTotal), {
      x: cols.amount,
      y: rowTop - 11,
      size: 9,
      font,
    });
    y -= 8;
  });

  line(y + 4, GRAY);
  y -= 12;

  // ——— totals block (legacy layout: subtotal / discount / VAT / total /
  // downpayment / balance) ———
  const totals = quote.totals;
  const labelX = cols.unit;
  const rightX = PAGE_W - MARGIN;
  const totalRow = (
    label: string,
    value: string,
    opts: { strong?: boolean } = {}
  ) => {
    ensure(16);
    text(label, { x: labelX, size: opts.strong ? 10 : 9, font: opts.strong ? bold : font });
    rightText(value, rightX, opts.strong ? 10 : 9, opts.strong ? bold : font);
    y -= opts.strong ? 16 : 14;
  };

  totalRow("Subtotal", money(totals.subtotal));
  if (parseFloat(totals.discount) > 0) {
    totalRow("Discount", `- ${money(totals.discount)}`);
  }
  if (totals.taxType === "VAT_EXCLUSIVE") {
    totalRow("VAT (12%)", money(totals.taxAmount));
  }
  if (totals.taxType === "VAT_INCLUSIVE") {
    totalRow("VAT included (12%)", money(totals.taxAmount));
  }
  totalRow("TOTAL", money(totals.total), { strong: true });
  totalRow(totals.paymentTermLabel ?? "Downpayment", money(totals.downpayment));
  totalRow("Balance", money(totals.balance));
  y -= 10;

  // ——— notes ———
  if (quote.notes) {
    ensure(40);
    text("NOTES", { size: 7, color: GRAY });
    y -= 11;
    for (const nl of wrap(quote.notes, font, 8, PAGE_W - MARGIN * 2)) {
      ensure(11);
      text(nl, { size: 8, color: GRAY });
      y -= 10;
    }
    y -= 8;
  }

  // ——— conforme block ———
  ensure(80);
  text(
    "This quotation is valid until the date above. Prices may change after expiry. To proceed, sign below or reply with your confirmation.",
    { size: 8, color: GRAY }
  );
  y -= 40;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 220, y },
    thickness: 1,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 11;
  text("Conforme — signature over printed name / date", {
    size: 7,
    color: GRAY,
  });

  // ——— footer ———
  page.drawText(
    `Generated ${format(new Date(), "M/d/yyyy h:mm a")} · OPS Fusion`,
    { x: MARGIN, y: MARGIN - 18, size: 7, font, color: GRAY }
  );

  return doc.save();
}

function wrap(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const raw of value.split(/\r?\n/)) {
    let current = "";
    for (const word of raw.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [""];
}
