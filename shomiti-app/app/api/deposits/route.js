import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("deposit_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data });
}

export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseAdmin();

  if (!body.member_id || !body.amount || !body.deposit_date) {
    return NextResponse.json(
      { error: "member_id, amount, deposit_date আবশ্যক" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      member_id: body.member_id,
      type: body.type || "deposit",
      amount: body.amount,
      deposit_date: body.deposit_date,
      for_month: body.for_month || null,
      remarks: body.remarks || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transaction: data });
}
