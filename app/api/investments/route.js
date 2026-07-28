import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .order("distribution_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ investments: data });
}

// একটা প্রজেক্টের লাভ রেকর্ড করে, সব একটিভ মেম্বারের মধ্যে সমান ভাগে বন্টন করে
// প্রতিটা মেম্বারের জন্য একটা 'profit' টাইপ transaction তৈরি হয়ে যায়
export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseAdmin();

  if (!body.profit_amount || !body.title) {
    return NextResponse.json(
      { error: "title এবং profit_amount আবশ্যক" },
      { status: 400 }
    );
  }

  const { data: members, error: memErr } = await supabase
    .from("members")
    .select("id, previous_amount")
    .eq("status", "active");

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
  if (!members || members.length === 0) {
    return NextResponse.json({ error: "কোনো একটিভ মেম্বার পাওয়া যায়নি।" }, { status: 400 });
  }

  const distributionDate =
    body.distribution_date || new Date().toISOString().slice(0, 10);

  // বন্টনের তারিখ পর্যন্ত সবার আসল জমা+আগের লাভের হিসাব বের করা হচ্ছে,
  // যাতে লাভ সমান ভাগে না হয়ে যার যত টাকা জমা আছে তার ভিত্তিতে অনুপাতে ভাগ হয়
  const { data: txUpToDate, error: txFetchErr } = await supabase
    .from("transactions")
    .select("member_id, type, amount, deposit_date")
    .lte("deposit_date", distributionDate);

  if (txFetchErr) return NextResponse.json({ error: txFetchErr.message }, { status: 500 });

  const balanceByMember = {};
  members.forEach((m) => {
    balanceByMember[m.id] = Number(m.previous_amount || 0);
  });
  (txUpToDate || []).forEach((t) => {
    if (t.member_id in balanceByMember) {
      balanceByMember[t.member_id] += Number(t.amount);
    }
  });

  // যাদের ব্যালেন্স শূন্য বা নিচে তাদের বাদ দিয়ে বাকিদের মধ্যে অনুপাতে ভাগ
  const eligible = members.filter((m) => balanceByMember[m.id] > 0);
  const totalBalance = eligible.reduce((s, m) => s + balanceByMember[m.id], 0);

  if (eligible.length === 0 || totalBalance <= 0) {
    return NextResponse.json(
      { error: `${distributionDate} তারিখ পর্যন্ত কোনো সদস্যের জমা পাওয়া যায়নি, তাই লাভ বন্টন করা যাচ্ছে না।` },
      { status: 400 }
    );
  }

  const { data: investment, error: invErr } = await supabase
    .from("investments")
    .insert({
      title: body.title,
      invested_amount: body.invested_amount || 0,
      profit_amount: body.profit_amount,
      distribution_date: distributionDate,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  const profitTotal = Number(body.profit_amount);
  const rows = eligible.map((m) => {
    const weight = balanceByMember[m.id] / totalBalance;
    const share = Math.round(profitTotal * weight * 100) / 100;
    return {
      member_id: m.id,
      type: "profit",
      amount: share,
      deposit_date: distributionDate,
      for_month: null,
      remarks: `"${body.title}" প্রজেক্ট থেকে লাভের ভাগ (তার জমার অনুপাতে)`,
      investment_id: investment.id,
    };
  });

  const { error: txErr } = await supabase.from("transactions").insert(rows);
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  return NextResponse.json({
    investment,
    memberCount: eligible.length,
    totalBalanceConsidered: totalBalance,
    breakdown: rows.map((r, i) => ({ member_id: eligible[i].id, share: r.amount })),
  });
}
