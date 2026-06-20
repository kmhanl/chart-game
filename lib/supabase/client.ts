import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// ──────────────────────────────────────────────────────────
// 클라이언트 컴포넌트 ("use client") 에서 사용
// 싱글톤으로 한 번만 생성
// ──────────────────────────────────────────────────────────
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
