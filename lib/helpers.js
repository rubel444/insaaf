export function taka(n) {
  const num = Number(n || 0);
  return "৳" + num.toLocaleString("en-IN");
}

// members: array from `members` table
// transactions: array from `transactions` table
// রিটার্ন করে প্রতিটা মেম্বারের জন্য computed summary সহ একটা array
export function buildMemberSummaries(members, transactions) {
  return members.map((m) => {
    const myTx = transactions.filter((t) => t.member_id === m.id);
    const totalDeposit = myTx
      .filter((t) => t.type === "deposit")
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalProfit = myTx
      .filter((t) => t.type === "profit")
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalAdjustment = myTx
      .filter((t) => t.type === "adjustment" || t.type === "withdrawal")
      .reduce((s, t) => s + Number(t.amount), 0);
    const currentBalance =
      Number(m.previous_amount || 0) +
      totalDeposit +
      totalProfit +
      totalAdjustment;

    // due = এই পর্যন্ত পুরোপুরি ক্লিয়ার থাকলে যত জমা থাকার কথা (target_amount)
    // বনাম সে আসলে এ পর্যন্ত মোট কত জমা করেছে (আগের ব্যালেন্স + নতুন সব deposit মিলিয়ে)।
    // target_amount সেট না থাকলে (0) due দেখাবে না।
    const target = Number(m.target_amount || 0);
    const contributedSoFar = Number(m.previous_amount || 0) + totalDeposit;
    const due = target > 0 ? Math.max(0, target - contributedSoFar) : 0;

    return {
      ...m,
      transactions: myTx.sort(
        (a, b) => new Date(b.deposit_date) - new Date(a.deposit_date)
      ),
      totalDeposit,
      totalProfit,
      currentBalance,
      target,
      due,
    };
  });
}

export function distinctMonths(transactions) {
  const set = new Set();
  transactions.forEach((t) => {
    if (t.type === "deposit" && t.for_month) set.add(t.for_month);
  });
  // মাস অনুযায়ী sort করার চেষ্টা (তারিখ ভিত্তিক না হওয়ায় simple alphabetical/insertion থাকবে)
  return Array.from(set);
}
