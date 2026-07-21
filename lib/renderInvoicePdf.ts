// Renders DonorInvoiceData / BackendInvoiceData (lib/invoices.ts) into
// actual PDF bytes using pdf-lib (pure JS, no native deps — safe on
// Vercel's serverless functions).

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { DonorInvoiceData, BackendInvoiceData } from "./invoices";

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 50;
const BRAND = rgb(0.02, 0.35, 0.3);
const GRAY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.85, 0.85, 0.85);

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN) newPage(ctx);
}

function text(ctx: Ctx, str: string, x: number, size: number, font: PDFFont, color = rgb(0, 0, 0)) {
  ctx.page.drawText(str, { x, y: ctx.y, size, font, color });
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

async function makeCtx(): Promise<Ctx> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  return { doc, page, font, bold, y: PAGE_H - MARGIN };
}

function drawInvoiceHeader(
  ctx: Ctx,
  opts: { title: string; invoiceNumber: string; office: string | null; dateReceived: string | null; donorLabel: string }
) {
  text(ctx, "ICNA Relief", MARGIN, 20, ctx.bold, BRAND);
  ctx.y -= 24;
  text(ctx, opts.title, MARGIN, 14, ctx.bold);
  ctx.y -= 22;

  const rightX = PAGE_W - MARGIN - 200;
  const startY = ctx.y;
  text(ctx, `Invoice #: ${opts.invoiceNumber}`, MARGIN, 10, ctx.bold);
  ctx.y -= 14;
  text(ctx, `Date received: ${fmtDate(opts.dateReceived)}`, MARGIN, 10, ctx.font, GRAY);
  ctx.y -= 14;
  text(ctx, `Office: ${opts.office ?? "—"}`, MARGIN, 10, ctx.font, GRAY);

  ctx.y = startY;
  ctx.page.drawText(`Donor: ${opts.donorLabel}`, { x: rightX, y: ctx.y, size: 10, font: ctx.bold });
  ctx.y -= 28;

  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 1,
    color: LIGHT,
  });
  ctx.y -= 20;
}

function drawTableHeader(ctx: Ctx, cols: { label: string; x: number }[]) {
  ensureSpace(ctx, 40);
  cols.forEach((c) => text(ctx, c.label, c.x, 9, ctx.bold, GRAY));
  ctx.y -= 6;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.75,
    color: LIGHT,
  });
  ctx.y -= 16;
}

const CONDITION_LABEL: Record<string, string> = { new: "New", used: "Used", na: "—" };

export async function renderDonorInvoicePdf(data: DonorInvoiceData): Promise<Uint8Array> {
  const ctx = await makeCtx();
  drawInvoiceHeader(ctx, {
    title: "Donation Receipt (Itemized)",
    invoiceNumber: data.invoiceNumber,
    office: data.office,
    dateReceived: data.dateReceived,
    donorLabel: data.donorLabel,
  });

  const cols = [
    { label: "ITEM", x: MARGIN },
    { label: "CONDITION", x: 380 },
    { label: "QTY", x: 480 },
  ];
  drawTableHeader(ctx, cols);

  data.lines.forEach((line) => {
    ensureSpace(ctx, 18);
    text(ctx, line.name, MARGIN, 10, ctx.font);
    text(ctx, CONDITION_LABEL[line.condition] ?? line.condition, 380, 10, ctx.font, GRAY);
    text(ctx, String(line.qty), 480, 10, ctx.font);
    ctx.y -= 18;
  });

  ctx.y -= 10;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 1,
    color: LIGHT,
  });
  ctx.y -= 20;
  text(ctx, `Total items: ${data.totalItems}`, MARGIN, 11, ctx.bold);
  ctx.y -= 30;
  text(
    ctx,
    "No monetary value is stated on this receipt. See your records for the fair market value of donated items.",
    MARGIN,
    8,
    ctx.font,
    GRAY
  );

  return ctx.doc.save();
}

/**
 * One backend, per-program invoice per page. `invoices` is expected to be
 * every program touched by a single session (from buildBackendInvoices),
 * but this also works fine called with just one.
 */
export async function renderBackendInvoicesPdf(invoices: BackendInvoiceData[]): Promise<Uint8Array> {
  const ctx = await makeCtx();

  invoices.forEach((inv, idx) => {
    if (idx > 0) newPage(ctx);

    drawInvoiceHeader(ctx, {
      title: `Backend Invoice — ${inv.program}`,
      invoiceNumber: inv.invoiceNumber,
      office: inv.office,
      dateReceived: inv.dateReceived,
      donorLabel: inv.donorLabel,
    });

    const cols = [
      { label: "ITEM", x: MARGIN },
      { label: "CONDITION", x: 280 },
      { label: "QTY", x: 360 },
      { label: "UNIT $", x: 410 },
      { label: "LINE TOTAL", x: 480 },
    ];
    drawTableHeader(ctx, cols);

    inv.lines.forEach((line) => {
      ensureSpace(ctx, 18);
      text(ctx, line.name, MARGIN, 10, ctx.font);
      text(ctx, CONDITION_LABEL[line.condition] ?? line.condition, 280, 10, ctx.font, GRAY);
      text(ctx, String(line.qty), 360, 10, ctx.font);
      text(ctx, line.isManualPrice ? "—" : `$${line.unitPrice.toFixed(2)}`, 410, 10, ctx.font, GRAY);
      text(ctx, `$${line.total.toFixed(2)}`, 480, 10, ctx.font);
      ctx.y -= 18;
    });

    ctx.y -= 10;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y },
      end: { x: PAGE_W - MARGIN, y: ctx.y },
      thickness: 1,
      color: LIGHT,
    });
    ctx.y -= 20;
    text(ctx, `Program subtotal: $${inv.subtotal.toFixed(2)}`, MARGIN, 12, ctx.bold);
  });

  return ctx.doc.save();
}
