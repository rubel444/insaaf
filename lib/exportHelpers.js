import * as XLSX from "xlsx";

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename);
}

// একটা transaction কোন "মাস" এর হিসেবে গণ্য হবে সেটা বের করা:
// for_month বসানো থাকলে সেটাই, না থাকলে (যেমন profit entry) deposit_date থেকে বের করা হয়
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
export function periodLabel(t) {
  if (t.for_month) return t.for_month;
  const d = new Date(t.deposit_date);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
export function yearOfLabel(label) {
  const m = String(label).match(/\d{4}/);
  return m ? m[0] : "অজানা";
}

/* ---------- ১. একজন নির্দিষ্ট সদস্যের সম্পূর্ণ হিসাব ---------- */
export function exportMemberDetail(member, transactions) {
  const myTx = transactions
    .filter((t) => t.member_id === member.id)
    .sort((a, b) => new Date(a.deposit_date) - new Date(b.deposit_date));

  const totalDeposit = myTx
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalProfit = myTx
    .filter((t) => t.type === "profit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const currentBalance = Number(member.previous_amount || 0) + totalDeposit + totalProfit;

  const rows = [
    ["সদস্যের নাম", member.name],
    ["সদস্য নং", member.member_no || ""],
    ["যোগদানের তারিখ", member.join_date || ""],
    ["আগের ব্যালেন্স", Number(member.previous_amount || 0)],
    ["টার্গেট এমাউন্ট", Number(member.target_amount || 0)],
    [],
    ["তারিখ", "কোন মাসের কিস্তি", "ধরন", "পরিমাণ (৳)", "মন্তব্য"],
  ];
  myTx.forEach((t) => {
    rows.push([
      t.deposit_date,
      t.for_month || "",
      t.type === "deposit" ? "জমা" : t.type === "profit" ? "লাভ" : t.type,
      Number(t.amount),
      t.remarks || "",
    ]);
  });
  rows.push([]);
  rows.push(["মোট জমা", totalDeposit]);
  rows.push(["মোট লাভ", totalProfit]);
  rows.push(["বর্তমান ব্যালেন্স", currentBalance]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 28 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "হিসাব");
  downloadWorkbook(wb, `${member.name.replace(/[^\w\u0980-\u09FF]/g, "_")}-hisab.xlsx`);
}

/* ---------- ২. সব সদস্যের এক নজরে সারসংক্ষেপ ---------- */
export function exportAllSummary(summaries) {
  const header = [
    "সদস্য নং", "নাম", "স্ট্যাটাস", "আগের ব্যালেন্স",
    "মোট জমা", "মোট লাভ", "বর্তমান ব্যালেন্স", "টার্গেট", "বকেয়া",
  ];
  const rows = [header];
  summaries.forEach((m) => {
    rows.push([
      m.member_no || "",
      m.name,
      m.status === "active" ? "সক্রিয়" : m.status === "left" ? "চলে গেছেন" : "বাদ",
      Number(m.previous_amount || 0),
      m.totalDeposit,
      m.totalProfit,
      m.currentBalance,
      m.target || 0,
      m.due || 0,
    ]);
  });
  const grand = summaries.reduce((s, m) => s + m.currentBalance, 0);
  rows.push([]);
  rows.push(["", "", "", "", "", "", "সর্বমোট তহবিল", "", grand]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = header.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "সারসংক্ষেপ");
  downloadWorkbook(wb, `somiti-summary-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ---------- ৩. একটা নির্দিষ্ট মাসের রিপোর্ট (সব সদস্য মিলিয়ে) ---------- */
export function exportMonthly(monthLabel, members, transactions) {
  const header = ["সদস্য নং", "নাম", "তারিখ", "ধরন", "পরিমাণ (৳)", "মন্তব্য"];
  const rows = [header];
  const filtered = transactions.filter((t) => periodLabel(t) === monthLabel);

  filtered.forEach((t) => {
    const mem = members.find((m) => m.id === t.member_id);
    rows.push([
      mem?.member_no || "",
      mem?.name || "অজানা সদস্য",
      t.deposit_date,
      t.type === "deposit" ? "জমা" : t.type === "profit" ? "লাভ" : t.type,
      Number(t.amount),
      t.remarks || "",
    ]);
  });

  const total = filtered.reduce((s, t) => s + Number(t.amount), 0);
  rows.push([]);
  rows.push(["", "", "", "মোট", total]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthLabel.slice(0, 28));
  downloadWorkbook(wb, `${monthLabel}-report.xlsx`);
}

/* ---------- ৪. একটা নির্দিষ্ট বছরের রিপোর্ট (member x month ম্যাট্রিক্স) ---------- */
export function exportYearly(year, members, transactions) {
  const monthsInYear = Array.from(
    new Set(
      transactions
        .filter((t) => t.type === "deposit" && yearOfLabel(periodLabel(t)) === String(year))
        .map(periodLabel)
    )
  );

  const header = ["সদস্য নং", "নাম", ...monthsInYear, "মোট জমা (এই বছর)", "মোট লাভ (এই বছর)", "সর্বমোট"];
  const rows = [header];

  members.forEach((m) => {
    const myTx = transactions.filter((t) => t.member_id === m.id);
    const rowMonths = monthsInYear.map((mo) => {
      const sum = myTx
        .filter((t) => t.type === "deposit" && periodLabel(t) === mo)
        .reduce((s, t) => s + Number(t.amount), 0);
      return sum || "";
    });
    const totalDeposit = myTx
      .filter((t) => t.type === "deposit" && yearOfLabel(periodLabel(t)) === String(year))
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalProfit = myTx
      .filter((t) => t.type === "profit" && yearOfLabel(periodLabel(t)) === String(year))
      .reduce((s, t) => s + Number(t.amount), 0);
    rows.push([
      m.member_no || "",
      m.name,
      ...rowMonths,
      totalDeposit,
      totalProfit,
      totalDeposit + totalProfit,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = header.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${year}`.slice(0, 28));
  downloadWorkbook(wb, `${year}-yearly-report.xlsx`);
}
