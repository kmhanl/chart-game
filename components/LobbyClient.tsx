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
// 코스닥 한글 검색용 로컬 데이터 (Yahoo API 한글 검색 미지원으로 로컬 매칭)
const KOSDAQ_KR: { name: string; ticker: string }[] = [
  // IT/소프트웨어
  { name: "카카오게임즈", ticker: "293490.KQ" }, { name: "크래프톤", ticker: "259960.KQ" },
  { name: "펄어비스", ticker: "263750.KQ" }, { name: "컴투스", ticker: "078340.KQ" },
  { name: "위메이드", ticker: "112040.KQ" }, { name: "선데이토즈", ticker: "123420.KQ" },
  { name: "넥슨게임즈", ticker: "225570.KQ" }, { name: "더블유게임즈", ticker: "192080.KQ" },
  { name: "드래곤플라이", ticker: "030350.KQ" }, { name: "조이시티", ticker: "067000.KQ" },
  { name: "NHN", ticker: "181710.KQ" }, { name: "네오위즈", ticker: "095660.KQ" },
  { name: "웹젠", ticker: "069080.KQ" }, { name: "데브시스터즈", ticker: "194480.KQ" },
  // 바이오/제약
  { name: "셀트리온헬스케어", ticker: "091990.KQ" }, { name: "알테오젠", ticker: "196170.KQ" },
  { name: "에코프로", ticker: "086520.KQ" }, { name: "에코프로비엠", ticker: "247540.KQ" },
  { name: "셀트리온제약", ticker: "068760.KQ" }, { name: "메디톡스", ticker: "086900.KQ" },
  { name: "파마리서치", ticker: "214450.KQ" }, { name: "레고켐바이오", ticker: "141080.KQ" },
  { name: "오스코텍", ticker: "039200.KQ" }, { name: "휴젤", ticker: "145020.KQ" },
  { name: "클래시스", ticker: "214150.KQ" }, { name: "리가켐바이오", ticker: "141080.KQ" },
  { name: "파멥신", ticker: "208340.KQ" }, { name: "보령", ticker: "003850.KQ" },
  { name: "동아ST", ticker: "170900.KQ" }, { name: "신라젠", ticker: "215600.KQ" },
  { name: "HLB", ticker: "028300.KQ" }, { name: "HLB생명과학", ticker: "067630.KQ" },
  { name: "유바이오로직스", ticker: "206650.KQ" }, { name: "삼천당제약", ticker: "000250.KQ" },
  { name: "동국제약", ticker: "086450.KQ" }, { name: "고려제약", ticker: "014570.KQ" },
  // 반도체/전자부품
  { name: "리노공업", ticker: "058470.KQ" }, { name: "솔브레인", ticker: "357780.KQ" },
  { name: "하나마이크론", ticker: "067310.KQ" }, { name: "이오테크닉스", ticker: "039030.KQ" },
  { name: "원익IPS", ticker: "240810.KQ" }, { name: "테크윙", ticker: "089030.KQ" },
  { name: "ISC", ticker: "095340.KQ" }, { name: "티씨케이", ticker: "064760.KQ" },
  { name: "엔씨앤", ticker: "072010.KQ" }, { name: "코미코", ticker: "183300.KQ" },
  { name: "유진테크", ticker: "084370.KQ" }, { name: "넥스틴", ticker: "348210.KQ" },
  { name: "케이씨텍", ticker: "281820.KQ" }, { name: "피에스케이", ticker: "319660.KQ" },
  { name: "한미반도체", ticker: "042700.KQ" }, { name: "파크시스템스", ticker: "140860.KQ" },
  { name: "비씨엔씨", ticker: "277650.KQ" }, { name: "오로스테크놀로지", ticker: "322310.KQ" },
  { name: "에스앤에스텍", ticker: "101490.KQ" }, { name: "솔레온", ticker: "338570.KQ" },
  // 2차전지/소재
  { name: "엘앤에프", ticker: "066970.KQ" }, { name: "천보", ticker: "278280.KQ" },
  { name: "동화기업", ticker: "025900.KQ" }, { name: "후성", ticker: "093370.KQ" },
  { name: "나노신소재", ticker: "121600.KQ" }, { name: "이엔드디", ticker: "101360.KQ" },
  { name: "피엔티", ticker: "137400.KQ" }, { name: "에코프로에이치엔", ticker: "383310.KQ" },
  { name: "SK아이이테크놀로지", ticker: "361610.KQ" }, { name: "코스모신소재", ticker: "005070.KQ" },
  // 통신/IT인프라
  { name: "NAVER", ticker: "035420.KQ" }, { name: "카카오", ticker: "035720.KQ" },
  { name: "비트컴퓨터", ticker: "032850.KQ" }, { name: "케이아이엔엑스", ticker: "093320.KQ" },
  { name: "가비아", ticker: "079940.KQ" }, { name: "아이티센", ticker: "124500.KQ" },
  { name: "더존비즈온", ticker: "012510.KQ" }, { name: "한글과컴퓨터", ticker: "030520.KQ" },
  { name: "이스트소프트", ticker: "047560.KQ" }, { name: "위세아이텍", ticker: "065370.KQ" },
  // 의료기기/헬스케어
  { name: "인바디", ticker: "041830.KQ" }, { name: "뷰웍스", ticker: "100120.KQ" },
  { name: "오스템임플란트", ticker: "048260.KQ" }, { name: "덴티움", ticker: "145720.KQ" },
  { name: "레이", ticker: "228670.KQ" }, { name: "바텍", ticker: "043150.KQ" },
  { name: "루트로닉", ticker: "085370.KQ" }, { name: "제이시스메디칼", ticker: "287410.KQ" },
  { name: "원텍", ticker: "336570.KQ" }, { name: "비올", ticker: "335890.KQ" },
  // 보안/AI
  { name: "슈프리마에이치큐", ticker: "094840.KQ" }, { name: "슈프리마", ticker: "236Identity.KQ" },
  { name: "아이디스", ticker: "143160.KQ" }, { name: "이노뎁", ticker: "303530.KQ" },
  { name: "크리니티", ticker: "200130.KQ" }, { name: "솔루션", ticker: "205100.KQ" },
  { name: "콤텍시스템", ticker: "031820.KQ" }, { name: "시큐브", ticker: "131090.KQ" },
  { name: "라온시큐어", ticker: "042510.KQ" }, { name: "아이오케이", ticker: "078600.KQ" },
  // 엔터/미디어
  { name: "에스엠", ticker: "041510.KQ" }, { name: "JYP엔터", ticker: "035900.KQ" },
  { name: "와이지엔터테인먼트", ticker: "122870.KQ" }, { name: "하이브", ticker: "352820.KQ" },
  { name: "에프엔씨엔터", ticker: "173940.KQ" }, { name: "큐브엔터", ticker: "182360.KQ" },
  { name: "스튜디오드래곤", ticker: "253450.KQ" }, { name: "키이스트", ticker: "054780.KQ" },
  // 제조/기계
  { name: "고영", ticker: "098460.KQ" }, { name: "제우스", ticker: "079370.KQ" },
  { name: "에스에프에이", ticker: "056190.KQ" }, { name: "이녹스첨단소재", ticker: "272290.KQ" },
  { name: "한화시스템", ticker: "272210.KQ" }, { name: "LIG넥스원", ticker: "079550.KQ" },
  { name: "기가비스", ticker: "420120.KQ" }, { name: "이오플로우", ticker: "294090.KQ" },
  // 금융
  { name: "카카오뱅크", ticker: "323410.KQ" }, { name: "카카오페이", ticker: "377300.KQ" },
  { name: "케이뱅크", ticker: "279570.KQ" }, { name: "비바리퍼블리카", ticker: "000000.KQ" },
  { name: "크래프톤", ticker: "259960.KQ" }, { name: "카카오게임즈", ticker: "293490.KQ" },
];

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
      { name: "슈프리마에이치큐", ticker: "094840.KQ" },
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

  const [intervalMode, setIntervalMode] = useState<"1wk" | "1mo" | "1d">("1wk");
  const [mounted,      setMounted]      = useState(false);
  const [currentAsset, setCurrentAsset] = useState<number | null>(null);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [tickerStats,  setTickerStats]  = useState<TickerStat[]>([]);
  const [totalPlays,   setTotalPlays]   = useState(0);
  const [loadingAsset, setLoadingAsset] = useState(false);

  // A안: 종목 목록 탭
  const [showUniverse,    setShowUniverse]    = useState(false);
  const [showCustomSearch, setShowCustomSearch] = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchResults,  setSearchResults]  = useState<{ symbol: string; name: string; exch: string }[]>([]);
  const [searching,      setSearching]      = useState(false);
  const [searchErr,      setSearchErr]      = useState("");
  const [startingTicker, setStartingTicker] = useState<string | null>(null);
  const [universeMarket,  setUniverseMarket]  = useState<"KOSPI" | "QQQ">("KOSPI");

  // ④ 다음 게임 목표 + ⑤ 산점도 데이터 (localStorage)
  const [nextGoal,     setNextGoal]     = useState<{ text: string; tag: string; createdAt: string } | null>(null);
  const [scatterData,  setScatterData]  = useState<{ pnl: number; followScore: number }[]>([]);
  const [entryPatterns, setEntryPatterns] = useState<Record<string, { count: number; wins: number; pnlSum: number }>>({});

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

  // localStorage에서 nextGoal + scatterData 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem("chartgame_stats_v2");
      if (raw) {
        const stats = JSON.parse(raw);
        if (stats.nextGoal) setNextGoal(stats.nextGoal);
        if (stats.scatterData) setScatterData(stats.scatterData);
        if (stats.entryPatterns) setEntryPatterns(stats.entryPatterns);
      }
    } catch { /* ignore */ }
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

  // ── 한글 검색용 로컬 종목 플랫 리스트 (KOSPI/KOSDAQ 한글 이름 포함)
  const LOCAL_KR_STOCKS = [
    ...Object.values(UNIVERSE_DISPLAY).flat().flatMap(
      (group) => (group as { sector: string; stocks: { name: string; ticker: string }[] }).stocks
    ).map(s => ({
      symbol: s.ticker,
      name: s.name,
      exch: s.ticker.endsWith(".KQ") ? "KOSDAQ" : s.ticker.endsWith(".KS") ? "KOSPI" : "US",
    })),
    ...KOSDAQ_KR.map(s => ({
      symbol: s.ticker,
      name: s.name,
      exch: "KOSDAQ",
    })),
  ].filter((v, i, a) => a.findIndex(x => x.symbol === v.symbol) === i); // 중복 제거

  // 종목/티커 검색
  // 1) 한글 입력 시 로컬 리스트에서 이름/티커 매칭 우선
  // 2) 영문 입력 시 Yahoo API + 로컬 병합
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSearchErr("");
    const q = query.trim();
    if (q.length < 1) { setSearchResults([]); return; }

    // 한글 포함 여부 체크
    const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(q);

    if (hasKorean) {
      // 한글 검색: 로컬 리스트에서만 매칭 (Yahoo API는 한글 검색 미지원)
      const lower = q.toLowerCase();
      const results = LOCAL_KR_STOCKS.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.symbol.toLowerCase().includes(lower)
      );
      setSearchResults(results);
      if (results.length === 0) setSearchErr("검색 결과가 없어요. 다른 이름이나 종목코드로 검색해보세요.");
      return;
    }

    // 영문/숫자 검색: Yahoo API 우선, 로컬 보완
    setSearching(true);
    try {
      const [globalRes, krRes] = await Promise.all([
        fetch(`/api/yahoo/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`),
        fetch(`/api/yahoo/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&lang=ko-KR&region=KR`),
      ]);
      const [globalJson, krJson] = await Promise.all([globalRes.json(), krRes.json()]);
      interface YahooQuoteRaw {
        quoteType?: string;
        symbol: string;
        shortname?: string;
        longname?: string;
        exchange?: string;
      }
      const toQuotes = (json: { quotes?: YahooQuoteRaw[] }) =>
        (json?.quotes ?? [])
          .filter((q2: YahooQuoteRaw) => q2.quoteType === "EQUITY" || q2.quoteType === "ETF")
          .map((q2: YahooQuoteRaw) => ({
            symbol: q2.symbol,
            name: q2.shortname || q2.longname || q2.symbol,
            exch: q2.exchange === "KSC" ? "KOSPI" : q2.exchange === "KOE" ? "KOSDAQ" : (q2.exchange ?? ""),
          }));

      // Yahoo 결과에 로컬 한글 이름 덮어쓰기 (삼성전자 → "SamsungElec" 대신 "삼성전자" 표시)
      const yahooResults = [...toQuotes(globalJson), ...toQuotes(krJson)];
      const localNameMap = new Map(LOCAL_KR_STOCKS.map(s => [s.symbol, s.name]));
      const merged = yahooResults.map(r => ({
        ...r,
        name: localNameMap.get(r.symbol) ?? r.name,  // 로컬 한글 이름 우선
      }));

      // 로컬 매칭도 추가 (티커 코드 검색 시 로컬 종목 보완)
      const lower = q.toLowerCase();
      const localMatches = LOCAL_KR_STOCKS.filter(s =>
        s.symbol.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower)
      );
      const combined = [...merged, ...localMatches];

      // 심볼 기준 중복 제거
      const seen = new Set<string>();
      const quotes = combined.filter(r => (seen.has(r.symbol) ? false : (seen.add(r.symbol), true)));
      setSearchResults(quotes);
      if (quotes.length === 0) setSearchErr("검색 결과가 없어요. 정확한 종목명이나 티커를 입력해보세요.");
    } catch {
      setSearchErr("검색 중 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setSearching(false);
    }
  };

  // 검색된 티커로 직접 게임 시작 — 상단에서 고른 봉 기준(주봉/월봉)을 그대로 사용
  const handleStartCustom = async (ticker: string, name: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/game` },
      });
      return;
    }
    setStartingTicker(ticker);
    setSearchErr("");
    try {
      // 최소 데이터 검증 — 주봉은 50턴 기준 여유분 포함 70봉, 월봉은 최소 50봉 필요
      const isMonthly = intervalMode === "1mo";
      const isDaily   = intervalMode === "1d";
      const period1 = Math.floor(new Date("2000-01-01").getTime() / 1000);
      const period2 = Math.floor(Date.now() / 1000);
      const MIN_REQUIRED = isMonthly ? 50 : 70;
      const res = await fetch(`/api/yahoo/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=${intervalMode}&events=div%7Csplit`);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const candleCount = result?.timestamp?.length ?? 0;
      if (!result || candleCount < MIN_REQUIRED) {
        const label = isMonthly ? "월봉" : isDaily ? "일봉" : "주봉";
        setSearchErr(
          isMonthly
            ? `"${name}"은(는) 월봉 데이터가 ${MIN_REQUIRED}개월 미만이라 게임을 진행할 수 없어요 (현재 ${candleCount}개월치 데이터). 주봉으로 다시 시도해보세요.`
            : `"${name}"은(는) 데이터가 부족해 플레이할 수 없어요 (최소 ${MIN_REQUIRED}${label} 필요, 현재 ${candleCount}${label}).`
        );
        setStartingTicker(null);
        return;
      }
      const asset = currentAsset ?? INIT_CASH;
      const params = new URLSearchParams({
        market: "CUSTOM",
        ticker,
        tickerName: name,
        interval: intervalMode,
        initCash: String(asset),
      });
      router.push(`/game?${params.toString()}`);
    } catch {
      setSearchErr("데이터를 불러오는 중 오류가 발생했어요. 다시 시도해주세요.");
      setStartingTicker(null);
    }
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

      {/* ④ 다음 게임 목표 */}
      {nextGoal && (
        <div style={{ width: "100%", maxWidth: 480, marginBottom: 14,
          background: "#f3f0ff", border: "1px solid #d0bfff", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>다음 게임 목표</span>
            <span style={{ fontSize: 10, background: C.accent, color: "#fff", borderRadius: 4, padding: "1px 6px", marginLeft: "auto" }}>이전 복기 기반</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            "{nextGoal.text}"
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ fontSize: 10, background: "#fff", color: C.accent, border: `1px solid ${C.accent}33`, borderRadius: 4, padding: "2px 8px" }}>
              #{nextGoal.tag}
            </span>
          </div>
        </div>
      )}

      {/* ⑤ 산점도 — 3게임 이상일 때만 표시 */}
      {scatterData.length >= 3 && (
        <div style={{ width: "100%", maxWidth: 480, marginBottom: 14,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            📈 원칙 준수율 vs 수익률
            <span style={{ fontSize: 10, fontWeight: 400, color: C.muted, marginLeft: 6 }}>{scatterData.length}게임 누적</span>
          </div>
          <svg width="100%" viewBox="0 0 280 160" style={{ display: "block" }}>
            {/* 배경 그리드 */}
            <line x1="30" y1="10" x2="30" y2="130" stroke="#dee2e6" strokeWidth="0.5"/>
            <line x1="30" y1="130" x2="270" y2="130" stroke="#dee2e6" strokeWidth="0.5"/>
            <line x1="30" y1="70" x2="270" y2="70" stroke="#dee2e6" strokeWidth="0.5" strokeDasharray="3 3"/>
            <line x1="150" y1="10" x2="150" y2="130" stroke="#dee2e6" strokeWidth="0.5" strokeDasharray="3 3"/>
            {/* 축 레이블 */}
            <text x="150" y="148" fontSize="9" fill="#adb5bd" textAnchor="middle">원칙 준수율 →</text>
            <text x="8" y="70" fontSize="9" fill="#adb5bd" textAnchor="middle" transform="rotate(-90,8,70)">수익률</text>
            <text x="30" y="144" fontSize="8" fill="#adb5bd" textAnchor="middle">0%</text>
            <text x="150" y="144" fontSize="8" fill="#adb5bd" textAnchor="middle">50%</text>
            <text x="270" y="144" fontSize="8" fill="#adb5bd" textAnchor="middle">100%</text>
            <text x="25" y="133" fontSize="8" fill="#adb5bd" textAnchor="end">-</text>
            <text x="25" y="73" fontSize="8" fill="#adb5bd" textAnchor="end">0</text>
            <text x="25" y="13" fontSize="8" fill="#adb5bd" textAnchor="end">+</text>
            {/* 추세선 계산 */}
            {(() => {
              const n = scatterData.length;
              if (n < 2) return null;
              const xs = scatterData.map(d => 30 + (d.followScore / 100) * 240);
              const ys = scatterData.map(d => 70 - Math.max(-60, Math.min(60, d.pnl * 8)));
              const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
              const num = xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0);
              const den = xs.reduce((s,x)=>s+(x-mx)**2,0);
              if (den === 0) return null;
              const slope = num/den, intercept = my - slope*mx;
              const x1=30, y1=slope*x1+intercept, x2=270, y2=slope*x2+intercept;
              return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2f9e44" strokeWidth="1" strokeDasharray="4 3" opacity="0.6"/>;
            })()}
            {/* 데이터 포인트 */}
            {scatterData.map((d, i) => {
              const cx = 30 + (d.followScore / 100) * 240;
              const cy = 70 - Math.max(-60, Math.min(60, d.pnl * 8));
              const col = d.followScore >= 60 ? "#2f9e44" : d.followScore >= 40 ? "#f97316" : "#e03131";
              const isLast = i === scatterData.length - 1;
              return (
                <g key={i}>
                  {isLast && <circle cx={cx} cy={cy} r={7} fill="none" stroke="#7048e8" strokeWidth="1.5"/>}
                  <circle cx={cx} cy={cy} r={4} fill={col} opacity={0.8}/>
                </g>
              );
            })}
          </svg>
          {/* 인사이트 */}
          {(() => {
            const highScore = scatterData.filter(d => d.followScore >= 60);
            const lowScore  = scatterData.filter(d => d.followScore < 60);
            const avgH = highScore.length ? highScore.reduce((s,d)=>s+d.pnl,0)/highScore.length : null;
            const avgL = lowScore.length  ? lowScore.reduce((s,d)=>s+d.pnl,0)/lowScore.length  : null;
            if (avgH === null || avgL === null) return null;
            return (
              <div style={{ marginTop: 6, fontSize: 10, color: C.sub, lineHeight: 1.6 }}>
                원칙 준수율 60% 이상 게임 평균 수익률
                <span style={{ fontWeight: 700, color: avgH >= 0 ? "#2f9e44" : "#e03131" }}> {avgH >= 0 ? "+" : ""}{avgH.toFixed(1)}%</span>
                {" / "} 60% 미만
                <span style={{ fontWeight: 700, color: avgL >= 0 ? "#2f9e44" : "#e03131" }}> {avgL >= 0 ? "+" : ""}{avgL.toFixed(1)}%</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* D안: 패턴별 성공률 */}
      {Object.keys(entryPatterns).length > 0 && (
        <div style={{ width: "100%", maxWidth: 480, marginBottom: 14,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            🎯 나의 패턴별 성공률
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {Object.entries(entryPatterns)
              .map(([key, v]) => ({ key, ...v, winRate: v.count > 0 ? v.wins / v.count : 0, avgPnl: v.count > 0 ? v.pnlSum / v.count : 0 }))
              .sort((a, b) => a.winRate - b.winRate)
              .slice(0, 6)
              .map(p => {
                const isWeak = p.winRate < 0.4 && p.count >= 2;
                const isStrong = p.winRate >= 0.6;
                return (
                  <div key={p.key} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 10px", borderRadius: 8,
                    background: isWeak ? "#fff5f5" : isStrong ? "#f0fdf4" : C.bg,
                    border: `1px solid ${isWeak ? "#fca5a5" : isStrong ? "#86efac" : C.border}`,
                  }}>
                    <span style={{ fontSize: 11, color: C.text }}>
                      {isWeak ? "⚠️ " : isStrong ? "✅ " : ""}{p.key}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isWeak ? "#e03131" : isStrong ? "#2f9e44" : C.sub }}>
                      {p.wins}승 {p.count - p.wins}패 ({Math.round(p.winRate * 100)}%)
                    </span>
                  </div>
                );
              })}
          </div>
          {(() => {
            const weakest = Object.entries(entryPatterns)
              .map(([key, v]) => ({ key, winRate: v.count > 0 ? v.wins / v.count : 0, count: v.count }))
              .filter(p => p.count >= 2)
              .sort((a, b) => a.winRate - b.winRate)[0];
            if (!weakest || weakest.winRate >= 0.5) return null;
            return (
              <div style={{ marginTop: 8, fontSize: 10, color: "#991b1b", background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 10px", lineHeight: 1.6 }}>
                "{weakest.key}"가 가장 약점이에요. 다음 게임에서 이 패턴을 주의해보세요.
              </div>
            );
          })()}
        </div>
      )}

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

          {/* 원하는 종목이 없다면? — 검색 진입점 */}
          <div style={{ padding: "14px 12px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
            <button onClick={() => setShowCustomSearch(v => !v)} style={{
              background: "none", border: "none", color: C.accent, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", textDecoration: "underline",
            }}>
              원하는 종목이 없다면?
            </button>

            {showCustomSearch && (
              <div style={{ marginTop: 10, textAlign: "left" }}>

                {/* 봉 선택 — 검색창 바로 위 (주봉 디폴트) */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {([["1wk","📊 주봉"],["1mo","📅 월봉"],["1d","📈 일봉"]] as ["1wk"|"1mo"|"1d", string][]).map(([val, lbl]) => {
                    const active = intervalMode === val;
                    return (
                      <button key={val} onClick={() => setIntervalMode(val)} style={{
                        flex: 1, padding: "7px 0", borderRadius: 8, fontFamily: "inherit",
                        border: `1.5px solid ${active ? C.accent : C.border2}`,
                        background: active ? "#f3f0ff" : C.bg,
                        color: active ? C.accent : C.sub,
                        fontWeight: active ? 800 : 500, fontSize: 12, cursor: "pointer",
                      }}>{lbl}</button>
                    );
                  })}
                </div>

                {/* 검색 입력창 */}
                <input
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="한글/영문 종목명 또는 티커 (예: 삼성전자, AAPL)"
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    border: `1.5px solid ${C.border2}`, fontSize: 13, fontFamily: "inherit",
                    boxSizing: "border-box", marginBottom: 8, outline: "none",
                  }}
                  autoFocus
                />

                {searching && (
                  <div style={{ fontSize: 11, color: C.muted, textAlign: "center", padding: "8px 0" }}>검색 중...</div>
                )}
                {searchErr && (
                  <div style={{ fontSize: 11, color: C.red, padding: "8px 10px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fca5a5", marginBottom: 6 }}>
                    {searchErr}
                  </div>
                )}
                {!searching && searchResults.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                    {searchResults.map(r => (
                      <button
                        key={r.symbol}
                        onClick={() => handleStartCustom(r.symbol, r.name)}
                        disabled={startingTicker === r.symbol}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                          background: C.bg, cursor: startingTicker === r.symbol ? "default" : "pointer",
                          fontFamily: "inherit", textAlign: "left",
                          opacity: startingTicker === r.symbol ? 0.6 : 1,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{r.symbol} · {r.exch}</div>
                        </div>
                        <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>
                          {startingTicker === r.symbol ? "확인 중..." : "플레이 ›"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 안내 텍스트 */}
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.7, padding: "6px 2px" }}>
                  💡 한글로 검색하면 국내 종목을 바로 찾을 수 있어요 (예: 삼성전자, 하이닉스)<br/>
                  선택한 종목으로 <b style={{ color: C.accent }}>
                    {intervalMode === "1mo" ? "월봉" : intervalMode === "1d" ? "일봉" : "주봉"}
                  </b> 50봉 기준 게임을 시작합니다.
                  {intervalMode === "1mo" && <span style={{ color: C.red }}> 월봉은 50개월 이상 데이터가 필요해요.</span>}
                  {intervalMode === "1d" && <span style={{ color: "#f97316" }}> 일봉은 최근 50일 기준으로 시작합니다.</span>}
                </div>
              </div>
            )}
          </div>
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
