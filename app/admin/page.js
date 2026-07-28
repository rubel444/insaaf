"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { taka, buildMemberSummaries } from "../../lib/helpers";

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "কিছু একটা ভুল হয়েছে");
  return data;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [m, d, i] = await Promise.all([
        api("/api/members"),
        api("/api/deposits"),
        api("/api/investments"),
      ]);
      setMembers(m.members);
      setTransactions(d.transactions);
      setInvestments(i.investments);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleLogout() {
    await api("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function flash(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  const summaries = buildMemberSummaries(members, transactions);

  return (
    <div className="wrap">
      <div className="ledger-header">
        <div>
          <h1 className="ledger-title" style={{ fontSize: 22 }}>
            এডমিন প্যানেল
          </h1>
          <div className="ledger-sub">এখান থেকে জমা, সদস্য এবং লাভ-বন্টন পরিচালনা করুন</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="admin-link" href="/">
            পাবলিক পেইজ দেখুন
          </a>
          <button className="btn secondary" onClick={handleLogout}>
            লগ-আউট
          </button>
        </div>
      </div>

      {msg && <div className={`msg ${msg.type}`} style={{ marginTop: 16 }}>{msg.text}</div>}

      <div className="tabs" style={{ marginTop: 20 }}>
        {[
          ["members", "সদস্যগণ"],
          ["deposit", "জমা এন্ট্রি"],
          ["investment", "লাভ / বিনিয়োগ"],
          ["history", "সব লেনদেন"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>লোড হচ্ছে...</p>
      ) : (
        <>
          {tab === "members" && (
            <MembersTab members={summaries} onChange={loadAll} flash={flash} />
          )}
          {tab === "deposit" && (
            <DepositTab members={members} onChange={loadAll} flash={flash} />
          )}
          {tab === "investment" && (
            <InvestmentTab
              investments={investments}
              activeCount={members.filter((m) => m.status === "active").length}
              onChange={loadAll}
              flash={flash}
            />
          )}
          {tab === "history" && (
            <HistoryTab
              transactions={transactions}
              members={members}
              onChange={loadAll}
              flash={flash}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Members Tab ---------------- */
function MembersTab({ members, onChange, flash }) {
  const [form, setForm] = useState({
    member_no: "",
    name: "",
    photo_url: "",
    previous_amount: "",
    target_amount: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [targetEdits, setTargetEdits] = useState({});

  async function addMember(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/members", {
        method: "POST",
        body: JSON.stringify({
          member_no: form.member_no ? Number(form.member_no) : null,
          name: form.name,
          photo_url: form.photo_url || null,
          previous_amount: form.previous_amount ? Number(form.previous_amount) : 0,
          target_amount: form.target_amount ? Number(form.target_amount) : 0,
        }),
      });
      setForm({ member_no: "", name: "", photo_url: "", previous_amount: "", target_amount: "" });
      flash("success", "নতুন সদস্য যোগ করা হয়েছে।");
      onChange();
    } catch (e) {
      flash("error", e.message);
    }
    setSaving(false);
  }

  async function saveTarget(m) {
    const val = targetEdits[m.id];
    if (val === undefined || val === "") return;
    try {
      await api(`/api/members/${m.id}`, {
        method: "PUT",
        body: JSON.stringify({ target_amount: Number(val) }),
      });
      flash("success", `${m.name} এর টার্গেট আপডেট হয়েছে।`);
      onChange();
    } catch (e) {
      flash("error", e.message);
    }
  }

  async function updateStatus(m, status) {
    const confirmMsg =
      status === "left"
        ? `${m.name} কে "চলে গেছেন" হিসেবে মার্ক করবেন? তার বর্তমান ব্যালেন্স ${taka(
            m.currentBalance
          )} এখনো দেখানো হবে (ইতিহাস হিসেবে থাকবে)।`
        : status === "excluded"
        ? `${m.name} কে বাদ (লাল দাগ) দিতে চান?`
        : `${m.name} কে আবার একটিভ করবেন?`;
    if (!confirm(confirmMsg)) return;
    try {
      await api(`/api/members/${m.id}`, {
        method: "PUT",
        body: JSON.stringify({ status, left_date: status === "left" ? new Date().toISOString().slice(0, 10) : null }),
      });
      flash("success", "স্ট্যাটাস আপডেট হয়েছে।");
      onChange();
    } catch (e) {
      flash("error", e.message);
    }
  }

  async function deleteMember(m) {
    if (!confirm(`${m.name} কে একেবারে মুছে ফেলবেন? এর সব লেনদেনের হিসাবও মুছে যাবে। এই কাজ ফেরানো যাবে না।`))
      return;
    try {
      await api(`/api/members/${m.id}`, { method: "DELETE" });
      flash("success", "সদস্য মুছে ফেলা হয়েছে।");
      onChange();
    } catch (e) {
      flash("error", e.message);
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>নতুন সদস্য যোগ করুন</h3>
        <form onSubmit={addMember}>
          <div className="form-row">
            <div className="field">
              <label>সদস্য নং (ঐচ্ছিক)</label>
              <input
                type="number"
                value={form.member_no}
                onChange={(e) => setForm({ ...form, member_no: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>নাম</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field" style={{ flex: 2 }}>
              <label>ছবির লিংক (URL) — ঐচ্ছিক</label>
              <input
                placeholder="https://..."
                value={form.photo_url}
                onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
              />
            </div>
            <div className="field">
              <label>আগের ব্যালেন্স (Previous Amount)</label>
              <input
                type="number"
                value={form.previous_amount}
                onChange={(e) => setForm({ ...form, previous_amount: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>টার্গেট এমাউন্ট (এই মাস পর্যন্ত ক্লিয়ার থাকলে কত জমা থাকার কথা)</label>
              <input
                type="number"
                placeholder="যেমন 51000"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              />
            </div>
          </div>
          <button className="btn" disabled={saving}>
            {saving ? "যোগ হচ্ছে..." : "+ সদস্য যোগ করুন"}
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>নং</th>
              <th>নাম</th>
              <th>স্ট্যাটাস</th>
              <th>বর্তমান ব্যালেন্স</th>
              <th>টার্গেট এমাউন্ট</th>
              <th>বকেয়া</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.member_no || "—"}</td>
                <td>{m.name}</td>
                <td>
                  {m.status === "active" ? "সক্রিয়" : m.status === "left" ? "চলে গেছেন" : "বাদ"}
                </td>
                <td className="amount-cell">{taka(m.currentBalance)}</td>
                <td>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="number"
                      style={{ width: 90, padding: "4px 6px", fontSize: 12 }}
                      placeholder={m.target > 0 ? m.target : "0"}
                      value={targetEdits[m.id] ?? ""}
                      onChange={(e) =>
                        setTargetEdits({ ...targetEdits, [m.id]: e.target.value })
                      }
                    />
                    <button className="icon-btn" onClick={() => saveTarget(m)}>
                      সেভ
                    </button>
                  </div>
                </td>
                <td className="amount-cell">
                  {m.due > 0 ? <span style={{ color: "var(--danger)" }}>{taka(m.due)}</span> : "—"}
                </td>
                <td>
                  <div className="data-table-actions">
                    {m.status !== "active" && (
                      <button className="icon-btn" onClick={() => updateStatus(m, "active")}>
                        একটিভ করুন
                      </button>
                    )}
                    {m.status === "active" && (
                      <>
                        <button className="icon-btn" onClick={() => updateStatus(m, "left")}>
                          চলে গেছেন
                        </button>
                        <button className="icon-btn" onClick={() => updateStatus(m, "excluded")}>
                          বাদ দিন
                        </button>
                      </>
                    )}
                    <button className="icon-btn danger" onClick={() => deleteMember(m)}>
                      মুছুন
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Deposit Tab ---------------- */
function DepositTab({ members, onChange, flash }) {
  const active = members.filter((m) => m.status === "active");
  const [form, setForm] = useState({
    member_id: active[0]?.id || "",
    amount: "2000",
    deposit_date: new Date().toISOString().slice(0, 10),
    for_month: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/deposits", {
        method: "POST",
        body: JSON.stringify({
          member_id: form.member_id,
          amount: Number(form.amount),
          deposit_date: form.deposit_date,
          for_month: form.for_month || null,
          remarks: form.remarks || null,
          type: "deposit",
        }),
      });
      flash("success", "জমার এন্ট্রি সেভ হয়েছে।");
      setForm({ ...form, amount: "2000", for_month: "", remarks: "" });
      onChange();
    } catch (e) {
      flash("error", e.message);
    }
    setSaving(false);
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>মাসিক জমা এন্ট্রি দিন</h3>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="field" style={{ flex: 2 }}>
            <label>সদস্য</label>
            <select
              value={form.member_id}
              onChange={(e) => setForm({ ...form, member_id: e.target.value })}
              required
            >
              {active.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.member_no ? `${m.member_no}. ` : ""}
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>টাকার পরিমাণ</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>জমা দেওয়ার তারিখ</label>
            <input
              type="date"
              value={form.deposit_date}
              onChange={(e) => setForm({ ...form, deposit_date: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>কোন মাসের কিস্তি (যেমনঃ July 2026)</label>
            <input
              placeholder="July 2026"
              value={form.for_month}
              onChange={(e) => setForm({ ...form, for_month: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>মন্তব্য (ঐচ্ছিক)</label>
            <input
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>
        <button className="btn" disabled={saving || !active.length}>
          {saving ? "সেভ হচ্ছে..." : "+ জমা এন্ট্রি সেভ করুন"}
        </button>
        {!active.length && <p className="small-note">প্রথমে একজন সক্রিয় সদস্য যোগ করুন।</p>}
      </form>
      <p className="small-note">
        একজন সদস্য একাধিক মাস বকেয়া থাকলে, প্রতিটা মাসের জন্য এই ফর্মটা আলাদা আলাদা ভাবে পূরণ করুন
        (তারিখ একই দিন দিলেও সমস্যা নাই, "কোন মাসের কিস্তি" ফিল্ডে আলাদা মাস লিখে দিন)।
      </p>
    </div>
  );
}

/* ---------------- Investment Tab ---------------- */
function InvestmentTab({ investments, activeCount, onChange, flash }) {
  const [form, setForm] = useState({
    title: "",
    invested_amount: "",
    profit_amount: "",
    distribution_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (
      !confirm(
        `${form.distribution_date} তারিখ পর্যন্ত যার যত টাকা জমা আছে, তার অনুপাতে ${form.profit_amount} টাকা লাভ ${activeCount} জন সক্রিয় সদস্যের মধ্যে ভাগ হবে (সমান ভাগ না, বেশি জমাদাতা বেশি পাবে)। আগাবেন?`
      )
    )
      return;
    setSaving(true);
    try {
      await api("/api/investments", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          invested_amount: Number(form.invested_amount || 0),
          profit_amount: Number(form.profit_amount),
          distribution_date: form.distribution_date,
          notes: form.notes || null,
        }),
      });
      flash("success", "লাভ সব সক্রিয় সদস্যের মধ্যে বন্টন করা হয়েছে।");
      setForm({ title: "", invested_amount: "", profit_amount: "", distribution_date: form.distribution_date, notes: "" });
      onChange();
    } catch (e) {
      flash("error", e.message);
    }
    setSaving(false);
  }

  async function deleteInvestment(id) {
    if (!confirm("এই প্রজেক্টের হিসাব এবং এর সাথে বন্টন করা লাভ মুছে ফেলবেন?")) return;
    try {
      await api(`/api/investments/${id}`, { method: "DELETE" });
      flash("success", "মুছে ফেলা হয়েছে।");
      onChange();
    } catch (e) {
      flash("error", e.message);
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>নতুন প্রজেক্ট / লাভ বন্টন</h3>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field" style={{ flex: 2 }}>
              <label>প্রজেক্টের নাম</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="field">
              <label>বিনিয়োগ করা টাকা</label>
              <input
                type="number"
                value={form.invested_amount}
                onChange={(e) => setForm({ ...form, invested_amount: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>মোট লাভ (যার যত জমা আছে সেই অনুপাতে ভাগ হবে)</label>
              <input
                type="number"
                required
                value={form.profit_amount}
                onChange={(e) => setForm({ ...form, profit_amount: e.target.value })}
              />
            </div>
            <div className="field">
              <label>বন্টনের তারিখ</label>
              <input
                type="date"
                value={form.distribution_date}
                onChange={(e) => setForm({ ...form, distribution_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>নোট (ঐচ্ছিক)</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <button className="btn" disabled={saving || !activeCount}>
            {saving ? "বন্টন হচ্ছে..." : "লাভ বন্টন করুন"}
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>প্রজেক্ট</th>
              <th>বিনিয়োগ</th>
              <th>লাভ</th>
              <th>তারিখ</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.title}</td>
                <td className="amount-cell">{taka(inv.invested_amount)}</td>
                <td className="amount-cell">{taka(inv.profit_amount)}</td>
                <td>{inv.distribution_date}</td>
                <td>
                  <button className="icon-btn danger" onClick={() => deleteInvestment(inv.id)}>
                    মুছুন
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- History Tab ---------------- */
function HistoryTab({ transactions, members, onChange, flash }) {
  const memberName = (id) => members.find((m) => m.id === id)?.name || "?";

  async function deleteTx(id) {
    if (!confirm("এই এন্ট্রিটা মুছে ফেলবেন?")) return;
    try {
      await api(`/api/deposits/${id}`, { method: "DELETE" });
      flash("success", "এন্ট্রি মুছে ফেলা হয়েছে।");
      onChange();
    } catch (e) {
      flash("error", e.message);
    }
  }

  return (
    <div className="table-wrap">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>সদস্য</th>
            <th>ধরন</th>
            <th>মাস</th>
            <th>পরিমাণ</th>
            <th>মন্তব্য</th>
            <th>অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.deposit_date}</td>
              <td>{memberName(t.member_id)}</td>
              <td>{t.type === "deposit" ? "জমা" : t.type === "profit" ? "লাভ" : t.type}</td>
              <td>{t.for_month || "—"}</td>
              <td className="amount-cell">{taka(t.amount)}</td>
              <td>{t.remarks || "—"}</td>
              <td>
                <button className="icon-btn danger" onClick={() => deleteTx(t.id)}>
                  মুছুন
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
