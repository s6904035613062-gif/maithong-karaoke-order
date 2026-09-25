import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // เตือนไว้เฉย ๆ ไม่ throw ตรงนี้
  console.warn(
    "[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars. " +
      "Set them in your .env.local (dev) or Vercel Project Settings > Environment Variables (prod)."
  );
}

// @supabase/supabase-js จะ throw ทันทีถ้า URL ไม่ใช่ URL ที่ valid (เช่น "")
// ใช้ placeholder URL ที่ syntactically valid กันไม่ให้ build ล้มตอนที่ยังไม่ได้ตั้ง env vars
// (การเรียก API จริงจะ fail ตอน runtime แทน ซึ่งจะเห็น error ชัดเจนกว่า)
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
