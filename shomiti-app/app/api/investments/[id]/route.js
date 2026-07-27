import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function DELETE(req, { params }) {
  const supabase = supabaseAdmin();
  // linked profit transactions গুলাও মুছে যাবে (investment_id references ... on delete set null থাকায়
  // আমরা ম্যানুয়ালি আগে মুছে দিচ্ছি যাতে ব্যালেন্স ভুল না হয়)
  await supabase.from("transactions").delete().eq("investment_id", params.id);
  const { error } = await supabase.from("investments").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
