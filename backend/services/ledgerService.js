// Pure maths for the farm money book. No database here, so it is easy to test.
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const GENERAL = '';

const blank = () => ({ expense: 0, income: 0 });

// entries: [{ type: 'expense'|'income', amount, category, crop }]
// Returns totals, profit (income minus expense), margin % of expenses (ROI), spending by category and a profit/loss line per crop.
export function summarize(entries) {
  const total = blank(); const cats = {}; const crops = new Map();
  for (const e of entries) {
    const amt = Number(e.amount) || 0;
    if (e.type !== 'expense' && e.type !== 'income') continue;
    total[e.type] += amt;
    if (e.type === 'expense') cats[e.category] = (cats[e.category] || 0) + amt;
    const key = (e.crop || GENERAL).trim().toLowerCase();
    if (!crops.has(key)) crops.set(key, { crop: (e.crop || GENERAL).trim(), ...blank() });
    crops.get(key)[e.type] += amt;
  }
  const finish = (x) => {
    const expense = round2(x.expense); const income = round2(x.income); const profit = round2(income - expense);
    return { ...x, expense, income, profit, roiPercent: expense > 0 ? round2((profit / expense) * 100) : null };
  };
  const perCrop = [...crops.values()].map(finish).sort((a, b) => b.profit - a.profit);
  const byCategory = Object.entries(cats).map(([category, amount]) => ({ category, amount: round2(amount), share: total.expense > 0 ? round2((amount / total.expense) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
  return { ...finish({ ...total }), entries: entries.length, byCategory, perCrop };
}
