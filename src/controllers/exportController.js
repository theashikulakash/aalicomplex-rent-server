import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import Transaction from "../models/Transaction.js";
import Shop from "../models/Shop.js";

// Shared RBAC-scoped fetch of transactions for exports, honoring the same
// visibility rules as listTransactions (Admin: all, Collector: own, Owner: own shops).
async function fetchScopedTransactions(req) {
  const { from, to, shop } = req.query;
  const filter = {};

  if (req.user.role === "collector") {
    filter.collectedBy = req.user._id;
  } else if (req.user.role === "owner") {
    const ownShops = await Shop.find({ owner: req.user._id }).select("_id");
    filter.shop = { $in: ownShops.map((s) => s._id) };
  }
  if (shop) filter.shop = shop;
  if (from || to) {
    filter.paymentDate = {};
    if (from) filter.paymentDate.$gte = new Date(from);
    if (to) filter.paymentDate.$lte = new Date(to);
  }

  return Transaction.find(filter)
    .populate("shop", "name block shopNumber")
    .populate("collectedBy", "name")
    .sort({ paymentDate: -1 });
}

// GET /api/exports/pdf
export async function exportPdf(req, res, next) {
  try {
    const transactions = await fetchScopedTransactions(req);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=rent-report.pdf");

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text("Akkel Ali Complex - Rent Collection Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(9).fillColor("#555").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1.5);
    doc.fillColor("#000");

    const colX = { date: 40, shop: 140, collector: 280, method: 380, amount: 450, fee: 510 };
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Date", colX.date, doc.y, { continued: false });
    doc.text("Shop", colX.shop, doc.y - 12);
    doc.text("Collector", colX.collector, doc.y - 12);
    doc.text("Method", colX.method, doc.y - 12);
    doc.text("Amount", colX.amount, doc.y - 12);
    doc.text("Late Fee", colX.fee, doc.y - 12);
    doc.moveDown(0.5);
    doc.font("Helvetica");

    let total = 0;
    transactions.forEach((t) => {
      const y = doc.y;
      doc.text(new Date(t.paymentDate).toLocaleDateString(), colX.date, y);
      doc.text(`${t.shop?.block ?? "-"}-${t.shop?.shopNumber ?? "-"}`, colX.shop, y);
      doc.text(t.collectedBy?.name ?? "-", colX.collector, y);
      doc.text(t.method, colX.method, y);
      doc.text(t.amount.toFixed(2), colX.amount, y);
      doc.text(t.lateFee.toFixed(2), colX.fee, y);
      doc.moveDown(0.4);
      total += t.amount;
    });

    doc.moveDown();
    doc.font("Helvetica-Bold").text(`Total Collected: ${total.toFixed(2)}`, { align: "right" });

    doc.end();
  } catch (err) {
    next(err);
  }
}

// GET /api/exports/xlsx
export async function exportXlsx(req, res, next) {
  try {
    const transactions = await fetchScopedTransactions(req);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Rent Collections");

    sheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Shop", key: "shop", width: 16 },
      { header: "Collected By", key: "collector", width: 20 },
      { header: "For Period", key: "period", width: 12 },
      { header: "Method", key: "method", width: 14 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Late Fee", key: "lateFee", width: 12 },
      { header: "Receipt Code", key: "receipt", width: 22 },
      { header: "Status", key: "status", width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };

    transactions.forEach((t) => {
      sheet.addRow({
        date: new Date(t.paymentDate).toLocaleDateString(),
        shop: `${t.shop?.block ?? "-"}-${t.shop?.shopNumber ?? "-"}`,
        collector: t.collectedBy?.name ?? "-",
        period: t.forPeriod,
        method: t.method,
        amount: t.amount,
        lateFee: t.lateFee,
        receipt: t.receiptCode,
        status: t.status,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=rent-report.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}
