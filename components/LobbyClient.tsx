"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#fff", surface: "#f8f9fa", border: "#e9ecef", border2: "#dee2e6",
  text: "#212529", sub: "#495057", muted: "#adb5bd",
  accent: "#7048e8",
};

const MISSIONS = [
  { id: "golden_cross",      icon: "✨", title: "골든크로스 공략",  desc: "5MA가 10MA를 상향 돌파하는 타이밍에 매수하세요",       hint: "5MA가 10MA 아래에 있다가 위로 올라오는 순간이 골든크로스입니다" },
  { id: "pullback_buy",      icon: "🎯", title: "눌림목 매수",      desc: "240MA 위 상승 추세에서 10MA 근처 눌림목에 매수하세요", hint: "주가가 240MA 위에 있고 10MA 근처(±3%)까지 눌린 구간이 눌림목입니다" },
  { id: "double_top_escape", icon: "🏃", title: "M 쌍봉 탈출",     desc: "고점 형성 후 10MA를 이탈하기 전에 매도하세요",         hint: "전고점 근처에서 음봉이 나오고 10MA가 꺾이기 시작하면 분배 구간입니다" },
  { id: "ma240_breakout",    icon: "🚀", title: "240MA 돌파 매수", desc: "장기 하락 후 240MA를 상향 돌파하는 순간을 포착하세요", hint: "주가가 240MA 아래에 오래 있다가 처음 위로 올라오는 봉이 핵심입니다" },
];

interface Props {
  user: User | null;
}

export default function LobbyClient({ user }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [intervalMode, setIntervalMode] = useState<"1wk" | "1mo">("1wk");
  const [mission,      setMission]      = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // Hydration 에러 해결: user prop이 서버/클라이언트 간 다를 수 있으므로
  // 조건부 렌더(user에 의존하는 UI)를 mounted 이후에만 표시
  // ─────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleStartGame = async (market: "KOSPI" | "QQQ") => {
    if (!user) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/game` },
      });
      return;
    }
    const params = new URLSearchParams({ market, interval: intervalMode, ...(mission ? { mission } : {}) });
    router.push(`/game?${params.toString()}`);
  };

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>

      {/* 타이틀 */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>Chart Game</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>차트게임</h1>
        <p style={{ color: C.muted, marginTop: 6, fontSize: 13 }}>실제 과거 데이터 · 1턴 = 1봉 · 추세추종 학습</p>
      </div>

      {/* 봉 선택 */}
      <div style={{ marginBottom: 20, width: "100%", maxWidth: 480 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, textAlign: "center" }}>봉 기준</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {([["1wk","📊 주봉"],["1mo","📅 월봉"]] as const).map(([val, lbl]) => {
            const active = intervalMode === val;
            return (
              <button key={val} onClick={() => setIntervalMode(val)} style={{
                padding: "9px 28px", borderRadius: 10, fontFamily: "inherit",
                border: `2px solid ${active ? C.accent : C.border2}`,
                background: active ? "#f3f0ff" : C.bg,
                color: active ? C.accent : C.sub,
                fontWeight: active ? 800 : 500, fontSize: 14, cursor: "pointer",
              }}>{lbl}</button>
            );
          })}
        </div>
      </div>

      {/* 미션 선택 */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, textAlign: "center" }}>모드 선택</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={() => setMission(null)} style={{
            padding: "12px 10px", borderRadius: 10, fontFamily: "inherit",
            border: `2px solid ${mission === null ? C.accent : C.border2}`,
            background: mission === null ? "#f3f0ff" : C.bg,
            color: mission === null ? C.accent : C.sub,
            fontWeight: mission === null ? 800 : 500, fontSize: 13,
            cursor: "pointer", textAlign: "left",
          }}>
            <div>🆓 자유 모드</div>
            <div style={{ fontSize: 11, marginTop: 3, color: C.muted }}>자유롭게 매매 연습</div>
          </button>
          {MISSIONS.map(m => (
            <button key={m.id} onClick={() => setMission(m.id)} style={{
              padding: "12px 10px", borderRadius: 10, fontFamily: "inherit",
              border: `2px solid ${mission === m.id ? C.accent : C.border2}`,
              background: mission === m.id ? "#f3f0ff" : C.bg,
              color: mission === m.id ? C.accent : C.sub,
              fontWeight: mission === m.id ? 800 : 500, fontSize: 13,
              cursor: "pointer", textAlign: "left",
            }}>
              <div>{m.icon} {m.title}</div>
              <div style={{ fontSize: 11, marginTop: 3, color: C.muted, lineHeight: 1.4 }}>{m.desc.slice(0, 28)}...</div>
            </button>
          ))}
        </div>
        {mission && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "#f3f0ff", borderRadius: 10, border: "1px solid #d0bfff", fontSize: 12, color: C.accent, lineHeight: 1.6 }}>
            💡 {MISSIONS.find(m => m.id === mission)?.hint}
          </div>
        )}
      </div>

      {/* 게임 시작 버튼 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {(["KOSPI", "QQQ"] as const).map(m => (
          <button key={m} onClick={() => handleStartGame(m)} style={{
            padding: "14px 44px", borderRadius: 10,
            border: `1.5px solid ${C.border2}`,
            cursor: "pointer", fontWeight: 700, fontSize: 16,
            background: C.bg, color: C.text, fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)"; }}
          >
            {m === "QQQ" ? "🇺🇸 QQQ" : "🇰🇷 KOSPI"}
          </button>
        ))}
      </div>

      {/* 미로그인 안내 — mounted 후에만 (hydration 안전) */}
      {mounted && !user && (
        <div style={{ padding: "10px 16px", background: "#f3f0ff", borderRadius: 8, border: "1px solid #d0bfff", fontSize: 12, color: C.accent, textAlign: "center" }}>
          🔒 게임 시작 시 Google 로그인이 필요합니다
        </div>
      )}

      {/* 게임 정보 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, maxWidth: 480, width: "100%", marginTop: 12 }}>
        {[["초기자본","1,000만원"],["봉 기준", intervalMode === "1wk" ? "주봉" : "월봉"],["이동평균","5 / 10 / 240MA"]].map(([k, v]) => (
          <div key={k} style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
