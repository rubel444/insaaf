import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function PUT(req, { params }) {
  const body = await req.json();
  const supabase = supabaseAdmin();

  const updates = {};
  ["member_no", "name", "photo_url", "status", "previous_amount", "notes", "left_date"].forEach(
    (key) => {
      if (key in body) updates[key] = body[key];
    }
  );

  const { data, error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

// মেম্বার একেবারে সমিতি ছেড়ে চলে গেলে এবং তার সব হিসাব মুছে ফেলতে চাইলে ব্যবহার হবে
export async function DELETE(req, { params }) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("members").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
