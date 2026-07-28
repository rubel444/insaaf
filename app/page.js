import { supabaseAdmin } from "../lib/supabaseAdmin";
import { buildMemberSummaries, distinctMonths, taka } from "../lib/helpers";
import MemberCard from "./MemberCard";

export const dynamic = "force-dynamic"; // সবসময় লেটেস্ট ডেটা দেখাবে
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const supabase = supabaseAdmin();

  const [{ data: members, error: mErr }, { data: transactions, error: tErr }] =
    await Promise.all([
      supabase.from("members").select("*").order("member_no", { ascending: true }),
      supabase.from("transactions").select("*"),
    ]);

  if (mErr || tErr) {
    return (
      <div className="wrap">
        <div className="msg error">
          ডেটা লোড করতে সমস্যা হচ্ছে। .env.local এ Supabase key ঠিকমতো বসানো আছে কিনা চেক করুন। <br />
          {mErr?.message || tErr?.message}
        </div>
      </div>
    );
  }

  const summaries = buildMemberSummaries(members || [], transactions || []);
  const activeMembers = summaries.filter((m) => m.status === "active");
  const excludedOrLeft = summaries.filter((m) => m.status !== "active");
  const months = distinctMonths(transactions || []);

  const grandTotal = summaries.reduce((s, m) => s + m.currentBalance, 0);
  const totalDue = summaries.reduce((s, m) => s + (m.due || 0), 0);
  const thisMonthDeposits = (transactions || [])
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalProfitDistributed = (transactions || [])
    .filter((t) => t.type === "profit")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="wrap">
      <div className="ledger-header">
        <div>
          <h1 className="ledger-title">ইনসাফ ফাউন্ডেশন</h1>
          <div className="ledger-sub">
            সক্রিয় সদস্য {activeMembers.length} জন · হালনাগাদ তথ্য (রিয়েল-টাইম)
          </div>
        </div>
        <a className="admin-link" href="/admin">
          এডমিন প্যানেল
        </a>
      </div>

      <div className="stamp-row">
        <div className="stamp">
          <div className="stamp-label">সর্বমোট তহবিল</div>
          <div className="stamp-value">{taka(grandTotal)}</div>
        </div>
        <div className="stamp">
          <div className="stamp-label">মোট জমা (সব মাস মিলিয়ে)</div>
          <div className="stamp-value">{taka(thisMonthDeposits)}</div>
        </div>
        <div className="stamp">
          <div className="stamp-label">মোট লাভ বন্টিত</div>
          <div className="stamp-value">{taka(totalProfitDistributed)}</div>
        </div>
        {totalDue > 0 && (
          <div className="stamp stamp-danger">
            <div className="stamp-label">সর্বমোট বকেয়া (সবাই মিলিয়ে)</div>
            <div className="stamp-value stamp-value-danger">{taka(totalDue)}</div>
          </div>
        )}
      </div>

      <div className="section-title">সদস্যদের তালিকা</div>
      <div className="member-grid">
        {activeMembers.map((m) => (
          <MemberCard key={m.id} m={m} />
        ))}
      </div>

      {excludedOrLeft.length > 0 && (
        <>
          <div className="section-title">প্রাক্তন / বাদ যাওয়া সদস্য</div>
          <div className="member-grid">
            {excludedOrLeft.map((m) => (
              <MemberCard key={m.id} m={m} />
            ))}
          </div>
        </>
      )}

      {months.length > 0 && (
        <>
          <div className="section-title">মাসভিত্তিক জমার সারসংক্ষেপ</div>
          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>সদস্য</th>
                  {months.map((mo) => (
                    <th key={mo}>{mo}</th>
                  ))}
                  <th>বর্তমান ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    {months.map((mo) => {
                      const tx = m.transactions.filter(
                        (t) => t.type === "deposit" && t.for_month === mo
                      );
                      const sum = tx.reduce((s, t) => s + Number(t.amount), 0);
                      return (
                        <td key={mo} className="amount-cell">
                          {sum > 0 ? taka(sum) : "—"}
                        </td>
                      );
                    })}
                    <td className="amount-cell">
                      <strong>{taka(m.currentBalance)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
