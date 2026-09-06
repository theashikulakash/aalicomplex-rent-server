// Computes outstanding rent due for a shop, month by month, starting from
// the agreement's start date and running through the current month. Each
// period only stops accruing once a collector logs a confirmed payment
// against it — a partial payment leaves the remainder still due.

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Every "YYYY-MM" period from start through end, inclusive.
export function periodsBetween(startDate, endDate) {
  const periods = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= last) {
    periods.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return periods;
}

// transactions: confirmed Transaction docs for this shop only.
export function computeShopDue(shop, transactions, asOf = new Date()) {
  const start = new Date(shop.agreement.startDate);
  const periods = periodsBetween(start, asOf);

  const paidByPeriod = {};
  for (const t of transactions) {
    if (t.status !== "confirmed") continue;
    paidByPeriod[t.forPeriod] = (paidByPeriod[t.forPeriod] || 0) + t.amount;
  }

  let totalDue = 0;
  const unpaidPeriods = [];

  for (const period of periods) {
    const paid = paidByPeriod[period] || 0;
    const due = Math.max(shop.monthlyRent - paid, 0);
    if (due > 0) unpaidPeriods.push({ period, due });
    totalDue += due;
  }

  return { totalDue, unpaidPeriods };
}
