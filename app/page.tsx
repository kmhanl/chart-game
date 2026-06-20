import { createClient } from "@/lib/supabase/server";
import AuthButton from "@/components/AuthButton";
import LobbyClient from "@/components/LobbyClient";

// ──────────────────────────────────────────────────────────
// 루트 페이지 = 로비
// 서버에서 유저 세션 조회 → AuthButton / LobbyClient에 전달
// ──────────────────────────────────────────────────────────
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;

  return (
    <div style={{
      minHeight: "100vh", background: "#fff", color: "#212529",
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── 헤더 ── */}
      <header style={{
        borderBottom: "1px solid #e9ecef",
        padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>📊 차트게임</span>
        <AuthButton user={user} />
      </header>

      {/* ── 알림 메시지 ── */}
      {params.message === "login_required" && (
        <div style={{
          margin: "12px 20px 0",
          padding: "10px 16px", borderRadius: 8,
          background: "#fff3cd", border: "1px solid #ffc107",
          fontSize: 13, color: "#856404",
        }}>
          🔒 게임을 시작하려면 Google 로그인이 필요합니다.
        </div>
      )}
      {params.error === "auth_failed" && (
        <div style={{
          margin: "12px 20px 0",
          padding: "10px 16px", borderRadius: 8,
          background: "#fff5f5", border: "1px solid #fca5a5",
          fontSize: 13, color: "#991b1b",
        }}>
          ⚠️ 로그인에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      {/* ── 로비 본문 (클라이언트 컴포넌트) ── */}
      <LobbyClient user={user} />
    </div>
  );
}
