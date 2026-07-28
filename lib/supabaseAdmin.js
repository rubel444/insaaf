import { createClient } from "@supabase/supabase-js";

// এই ক্লায়েন্টটা শুধু সার্ভার সাইড কোডে (API routes / server components) ব্যবহার হবে।
// SUPABASE_SERVICE_ROLE_KEY কখনো ব্রাউজারে যায় না।
//
// global.fetch এ cache: "no-store" জোর করে বসিয়ে দেয়া হচ্ছে যাতে Next.js/Vercel
// কোনোভাবেই এই ডেটা cache না করে - ফলে এডমিন থেকে entry দেয়ার সাথে সাথেই
// viewer রা সেই আপডেট দেখতে পাবে (real-time এর মতো)।
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
