"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "লগইন ব্যর্থ হয়েছে।");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError("সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card login-wrap">
        <h1 className="ledger-title" style={{ fontSize: 22 }}>
          এডমিন লগইন
        </h1>
        <p className="ledger-sub">শুধুমাত্র হিসাব রক্ষকের জন্য</p>

        {error && <div className="msg error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>ইউজারনেম</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <label>পাসওয়ার্ড</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
          </button>
        </form>

        <p className="small-note">
          <a href="/">← ফিরে যান পাবলিক পেইজে</a>
        </p>
      </div>
    </div>
  );
}
