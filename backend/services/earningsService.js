// Pure arithmetic for the farmer's Earnings page. No database access, so it can be unit tested alone.
// Input rows are the farmer's own sold orders grouped by whether the money has been received:
//   { paid: boolean, total: paise, n: order count }
// Farmers are paid directly by buyers (cash on delivery), so there is no commission or payout here:
// "received" is only what the order records show as paid, and "to collect" is the rest.
export function summariseSales(groups = []) {
  const pick = (paid) => groups.find((g) => g.paid === paid) || { total: 0, n: 0 };
  const received = pick(true);
  const open = pick(false);
  return {
    totalSalesPaise: received.total + open.total,
    receivedPaise: received.total,
    toCollectPaise: open.total,
    orders: received.n + open.n,
    ordersToCollect: open.n,
  };
}
