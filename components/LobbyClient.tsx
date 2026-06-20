"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#fff", surface: "#f8f9fa", border: "#e9ecef", border2: "#dee2e6",
  text: "#212529", sub: "#495057", muted: "#adb5bd",
  accent: "#7048e8", green: "#2f9e44", red: "#e03131", blue: "#1971c2",
};

const INIT_CASH = 10_000_000;
const fmtKRW = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원";
const fmtPct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

interface GameSession {
  final_asset: number;
  return_pct: number;
  ticker_name: string;
  market: string;
  played_at: string;
}

interface Props { user: User | null; }

export default function LobbyClient({ user }: Props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [intervalMode, setIntervalMode] = useState<"1wk" | "1mo">("1wk");
  const [mounted,      setMounted]      = useState(false);
  const [currentAsset,  setCurrentAsset]  = useState<number | null>(null);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [loadingAsset,  setLoadingAsset]  = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchAsset = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      setLoadingAsset(true);
      const { data } = await supabase
        .from("game_sessions")
        .select("final_asset, return_pct, ticker_name, market, played_at")
        .eq("user_id", currentUser.id)
        .order("played_at", { ascending: false })
        .limit(5);
      if (data && data.length > 0) {
        setCurrentAsset(data[0].final_asset);
        setRecentSessions(data);
      } else {
        setCurrentAsset(INIT_CASH);
      }
      setLoadingAsset(false);
    };
    fetchAsset();
  }, []);

  const handleStartGame = async (market: "KOSPI" | "QQQ") => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/game` },
      });
      return;
    }
    const asset = currentAsset ?? INIT_CASH;
    const params = new URLSearchParams({
      market, interval: intervalMode,
      initCash: String(asset),
    });
    router.push(`/game?${params.toString()}`);
  };

  const pnlColor = (pct: number) => pct > 0 ? C.red : pct < 0 ? C.blue : C.muted;
  const totalPnlPct = currentAsset != null ? ((currentAsset / INIT_CASH) - 1) * 100 : 0;

  return (
    <main style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "16px 16px 24px", overflowY: "auto",
    }}>

      {/* 타이틀 */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Chart Game</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>차트게임</h1>
        <p style={{ color: C.muted, marginTop: 4, fontSize: 12 }}>실제 과거 데이터 · 1턴 = 1봉 · 추세추종 학습</p>
      </div>

      {/* 자산 현황 (로그인 시) */}
      {mounted && user && (
        <div style={{ width: "100%", maxWidth: 480, marginBottom: 16 }}>
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
            {loadingAsset ? (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 13 }}>자산 불러오는 중...</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: recentSessions.length > 0 ? 10 : 0 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>💰 현재 자산</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: pnlColor(totalPnlPct) }}>
                      {fmtKRW(currentAsset ?? INIT_CASH)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>초기 대비</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: pnlColor(totalPnlPct) }}>
                      {fmtPct(totalPnlPct)}
                    </div>
                  </div>
                </div>
                {recentSessions.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>최근 게임</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {recentSessions.map((s, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "6px 10px", borderRadius: 8,
                          background: C.bg, border: `1px solid ${C.border}`, fontSize: 12,
                        }}>
                          <span style={{ color: C.sub }}>{s.market} · {s.ticker_name}</span>
                          <span style={{ fontWeight: 700, color: pnlColor(s.return_pct) }}>{fmtPct(s.return_pct)}</span>
                          <span style={{ color: C.muted, fontSize: 11 }}>
                            {new Date(s.played_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 봉 선택 */}
      <div style={{ marginBottom: 16, width: "100%", maxWidth: 480 }}>
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

      {/* 게임 시작 버튼 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
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

      {/* 미로그인 안내 */}
      {mounted && !user && (
        <div style={{ padding: "10px 16px", background: "#f3f0ff", borderRadius: 8, border: "1px solid #d0bfff", fontSize: 12, color: C.accent, textAlign: "center", marginBottom: 16 }}>
          🔒 게임 시작 시 Google 로그인이 필요합니다
        </div>
      )}

      {/* 게임 정보 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, maxWidth: 480, width: "100%" }}>
        {[["봉 기준", intervalMode === "1wk" ? "주봉" : "월봉"], ["이동평균","5 / 10 / 240MA"]].map(([k, v]) => (
          <div key={k} style={{ background: C.surface, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
