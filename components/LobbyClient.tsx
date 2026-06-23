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

// ══════════════════════════════════════════════════════════════════════════════
// 📱 PWA 설치 안내 배너
// ══════════════════════════════════════════════════════════════════════════════
function PwaInstallBanner() {
  const [show,      setShow]      = useState(false);
  const [platform, setPlatform]  = useState<"ios" | "android" | null>(null);
  const [step,     setStep]      = useState(0);   // iOS 단계별 안내

  useEffect(() => {
    // 이미 설치됐으면 표시 안 함
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // 닫기 누른 적 있으면 표시 안 함
    if (sessionStorage.getItem("pwa_banner_closed")) return;

    const ua = navigator.userAgent;
    const isIos     = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isMobile  = isIos || isAndroid;

    if (!isMobile) return;
    setPlatform(isIos ? "ios" : "android");
    setShow(true);
  }, []);

  if (!show) return null;

  // ── Android: beforeinstallprompt가 없어도 안내 표시 ──
  if (platform === "android") {
    return (
      <div style={{
        width: "100%", maxWidth: 480,
        background: "#f3f0ff", border: "1.5px solid #b197fc",
        borderRadius: 14, padding: "14px 16px", marginBottom: 16,
        position: "relative",
      }}>
        <button onClick={() => { setShow(false); sessionStorage.setItem("pwa_banner_closed","1"); }}
          style={{ position:"absolute", top:10, right:12, background:"none", border:"none", fontSize:18, color:C.muted, cursor:"pointer", lineHeight:1 }}>×</button>
        <div style={{ fontSize:13, fontWeight:700, color:C.accent, marginBottom:6 }}>
          📲 홈 화면에 추가하면 앱처럼 사용 가능!
        </div>
        <div style={{ fontSize:12, color:C.sub, lineHeight:1.7 }}>
          Chrome 브라우저 오른쪽 상단 <b>⋮</b> 메뉴<br/>
          → <b>"홈 화면에 추가"</b> 또는 <b>"앱 설치"</b> 탭
        </div>
      </div>
    );
  }

  // ── iOS: 단계별 안내 ──
  const steps = [
    {
      icon: "⬆️",
      title: "1단계 — 공유 버튼 탭",
      desc: "Safari 하단 가운데 공유 버튼(⬆️)을 탭하세요.",
      img: (
        <div style={{ background:"#e9ecef", borderRadius:10, padding:"10px 14px", marginTop:8, fontSize:12, color:C.sub, textAlign:"center", lineHeight:1.8 }}>
          Safari 주소창 아래<br/>
          <span style={{ fontSize:22 }}>⬆️</span><br/>
          <span style={{ fontSize:11, color:C.muted }}>하단 가운데 공유 아이콘</span>
        </div>
      ),
    },
    {
      icon: "➕",
      title: "2단계 — 홈 화면에 추가",
      desc: "스크롤해서 \"홈 화면에 추가\" 버튼을 탭하세요.",
      img: (
        <div style={{ background:"#e9ecef", borderRadius:10, padding:"10px 14px", marginTop:8, fontSize:12, color:C.sub, lineHeight:1.8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", borderRadius:8, padding:"8px 12px", marginBottom:4, border:"1px solid #dee2e6" }}>
            <span style={{ fontSize:20 }}>➕</span>
            <span style={{ fontWeight:700, color:C.text }}>홈 화면에 추가</span>
          </div>
          <div style={{ fontSize:11, color:C.muted, textAlign:"center" }}>목록에서 위 항목을 탭</div>
        </div>
      ),
    },
    {
      icon: "✅",
      title: "3단계 — 추가 버튼 탭",
      desc: "오른쪽 상단 \"추가\" 버튼을 탭하면 설치 완료!",
      img: (
        <div style={{ background:"#e9ecef", borderRadius:10, padding:"10px 14px", marginTop:8, fontSize:12, color:C.sub, lineHeight:1.8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fff", borderRadius:8, padding:"8px 12px", border:"1px solid #dee2e6" }}>
            <span style={{ color:C.muted }}>취소</span>
            <span style={{ fontSize:13, fontWeight:700 }}>차트게임</span>
            <span style={{ color:C.accent, fontWeight:700 }}>추가</span>
          </div>
          <div style={{ fontSize:11, color:C.muted, textAlign:"center", marginTop:4 }}>오른쪽 "추가" 탭 → 홈 화면에 아이콘 생성</div>
        </div>
      ),
    },
  ];

  const cur = steps[step];

  return (
    <div style={{
      width:"100%", maxWidth:480,
      background:"#f3f0ff", border:"1.5px solid #b197fc",
      borderRadius:14, padding:"14px 16px", marginBottom:16,
      position:"relative",
    }}>
      {/* 닫기 */}
      <button onClick={() => { setShow(false); sessionStorage.setItem("pwa_banner_closed","1"); }}
        style={{ position:"absolute", top:10, right:12, background:"none", border:"none", fontSize:20, color:C.muted, cursor:"pointer", lineHeight:1 }}>×</button>

      {/* 헤더 */}
      <div style={{ fontSize:13, fontWeight:700, color:C.accent, marginBottom:10 }}>
        📲 아이폰 홈 화면에 앱으로 설치하기
      </div>

      {/* 현재 단계 */}
      <div style={{ background:"#fff", borderRadius:10, padding:"12px 14px", border:"1px solid #d0bfff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <span style={{ fontSize:18 }}>{cur.icon}</span>
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{cur.title}</span>
        </div>
        <div style={{ fontSize:12, color:C.sub, lineHeight:1.6 }}>{cur.desc}</div>
        {cur.img}
      </div>

      {/* 단계 진행 버튼 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12 }}>
        {/* 도트 인디케이터 */}
        <div style={{ display:"flex", gap:5 }}>
          {steps.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 18 : 7, height:7, borderRadius:99, cursor:"pointer",
              background: i === step ? C.accent : "#d0bfff",
              transition:"width .2s",
            }} />
          ))}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding:"7px 14px", borderRadius:8, border:"1.5px solid #b197fc",
              background:"#fff", color:C.accent, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>← 이전</button>
          )}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} style={{
              padding:"7px 14px", borderRadius:8, border:"none",
              background:C.accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>다음 →</button>
          ) : (
            <button onClick={() => { setShow(false); sessionStorage.setItem("pwa_banner_closed","1"); }} style={{
              padding:"7px 14px", borderRadius:8, border:"none",
              background:C.green, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>✅ 완료</button>
          )}
        </div>
      </div>
    </div>
  );
}

const INIT_CASH = 10_000_000;
const fmtKRW = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원";
const fmtPct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

// ── 종목 유니버스 (섹터별 분류)
const UNIVERSE_DISPLAY = {
  KOSPI: [
    { sector: "반도체/전자", stocks: [
      { name: "삼성전자", ticker: "005930.KS" },
      { name: "SK하이닉스", ticker: "000660.KS" },
      { name: "삼성전기", ticker: "009150.KS" },
      { name: "LG이노텍", ticker: "011070.KS" },
      { name: "LG전자", ticker: "066570.KS" },
    ]},
    { sector: "2차전지", stocks: [
      { name: "삼성SDI", ticker: "006400.KS" },
      { name: "LG화학", ticker: "051910.KS" },
      { name: "SK이노베이션", ticker: "096770.KS" },
      { name: "한화솔루션", ticker: "009830.KS" },
      { name: "에코프로비엠", ticker: "247540.KS" },
      { name: "포스코퓨처엠", ticker: "003670.KS" },
    ]},
    { sector: "자동차", stocks: [
      { name: "현대차", ticker: "005380.KS" },
      { name: "기아", ticker: "000270.KS" },
      { name: "현대모비스", ticker: "012330.KS" },
    ]},
    { sector: "IT/플랫폼", stocks: [
      { name: "NAVER", ticker: "035420.KS" },
      { name: "카카오", ticker: "035720.KS" },
      { name: "엔씨소프트", ticker: "036570.KS" },
      { name: "크래프톤", ticker: "259960.KS" },
    ]},
    { sector: "금융", stocks: [
      { name: "KB금융", ticker: "105560.KS" },
      { name: "신한지주", ticker: "055550.KS" },
      { name: "하나금융지주", ticker: "086790.KS" },
      { name: "삼성생명", ticker: "032830.KS" },
      { name: "삼성화재", ticker: "000810.KS" },
      { name: "메리츠금융지주", ticker: "138040.KS" },
    ]},
    { sector: "바이오/제약", stocks: [
      { name: "셀트리온", ticker: "068270.KS" },
      { name: "삼성바이오로직스", ticker: "207940.KS" },
      { name: "유한양행", ticker: "000100.KS" },
      { name: "한미약품", ticker: "128940.KS" },
    ]},
    { sector: "철강/소재", stocks: [
      { name: "POSCO홀딩스", ticker: "005490.KS" },
      { name: "현대제철", ticker: "004020.KS" },
      { name: "고려아연", ticker: "010130.KS" },
    ]},
    { sector: "건설/중공업", stocks: [
      { name: "현대건설", ticker: "000720.KS" },
      { name: "삼성물산", ticker: "028260.KS" },
      { name: "HD현대중공업", ticker: "329180.KS" },
      { name: "두산에너빌리티", ticker: "034020.KS" },
      { name: "한화에어로스페이스", ticker: "012450.KS" },
    ]},
    { sector: "소비재/유통", stocks: [
      { name: "아모레퍼시픽", ticker: "090430.KS" },
      { name: "LG생활건강", ticker: "051900.KS" },
      { name: "오리온", ticker: "271560.KS" },
      { name: "CJ제일제당", ticker: "097950.KS" },
      { name: "이마트", ticker: "139480.KS" },
    ]},
    { sector: "통신/기타", stocks: [
      { name: "SK텔레콤", ticker: "017670.KS" },
      { name: "KT", ticker: "030200.KS" },
      { name: "한국전력", ticker: "015760.KS" },
      { name: "코웨이", ticker: "021240.KS" },
    ]},
  ],
  QQQ: [
    { sector: "빅테크", stocks: [
      { name: "Apple", ticker: "AAPL" },
      { name: "Microsoft", ticker: "MSFT" },
      { name: "NVIDIA", ticker: "NVDA" },
      { name: "Amazon", ticker: "AMZN" },
      { name: "Meta", ticker: "META" },
      { name: "Alphabet", ticker: "GOOGL" },
      { name: "Tesla", ticker: "TSLA" },
      { name: "Broadcom", ticker: "AVGO" },
    ]},
    { sector: "반도체", stocks: [
      { name: "AMD", ticker: "AMD" },
      { name: "Micron", ticker: "MU" },
      { name: "Qualcomm", ticker: "QCOM" },
      { name: "Intel", ticker: "INTC" },
      { name: "ASML", ticker: "ASML" },
      { name: "KLA Corp", ticker: "KLAC" },
      { name: "Lam Research", ticker: "LRCX" },
      { name: "Applied Mat", ticker: "AMAT" },
      { name: "Analog Devices", ticker: "ADI" },
    ]},
    { sector: "소프트웨어", stocks: [
      { name: "Salesforce", ticker: "CRM" },
      { name: "Adobe", ticker: "ADBE" },
      { name: "ServiceNow", ticker: "NOW" },
      { name: "Palo Alto", ticker: "PANW" },
      { name: "CrowdStrike", ticker: "CRWD" },
      { name: "Workday", ticker: "WDAY" },
      { name: "Autodesk", ticker: "ADSK" },
      { name: "Cadence", ticker: "CDNS" },
    ]},
    { sector: "헬스케어", stocks: [
      { name: "Amgen", ticker: "AMGN" },
      { name: "Gilead", ticker: "GILD" },
      { name: "Regeneron", ticker: "REGN" },
      { name: "Vertex", ticker: "VRTX" },
      { name: "Intuitive", ticker: "ISRG" },
      { name: "Moderna", ticker: "MRNA" },
    ]},
    { sector: "소비재/기타", stocks: [
      { name: "Netflix", ticker: "NFLX" },
      { name: "Starbucks", ticker: "SBUX" },
      { name: "Costco", ticker: "COST" },
      { name: "PepsiCo", ticker: "PEP" },
      { name: "T-Mobile", ticker: "TMUS" },
      { name: "Booking", ticker: "BKNG" },
      { name: "Airbnb", ticker: "ABNB" },
      { name: "PayPal", ticker: "PYPL" },
    ]},
  ],
};

interface GameSession {
  final_asset: number;
  return_pct: number;
  ticker_name: string;
  ticker: string;
  market: string;
  played_at: string;
}

interface TickerStat {
  ticker_name: string;
  ticker: string;
  market: string;
  count: number;
  avgReturn: number;
}

interface Props { user: User | null; }

export default function LobbyClient({ user }: Props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [intervalMode, setIntervalMode] = useState<"1wk" | "1mo">("1wk");
  const [mounted,      setMounted]      = useState(false);
  const [currentAsset, setCurrentAsset] = useState<number | null>(null);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [tickerStats,  setTickerStats]  = useState<TickerStat[]>([]);
  const [totalPlays,   setTotalPlays]   = useState(0);
  const [loadingAsset, setLoadingAsset] = useState(false);

  // A안: 종목 목록 탭
  const [showUniverse,    setShowUniverse]    = useState(false);
  const [universeMarket,  setUniverseMarket]  = useState<"KOSPI" | "QQQ">("KOSPI");

  // C안: 종목 통계 탭
  const [showStats, setShowStats] = useState(false);

  // 자산 카드 탭 (최근게임 / 종목통계)
  const [assetTab, setAssetTab] = useState<"recent" | "stats">("recent");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      setLoadingAsset(true);

      // 최근 5게임 + 전체 통계
      const { data } = await supabase
        .from("game_sessions")
        .select("final_asset, return_pct, ticker_name, ticker, market, played_at")
        .eq("user_id", currentUser.id)
        .order("played_at", { ascending: false });

      if (data && data.length > 0) {
        setCurrentAsset(data[0].final_asset);
        setRecentSessions(data.slice(0, 5));
        setTotalPlays(data.length);

        // 종목별 통계 집계
        const map: Record<string, { ticker_name: string; ticker: string; market: string; count: number; sum: number }> = {};
        data.forEach((s: GameSession) => {
          const key = s.ticker;
          if (!map[key]) map[key] = { ticker_name: s.ticker_name, ticker: s.ticker, market: s.market, count: 0, sum: 0 };
          map[key].count++;
          map[key].sum += s.return_pct;
        });
        const stats = Object.values(map).map(v => ({
          ticker_name: v.ticker_name, ticker: v.ticker, market: v.market,
          count: v.count, avgReturn: v.sum / v.count,
        })).sort((a, b) => b.avgReturn - a.avgReturn);
        setTickerStats(stats);
      } else {
        setCurrentAsset(INIT_CASH);
      }
      setLoadingAsset(false);
    };
    fetchData();
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
    const params = new URLSearchParams({ market, interval: intervalMode, initCash: String(asset) });
    router.push(`/game?${params.toString()}`);
  };

  const pnlColor = (pct: number) => pct > 0 ? C.red : pct < 0 ? C.blue : C.muted;
  const totalPnlPct = currentAsset != null ? ((currentAsset / INIT_CASH) - 1) * 100 : 0;
  const avgReturn = tickerStats.length
    ? tickerStats.reduce((s, t) => s + t.avgReturn * t.count, 0) / totalPlays
    : 0;

  // A안: 종목 플레이 가능 여부 (현재 자산 기준 단순 체크)
  const getStockStatus = (ticker: string) => {
    // 최근 상장 종목 (데이터 부족 가능성)
    const recentIPO = ["373220.KS", "259960.KS", "323410.KS", "377300.KS", "402340.KS", "329180.KS", "CRWD", "ABNB", "SNOW", "DDOG", "PLTR"];
    if (recentIPO.includes(ticker)) return "data";
    // 고가 종목 (자산 부족 가능성) - 단순 휴리스틱
    const highPrice = ["207940.KS", "247540.KS", "003670.KS", "090430.KS", "128940.KS", "BKNG", "ASML", "REGN", "VRTX"];
    if (highPrice.includes(ticker) && (currentAsset ?? INIT_CASH) < 20_000_000) return "asset";
    return "ok";
  };

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
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {loadingAsset ? (
              <div style={{ padding: "14px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>자산 불러오는 중...</div>
            ) : (
              <>
                {/* 자산 요약 */}
                <div style={{ padding: "14px 16px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
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

                  {/* C안: 요약 통계 3개 */}
                  {totalPlays > 0 && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {[
                        ["총 플레이", `${totalPlays}회`],
                        ["플레이 종목", `${tickerStats.length}종목`],
                        ["평균 수익률", fmtPct(avgReturn)],
                      ].map(([label, val]) => (
                        <div key={label} style={{ flex: 1, background: C.bg, borderRadius: 8, padding: "6px 8px", textAlign: "center", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: label === "평균 수익률" ? pnlColor(avgReturn) : C.text }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 탭 버튼 */}
                  {totalPlays > 0 && (
                    <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
                      {([["recent", "최근 게임"], ["stats", "종목 통계"]] as const).map(([tab, label]) => (
                        <button key={tab} onClick={() => setAssetTab(tab)} style={{
                          flex: 1, padding: "6px 0", fontSize: 11, fontFamily: "inherit",
                          background: "none", border: "none", cursor: "pointer",
                          color: assetTab === tab ? C.accent : C.muted,
                          borderBottom: assetTab === tab ? `2px solid ${C.accent}` : "2px solid transparent",
                          fontWeight: assetTab === tab ? 700 : 400,
                        }}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 최근 게임 탭 */}
                {(assetTab === "recent" || totalPlays === 0) && recentSessions.length > 0 && (
                  <div style={{ padding: "8px 16px 12px" }}>
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

                {/* C안: 종목 통계 탭 */}
                {assetTab === "stats" && tickerStats.length > 0 && (
                  <div style={{ padding: "8px 16px 12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {tickerStats.map((s, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "7px 10px", borderRadius: 8,
                          background: C.bg, border: `1px solid ${C.border}`,
                        }}>
                          <div>
                            <span style={{ fontSize: 12, color: C.text }}>{s.ticker_name}</span>
                            <span style={{ fontSize: 10, color: C.muted, background: C.surface, borderRadius: 4, padding: "1px 5px", marginLeft: 5 }}>{s.market}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: pnlColor(s.avgReturn) }}>{fmtPct(s.avgReturn)}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>{s.count}회 플레이</div>
                          </div>
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

      {/* 📱 PWA 설치 안내 배너 */}
      <PwaInstallBanner />

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
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
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

      {/* A안: 플레이 가능 종목 토글 버튼 */}
      <button onClick={() => setShowUniverse(v => !v)} style={{
        marginBottom: 12, padding: "7px 16px", borderRadius: 8,
        border: `1px solid ${C.border2}`, background: C.bg,
        fontSize: 12, color: C.sub, cursor: "pointer", fontFamily: "inherit",
      }}>
        {showUniverse ? "▲ 종목 목록 닫기" : "📋 플레이 가능 종목 보기"}
      </button>

      {/* A안: 종목 목록 패널 */}
      {showUniverse && (
        <div style={{ width: "100%", maxWidth: 480, marginBottom: 16, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {/* 시장 탭 */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
            {(["KOSPI", "QQQ"] as const).map(m => (
              <button key={m} onClick={() => setUniverseMarket(m)} style={{
                flex: 1, padding: "10px 0", fontSize: 12, fontFamily: "inherit",
                background: universeMarket === m ? C.bg : "transparent",
                border: "none", cursor: "pointer",
                color: universeMarket === m ? C.accent : C.muted,
                fontWeight: universeMarket === m ? 700 : 400,
                borderBottom: universeMarket === m ? `2px solid ${C.accent}` : "2px solid transparent",
              }}>{m === "KOSPI" ? "🇰🇷 KOSPI" : "🇺🇸 QQQ"}</button>
            ))}
          </div>

          {/* 범례 */}
          <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 10 }}>
            {[
              ["#EAF3DE", "#3B6D11", "플레이 가능"],
              ["#FAEEDA", "#854F0B", "자산 부족"],
              ["#FCEBEB", "#A32D2D", "데이터 부족"],
            ].map(([bg, col, label]) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, display: "inline-block" }} />
                <span style={{ color: C.muted }}>{label}</span>
              </span>
            ))}
          </div>

          {/* 섹터별 종목 */}
          {UNIVERSE_DISPLAY[universeMarket].map(({ sector, stocks }) => (
            <div key={sector}>
              <div style={{ fontSize: 10, color: C.muted, padding: "6px 12px 3px", background: C.surface, borderTop: `1px solid ${C.border}` }}>{sector}</div>
              {stocks.map(({ name, ticker }) => {
                const status = getStockStatus(ticker);
                return (
                  <div key={ticker} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 12px", borderBottom: `1px solid ${C.border}`,
                    background: C.bg,
                  }}>
                    <span style={{ fontSize: 12, color: C.text }}>{name}</span>
                    <span style={{
                      fontSize: 10, borderRadius: 4, padding: "2px 7px",
                      background: status === "ok" ? "#EAF3DE" : status === "asset" ? "#FAEEDA" : "#FCEBEB",
                      color: status === "ok" ? "#3B6D11" : status === "asset" ? "#854F0B" : "#A32D2D",
                    }}>
                      {status === "ok" ? "✓ 가능" : status === "asset" ? "자산 부족" : "데이터 부족"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

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
