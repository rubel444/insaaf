import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function PUT(req, { params }) {
  const body = await req.json();
  const supabase = supabaseAdmin();

  const updates = {};
  ["amount", "deposit_date", "for_month", "remarks", "type"].forEach((key) => {
    if (key in body) updates[key] = body[key];
  });

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transaction: data });
}

export async function DELETE(req, { params }) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("transactions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
