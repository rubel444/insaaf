import { createClient } from "@supabase/supabase-js";

// এই ক্লায়েন্টটা শুধু সার্ভার সাইড কোডে (API routes / server components) ব্যবহার হবে।
// SUPABASE_SERVICE_ROLE_KEY কখনো ব্রাউজারে যায় না।
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
