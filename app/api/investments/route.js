import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

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
    .select("id")
    .eq("status", "active");

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
  if (!members || members.length === 0) {
    return NextResponse.json({ error: "কোনো একটিভ মেম্বার পাওয়া যায়নি।" }, { status: 400 });
  }

  const { data: investment, error: invErr } = await supabase
    .from("investments")
    .insert({
      title: body.title,
      invested_amount: body.invested_amount || 0,
      profit_amount: body.profit_amount,
      distribution_date: body.distribution_date || new Date().toISOString().slice(0, 10),
      notes: body.notes || null,
    })
    .select()
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  const share = Number(body.profit_amount) / members.length;
  const rows = members.map((m) => ({
    member_id: m.id,
    type: "profit",
    amount: share,
    deposit_date: investment.distribution_date,
    for_month: null,
    remarks: `"${body.title}" প্রজেক্ট থেকে লাভের ভাগ`,
    investment_id: investment.id,
  }));

  const { error: txErr } = await supabase.from("transactions").insert(rows);
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  return NextResponse.json({ investment, sharePerMember: share, memberCount: members.length });
}
