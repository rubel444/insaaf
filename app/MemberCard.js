"use client";
import { useState } from "react";
import { taka } from "../lib/helpers";

export default function MemberCard({ m }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isLeft = m.status === "left";
  const initial = m.name?.trim()?.[0] || "?";
  const showPhoto = m.photo_url && !imgError;

  return (
    <div className={`member-card ${isLeft ? "left-member" : ""}`}>
      <button className="member-top member-top-clickable" onClick={() => setOpen(!open)}>
        {showPhoto ? (
          <img
            className="member-photo"
            src={m.photo_url}
            alt={m.name}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="member-photo-placeholder">{initial}</div>
        )}
        <div style={{ textAlign: "left" }}>
          {m.member_no ? <span className="member-no-badge">নং {m.member_no}</span> : null}
          <div className="member-name">
            {m.name} {isLeft ? "(চলে গেছেন)" : ""}
          </div>
          {m.due > 0 && <span className="due-badge">বকেয়া {taka(m.due)}</span>}
        </div>
      </button>

      <div className="member-balance-row">
        <span className="member-balance-label">মোট জমা</span>
        <span className="member-balance-value">{taka(m.totalContributed)}</span>
      </div>

      <button className="details-toggle" onClick={() => setOpen(!open)}>
        {open ? "লুকান" : "বিস্তারিত দেখুন (জমা + লাভ)"}
      </button>

      {open && (
        <div className="tx-detail">
          <div className="tx-summary">
            <div>
              <span className="member-balance-label">মোট জমা</span>
              <div className="tx-amount-deposit">{taka(m.totalContributed)}</div>
            </div>
            <div>
              <span className="member-balance-label">লাভের ভাগ</span>
              <div className="tx-amount-profit">{taka(m.totalProfit)}</div>
            </div>
            <div>
              <span className="member-balance-label">সর্বমোট (জমা + লাভ)</span>
              <div className="tx-amount-grand">{taka(m.currentBalance)}</div>
            </div>
            {m.target > 0 && (
              <div>
                <span className="member-balance-label">টার্গেট</span>
                <div>{taka(m.target)}</div>
              </div>
            )}
          </div>
          <p className="small-note" style={{ marginTop: -4 }}>যোগদানের তারিখ: {m.join_date || "—"}</p>

          {m.transactions.length > 0 ? (
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
          ) : (
            <p className="small-note">এখনো কোনো এন্ট্রি নাই।</p>
          )}
        </div>
      )}
    </div>
  );
}
