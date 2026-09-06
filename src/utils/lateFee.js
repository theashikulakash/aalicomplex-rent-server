// Automated late-fee computation for overdue rents (PRD best-practice feature).
// Rule: after a grace period past the 1st of forPeriod's month, apply a flat fee
// plus a percentage of the monthly rent. Kept simple and centralized so the
// admin-config rule can be swapped out later without touching callers.

export function calculateLateFee({ monthlyRent, forPeriod, paymentDate }) {
  const graceDays = Number(process.env.LATE_FEE_GRACE_DAYS ?? 5);
  const flatAmount = Number(process.env.LATE_FEE_FLAT_AMOUNT ?? 0);
  const percent = Number(process.env.LATE_FEE_PERCENT ?? 0);

  const [year, month] = forPeriod.split("-").map(Number); // "YYYY-MM"
  const dueDate = new Date(year, month - 1, 1 + graceDays);
  const paidOn = paymentDate ? new Date(paymentDate) : new Date();

  if (paidOn <= dueDate) return 0;

  const percentFee = (percent / 100) * monthlyRent;
  return Math.round(flatAmount + percentFee);
}

export function generateReceiptCode() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AAC-${stamp}-${rand}`;
}
