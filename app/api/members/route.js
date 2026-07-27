import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("member_no", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}

export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("members")
    .insert({
      member_no: body.member_no || null,
      name: body.name,
      photo_url: body.photo_url || null,
      status: body.status || "active",
      previous_amount: body.previous_amount || 0,
      join_date: body.join_date || new Date().toISOString().slice(0, 10),
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}
