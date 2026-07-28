import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// একটা মাত্র টার্গেট এমাউন্ট সব "active" সদস্যের উপর একসাথে বসিয়ে দেয়,
// যাতে একজন একজন করে বসাতে না হয়
export async function POST(req) {
  const body = await req.json();
  if (body.target_amount === undefined || body.target_amount === null) {
    return NextResponse.json({ error: "target_amount আবশ্যক" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .update({ target_amount: Number(body.target_amount) })
    .eq("status", "active")
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updatedCount: data.length });
}
