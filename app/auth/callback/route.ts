import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ──────────────────────────────────────────────────────────
// Google OAuth 콜백 처리
// Supabase가 이 URL로 code를 전달 → 세션으로 교환
//
// Supabase 대시보드 설정:
//   Authentication > URL Configuration > Redirect URLs
//   → http://localhost:3000/auth/callback  (로컬)
//   → https://your-domain.vercel.app/auth/callback  (배포)
// ──────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/game";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 로그인 성공 → game 화면으로 이동
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패 → 로비로 이동 + 에러 파라미터
  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
