"use client";
import { useState } from "react";
import { taka } from "../lib/helpers";

export default function MemberCard({ m }) {
  const [open, setOpen] = useState(false);
  const isLeft = m.status === "left";
  const initial = m.name?.trim()?.[0] || "?";

  return (
    <div className={`member-card ${isLeft ? "left-member" : ""}`}>
      <div className="member-top">
        {m.photo_url ? (
          <img className="member-photo" src={m.photo_url} alt={m.name} />
        ) : (
          <div className="member-photo-placeholder">{initial}</div>
        )}
        <div>
          {m.member_no ? <span className="member-no-badge">নং {m.member_no}</span> : null}
          <div className="member-name">
            {m.name} {isLeft ? "(চলে গেছেন)" : ""}
          </div>
        </div>
      </div>

      <div className="member-balance-row">
        <span className="member-balance-label">বর্তমান ব্যালেন্স</span>
        <span className="member-balance-value">{taka(m.currentBalance)}</span>
      </div>

      {m.transactions.length > 0 && (
        <button className="details-toggle" onClick={() => setOpen(!open)}>
          {open ? "লুকান" : `বিস্তারিত দেখুন (${m.transactions.length} এন্ট্রি)`}
        </button>
      )}

      {open && (
        <div className="tx-list">
          {m.transactions.map((t) => (
            <div className="tx-row" key={t.id}>
              <span>
                {t.deposit_date}
                {t.for_month ? ` (${t.for_month})` : ""}
                {t.type === "profit" ? " — লাভের ভাগ" : ""}
              </span>
              <span className={t.type === "profit" ? "tx-amount-profit" : "tx-amount-deposit"}>
                {taka(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
