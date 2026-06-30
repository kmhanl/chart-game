"use client";

import React, { useState, useRef, useMemo } from "react";
import type { User } from "@supabase/supabase-js";

// ══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════════════════════════════════════
interface Trade {
  turn: number;
  type: "매수" | "매도";
  qty: number;
  krwPrice: number;
  snap: Record<string, unknown>;
  score?: number;
  priceNative?: number;
  date?: string;
}
interface TurnScore { score: number; maxScore: number; reasons?: Reason[]; action?: string; diagnosis?: Diagnosis | null; above10?: boolean; above5?: boolean | null; overheat10?: boolean; volMassiveSell?: boolean; deadCross?: boolean; candleUpperTail?: boolean; }
interface Reason { ok: boolean | null; text: string; }
interface Diagnosis {
  stage: string; stageColor: string; stageIcon: string;
  buyFit: string; buyFitColor: string; buyReason: string;
  risk: string | null; suggestion: string;
  goldenCross: boolean; deadCross: boolean; has240: boolean;
}
export interface GameResult {
  trades: Trade[];
  turnScores: TurnScore[];
  totalAsset: number;
  market: string;
  stockMeta: { ticker: string; name: string };
  interval: string;
  mission: string | null;
  followScore: number;
}
interface GameAppProps {
  user: User;
  initialMarket: "KOSPI" | "QQQ";
  initialInterval: "1wk" | "1mo";
  initialMission: string | null;
  initialCash?: number;          // ← 이 줄 추가
  customTicker?: string | null;
  customTickerName?: string | null;
  onGameEnd: (result: GameResult) => Promise<string | null>;
  onBackToLobby: () => void;
}
interface Candle { date: Date; open: number; high: number; low: number; close: number; vol: number; }
interface StockMeta { name: string; ticker: string; }

// ══════════════════════════════════════════════════════════════════════════════
// 종목 유니버스
// ══════════════════════════════════════════════════════════════════════════════
const UNIVERSE: Record<string, StockMeta[]> = {
  KOSPI: [
    { name: "삼성전자",     ticker: "005930.KS" },
    { name: "SK하이닉스",   ticker: "000660.KS" },
    { name: "삼성전기",     ticker: "009150.KS" },
    { name: "LG이노텍",     ticker: "011070.KS" },
    { name: "LG전자",       ticker: "066570.KS" },
    { name: "삼성SDI",      ticker: "006400.KS" },
    { name: "LG화학",       ticker: "051910.KS" },
    { name: "SK이노베이션",  ticker: "096770.KS" },
    { name: "한화솔루션",   ticker: "009830.KS" },
    { name: "현대차",       ticker: "005380.KS" },
    { name: "기아",         ticker: "000270.KS" },
    { name: "현대모비스",   ticker: "012330.KS" },
    { name: "NAVER",        ticker: "035420.KS" },
    { name: "카카오",       ticker: "035720.KS" },
    { name: "엔씨소프트",   ticker: "036570.KS" },
    { name: "KB금융",       ticker: "105560.KS" },
    { name: "신한지주",     ticker: "055550.KS" },
    { name: "하나금융지주", ticker: "086790.KS" },
    { name: "삼성생명",     ticker: "032830.KS" },
    { name: "삼성화재",     ticker: "000810.KS" },
    { name: "메리츠금융지주", ticker: "138040.KS" },
    { name: "셀트리온",     ticker: "068270.KS" },
    { name: "유한양행",     ticker: "000100.KS" },
    { name: "한미약품",     ticker: "128940.KS" },
    { name: "POSCO홀딩스",  ticker: "005490.KS" },
    { name: "현대제철",     ticker: "004020.KS" },
    { name: "고려아연",     ticker: "010130.KS" },
    { name: "현대건설",     ticker: "000720.KS" },
    { name: "삼성물산",     ticker: "028260.KS" },
    { name: "두산에너빌리티", ticker: "034020.KS" },
    { name: "한화에어로스페이스", ticker: "012450.KS" },
    { name: "아모레퍼시픽", ticker: "090430.KS" },
    { name: "LG생활건강",   ticker: "051900.KS" },
    { name: "오리온",       ticker: "271560.KS" },
    { name: "CJ제일제당",   ticker: "097950.KS" },
    { name: "이마트",       ticker: "139480.KS" },
    { name: "SK텔레콤",     ticker: "017670.KS" },
    { name: "KT",           ticker: "030200.KS" },
    { name: "한국전력",     ticker: "015760.KS" },
    { name: "코웨이",       ticker: "021240.KS" },
  ],
  QQQ: [
    { name: "Apple",        ticker: "AAPL" },
    { name: "Microsoft",    ticker: "MSFT" },
    { name: "NVIDIA",       ticker: "NVDA" },
    { name: "Amazon",       ticker: "AMZN" },
    { name: "Meta",         ticker: "META" },
    { name: "Alphabet",     ticker: "GOOGL" },
    { name: "Tesla",        ticker: "TSLA" },
    { name: "Broadcom",     ticker: "AVGO" },
    { name: "AMD",          ticker: "AMD" },
    { name: "Micron",       ticker: "MU" },
    { name: "Qualcomm",     ticker: "QCOM" },
    { name: "Intel",        ticker: "INTC" },
    { name: "ASML",         ticker: "ASML" },
    { name: "KLA Corp",     ticker: "KLAC" },
    { name: "Lam Research", ticker: "LRCX" },
    { name: "Applied Mat",  ticker: "AMAT" },
    { name: "Analog Devices", ticker: "ADI" },
    { name: "Salesforce",   ticker: "CRM" },
    { name: "Adobe",        ticker: "ADBE" },
    { name: "ServiceNow",   ticker: "NOW" },
    { name: "Palo Alto",    ticker: "PANW" },
    { name: "Workday",      ticker: "WDAY" },
    { name: "Autodesk",     ticker: "ADSK" },
    { name: "Cadence",      ticker: "CDNS" },
    { name: "Netflix",      ticker: "NFLX" },
    { name: "Amgen",        ticker: "AMGN" },
    { name: "Gilead",       ticker: "GILD" },
    { name: "Regeneron",    ticker: "REGN" },
    { name: "Vertex",       ticker: "VRTX" },
    { name: "Intuitive",    ticker: "ISRG" },
    { name: "Moderna",      ticker: "MRNA" },
    { name: "Starbucks",    ticker: "SBUX" },
    { name: "Costco",       ticker: "COST" },
    { name: "PepsiCo",      ticker: "PEP" },
    { name: "T-Mobile",     ticker: "TMUS" },
    { name: "Booking",      ticker: "BKNG" },
    { name: "PayPal",       ticker: "PYPL" },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// 미션 정의
// ══════════════════════════════════════════════════════════════════════════════
const MISSIONS = [
  {
    id: "golden_cross", icon: "✨", title: "골든크로스 공략",
    desc: "5MA가 10MA를 상향 돌파하는 타이밍에 매수하세요",
    hint: "5MA가 10MA 아래에 있다가 위로 올라오는 순간이 골든크로스입니다",
    check: (snap: Record<string, number | null>) => {
      const { ma5Cur, ma10Cur, ma5Prev, ma10Prev } = snap;
      return ma5Prev != null && ma10Prev != null && ma5Cur != null && ma10Cur != null
        && ma5Prev < ma10Prev && ma5Cur > ma10Cur;
    },
  },
  {
    id: "pullback_buy", icon: "🎯", title: "눌림목 매수",
    desc: "240MA 위 상승 추세에서 10MA 근처 눌림목에 매수하세요",
    hint: "주가가 240MA 위에 있고 10MA 근처(±3%)까지 눌린 구간이 눌림목입니다",
    check: (snap: Record<string, number | null>) => {
      const { price, ma10, ma240 } = snap;
      if (!ma10 || !ma240 || !price) return false;
      return price > ma240 && Math.abs(price - ma10) / ma10 < 0.03;
    },
  },
  {
    id: "double_top_escape", icon: "🏃", title: "M 쌍봉 탈출",
    desc: "고점 형성 후 10MA를 이탈하기 전에 매도하세요",
    hint: "전고점 근처에서 음봉이 나오고 10MA가 꺾이기 시작하면 분배 구간입니다",
    check: (snap: Record<string, number | null>) => {
      const { price, ma10, ma10Prev } = snap;
      if (!ma10 || !ma10Prev || !price) return false;
      return ma10 < ma10Prev && price < ma10 * 1.05;
    },
  },
  {
    id: "ma240_breakout", icon: "🚀", title: "240MA 돌파 매수",
    desc: "장기 하락 후 240MA를 상향 돌파하는 순간을 포착하세요",
    hint: "주가가 240MA 아래에 오래 있다가 처음 위로 올라오는 봉이 핵심입니다",
    check: (snap: Record<string, number | null>) => {
      const { price, ma240, prevPrice, prevMa240 } = snap;
      if (!ma240 || !prevMa240 || !price || !prevPrice) return false;
      return prevPrice < prevMa240 && price > ma240;
    },
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// 유틸
// ══════════════════════════════════════════════════════════════════════════════
async function fetchCandles(ticker: string, interval: string): Promise<Candle[]> {
  const period1 = Math.floor(new Date("2000-01-01").getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `/api/yahoo/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=${interval}&events=div%7Csplit`;
  const res = await fetch(url);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("데이터 없음");
  const ts = result.timestamp, q = result.indicators.quote[0];
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i], v = q.volume[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({ date: new Date(ts[i] * 1000), open: o, high: h, low: l, close: c, vol: v ?? 0 });
  }
  return candles;
}

function calcMA(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    return candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0) / period;
  });
}

function analyzeCandleState(c: Candle | null) {
  if (!c) return null;
  const body = Math.abs(c.close - c.open), total = c.high - c.low || 1;
  const upper = c.high - Math.max(c.open, c.close), lower = Math.min(c.open, c.close) - c.low;
  const isUp = c.close >= c.open, ratio = body / total;
  if (ratio > 0.7 && isUp)                return { label: "장대 양봉", color: "#e03131", bg: "#fff5f5", icon: "📈", desc: "강한 매수세" };
  if (ratio > 0.7 && !isUp)               return { label: "장대 음봉", color: "#1971c2", bg: "#e7f5ff", icon: "📉", desc: "강한 매도세" };
  if (upper > body * 1.5 && upper > lower) return { label: "윗꼬리",   color: "#f97316", bg: "#fff4e6", icon: "⬆️", desc: "상단 매도 압력" };
  if (lower > body * 1.5 && lower > upper) return { label: "아랫꼬리", color: "#7048e8", bg: "#f3f0ff", icon: "⬇️", desc: "하단 매수 지지" };
  if (ratio < 0.15)                        return { label: "도지",      color: "#868e96", bg: "#f8f9fa", icon: "➡️", desc: "매수·매도 균형" };
  return isUp
    ? { label: "양봉", color: "#e03131", bg: "#fff5f5", icon: "🔴", desc: "매수 우세" }
    : { label: "음봉", color: "#1971c2", bg: "#e7f5ff", icon: "🔵", desc: "매도 우세" };
}


// ══════════════════════════════════════════════════════════════════════════════
// 전황 보기 — 거래량을 병력 규모로 시각화한 전투 애니메이션
// ══════════════════════════════════════════════════════════════════════════════
function BattleModal({ candles, ma5, ma10, vol20Avg, holdings, above5, above10, onClose, onGoDiag, onGoSell }: {
  candles: Candle[]; ma5: (number|null)[]; ma10: (number|null)[]; vol20Avg: number;
  holdings: number; above5: boolean | null; above10: boolean | null;
  onClose: () => void; onGoDiag: () => void; onGoSell: () => void;
}) {
  const N = Math.min(10, candles.length);
  const recent = candles.slice(-N);
  const totalLen = candles.length;
  const ma5Recent  = ma5.slice(-N);
  const ma10Recent = ma10.slice(-N);
  // 직전 MA (패턴 판정용 — 윈도우 시작 직전 값)
  const ma5Prev0  = ma5[Math.max(0, totalLen - N - 1)] ?? null;
  const ma10Prev0 = ma10[Math.max(0, totalLen - N - 1)] ?? null;

  type EventTag = { key: string; label: string; emoji: string; color: string; coach: string };

  // 거래량 비율 + 가격변화율 + 캔들별 단일 이벤트 사전 계산
  const battles = recent.map((c, i) => {
    const ratio = vol20Avg > 0 ? c.vol / vol20Avg : 1;
    const pct = c.open > 0 ? ((c.close - c.open) / c.open) * 100 : 0;
    const up = c.close >= c.open;
    const body  = Math.abs(c.close - c.open);
    const upper = c.high - Math.max(c.open, c.close);
    const lower = Math.min(c.open, c.close) - c.low;
    const upperTail = upper > body * 1.5 && upper > 0;
    const lowerTail = lower > body * 1.5 && lower > 0;

    // 골든/데드크로스 — 이 캔들 시점의 MA5/MA10 비교
    const m5 = ma5Recent[i], m10 = ma10Recent[i];
    const pm5 = i === 0 ? ma5Prev0 : ma5Recent[i - 1];
    const pm10 = i === 0 ? ma10Prev0 : ma10Recent[i - 1];
    const golden = !!(m5 && m10 && pm5 && pm10 && pm5 < pm10 && m5 >= m10);
    const dead    = !!(m5 && m10 && pm5 && pm10 && pm5 > pm10 && m5 <= m10);

    let event: EventTag | null = null;
    if (golden) {
      event = { key: "golden", label: "골든크로스", emoji: "⚡", color: "#e03131", coach: "5MA가 10MA를 돌파 — 단기 추세 전환, 거래량 확인 후 매수 검토" };
    } else if (dead) {
      event = { key: "dead", label: "데드크로스", emoji: "💥", color: "#1971c2", coach: "5MA가 10MA를 이탈 — 단기 추세 꺾임, 손절 또는 관망 검토" };
    } else if (ratio >= 1.8) {
      event = up
        ? { key: "volsurge_up", label: "대군 합류", emoji: "🔥", color: "#e03131", coach: "거래량 동반 상승 — 신뢰도 높은 돌파 신호" }
        : { key: "volsurge_down", label: "대량 매도", emoji: "⚠️", color: "#1971c2", coach: "거래량 동반 하락 — 매도 압력 강함, 주의 필요" };
    } else if (upperTail) {
      event = { key: "uppertail", label: "윗꼬리", emoji: "↑", color: "#1971c2", coach: "고점에서 매도 압력 — 상단 저항 가능성" };
    } else if (lowerTail) {
      event = { key: "lowertail", label: "아랫꼬리", emoji: "↓", color: "#e03131", coach: "저점에서 매수 지지 — 하단 지지 확인" };
    }

    return { up, ratio, pct, event };
  });

  // 3봉 패턴(양음양/음양음) 스캔 — 단일 이벤트가 없는 구간 위에 보조로 표시
  const patternRoles: ("start" | "mid" | "end" | null)[] = recent.map(() => null);
  let foundPatternType: "양음양" | "음양음" | null = null;
  for (let i = 2; i < recent.length; i++) {
    const c1 = recent[i - 2], c2 = recent[i - 1], c3 = recent[i];
    const up1 = c1.close >= c1.open, up2 = c2.close >= c2.open, up3 = c3.close >= c3.open;
    if (up1 && !up2 && up3) {
      patternRoles[i - 2] = "start"; patternRoles[i - 1] = "mid"; patternRoles[i] = "end";
      foundPatternType = "양음양";
    } else if (!up1 && up2 && !up3) {
      patternRoles[i - 2] = "start"; patternRoles[i - 1] = "mid"; patternRoles[i] = "end";
      foundPatternType = "음양음";
    }
  }

  // C안: 사전 안내용 — 이번 구간에 어떤 신호들이 있는지 모아두기
  const eventSummary = battles
    .map((b, i) => ({ ...b.event, idx: i }))
    .filter((e): e is EventTag & { idx: number } => !!e.key);
  const uniqueEventLabels = Array.from(new Set(eventSummary.map(e => e.label)));
  if (foundPatternType) uniqueEventLabels.push(foundPatternType);

  const [idx, setIdx] = React.useState(-1);
  const [playing, setPlaying] = React.useState(false);
  const [redWins, setRedWins] = React.useState(0);
  const [blueWins, setBlueWins] = React.useState(0);
  const [cumPct, setCumPct] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const [showPatternCard, setShowPatternCard] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIdx(-1); setPlaying(false); setRedWins(0); setBlueWins(0); setCumPct(0); setDone(false);
    setShake(false); setShowPatternCard(false);
  };

  const play = () => {
    reset();
    setPlaying(true);
    let i = 0, r = 0, b = 0, cp = 0;
    const step = () => {
      if (i >= battles.length) {
        setPlaying(false); setDone(true);
        if (foundPatternType) setTimeout(() => setShowPatternCard(true), 100);
        return;
      }
      const bt = battles[i];
      if (bt.up) r++; else b++;
      cp += bt.pct;
      setIdx(i); setRedWins(r); setBlueWins(b); setCumPct(cp);
      if (patternRoles[i] === "mid") {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
      i++;
      timerRef.current = setTimeout(step, 700);
    };
    step();
  };

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const cur = idx >= 0 && idx < battles.length ? battles[idx] : null;
  const curRole = idx >= 0 ? patternRoles[idx] : null;
  const personCount = (ratio: number) => Math.min(5, Math.max(1, Math.ceil(ratio / 0.5)));
  const ropePct = Math.max(-30, Math.min(30, cumPct * 3));

  let statusText = "";
  let coachText = "";
  let eventTagLabel = "";
  let eventTagColor = "";
  if (cur?.event) {
    eventTagLabel = `${cur.event.emoji} ${cur.event.label}`;
    eventTagColor = cur.event.color;
    statusText = `${cur.event.emoji} ${cur.event.label}!`;
    coachText = cur.event.coach;
  } else if (curRole === "mid") {
    statusText = "😰 빨강팀 휘청!";
    coachText = "거래량 동반 안 된 눌림 — 아직 추세 훼손은 아닙니다";
  } else if (curRole === "end") {
    statusText = "🔥 전열 정비! 다시 강하게 당김!";
    coachText = "눌림 후 재돌파 — 추세 지속 신뢰도 높음, 보유 유지 검토";
  } else if (cur && cur.ratio < 0.7) {
    coachText = "거래량 적은 움직임 — 신뢰도 낮음, 추세 판단 보류";
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 16 }}>
      <style>{`@keyframes battleShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}`}</style>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(360px, 100%)", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e9ecef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#212529" }}>🪢 최근 {N}봉 줄다리기</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, color: "#adb5bd", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "14px 16px" }}>
          {/* C안: 재생 전 사전 안내 — 이번 구간에 숨어있는 신호 미리보기 */}
          {idx < 0 && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 11, color: "#854f0b", lineHeight: 1.6 }}>
              {uniqueEventLabels.length > 0
                ? <>🔍 이번 구간에 숨어있는 신호: <b>{uniqueEventLabels.join(", ")}</b><br />재생을 누르면 어디서 발생하는지 확인할 수 있어요!</>
                : "😴 이번 구간은 특별한 신호 없이 조용히 흘러갑니다. 재생해서 흐름을 확인해보세요."}
            </div>
          )}

          {/* 상태 라벨 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#212529" }}>
              {idx < 0 ? "대기 중" : done ? "줄다리기 종료" : `${idx + 1}봉 — ${cur?.up ? "빨강팀 당기는 중" : "파랑팀 당기는 중"}`}
            </span>
            <span style={{ fontSize: 10, color: "#e03131", fontWeight: 700 }}>{statusText}</span>
          </div>
          {/* B안: 실시간 코칭 멘트 */}
          {coachText && (
            <div style={{ fontSize: 10, color: "#7048e8", background: "#f3f0ff", borderRadius: 6, padding: "4px 8px", marginBottom: 8, lineHeight: 1.5 }}>
              💡 {coachText}
            </div>
          )}

          {/* 줄다리기 필드 */}
          <div style={{
            position: "relative", height: 70, marginBottom: 10, background: "#f8f9fa",
            borderRadius: 10, overflow: "hidden", border: "1px solid #e9ecef",
            animation: shake ? "battleShake .4s" : "none",
          }}>
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "#adb5bd" }} />
            <div style={{
              position: "absolute", left: `${50 - ropePct}%`, top: "50%", width: 100, height: 3,
              background: "#868e96", transform: "translate(-50%, -50%)", transition: "left .65s cubic-bezier(.4,0,.2,1)",
            }}>
              <div style={{ position: "absolute", left: "50%", top: -5, width: 3, height: 13, background: "#495057", transform: "translateX(-50%)" }} />
            </div>
            <div style={{ position: "absolute", top: "50%", left: 8, transform: "translateY(-50%)", display: "flex", gap: 1, opacity: cur?.up ? 1 : 0, transition: "opacity .25s" }}>
              {cur?.up && Array.from({ length: personCount(cur.ratio) }).map((_, i) => (
                <span key={i} style={{ fontSize: 18 }}>🏃</span>
              ))}
            </div>
            <div style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", display: "flex", flexDirection: "row-reverse", gap: 1, opacity: cur && !cur.up ? 1 : 0, transition: "opacity .25s" }}>
              {cur && !cur.up && Array.from({ length: personCount(cur.ratio) }).map((_, i) => (
                <span key={i} style={{ fontSize: 18 }}>🏃</span>
              ))}
            </div>
          </div>

          {/* 진행 도트 (이벤트/패턴 라벨 포함, A안) */}
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 10 }}>
            {battles.map((bt, i) => (
              <div key={i} style={{ position: "relative", width: 18, height: 18 }}>
                {bt.event ? (
                  <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", fontSize: 9, whiteSpace: "nowrap" }}>
                    {bt.event.emoji}
                  </div>
                ) : patternRoles[i] ? (
                  <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 700, color: "#7048e8", whiteSpace: "nowrap" }}>
                    {bt.up ? "양" : "음"}
                  </div>
                ) : null}
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: i <= idx ? (bt.up ? "#e03131" : "#1971c2") : "#fff",
                  border: `1.5px solid ${bt.event ? bt.event.color : i <= idx ? (bt.up ? "#e03131" : "#1971c2") : "#dee2e6"}`,
                  borderWidth: bt.event ? 2.5 : 1.5,
                  transition: "all .3s",
                }} />
              </div>
            ))}
          </div>

          {/* 통계 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <div style={{ flex: 1, background: "#f8f9fa", borderRadius: 8, padding: "7px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#495057" }}>빨강팀 인원</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e03131" }}>{cur?.up ? personCount(cur.ratio) : 0}명</div>
            </div>
            <div style={{ flex: 1, background: "#f8f9fa", borderRadius: 8, padding: "7px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#495057" }}>파랑팀 인원</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1971c2" }}>{cur && !cur.up ? personCount(cur.ratio) : 0}명</div>
            </div>
          </div>
          <div style={{ background: "#f8f9fa", borderRadius: 8, padding: "7px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#495057" }}>🪢 밧줄 위치 (가격)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: cumPct >= 0 ? "#e03131" : "#1971c2" }}>
              {cumPct >= 0 ? "+" : ""}{cumPct.toFixed(1)}%
            </span>
          </div>

          {/* 당김 횟수 */}
          <div style={{ background: "#f8f9fa", borderRadius: 8, padding: "7px 12px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#495057" }}>🪢 당김 횟수</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: "#e03131" }}>{redWins}</span> : <span style={{ color: "#1971c2" }}>{blueWins}</span>
            </span>
          </div>

          {/* 패턴 카드 (C안) */}
          {showPatternCard && foundPatternType && (
            <div style={{ background: "#f3f0ff", border: "1px solid #d0bfff", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: "#7048e8", lineHeight: 1.6, marginBottom: 8 }}>
              🕯️ {foundPatternType} 패턴 발견!<br />
              {foundPatternType === "양음양"
                ? "빨강팀이 한 번 휘청였지만 더 강하게 돌아왔습니다. 이게 추세 지속의 신호입니다."
                : "파랑팀이 한 번 밀렸지만 다시 끌고 갔습니다. 하락 추세 지속 가능성에 주의하세요."}
            </div>
          )}

          {/* D안: 신호도 패턴도 없었던 조용한 구간 안내 */}
          {done && uniqueEventLabels.length === 0 && (
            <div style={{ background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: "#495057", lineHeight: 1.6, marginBottom: 8 }}>
              😴 이번 10봉엔 특별한 신호가 없었습니다.<br />
              횡보 구간 — 무리한 매매보다 관망이 정답입니다.
            </div>
          )}

          {/* 결과 */}
          {done && (() => {
            const priceUp = cumPct > 0;
            const battleWinRed = redWins > blueWins;
            const bg = priceUp ? "#fff5f5" : "#e7f5ff";
            const border = priceUp ? "#fca5a5" : "#74c0fc";
            const color = priceUp ? "#e03131" : "#1971c2";
            const msg = priceUp
              ? (battleWinRed
                  ? `당김 횟수 ${redWins}번 ${blueWins}번으로 압도, 밧줄도 +${cumPct.toFixed(1)}% 끌려옴. 빨강팀의 완승!`
                  : `당김 횟수는 ${blueWins}번 ${redWins}번으로 밀렸지만, 밧줄은 +${cumPct.toFixed(1)}% 끌려옴. 한 번의 강한 당김으로 역전!`)
              : (!battleWinRed
                  ? `당김 횟수 ${blueWins}번 ${redWins}번으로 압도, 밧줄도 ${cumPct.toFixed(1)}% 끌려감. 파랑팀의 완승!`
                  : `당김 횟수는 ${redWins}번 ${blueWins}번으로 빨강팀이 우세했지만, 밧줄은 ${cumPct.toFixed(1)}% 끌려감. 작은 당김 여러 번보다 강한 한 번이 더 셉니다.`);

            // C안: 지금 내 포지션 기반 행동 제안
            let actionTitle = "";
            let actionDesc = "";
            let actionBtn: "diag" | "sell" | null = null;
            if (holdings > 0) {
              if (above5 === false && above10 === false) {
                actionTitle = "보유 중 — 5MA·10MA 모두 이탈";
                actionDesc = "줄다리기에서도 파랑팀이 우세했죠. 추세 이탈 가능성이 높습니다.";
                actionBtn = "sell";
              } else if (above10 === false) {
                actionTitle = "보유 중 — 10MA 이탈";
                actionDesc = "손절 또는 관망 검토가 필요한 구간입니다.";
                actionBtn = "sell";
              } else if (priceUp) {
                actionTitle = "보유 중 — 추세 지속";
                actionDesc = "밧줄이 빨강팀 쪽으로 끌려갔듯, 보유 포지션을 유지할 좋은 흐름입니다.";
              } else {
                actionTitle = "보유 중 — 단기 조정";
                actionDesc = "파랑팀이 우세했지만 MA는 아직 무너지지 않았습니다. 진단을 확인해보세요.";
                actionBtn = "diag";
              }
            } else {
              if (priceUp && above5 && above10) {
                actionTitle = "미보유 — 매수 신호 구간";
                actionDesc = "빨강팀이 줄다리기를 주도했고 MA도 위입니다. 매수 적합도를 확인해보세요.";
                actionBtn = "diag";
              } else {
                actionTitle = "미보유 — 관망 구간";
                actionDesc = "지금은 추세가 불명확합니다. 진단 패널에서 더 확인해보세요.";
                actionBtn = "diag";
              }
            }

            return (
              <>
                <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", fontSize: 11, color, lineHeight: 1.6, marginBottom: 8 }}>
                  {priceUp ? "🔴" : "🔵"} {msg}
                </div>
                <div style={{ background: "#fff", border: "1px solid #dee2e6", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#adb5bd", marginBottom: 3 }}>📌 지금 당신의 포지션</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#212529", marginBottom: 3 }}>{actionTitle}</div>
                  <div style={{ fontSize: 11, color: "#495057", lineHeight: 1.6, marginBottom: actionBtn ? 8 : 0 }}>{actionDesc}</div>
                  {actionBtn === "diag" && (
                    <button onClick={onGoDiag} style={{ width: "100%", padding: "8px", borderRadius: 7, border: "1px solid #d0bfff", background: "#f3f0ff", color: "#7048e8", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      📊 추세 진단 보기
                    </button>
                  )}
                  {actionBtn === "sell" && (
                    <button onClick={onGoSell} style={{ width: "100%", padding: "8px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fff5f5", color: "#e03131", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      💰 매도 검토하기
                    </button>
                  )}
                </div>
              </>
            );
          })()}

          {/* 컨트롤 */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={play} disabled={playing} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: "#212529", color: "#fff", border: "none", borderRadius: 8,
              padding: "9px", fontSize: 12, fontWeight: 700, cursor: playing ? "default" : "pointer",
              opacity: playing ? 0.6 : 1, fontFamily: "inherit",
            }}>▶ 재생</button>
            <button onClick={reset} style={{
              padding: "9px 14px", borderRadius: 8, border: "1px solid #dee2e6",
              background: "#fff", fontSize: 12, color: "#495057", cursor: "pointer", fontFamily: "inherit",
            }}>↻ 리셋</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function analyzeMAStatus(price: number, prevPrice: number | null, maVal: number | null, prevMaVal: number | null) {
  if (!maVal) return null;
  if (!prevMaVal || prevPrice == null) return price > maVal
    ? { status: "위", color: "#e03131", bg: "#fff5f5" }
    : { status: "아래", color: "#1971c2", bg: "#e7f5ff" };
  const wasAbove = prevPrice > prevMaVal, isAbove = price > maVal;
  if (!wasAbove && isAbove)  return { status: "돌파 ↑", color: "#e03131", bg: "#fff5f5", bold: true };
  if (wasAbove  && !isAbove) return { status: "이탈 ↓", color: "#1971c2", bg: "#e7f5ff", bold: true };
  return isAbove ? { status: "위", color: "#e03131", bg: "#fff5f5" } : { status: "아래", color: "#1971c2", bg: "#e7f5ff" };
}

function diagnoseTrend(price: number, prevPrice: number, ma5: number | null, ma10: number | null, ma240: number | null, prevMa5: number | null, prevMa10: number | null, candle: Candle | null, recentCandles: Candle[]): Diagnosis | null {
  if (!candle) return null;
  if (!ma5 && !ma10) return null;
  const has240 = ma240 != null;
  const above240 = has240 ? price > ma240! : null;
  const above10  = ma10  ? price > ma10   : null;
  const above5   = ma5   ? price > ma5    : null;
  const goldenCross = !!(ma5 && ma10 && prevMa5 && prevMa10 && prevMa5 < prevMa10 && ma5 > ma10);
  const deadCross   = !!(ma5 && ma10 && prevMa5 && prevMa10 && prevMa5 > prevMa10 && ma5 < ma10);
  const ma10Falling = !!(ma10 && prevMa10 && ma10 < prevMa10);
  const nearMA10    = ma10 ? Math.abs(price - ma10) / ma10 < 0.03 : false;
  let volDecreasing = false;
  if (recentCandles.length >= 4) {
    const recent = recentCandles.slice(-4);
    const avgVol = recent.slice(0, 3).reduce((s, c) => s + c.vol, 0) / 3;
    volDecreasing = recent[3].vol < avgVol * 0.7;
  }
  let stage = "", stageColor = "", stageIcon = "";
  if (has240) {
    if (!above240) {
      if (ma10Falling) { stage = "하락 추세";      stageColor = "#1971c2"; stageIcon = "📉"; }
      else             { stage = "240MA 하단 횡보"; stageColor = "#868e96"; stageIcon = "↔️"; }
    } else if (above10) {
      if (goldenCross) { stage = "골든크로스 발생!"; stageColor = "#e03131"; stageIcon = "✨"; }
      else             { stage = "상승 추세";        stageColor = "#e03131"; stageIcon = "📈"; }
    } else {
      if (nearMA10)         { stage = "눌림목 구간";  stageColor = "#f97316"; stageIcon = "🎯"; }
      else if (ma10Falling) { stage = "단기 조정";    stageColor = "#f97316"; stageIcon = "⚠️"; }
      else                  { stage = "240MA 위 횡보"; stageColor = "#868e96"; stageIcon = "↗️"; }
    }
  } else {
    if (goldenCross)           { stage = "골든크로스 발생!"; stageColor = "#e03131"; stageIcon = "✨"; }
    else if (deadCross)        { stage = "데드크로스 발생!"; stageColor = "#1971c2"; stageIcon = "💀"; }
    else if (above10 && above5){ stage = "단기 상승 추세";   stageColor = "#e03131"; stageIcon = "📈"; }
    else if (!above10)         { stage = "단기 하락 추세";   stageColor = "#1971c2"; stageIcon = "📉"; }
    else if (ma10Falling)      { stage = "조정 구간";        stageColor = "#f97316"; stageIcon = "⚠️"; }
    else                       { stage = "횡보 구간";         stageColor = "#868e96"; stageIcon = "↔️"; }
  }
  let buyFit = "", buyFitColor = "", buyReason = "";
  if (has240) {
    if (!above240)                              { buyFit = "❌ 부적합";   buyFitColor = "#1971c2"; buyReason = "240MA 아래 — 매수 자제"; }
    else if (goldenCross)                       { buyFit = "🔥 최적 타점"; buyFitColor = "#e03131"; buyReason = "골든크로스 돌파 직후 — 1차 매수 기회"; }
    else if (above10 && above5)                 { buyFit = "✅ 매수 가능"; buyFitColor = "#2f9e44"; buyReason = "전체 MA 위 강세 구간 — 비중 유지"; }
    else if (nearMA10 && volDecreasing)         { buyFit = "🎯 눌림 매수"; buyFitColor = "#f97316"; buyReason = "거래량 감소 눌림목 — 분할 매수 적기"; }
    else if (!above10)                          { buyFit = "⏳ 대기";     buyFitColor = "#868e96"; buyReason = "10MA 회복 확인 후 진입"; }
    else                                        { buyFit = "⚠️ 주의";    buyFitColor = "#f97316"; buyReason = "추세 불명확 — 소량 또는 관망"; }
  } else {
    if (goldenCross)       { buyFit = "🔥 골든크로스"; buyFitColor = "#e03131"; buyReason = "5MA가 10MA 돌파 — 월봉 매수 신호"; }
    else if (deadCross)    { buyFit = "❌ 데드크로스"; buyFitColor = "#1971c2"; buyReason = "5MA가 10MA 하향 이탈 — 매도·관망"; }
    else if (above10 && above5) { buyFit = "✅ 매수 가능"; buyFitColor = "#2f9e44"; buyReason = "5MA · 10MA 위 상승 구간 — 비중 유지"; }
    else if (above10 && !above5){ buyFit = "🎯 눌림 확인"; buyFitColor = "#f97316"; buyReason = "10MA 위 / 5MA 아래 — 5MA 회복 확인 후 매수"; }
    else if (!above10)     { buyFit = "⏳ 대기"; buyFitColor = "#868e96"; buyReason = "10MA 아래 — 회복 확인 후 진입"; }
    else                   { buyFit = "⚠️ 주의"; buyFitColor = "#f97316"; buyReason = "추세 불명확 — 관망"; }
  }
  let risk: string | null = null;
  if (deadCross) risk = "⚠️ 데드크로스 발생 — 매도 검토";
  else if (!above10 && has240 && above240 && ma10Falling) risk = "⚠️ 10MA 이탈 — 손절 또는 관망";
  else if (!above10 && !has240 && ma10Falling) risk = "⚠️ 10MA 하락 중 — 추가 하락 주의";
  let suggestion = "";
  if (buyFit.includes("최적") || buyFit.includes("골든")) suggestion = "5~10% 매수 고려";
  else if (buyFit.includes("가능"))  suggestion = "비중 유지 / 추가 시 5%";
  else if (buyFit.includes("눌림"))  suggestion = "5% 분할 매수 검토";
  else if (buyFit.includes("대기"))  suggestion = "관망 — MA 회복 확인";
  else suggestion = "관망 권장";
  return { stage, stageColor, stageIcon, buyFit, buyFitColor, buyReason, risk, suggestion, goldenCross, deadCross, has240 };
}

function scoreTurnAction(action: string, snap: Record<string, unknown>, diagnosis: Diagnosis | null): TurnScore {
  let score = 0;
  const reasons: Reason[] = [];
  let maxScore = 0;
  const has240 = snap.ma240 != null;
  if (action === "buy") {
    maxScore = has240 ? 40 : 25;
    if (has240) {
      if (snap.above240) { score += 15; reasons.push({ ok: true,  text: "240MA 위에서 매수 (+15)" }); }
      else               { score -=  5; reasons.push({ ok: false, text: "240MA 아래 매수 (-5)" }); }
    } else { reasons.push({ ok: null, text: "240MA 데이터 부족 — 해당 항목 제외" }); }
    if (snap.goldenCross)     { score += 15; reasons.push({ ok: true,  text: "골든크로스 타점 (+15)" }); }
    else if (snap.above10)    { score +=  5; reasons.push({ ok: true,  text: "10MA 위 매수 (+5)" }); }
    else                      { score -=  5; reasons.push({ ok: false, text: "10MA 아래 매수 (-5)" }); }
    if (snap.nearMA10 && snap.volDecreasing && (!has240 || snap.above240)) {
      score += 10; reasons.push({ ok: true, text: "눌림목 거래량 감소 (+10)" });
    }
    // 6번: 거래량 기반 채점
    if (snap.goldenCross && snap.volSurge) {
      score += 15; maxScore += 15;
      reasons.push({ ok: true, text: `거래량 확인 돌파 보너스 (+15) — 평균의 ${Math.round((snap.volRatio as number)*100)}%` });
    } else if (snap.goldenCross && !snap.volSurge) {
      reasons.push({ ok: false, text: `거래량 미확인 돌파 — 평균의 ${Math.round((snap.volRatio as number)*100)}% (150% 필요)` });
    }
    if (snap.volMassiveSell && snap.above240) {
      score -= 10; reasons.push({ ok: false, text: "대량 매도 출현 중 매수 (-10)" });
    }
  } else if (action === "sell") {
    maxScore = has240 ? 40 : 35;
    if (snap.deadCross) { score += 20; reasons.push({ ok: true, text: "데드크로스 매도 (+20)" }); }
    if (!snap.above10)          { score += 15; reasons.push({ ok: true,  text: "10MA 이탈 후 매도 (+15)" }); }
    else if (snap.above5 === false) { score += 10; reasons.push({ ok: true, text: "5MA 이탈 — 절반 매도 전략 (+10)" }); }
    else if (snap.above5 === true) {
      if (snap.upperTailSignal) {
        score += 5; reasons.push({ ok: true, text: "윗꼬리 매도 — 매도 압력 확인 후 청산 (+5)" });
      } else {
        score += 0; reasons.push({ ok: null, text: "5MA 위 매도 — 추세 중 조기 청산 (중립)" });
      }
    }
    // 6번: 대량 매도 출현 후 매도
    if (snap.volMassiveSell) {
      score += 10; maxScore += 10;
      reasons.push({ ok: true, text: `대량 음봉 후 매도 (+10) — 평균의 ${Math.round((snap.volRatio as number)*100)}%` });
    }
    if (has240) {
      if (!snap.above240) { score += 5; reasons.push({ ok: true, text: "240MA 아래 청산 (+5)" }); }
    } else { reasons.push({ ok: null, text: "240MA 데이터 부족 — 해당 항목 제외" }); }
  } else {
    // C안: 보유 중 + 상승 추세 관망은 만점 (비중 유지 = 올바른 판단)
    const holdingShares = (snap.holdingQty as number | undefined) ?? 0;
    const isHoldingUptrend = holdingShares > 0 && !!snap.above10;

    maxScore = has240 ? 20 : 15;
    if (isHoldingUptrend) {
      // B+C: 보유 중 상승 추세 관망 → 만점
      score = maxScore;
      reasons.push({ ok: true, text: "비중 유지 — 상승 추세 중 보유 지속 (만점)" });
    } else if (has240) {
      if (!snap.above240)    { score += 20; reasons.push({ ok: true,  text: "240MA 아래 관망 정석 (+20)" }); }
      else if (!snap.above10){ score += 15; reasons.push({ ok: true,  text: "10MA 이탈 관망 (+15)" }); }
      else                   { score +=  5; reasons.push({ ok: false, text: "상승 추세 중 미보유 관망 (+5, 매수 기회)" }); }
    } else {
      if (!snap.above10){ score += 15; reasons.push({ ok: true,  text: "10MA 이탈 관망 (+15)" }); }
      else              { score +=  5; reasons.push({ ok: false, text: "상승 추세 중 미보유 관망 (+5, 매수 기회)" }); }
      reasons.push({ ok: null, text: "240MA 데이터 부족 — 해당 항목 제외" });
    }
  }
  const clampedScore = Math.max(0, Math.min(maxScore, score));
  const above10Val = snap.above10 as boolean | undefined;
  const above5Val = snap.above5 as boolean | null | undefined;
  const overheat10Val = snap.overheat10 as boolean | undefined;
  const volMassiveSellVal = snap.volMassiveSell as boolean | undefined;
  const deadCrossVal = snap.deadCross as boolean | undefined;
  // 윗꼬리 감지: snap에 없으므로 candleState 정보를 이용
  // candleUpperTail: 진단 패널의 buyReason에 "윗꼬리" 포함 여부로 대체
  const candleUpperTailVal = !!(snap.upperTailSignal as boolean);
  return { score: clampedScore, maxScore, reasons, action, diagnosis, above10: above10Val, above5: above5Val, overheat10: overheat10Val, volMassiveSell: volMassiveSellVal, deadCross: deadCrossVal, candleUpperTail: candleUpperTailVal };
}

// ══════════════════════════════════════════════════════════════════════════════
// 스타일 & 포맷
// ══════════════════════════════════════════════════════════════════════════════
const C = {
  bg: "#fff", surface: "#f8f9fa", border: "#e9ecef", border2: "#dee2e6",
  text: "#212529", sub: "#495057", muted: "#adb5bd",
  red: "#e03131", redBg: "#fff5f5", redBorder: "#fca5a5",
  blue: "#1971c2", blueBg: "#e7f5ff", blueBorder: "#74c0fc",
  accent: "#7048e8", green: "#2f9e44",
};
const fmtKRW  = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원";
const fmtUSD  = (n: number) => "$" + n.toFixed(2);
const fmtPct  = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const fmtDate = (d: Date | undefined) => d instanceof Date ? d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

// ══════════════════════════════════════════════════════════════════════════════
// 차트 컴포넌트
// ══════════════════════════════════════════════════════════════════════════════
function CandleChart({ candles, ma5, ma10, ma240, width = 700, height = 270, style, svgHeight, markers, avgCostLines, patternMarks, pullbackZones }: {
  candles: Candle[]; ma5: (number|null)[]; ma10: (number|null)[]; ma240: (number|null)[];
  width?: number; height?: number; style?: React.CSSProperties; svgHeight?: string;
  markers?: { idx:number; type:"매수"|"매도"; source?:"sim"|"mine"; gap10?:number; avgCost?:number; pnlPct?:number; qty?:number; krwPrice?:number }[];
  avgCostLines?: { price: number; source: "sim"|"mine"; label?: string }[];
  patternMarks?: { idx: number; type: "golden" | "dead" | "uppertail" | "lowertail" | "threebar" | "pullback"; label: string; cls: "up_cont" | "up_rev" | "down_cont" | "down_rev" }[];
  pullbackZones?: { startIdx: number; endIdx: number }[];
}) {
  if (!candles.length) return null;
  const PAD = { l: 10, r: 50, t: 8, b: 8 };
  const W = width - PAD.l - PAD.r, H = height - PAD.t - PAD.b, n = candles.length;
  const allP = candles.flatMap(c => [c.high, c.low]);
  const maV  = [...ma5, ...ma10, ...ma240].filter((v): v is number => v != null);
  // 캔들 가격 범위 (기준)
  const candleMin = Math.min(...allP, ...maV);
  const candleMax = Math.max(...allP, ...maV);
  const candleRange = candleMax - candleMin || candleMax * 0.05 || 1;
  // 평단선은 캔들 범위 기준 ±50% 이내일 때만 범위 계산에 포함 (이상치 방어)
  const costV = (avgCostLines ?? [])
    .map(l => l.price)
    .filter(p => p > 0 && p >= candleMin - candleRange * 2 && p <= candleMax + candleRange * 2);
  let minP = Math.min(candleMin, ...costV) * 0.995;
  let maxP = Math.max(candleMax, ...costV) * 1.005;
  // 분모 0 방어 — 범위가 너무 좁으면 강제로 벌려줌
  if (maxP - minP < candleMax * 0.001) {
    const mid = (maxP + minP) / 2;
    minP = mid * 0.97;
    maxP = mid * 1.03;
  }
  const sx = (i: number) => PAD.l + (i / Math.max(n - 1, 1)) * W;
  const sy = (p: number) => PAD.t + H - ((p - minP) / (maxP - minP)) * H;
  const cw = Math.max(2, (W / n) * 0.7);
  const lbls = Array.from({ length: 6 }, (_, i) => {
    const p = minP + ((maxP - minP) * i) / 5;
    return { y: sy(p), label: p >= 10000 ? Math.round(p).toLocaleString() : p.toFixed(2) };
  });
  const maPath = (vals: (number|null)[], col: string) => {
    const pts = vals.map((v, i) => v != null ? `${sx(i)},${sy(v)}` : null).filter(Boolean);
    return pts.length ? <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth="1.5" strokeOpacity="0.9" /> : null;
  };
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block", height: svgHeight ?? "100%", ...style }}>
      {/* C안: 눌림목 구간 배경 음영 — 가장 아래 레이어 */}
      {pullbackZones && pullbackZones.map((z, zi) => {
        const x1 = sx(z.startIdx) - cw / 2;
        const x2 = sx(z.endIdx) + cw / 2;
        return (
          <rect key={zi} x={x1} y={PAD.t} width={Math.max(0, x2 - x1)} height={H}
            fill="#f97316" fillOpacity={0.08} />
        );
      })}
      {/* 매수▲ / 매도▼ 마커 (원칙=채움, 내꺼=빈 테두리+다른 오프셋) */}
      {markers && markers.map((m, mi) => {
        if (!candles[m.idx]) return null;
        const cx    = sx(m.idx);
        const c     = candles[m.idx];
        const isBuy  = m.type === "매수";
        const isSim  = m.source !== "mine";
        const isMine = m.source === "mine";
        const isLatest = m.idx === markers.filter(mk => mk.source === m.source).slice(-1)[0]?.idx;

        const clr     = isBuy
          ? (isSim ? "#e03131" : "#f97316")
          : (isSim ? "#1971c2" : "#0c8599");

        // 과거 마커는 투명도 낮춤
        const opacity = isLatest ? 1 : 0.45;

        const simOff  = 18;
        const mineOff = 34;
        const off = isMine ? mineOff : simOff;

        const markerY = isBuy ? sy(c.low) + off : sy(c.high) - off;
        const ts = 6;
        const buyPts  = `${cx},${markerY} ${cx-ts},${markerY+ts*1.5} ${cx+ts},${markerY+ts*1.5}`;
        const sellPts = `${cx},${markerY} ${cx-ts},${markerY-ts*1.5} ${cx+ts},${markerY-ts*1.5}`;
        const pts = isBuy ? buyPts : sellPts;

        return (
          <g key={mi} opacity={opacity}>
            {/* 수직 점선 */}
            <line x1={cx} y1={sy(c.high) - 4} x2={cx} y2={sy(c.low) + 4}
              stroke={clr} strokeWidth="1" strokeDasharray="3,2" strokeOpacity="0.4" />
            {/* 삼각형 */}
            {isSim
              ? <polygon points={pts} fill={clr} />
              : <polygon points={pts} fill="none" stroke={clr} strokeWidth="1.5" />
            }
            {/* 카드: 최신 턴만 표시 */}
            {isLatest && (() => {
              const bw = 150;
              const bh = 20;
              const bgClr = isBuy
                ? (isSim ? "rgba(255,245,245,0.97)" : "rgba(255,247,237,0.97)")
                : (isSim ? "rgba(231,245,255,0.97)" : "rgba(224,249,255,0.97)");
              const rawBoxY = isBuy ? sy(c.low) + off + 6 : sy(c.high) - off - bh - 6;
              const boxY   = Math.min(Math.max(rawBoxY, PAD.t + 2), height - bh - PAD.b - 2);
              // 좌우 위치: 오른쪽 넘으면 왼쪽으로
              const bx = (cx + bw + 55 > width) ? cx - bw - 4 : cx + 4;
              const srcLabel = isSim ? "원칙" : "나";
              return (
                <>
                  <rect x={bx} y={boxY} width={bw} height={bh}
                    rx="4" fill={bgClr} stroke={clr} strokeWidth="0.8" strokeOpacity="0.8" />
                  {/* 배지 */}
                  <rect x={bx+2} y={boxY+3} width={isSim?20:14} height={14} rx="3" fill={clr} />
                  <text x={bx+2+(isSim?10:7)} y={boxY+13} fontSize="8" fill="#fff" textAnchor="middle" fontWeight="bold">
                    {srcLabel}
                  </text>
                  {/* 타입 */}
                  <text x={bx+(isSim?25:19)} y={boxY+13} fontSize="9" fill={clr} fontWeight="bold">
                    {isBuy ? "매수" : "매도"} {m.qty}주
                  </text>
                  {/* 이격도 (매수 시만) */}
                  {isBuy && m.gap10 != null && (
                    <text x={bx+85} y={boxY+13} fontSize="8" fill={clr} fontWeight="bold">
                      {m.gap10 >= 0 ? "+" : ""}{m.gap10.toFixed(1)}%
                    </text>
                  )}
                  {/* 매도 수익률 */}
                  {!isBuy && m.pnlPct != null && (
                    <text x={bx+85} y={boxY+13} fontSize="8"
                      fill={m.pnlPct >= 0 ? "#2f9e44" : "#e03131"} fontWeight="bold">
                      {m.pnlPct >= 0 ? "+" : ""}{m.pnlPct.toFixed(1)}%
                    </text>
                  )}
                </>
              );
            })()}
          </g>
        );
      })}
      {/* B안: 패턴 오버레이 — 4색 분류 체계 + 눌림목(주황, 별도 카테고리) */}
      {patternMarks && patternMarks.map((p, pi) => {
        if (!candles[p.idx]) return null;
        const c = candles[p.idx];
        const cx = sx(p.idx);

        // 눌림목은 4분류와 별개로 주황 단일 스타일
        if (p.type === "pullback") {
          const cy = sy(c.low) + 22;
          return (
            <g key={pi}>
              <rect x={cx - 22} y={cy - 19} width={44} height={36} rx={5}
                fill="#fff7ed" fillOpacity={0.95} stroke="#f97316" strokeWidth="1.2" />
              <text x={cx} y={cy - 7} fontSize="11" textAnchor="middle">🎯</text>
              <text x={cx} y={cy + 4} fontSize="7.5" fill="#c2410c" textAnchor="middle" fontWeight="bold">
                눌림목 매수
              </text>
              <text x={cx} y={cy + 14} fontSize="7" fill="#c2410c" textAnchor="middle" fontWeight="600">
                {p.label}
              </text>
              <line x1={cx} y1={cy - 17} x2={cx} y2={sy(c.low)}
                stroke="#f97316" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.6" />
            </g>
          );
        }

        // 4색 분류 스타일
        const clsStyle = {
          up_cont:   { color: "#2f9e44", bg: "#f0fdf4", border: "#86efac", badge: "상승지속", arrow: "▲" },
          up_rev:    { color: "#e03131", bg: "#fff5f5", border: "#fca5a5", badge: "상승반전", arrow: "⤴" },
          down_cont: { color: "#7048e8", bg: "#f3f0ff", border: "#d0bfff", badge: "하락지속", arrow: "▼" },
          down_rev:  { color: "#1971c2", bg: "#e7f5ff", border: "#74c0fc", badge: "하락반전", arrow: "⤵" },
        }[p.cls];
        const isAbove = p.type === "dead" || p.type === "uppertail";
        const cy = isAbove ? sy(c.high) - 22 : sy(c.low) + 22;
        const shapeEmoji = p.type === "golden" || p.type === "dead" ? "⭐"
          : p.type === "threebar" ? "🕯️"
          : null; // 꼬리는 원으로

        return (
          <g key={pi}>
            {/* 분류 배지 박스 */}
            <rect x={cx - 20} y={cy - 19} width={40} height={36} rx={5}
              fill={clsStyle.bg} fillOpacity={0.95} stroke={clsStyle.color} strokeWidth="1" />
            {/* 화살표 + 아이콘 */}
            <text x={cx} y={cy - 7} fontSize="11" textAnchor="middle">
              {shapeEmoji ?? (p.type === "uppertail" ? "○" : "○")}
            </text>
            {/* 4분류 배지 텍스트 */}
            <text x={cx} y={cy + 4} fontSize="7.5" fill={clsStyle.color} textAnchor="middle" fontWeight="bold">
              {clsStyle.arrow} {clsStyle.badge}
            </text>
            {/* 패턴 이름 */}
            <text x={cx} y={cy + 14} fontSize="7" fill={clsStyle.color} textAnchor="middle" fontWeight="600">
              {p.label}
            </text>
            {/* 연결선 */}
            <line x1={cx} y1={isAbove ? cy + 17 : cy - 17} x2={cx} y2={isAbove ? sy(c.high) : sy(c.low)}
              stroke={clsStyle.color} strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.5" />
          </g>
        );
      })}
      {lbls.map((l, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={l.y} x2={PAD.l + W} y2={l.y} stroke="#e9ecef" strokeWidth="1" />
          <text x={PAD.l + W + 4} y={l.y + 4} fontSize="9" fill="#adb5bd">{l.label}</text>
        </g>
      ))}
      {/* 평단 가로선 */}
      {avgCostLines && avgCostLines.filter(l => l.price > 0 && l.price >= minP && l.price <= maxP).map((l, li) => {
        const ly   = sy(l.price);
        const clr  = l.source === "sim" ? "#e03131" : "#f97316";
        const lbl  = l.label ?? (l.source === "sim" ? "원칙 평단" : "내 평단");
        const pStr = Math.round(l.price).toLocaleString();
        return (
          <g key={li}>
            <line x1={PAD.l} y1={ly} x2={PAD.l + W} y2={ly}
              stroke={clr} strokeWidth="1.2" strokeDasharray="5,3" strokeOpacity="0.7" />
            <rect x={PAD.l + W + 2} y={ly - 8} width={46} height={14} rx="3"
              fill={clr} fillOpacity="0.12" />
            <text x={PAD.l + W + 4} y={ly + 3} fontSize="8" fill={clr} fontWeight="bold">
              {lbl}
            </text>
            <text x={PAD.l + W + 2} y={ly + 14} fontSize="7" fill={clr} fillOpacity="0.8">
              {pStr}
            </text>
          </g>
        );
      })}
      {candles.map((c, i) => {
        const x = sx(i), up = c.close >= c.open, col = up ? "#e03131" : "#1971c2";
        const bT = sy(Math.max(c.open, c.close)), bH = Math.max(1, sy(Math.min(c.open, c.close)) - bT);
        return <g key={i}><line x1={x} y1={sy(c.high)} x2={x} y2={sy(c.low)} stroke={col} strokeWidth="1" /><rect x={x - cw / 2} y={bT} width={cw} height={bH} fill={col} /></g>;
      })}
      {maPath(ma240, "#adb5bd")}{maPath(ma10, "#f97316")}{maPath(ma5, "#7048e8")}
      <line x1={PAD.l + W} y1={PAD.t} x2={PAD.l + W} y2={PAD.t + H} stroke="#dee2e6" />
    </svg>
  );
}

function VolumeChart({ candles, width = 700, height = 48, interval = "1wk", vol20Avg = 0, highlightLast = false }: { candles: Candle[]; width?: number; height?: number; interval?: string; vol20Avg?: number; highlightLast?: boolean; }) {
  if (!candles.length) return null;

  // B안: 바 차트 + 하단 게이지
  // 바 차트 영역 / 연도 레이블 / 하단 게이지 영역 분리
  const GAUGE_H  = highlightLast && vol20Avg > 0 ? 14 : 0; // 게이지 높이
  const LABEL_H  = 10; // 연도 레이블
  const PAD      = { l: 10, r: 66, t: 2, b: LABEL_H + GAUGE_H };
  const totalH   = height + GAUGE_H;
  const W        = width - PAD.l - PAD.r;
  const H        = totalH - PAD.t - PAD.b;
  const n        = candles.length;
  const maxV     = Math.max(...candles.map(c => c.vol), 1);
  const cw       = Math.max(2, (W / n) * 0.7);
  const sx       = (i: number) => PAD.l + (i / Math.max(n - 1, 1)) * W;

  const lastIdx   = n - 1;
  const lastVol   = candles[lastIdx]?.vol ?? 0;
  const lastRatio = vol20Avg > 0 ? lastVol / vol20Avg : 0;
  const lastPct   = Math.round(lastRatio * 100);
  const lastSurge = lastRatio >= 1.5;

  // 게이지 색상 (구간별)
  const gaugeColor = lastRatio >= 2.0 ? "#1971c2"
    : lastRatio >= 1.5 ? "#2f9e44"
    : lastRatio >= 1.0 ? "#f97316"
    : "#e03131";

  // 기준선 y좌표
  const avgLineY   = vol20Avg > 0 ? PAD.t + H - (vol20Avg / maxV) * H : null;
  const surgeLineY = vol20Avg > 0 ? PAD.t + H - (vol20Avg * 1.5 / maxV) * H : null;

  // 연도 레이블
  const yearLabels: { x: number; year: number }[] = [];
  let lastYear = -1;
  candles.forEach((c, i) => {
    const d = c.date, yr = d.getFullYear(), mo = d.getMonth();
    const isYearStart = interval === "1mo" ? mo === 0 : (mo === 0 && d.getDate() <= 14);
    if (isYearStart && yr !== lastYear) { yearLabels.push({ x: sx(i), year: yr }); lastYear = yr; }
  });

  // 게이지 y 시작 (바 + 연도 레이블 아래)
  const gaugeY = totalH - GAUGE_H + 1;
  // 게이지 내 마커 x = 0~250% 범위에서 선형 매핑
  const gaugeX    = (pct: number) => PAD.l + Math.min(pct / 250, 1) * W;
  const markerX   = gaugeX(lastPct);
  const surge150X = gaugeX(150);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${totalH}`} style={{ display: "block" }}>
      {/* ── 거래량 바 */}
      {candles.map((c, i) => {
        const x = sx(i), bH = (c.vol / maxV) * H;
        const isLast = highlightLast && i === lastIdx;
        const fill = isLast
          ? (lastSurge ? "#2f9e44bb" : lastRatio >= 1.0 ? "#f97316bb" : "#e03131bb")
          : (c.close >= c.open ? "#e0313144" : "#1971c244");
        return (
          <rect key={i} x={x - cw / 2} y={PAD.t + H - bH} width={cw} height={bH}
            fill={fill}
            stroke={isLast ? gaugeColor : "none"}
            strokeWidth={isLast ? 1 : 0}
          />
        );
      })}
      {/* 현재봉 % 텍스트 (바 위) */}
      {highlightLast && vol20Avg > 0 && (() => {
        const x   = sx(lastIdx);
        const bH  = (lastVol / maxV) * H;
        const lY  = PAD.t + H - bH - 2;
        return lY > PAD.t + 6
          ? <text x={x} y={lY} fontSize="7" fill={gaugeColor} textAnchor="middle" fontWeight="bold">{lastPct}%</text>
          : null;
      })()}
      {/* 평균 기준선 (회색 점선) */}
      {avgLineY !== null && avgLineY > PAD.t && avgLineY < PAD.t + H && (
        <line x1={PAD.l} y1={avgLineY} x2={PAD.l + W} y2={avgLineY} stroke="#adb5bd" strokeWidth="0.8" strokeDasharray="3 3" />
      )}
      {/* 150% 기준선 (보라 점선) */}
      {surgeLineY !== null && surgeLineY > PAD.t && surgeLineY < PAD.t + H && (
        <>
          <line x1={PAD.l} y1={surgeLineY} x2={PAD.l + W} y2={surgeLineY} stroke="#7048e8" strokeWidth="0.8" strokeDasharray="3 3" />
          <text x={PAD.l + W + 3} y={surgeLineY + 3} fontSize="7" fill="#7048e8">150%</text>
        </>
      )}
      {/* 연도 레이블 */}
      {yearLabels.map(({ x, year }) => (
        <g key={year}>
          <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + H} stroke="#dee2e6" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x={x + 2} y={PAD.t + H + LABEL_H - 2} fontSize="8" fill="#adb5bd">{year}</text>
        </g>
      ))}

      {/* ── B안: 하단 게이지 */}
      {highlightLast && vol20Avg > 0 && (
        <g>
          {/* 게이지 트랙 배경 (구간별 색) */}
          <rect x={PAD.l}           y={gaugeY}     width={Math.max(0,surge150X - PAD.l)} height={5} fill="#fca5a555" rx="2"/>
          <rect x={surge150X}       y={gaugeY}     width={Math.max(0,PAD.l + W - surge150X)} height={5} fill="#86efac55" rx="2"/>
          {/* 게이지 테두리 */}
          <rect x={PAD.l} y={gaugeY} width={W} height={5} fill="none" stroke="#dee2e6" strokeWidth="0.5" rx="2"/>
          {/* 150% 기준 수직선 */}
          <line x1={surge150X} y1={gaugeY - 1} x2={surge150X} y2={gaugeY + 6} stroke="#7048e8" strokeWidth="1.5"/>
          {/* 현재 위치 마커 */}
          <rect x={markerX - 1.5} y={gaugeY - 2} width={3} height={9} fill={gaugeColor} rx="1"/>
          {/* 구간 텍스트 */}
          <text x={PAD.l + 2}    y={gaugeY + 12} fontSize="7" fill="#e03131">~150%</text>
          <text x={surge150X + 3} y={gaugeY + 12} fontSize="7" fill="#2f9e44">150%↑ 돌파</text>
          {/* 현재 % 라벨 */}
          <text x={PAD.l + W + 3} y={gaugeY + 10} fontSize="8" fill={gaugeColor} fontWeight="bold">{lastPct}%</text>
        </g>
      )}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 서브 컴포넌트
// ══════════════════════════════════════════════════════════════════════════════
function TradeModal({ msg }: { msg: { type: string; qty: number; amount: string } | null }) {
  if (!msg) return null;
  const isBuy = msg.type === "매수";
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,.18)", border: `2px solid ${isBuy ? "#e03131" : "#1971c2"}`, padding: "28px 36px", textAlign: "center", minWidth: 240, animation: "fadeInScale .2s ease" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{isBuy ? "🛒" : "💸"}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: isBuy ? "#e03131" : "#1971c2", marginBottom: 6 }}>{msg.type} 체결</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#212529", marginBottom: 4 }}>{msg.qty.toLocaleString()}주</div>
        <div style={{ fontSize: 14, color: "#495057" }}>{msg.amount}</div>
      </div>
    </div>
  );
}

function ScoreModal({ data, onClose }: { data: TurnScore; onClose: () => void }) {
  if (!data) return null;
  const actionLabel = data.action === "buy" ? "매수" : data.action === "sell" ? "매도" : "관망";
  const actionColor = data.action === "buy" ? "#e03131" : data.action === "sell" ? "#1971c2" : "#868e96";
  const pct = Math.round((data.score / data.maxScore) * 100);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 12px 60px rgba(0,0,0,.2)", padding: "28px 28px 24px", width: "min(420px, 92vw)", animation: "fadeInScale .2s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#adb5bd", marginBottom: 4 }}>이번 턴 채점</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: actionColor, background: actionColor + "18", padding: "4px 14px", borderRadius: 20 }}>{actionLabel} 선택</span>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: "#495057" }}>점수</span>
            <span style={{ fontWeight: 800, color: pct >= 60 ? "#2f9e44" : pct >= 30 ? "#f97316" : "#e03131" }}>{data.score} / {data.maxScore}점</span>
          </div>
          <div style={{ height: 10, background: "#e9ecef", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 60 ? "#2f9e44" : pct >= 30 ? "#f97316" : "#e03131", borderRadius: 6, transition: "width .5s" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
          {data.reasons?.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "7px 12px", borderRadius: 8, background: r.ok === true ? "#f0fdf4" : r.ok === false ? "#fff5f5" : "#f8f9fa", border: `1px solid ${r.ok === true ? "#bbf7d0" : r.ok === false ? "#fca5a5" : "#e9ecef"}` }}>
              <span>{r.ok === true ? "✅" : r.ok === false ? "❌" : "ℹ️"}</span>
              <span style={{ color: r.ok === true ? "#166534" : r.ok === false ? "#991b1b" : "#6b7280" }}>{r.text}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 14px", background: "#f8f9fa", borderRadius: 10, fontSize: 12, color: "#495057", lineHeight: 1.7, marginBottom: 16 }}>
          {data.diagnosis?.buyReason && <div>💬 {data.diagnosis.buyReason}</div>}
          {data.diagnosis?.risk && <div style={{ color: "#c2410c", marginTop: 4 }}>{data.diagnosis.risk}</div>}
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#212529", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>확인</button>
      </div>
    </div>
  );
}

function ResultReport({ trades, turnScores, totalAsset, initCash, stockMeta, market, interval, startDate, endDate, allCandles, gameStart, isQQQ: isQQQProp, onClose, onRestart }: {
  trades: Trade[]; turnScores: TurnScore[]; totalAsset: number; initCash: number;
  stockMeta: StockMeta | null; market: string; interval: string;
  startDate: Date | undefined; endDate: Date | undefined;
  allCandles: Candle[]; gameStart: number; isQQQ: boolean;
  onClose: () => void; onRestart: () => void;
}) {
  const [selectedTurn, setSelectedTurn] = React.useState<number | null>(null);
  const [showSim,      setShowSim]      = React.useState(false);

  // ③ 핵심 실수 3턴 자동 선별 (점수 낮은 순, 채점된 턴만)
  const worstTurns = React.useMemo(() => {
    return turnScores
      .map((ts, i) => ({ i, ts }))
      .filter(({ ts }) => ts.maxScore > 0 && ts.score / ts.maxScore < 0.5)
      .sort((a, b) => (a.ts.score / a.ts.maxScore) - (b.ts.score / b.ts.maxScore))
      .slice(0, 3);
  }, [turnScores]);

  // ① 최선의 행동 도출 함수
  const getBestAction = (ts: TurnScore): { action: string; reason: string } => {
    const reasons = (ts as TurnScore & { reasons?: Reason[] }).reasons ?? [];
    const diag = (ts as TurnScore & { diagnosis?: Diagnosis | null }).diagnosis;
    const hasBadBuy = reasons.some(r => r.ok === false && r.text.includes("매수"));
    const hasBadSell = reasons.some(r => r.ok === false && r.text.includes("매도"));
    const isHold = ts.action === "hold";

    if (hasBadBuy) {
      const isBelow10 = reasons.some(r => r.text.includes("10MA 아래 매수"));
      const isLowVol  = reasons.some(r => r.text.includes("거래량 미확인"));
      const isMassive = reasons.some(r => r.text.includes("대량 매도 출현"));
      if (isMassive) return { action: "관망", reason: "대량 음봉 출현 — 세력 이탈 신호" };
      if (isBelow10) return { action: "관망", reason: "10MA 회복 확인 후 재진입 대기" };
      if (isLowVol)  return { action: "관망", reason: "거래량 150% 이상 확인 후 매수" };
      return { action: "관망", reason: diag?.suggestion ?? "추세 확인 후 진입" };
    }
    if (hasBadSell) {
      return { action: "보유", reason: "5MA·10MA 위 상승 추세 — 비중 유지" };
    }
    if (isHold) {
      const isMissed = reasons.some(r => r.text.includes("미보유 관망"));
      if (isMissed) return { action: "매수", reason: diag?.buyReason ?? "상승 추세 매수 기회" };
    }
    return { action: "현재 행동", reason: "최선의 선택이었습니다" };
  };

  const pnl = ((totalAsset / initCash) - 1) * 100;
  // maxScore > 0인 턴만 채점 (보유 중 관망 제외)
  const scoredTurns   = turnScores.filter(t => t.maxScore > 0);
  const avgTurnScore  = scoredTurns.length ? Math.round(scoredTurns.reduce((s, t) => s + t.score, 0) / scoredTurns.length) : 0;
  const totalMaxScore = scoredTurns.reduce((s, t) => s + t.maxScore, 0);
  const totalGained   = scoredTurns.reduce((s, t) => s + t.score, 0);
  const followScore   = totalMaxScore > 0 ? Math.round((totalGained / totalMaxScore) * 100) : 0;
  const iLabel = interval === "1wk" ? "주봉" : "월봉";

  // ── 손익비(R) 계산
  const buyTrades  = trades.filter(t => t.type === "매수");
  const sellTrades = trades.filter(t => t.type === "매도");

  // 매수→매도 페어로 수익/손실 계산
  const tradePnls: number[] = [];
  let pendingBuys: { qty: number; krwPrice: number }[] = [];
  trades.forEach(t => {
    if (t.type === "매수") {
      pendingBuys.push({ qty: t.qty, krwPrice: t.krwPrice });
    } else {
      // 선입선출로 매수 비용 계산
      let remainQty = t.qty;
      let costKrw = 0;
      const newPending: typeof pendingBuys = [];
      for (const b of pendingBuys) {
        if (remainQty <= 0) { newPending.push(b); continue; }
        const used = Math.min(b.qty, remainQty);
        costKrw += used * b.krwPrice;
        remainQty -= used;
        if (b.qty > used) newPending.push({ qty: b.qty - used, krwPrice: b.krwPrice });
      }
      pendingBuys = newPending;
      if (costKrw > 0) {
        const pnlAmt = (t.krwPrice - costKrw / t.qty) * t.qty;
        tradePnls.push(pnlAmt);
      }
    }
  });

  // 남은 보유분은 최종 자산에서 평가
  const holdingCost = pendingBuys.reduce((s, b) => s + b.qty * b.krwPrice, 0);
  if (holdingCost > 0) {
    const holdingValue = totalAsset - (initCash - trades.filter(t=>t.type==="매수").reduce((s,t)=>s+t.qty*t.krwPrice,0) + trades.filter(t=>t.type==="매도").reduce((s,t)=>s+t.qty*t.krwPrice,0));
    if (holdingValue > 0) tradePnls.push(holdingValue - holdingCost);
  }

  const wins  = tradePnls.filter(p => p > 0);
  const losses = tradePnls.filter(p => p < 0);
  const avgWin  = wins.length  ? wins.reduce((s,p)=>s+p,0)  / wins.length  : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s,p)=>s+p,0) / losses.length) : 0;
  const rMultiple = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99 : 0;
  const winRate   = tradePnls.length > 0 ? wins.length / tradePnls.length : 0;
  const expectancy = tradePnls.length > 0
    ? tradePnls.reduce((s,p)=>s+p,0) / tradePnls.length
    : 0;
  const MAX_TURNS = turnScores.length;

  // ── A안: 채점 근거 기반 goodPoints/badPoints ──────────────────
  const goodPoints: string[] = [], badPoints: string[] = [];
  const badWithTurns: { text: string; turns: number[] }[] = [];

  // 턴별 문제점 집계
  const badTurnMap: Record<string, number[]> = {};
  const addBad = (key: string, turn: number) => {
    if (!badTurnMap[key]) badTurnMap[key] = [];
    badTurnMap[key].push(turn);
  };

  trades.filter(t => t.type === "매수").forEach(t => {
    const snap = t.snap as Record<string, unknown>;
    if (snap?.ma240 != null) {
      if (snap?.above240) goodPoints.push("240MA 위에서 매수");
      else addBad("240MA 아래 매수 — 원칙 위반", t.turn + 1);
    }
    if (snap?.goldenCross) {
      if (snap?.volSurge) goodPoints.push("거래량 확인 골든크로스 매수");
      else { goodPoints.push("골든크로스 타점 매수"); addBad("거래량 미확인 돌파 — 신뢰도 낮음", t.turn + 1); }
    }
    if (!snap?.above10) addBad("10MA 아래 매수 — 조기 진입", t.turn + 1);
    if (snap?.volMassiveSell) addBad("대량 매도 출현 중 매수", t.turn + 1);
  });

  trades.filter(t => t.type === "매도").forEach(t => {
    const snap = t.snap as Record<string, unknown>;
    if (!snap?.above10)              goodPoints.push("10MA 이탈 후 즉시 매도");
    else if (snap?.above5 === false) goodPoints.push("5MA 이탈 절반 매도 — 추세추종 전략");
    else if (snap?.above5 === true && !snap?.upperTailSignal)  addBad("5MA·10MA 위에서 매도 — 추세 중 조기 청산", t.turn + 1);
    if (snap?.deadCross)             goodPoints.push("데드크로스 매도 타이밍");
    if (snap?.volMassiveSell)        goodPoints.push("대량 매도 출현 후 매도");
  });

  // 관망 문제 집계 (보유 주식 있는 턴은 "상승 추세 중 관망" 제외)
  // 턴별 보유 수량 계산
  const holdingsAtTurn: Record<number, number> = {};
  let runningHoldings = 0;
  for (let i = 0; i < (turnScores.length || 50); i++) {
    const trade = trades.find(t => t.turn === i);
    if (trade) {
      runningHoldings = trade.type === "매수"
        ? runningHoldings + trade.qty
        : Math.max(0, runningHoldings - trade.qty);
    }
    holdingsAtTurn[i] = runningHoldings;
  }

  turnScores.forEach((ts, i) => {
    const r = (ts as TurnScore & { reasons?: Reason[] }).reasons ?? [];
    r.filter(r => r.ok === false).forEach(r => {
      if (r.text.includes("관망")) {
        // 상승 추세 중 관망 제외 조건:
        // 1. 이미 주식 보유 중
        // 2. 해당 턴의 snap에서 10MA 아래 (상승 추세 아님)
        if (r.text.includes("상승 추세")) {
          // 보유 중이면 제외
          if (holdingsAtTurn[i] > 0) return;
          // 10MA 아래면 제외
          if (ts.above10 === false) return;
          // 5MA 아래면 제외 (단기 추세 이탈)
          if (ts.above5 === false) return;
          // 과열 구간 (10MA 이격 +10% 초과)이면 제외
          if (ts.overheat10 === true) return;
          // 대량 매도 출현이면 제외
          if (ts.volMassiveSell === true) return;
          // 데드크로스 발생이면 제외
          if (ts.deadCross === true) return;
          // 윗꼬리 캔들이면 제외 (매도 압력)
          if (ts.candleUpperTail === true) return;
        }
        addBad(r.text.replace(/ \(\+\d+.*\)/, ''), i + 1);
      }
    });
  });

  Object.entries(badTurnMap).forEach(([text, turns]) => {
    badWithTurns.push({ text, turns });
    badPoints.push(text);
  });

  const dedupGood = [...new Set(goodPoints)];

  // ── 턴 색상 계산 ──────────────────────────────────────────────
  const turnColor = (i: number) => {
    const ts = turnScores[i];
    if (!ts) return "#f8f9fa";
    const pct = ts.maxScore > 0 ? ts.score / ts.maxScore : 0;
    if (pct >= 0.6) return "#f0fdf4";
    if (pct <= 0.2) return "#fff5f5";
    return "#f8f9fa";
  };
  const turnBorder = (i: number) => {
    const ts = turnScores[i];
    if (!ts) return "0.5px solid #dee2e6";
    const pct = ts.maxScore > 0 ? ts.score / ts.maxScore : 0;
    if (pct >= 0.6) return "0.5px solid #86efac";
    if (pct <= 0.2) return "1.5px solid #fca5a5";
    return "0.5px solid #dee2e6";
  };

  // ── C안: 선택 턴 미니 차트 데이터 ────────────────────────────
  const getMiniChartData = (turn: number) => {
    const idx = gameStart + turn;
    const start = Math.max(0, idx - 35);
    const candles = allCandles.slice(start, idx);
    const ma5: (number|null)[]  = candles.map((_, i) => i < 4  ? null : candles.slice(i-4,  i+1).reduce((s,c)=>s+c.close,0)/5);
    const ma10: (number|null)[] = candles.map((_, i) => i < 9  ? null : candles.slice(i-9,  i+1).reduce((s,c)=>s+c.close,0)/10);
    const ma240: (number|null)[]= candles.map((_, i) => i < 239? null : candles.slice(i-239,i+1).reduce((s,c)=>s+c.close,0)/240);
    // 20봉 평균 거래량 계산
    const volSlice = candles.slice(-21, -1);
    const miniVol20Avg = volSlice.length > 0 ? volSlice.reduce((s,c)=>s+c.vol,0)/volSlice.length : 0;
    return { candles, ma5, ma10, ma240, miniVol20Avg };
  };

  const selectedData = selectedTurn !== null ? getMiniChartData(selectedTurn) : null;
  const selectedTurnScore = selectedTurn !== null ? turnScores[selectedTurn] : null;
  const selectedTrade = selectedTurn !== null ? trades.find(t => t.turn === selectedTurn) : null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", boxShadow: "0 -4px 40px rgba(0,0,0,.2)", width: "min(480px, 100vw)", height: "92dvh", display: "flex", flexDirection: "column", animation: "fadeInScale .2s ease" }}>
        <div style={{ background: "#f8f9fa", padding: "20px 24px 16px", borderBottom: "1px solid #e9ecef", borderRadius: "20px 20px 0 0", textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#212529", marginBottom: 4, fontWeight: 600 }}>{market === "CUSTOM" ? "검색" : market} · {stockMeta?.name} · {iLabel}</div>
          <div style={{ fontSize: 11, color: "#495057", marginBottom: 12 }}>{fmtDate(startDate)} ~ {fmtDate(endDate)}</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: pnl >= 0 ? "#e03131" : "#1971c2" }}>{fmtPct(pnl)}</div>
          <div style={{ fontSize: 14, color: "#495057", marginTop: 4 }}>{fmtKRW(totalAsset)}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
          {/* 기본 지표 2개 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {([
              ["수익금", ((totalAsset - initCash) >= 0 ? "+" : "") + fmtKRW(totalAsset - initCash), (totalAsset - initCash) >= 0 ? "#2f9e44" : "#e03131"],
              ["총 거래", trades.length + "회", "#212529"],
              ["추세추종 점수", followScore + "점 / 100점", followScore >= 70 ? "#2f9e44" : followScore >= 40 ? "#f97316" : "#e03131"],
              ["평균 판단 점수", avgTurnScore + "점", "#212529"],
            ] as const).map(([k, v, col]) => (
              <div key={k} style={{ background: "#f8f9fa", borderRadius: 10, padding: "10px 12px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: 10, color: "#adb5bd" }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: col }}>{v}</div>
              </div>
            ))}
          </div>

          {/* 손익비 섹션 */}
          {tradePnls.length > 0 && (() => {
            const isPositive = expectancy >= 0;
            const accentClr  = isPositive ? "#2f9e44" : "#e03131";
            const accentBg   = isPositive ? "#f0fdf4" : "#fff5f5";
            const accentBdr  = isPositive ? "#bbf7d0" : "#fca5a5";
            const winRatePct = Math.round(winRate * 100);
            const losRatePct = 100 - winRatePct;
            // 손익비 게이지 (3배 목표)
            const rrPct = Math.min(rMultiple / 3 * 100, 100);
            const rrClr = rMultiple >= 3 ? "#2f9e44" : rMultiple >= 1.5 ? "#f97316" : "#e03131";
            // 케이스별 인사이트
            const neededWinRate = rMultiple > 0 ? Math.round(1 / (1 + rMultiple) * 100) : 100;
            const insightBg  = rMultiple >= 2 ? "#f0fdf4" : rMultiple >= 1 ? "#fff7ed" : "#fff5f5";
            const insightClr = rMultiple >= 2 ? "#166534" : rMultiple >= 1 ? "#854f0b" : "#991b1b";
            const insightBdr = rMultiple >= 2 ? "#bbf7d0" : rMultiple >= 1 ? "#fed7aa" : "#fca5a5";
            const insightMsg =
              // 수익 거래 0회 (손익비 계산 불가)
              wins.length === 0 && losses.length === 0
              ? "📊 거래 없음 — 아직 매매 기록이 없습니다"
              : wins.length === 0
              ? `❌ 수익 거래 없음 — 아직 한 번도 수익을 실현하지 못했습니다\n10MA 초입 구간 진입 후 추세가 살아있는 동안 보유를 유지하는 연습이 필요합니다`
              // 정상 케이스
              : rMultiple >= 3
              ? `✅ 손익비 ${rMultiple.toFixed(1)}배 + 승률 ${winRatePct}%로 전략이 유효합니다\n수익은 길게, 손실은 짧게 원칙 실천 중`
              : rMultiple >= 1.5
              ? `⚠️ 손익비 ${rMultiple.toFixed(1)}배 — 좋은 방향입니다. 목표는 3배 이상\n손익비 ${rMultiple.toFixed(1)}배를 유지하려면 승률이 최소 ${neededWinRate}% 이상 필요`
              : rMultiple >= 1
              ? `⚠️ 손익비 ${rMultiple.toFixed(1)}배 — 아직 부족합니다. 수익을 더 길게 유지하세요\n손익비 ${rMultiple.toFixed(1)}배를 유지하려면 승률이 최소 ${neededWinRate}% 이상 필요`
              : losses.length === 0
              ? "📊 손절 없음 — 아직 확인된 손실 거래 없음"
              // 손익비 1배 미만 (손실 > 수익)
              : `❌ 손익비 ${rMultiple.toFixed(1)}배 — 손실이 수익보다 큽니다\n수익은 더 길게 보유하고, 손절은 더 빠르게 실천하세요`;

            return (
              <div style={{ background: "#f8f9fa", borderRadius: 12, border: "1px solid #e9ecef", padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#212529", marginBottom: 10 }}>📐 손익비 분석</div>

                {/* ① 기대값 — 전체 너비 */}
                <div style={{ background: accentBg, borderRadius: 10, border: `1px solid ${accentBdr}`, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: accentClr, opacity: 0.75, marginBottom: 2 }}>거래당 기대값</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: accentClr, lineHeight: 1.1, marginBottom: 3 }}>
                    {expectancy >= 0 ? "+" : ""}{fmtKRW(Math.round(Math.abs(expectancy)))}
                  </div>
                  <div style={{ fontSize: 10, color: accentClr, opacity: 0.8 }}>
                    {trades.filter(t => t.type === "매수").length}회 거래 기준 · 이 전략은 평균적으로 {isPositive ? "수익" : "손해"}
                  </div>
                </div>

                {/* ② 손익비 + 승률 나란히 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  {/* 손익비 */}
                  <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e9ecef" }}>
                    <div style={{ fontSize: 10, color: "#adb5bd", marginBottom: 2 }}>손익비</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: rrClr, lineHeight: 1.1 }}>
                      {rMultiple >= 99 ? "∞" : rMultiple.toFixed(1) + "배"}
                    </div>
                    <div style={{ position: "relative", height: 5, background: "#e9ecef", borderRadius: 3, marginTop: 6 }}>
                      <div style={{ width: `${rrPct}%`, height: "100%", background: rrClr, borderRadius: 3, transition: "width .4s" }} />
                      <div style={{ position: "absolute", right: 0, top: -3, bottom: -3, width: 2, background: "#2f9e44", borderRadius: 1 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginTop: 2 }}>
                      <span style={{ color: "#adb5bd" }}>평균수익/평균손실</span>
                      <span style={{ color: "#2f9e44", fontWeight: 600 }}>목표 3배</span>
                    </div>
                  </div>

                  {/* 승률 */}
                  <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e9ecef" }}>
                    <div style={{ fontSize: 10, color: "#adb5bd", marginBottom: 2 }}>승률</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: winRatePct >= 50 ? "#2f9e44" : "#e03131", lineHeight: 1.1 }}>
                      {winRatePct}%
                    </div>
                    <div style={{ position: "relative", height: 5, background: "#e9ecef", borderRadius: 3, marginTop: 6 }}>
                      <div style={{ width: `${winRatePct}%`, height: "100%", background: winRatePct >= 50 ? "#2f9e44" : "#e03131", borderRadius: 3, transition: "width .4s" }} />
                    </div>
                    <div style={{ fontSize: 9, color: "#adb5bd", marginTop: 2 }}>
                      {wins.length}승 {losses.length}패 / {wins.length + losses.length}회
                    </div>
                  </div>
                </div>

                {/* ③ 평균 수익 + 평균 손실 나란히 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e9ecef" }}>
                    <div style={{ fontSize: 10, color: "#adb5bd", marginBottom: 2 }}>평균 수익 ({wins.length}회)</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#2f9e44" }}>
                      {wins.length > 0 ? "+" + fmtKRW(Math.round(avgWin)) : "—"}
                    </div>
                  </div>
                  <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e9ecef" }}>
                    <div style={{ fontSize: 10, color: "#adb5bd", marginBottom: 2 }}>평균 손실 ({losses.length}회)</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e03131" }}>
                      {losses.length > 0 ? "-" + fmtKRW(Math.round(avgLoss)) : "—"}
                    </div>
                  </div>
                </div>

                {/* ④ 인사이트 */}
                <div style={{ background: insightBg, borderRadius: 8, padding: "9px 12px", fontSize: 11, lineHeight: 1.7, color: insightClr, border: `1px solid ${insightBdr}`, whiteSpace: "pre-line" }}>
                  {insightMsg}
                </div>
              </div>
            );
          })()}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "#495057", fontWeight: 600 }}>📊 추세추종 원칙 준수율</span>
              <span style={{ fontWeight: 800, color: followScore >= 70 ? "#2f9e44" : followScore >= 40 ? "#f97316" : "#e03131" }}>{followScore}%</span>
            </div>
            <div style={{ height: 10, background: "#e9ecef", borderRadius: 6 }}>
              <div style={{ width: `${followScore}%`, height: "100%", background: followScore >= 70 ? "#2f9e44" : followScore >= 40 ? "#f97316" : "#e03131", borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: 11, color: "#adb5bd", marginTop: 4 }}>{followScore >= 80 ? "🏆 추세추종 원칙을 잘 지켰습니다!" : followScore >= 50 ? "📈 절반 이상 원칙을 지켰어요. 더 연습해보세요" : "📚 원칙 학습이 더 필요합니다. 진단 패널을 참고하세요"}</div>
          </div>
          {/* A안: 잘한 것 */}
          {dedupGood.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 8 }}>✅ 잘한 것</div>
              {dedupGood.map((g, i) => (
                <div key={i} style={{ fontSize: 12, padding: "7px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 5, color: "#166534" }}>· {g}</div>
              ))}
            </div>
          )}

          {/* A안: 아쉬운 것 (채점 근거 기반 + 턴 표시) */}
          {badWithTurns.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>❌ 아쉬운 것</div>
              {badWithTurns.map((b, i) => (
                <div key={i} style={{ padding: "8px 12px", background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: "#991b1b", marginBottom: b.turns.length > 0 ? 4 : 0 }}>· {b.text}{b.turns.length > 1 ? ` (${b.turns.length}회)` : ""}</div>
                  {b.turns.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {b.turns.map(t => (
                        <button key={t} onClick={() => setSelectedTurn(selectedTurn === t - 1 ? null : t - 1)} style={{
                          padding: "2px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                          background: selectedTurn === t - 1 ? "#e03131" : "#fff",
                          color: selectedTurn === t - 1 ? "#fff" : "#991b1b",
                          border: "1px solid #fca5a5", fontFamily: "inherit",
                        }}>{t}턴</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* A안: 아쉬운 것이 없을 때 */}
          {badWithTurns.length === 0 && dedupGood.length > 0 && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: 12, color: "#166534" }}>
              🏆 이번 게임에서 원칙 위반 없이 매매했습니다!
            </div>
          )}

          {/* ③ 핵심 실수 3턴 자동 선별 */}
          {worstTurns.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#212529", marginBottom: 8 }}>⚠️ 이번 게임 핵심 복기</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {worstTurns.map(({ i, ts }) => {
                  const trade = trades.find(t => t.turn === i);
                  const reasons = (ts as TurnScore & { reasons?: Reason[] }).reasons ?? [];
                  const topBad = reasons.find(r => r.ok === false);
                  const pct = ts.maxScore > 0 ? Math.round(ts.score / ts.maxScore * 100) : 0;
                  const best = getBestAction(ts);
                  return (
                    <button key={i} onClick={() => setSelectedTurn(selectedTurn === i ? null : i)} style={{
                      textAlign: "left", background: "#fff", border: "1px solid #fca5a5",
                      borderLeft: "3px solid #e03131", borderRadius: "0 8px 8px 0",
                      padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", width: "100%",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#212529" }}>
                          {i + 1}턴 {trade ? (trade.type === "매수" ? "▲ 매수" : "▼ 매도") : "관망"}
                          {allCandles[gameStart + i]?.date ? ` — ${fmtDate(allCandles[gameStart + i].date)}` : ""}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#e03131" }}>{pct}%</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#991b1b", marginBottom: 3 }}>
                        {topBad?.text ?? "원칙 미준수"}
                      </div>
                      <div style={{ fontSize: 10, color: "#2f9e44" }}>
                        → 최선: {best.action} — {best.reason}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* C안: 턴별 복기 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#212529", marginBottom: 8 }}>🔍 턴별 복기</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              {Array.from({ length: MAX_TURNS }, (_, i) => {
                const hasTrade = trades.some(t => t.turn === i);
                const ts = turnScores[i];
                const pct = ts && ts.maxScore > 0 ? ts.score / ts.maxScore : 0.5;
                return (
                  <button key={i} onClick={() => setSelectedTurn(selectedTurn === i ? null : i)} style={{
                    width: 28, height: 28, borderRadius: 6, border: selectedTurn === i ? "2px solid #7048e8" : turnBorder(i),
                    background: selectedTurn === i ? "#f3f0ff" : turnColor(i),
                    fontSize: 10, fontWeight: hasTrade ? 700 : 400,
                    color: selectedTurn === i ? "#7048e8" : pct >= 0.6 ? "#166534" : pct <= 0.2 ? "#991b1b" : "#868e96",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
                    position: "relative",
                  }}>
                    {hasTrade ? (trades.find(t=>t.turn===i)?.type === "매수" ? "▲" : "▼") : i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#868e96", marginBottom: 10 }}>
              <span style={{ display:"flex",alignItems:"center",gap:3 }}><span style={{ width:10,height:10,borderRadius:3,background:"#f0fdf4",border:"0.5px solid #86efac",display:"inline-block" }}></span>좋은 판단</span>
              <span style={{ display:"flex",alignItems:"center",gap:3 }}><span style={{ width:10,height:10,borderRadius:3,background:"#fff5f5",border:"1.5px solid #fca5a5",display:"inline-block" }}></span>개선 필요</span>
              <span style={{ display:"flex",alignItems:"center",gap:3 }}><span style={{ width:10,height:10,borderRadius:3,background:"#f8f9fa",border:"0.5px solid #dee2e6",display:"inline-block" }}></span>중립</span>
              <span style={{ display:"flex",alignItems:"center",gap:3 }}>▲▼ 거래 발생</span>
            </div>

            {/* C안: 선택 턴 상세 (미니 차트 + 채점) */}
            {selectedTurn !== null && selectedData && (
              <div style={{ border: "1px solid #dee2e6", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                {/* 미니 차트 */}
                <div style={{ background: "#fff", borderBottom: "1px solid #e9ecef" }}>
                  <div style={{ padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, borderBottom: "0.5px solid #e9ecef" }}>
                    <span style={{ fontWeight: 700, color: "#212529" }}>{selectedTurn + 1}턴 — {allCandles[gameStart + selectedTurn]?.date ? fmtDate(allCandles[gameStart + selectedTurn].date) : ""}</span>
                    {selectedTrade && (
                      <span style={{ fontWeight: 700, color: selectedTrade.type === "매수" ? "#e03131" : "#1971c2", background: selectedTrade.type === "매수" ? "#fff5f5" : "#e7f5ff", padding: "2px 8px", borderRadius: 5, border: `1px solid ${selectedTrade.type === "매수" ? "#fca5a5" : "#74c0fc"}` }}>
                        {selectedTrade.type} {selectedTrade.qty}주
                      </span>
                    )}
                  </div>
                  {(() => {
                    const { candles, ma5, ma10, ma240 } = selectedData;
                    if (!candles.length) return null;
                    const W = 440, H = 140, PAD = { l:8, r:48, t:6, b:6 };
                    const cw = Math.max(2, (W - PAD.l - PAD.r) / Math.max(candles.length-1,1) * 0.7);
                    const allP = candles.flatMap(c=>[c.high,c.low]);
                    const maV = [...ma5,...ma10,...ma240].filter((v): v is number => v!=null);
                    const minP = Math.min(...allP,...maV)*0.997, maxP = Math.max(...allP,...maV)*1.003;
                    const sx = (i:number) => PAD.l + (i/Math.max(candles.length-1,1))*(W-PAD.l-PAD.r);
                    const sy = (p:number) => PAD.t + (H-PAD.t-PAD.b) - ((p-minP)/(maxP-minP))*(H-PAD.t-PAD.b);
                    const maPath = (vals:(number|null)[], col:string) => {
                      const pts = vals.map((v,i)=>v!=null?`${sx(i)},${sy(v)}`:null).filter(Boolean);
                      return pts.length ? <polyline key={col} points={pts.join(" ")} fill="none" stroke={col} strokeWidth="1.2" strokeOpacity="0.9"/> : null;
                    };
                    const lbls = [0,0.25,0.5,0.75,1].map(r => {
                      const p = minP + (maxP-minP)*r;
                      return { y: sy(p), label: isQQQProp ? `$${p.toFixed(1)}` : Math.round(p).toLocaleString() };
                    });
                    return (
                      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}>
                        {lbls.map((l,i) => (
                          <g key={i}>
                            <line x1={PAD.l} y1={l.y} x2={W-PAD.r} y2={l.y} stroke="#e9ecef" strokeWidth="0.5"/>
                            <text x={W-PAD.r+3} y={l.y+3} fontSize="8" fill="#adb5bd">{l.label}</text>
                          </g>
                        ))}
                        {candles.map((c,i) => {
                          const x=sx(i), up=c.close>=c.open, col=up?"#e03131":"#1971c2";
                          const bT=sy(Math.max(c.open,c.close)), bH=Math.max(1,sy(Math.min(c.open,c.close))-bT);
                          return <g key={i}><line x1={x} y1={sy(c.high)} x2={x} y2={sy(c.low)} stroke={col} strokeWidth="0.8"/><rect x={x-cw/2} y={bT} width={cw} height={bH} fill={col}/></g>;
                        })}
                        {maPath(ma240,"#adb5bd")}{maPath(ma10,"#f97316")}{maPath(ma5,"#7048e8")}
                        {/* 거래 마커 */}
                        {selectedTrade && (() => {
                          const li = candles.length - 1;
                          const x = sx(li), y = sy(candles[li]?.close ?? 0);
                          return selectedTrade.type === "매수"
                            ? <polygon points={`${x},${y-14} ${x-7},${y} ${x+7},${y}`} fill="#e03131" opacity="0.9"/>
                            : <polygon points={`${x},${y+14} ${x-7},${y} ${x+7},${y}`} fill="#1971c2" opacity="0.9"/>;
                        })()}
                      </svg>
                    );
                  })()}
                </div>
                {/* 채점 상세 */}
                <div style={{ padding: "10px 12px", background: "#fafafa" }}>
                  {selectedTurnScore && (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                        <span style={{ color:"#495057" }}>점수</span>
                        <span style={{ fontWeight:700, color: selectedTurnScore.score/selectedTurnScore.maxScore >= 0.6 ? "#2f9e44" : selectedTurnScore.score/selectedTurnScore.maxScore <= 0.2 ? "#e03131" : "#f97316" }}>
                          {selectedTurnScore.score} / {selectedTurnScore.maxScore}점
                        </span>
                      </div>
                      <div style={{ height:5, background:"#e9ecef", borderRadius:3, marginBottom:8 }}>
                        <div style={{ width:`${Math.min(selectedTurnScore.maxScore>0?selectedTurnScore.score/selectedTurnScore.maxScore*100:0,100)}%`, height:"100%", background: selectedTurnScore.score/selectedTurnScore.maxScore >= 0.6 ? "#2f9e44" : "#e03131", borderRadius:3 }}/>
                      </div>
                      {((selectedTurnScore as TurnScore & { reasons?: Reason[] }).reasons ?? []).map((r,i) => (
                        <div key={i} style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,padding:"5px 8px",borderRadius:6,marginBottom:4,
                          background: r.ok===true?"#f0fdf4":r.ok===false?"#fff5f5":"#f8f9fa",
                          border: `0.5px solid ${r.ok===true?"#86efac":r.ok===false?"#fca5a5":"#dee2e6"}`,
                          color: r.ok===true?"#166534":r.ok===false?"#991b1b":"#6b7280",
                        }}>
                          <span>{r.ok===true?"✅":r.ok===false?"❌":"ℹ️"}</span>
                          <span>{r.text}</span>
                        </div>
                      ))}
                      {((selectedTurnScore as TurnScore & { diagnosis?: Diagnosis | null }).diagnosis)?.buyReason && (
                        <div style={{ marginTop:6, padding:"6px 10px", background:"#f3f0ff", borderRadius:8, fontSize:11, color:"#7048e8", lineHeight:1.6 }}>
                          💬 {(selectedTurnScore as TurnScore & { diagnosis?: Diagnosis | null }).diagnosis?.buyReason}
                        </div>
                      )}

                      {/* ① 최선의 행동 vs 실제 행동 비교 */}
                      {(() => {
                        const best = getBestAction(selectedTurnScore);
                        const actionLabel = selectedTurnScore.action === "buy" ? "매수" : selectedTurnScore.action === "sell" ? "매도" : "관망";
                        const isGood = best.action === "현재 행동" || best.action === actionLabel;
                        if (isGood) return (
                          <div style={{ marginTop:8, padding:"7px 10px", background:"#f0fdf4", borderRadius:8, fontSize:11, color:"#166534", lineHeight:1.6 }}>
                            ✅ 최선의 행동 — {best.reason}
                          </div>
                        );
                        return (
                          <div style={{ marginTop:8, display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                            <div style={{ padding:"8px 10px", background:"#fff5f5", border:"0.5px solid #fca5a5", borderRadius:8 }}>
                              <div style={{ fontSize:9, color:"#e03131", marginBottom:2 }}>내 행동</div>
                              <div style={{ fontSize:13, fontWeight:700, color:"#e03131" }}>{actionLabel}</div>
                            </div>
                            <div style={{ padding:"8px 10px", background:"#f0fdf4", border:"0.5px solid #86efac", borderRadius:8 }}>
                              <div style={{ fontSize:9, color:"#2f9e44", marginBottom:2 }}>최선의 행동</div>
                              <div style={{ fontSize:13, fontWeight:700, color:"#2f9e44" }}>{best.action}</div>
                            </div>
                            <div style={{ gridColumn:"1/3", padding:"7px 10px", background:"#f8f9fa", borderRadius:8, fontSize:10, color:"#495057", lineHeight:1.6 }}>
                              💡 {best.reason}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 📊 누적 통계 패널 */}
          {(() => {
            const stats = loadStats();
            if (stats.totalGames < 1) return null;
            const avgPnl  = stats.totalPnl / stats.totalGames;
            const winRate = Math.round((stats.winGames / stats.totalGames) * 100);
            const patterns = Object.entries(stats.entryPatterns).sort((a, b) => b[1].count - a[1].count);
            const pClr: Record<string, string> = { "골든크로스":"#2f9e44","눌림목진입":"#2f9e44","10MA위진입":"#7048e8","과열구간진입":"#e03131","10MA아래진입":"#e03131" };
            const worst = [...patterns].filter(([,v])=>v.count>=2).sort(([,a],[,b])=>(a.wins/a.count)-(b.wins/b.count))[0];
            return (
              <div style={{ marginBottom: 16, background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#4338ca", marginBottom: 10 }}>
                  📊 나만의 매매 통계
                  <span style={{ fontSize: 10, fontWeight: 400, color: "#6366f1", marginLeft: 6 }}>({stats.totalGames}게임 누적)</span>
                </div>
                {/* 요약 카드 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 12 }}>
                  {[
                    { label:"평균 수익률", value:`${avgPnl>=0?"+":""}${avgPnl.toFixed(1)}%`, color: avgPnl>=0?"#e03131":"#1971c2" },
                    { label:"승률",        value:`${winRate}%`,  color:"#7048e8" },
                    { label:"총 게임",     value:`${stats.totalGames}회`, color:"#495057" },
                  ].map(c => (
                    <div key={c.label} style={{ background:"#fff", borderRadius:8, border:"1px solid #e0e7ff", padding:"8px 10px", textAlign:"center" }}>
                      <div style={{ fontSize:9, color:"#adb5bd", marginBottom:2 }}>{c.label}</div>
                      <div style={{ fontSize:15, fontWeight:800, color:c.color }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                {/* 진입 패턴별 승률 바 */}
                {patterns.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color:"#212529", marginBottom: 8 }}>진입 패턴별 승률</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom: worst ? 10 : 0 }}>
                      {patterns.map(([key, val]) => {
                        const wr = val.count > 0 ? Math.round(val.wins / val.count * 100) : 0;
                        const bc = pClr[key] ?? "#868e96";
                        return (
                          <div key={key} style={{ display:"grid", gridTemplateColumns:"90px 1fr 42px", alignItems:"center", gap:8 }}>
                            <div style={{ fontSize:11, color:"#495057", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{key}</div>
                            <div style={{ background:"#e9ecef", borderRadius:99, height:8, overflow:"hidden" }}>
                              <div style={{ width:`${wr}%`, height:"100%", background:bc, borderRadius:99 }} />
                            </div>
                            <div style={{ fontSize:11, fontWeight:700, color:bc, textAlign:"right" }}>{wr}%</div>
                          </div>
                        );
                      })}
                    </div>
                    {/* 인사이트 */}
                    {worst && (
                      <div style={{ padding:"8px 12px", background:"#fff7ed", borderRadius:8, border:"1px solid #fed7aa", fontSize:11, color:"#9a3412", lineHeight:1.5 }}>
                        💡 <b>{worst[0]}</b> 승률 {Math.round(worst[1].wins/worst[1].count*100)}% — 이 패턴 진입을 줄이면 수익률이 개선됩니다.
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* 매매내역 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#212529", marginBottom: 8 }}>📋 매매내역</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {!trades.length && <div style={{ color: "#adb5bd", textAlign: "center", padding: "16px 0", fontSize: 13 }}>거래 없음</div>}
              {trades.map((t, i) => (
                <div key={i} onClick={() => setSelectedTurn(selectedTurn === t.turn ? null : t.turn)} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "7px 12px", borderRadius: 8, background: t.type === "매수" ? "#fff5f5" : "#e7f5ff", border: `1px solid ${t.type === "매수" ? "#fca5a5" : "#74c0fc"}`, cursor: "pointer" }}>
                  <span style={{ fontWeight: 700, color: t.type === "매수" ? "#e03131" : "#1971c2" }}>{t.type}</span>
                  <span style={{ color: "#495057" }}>{t.qty}주</span>
                  <span style={{ color: "#495057" }}>{fmtKRW(t.krwPrice)}</span>
                  <span style={{ color: "#adb5bd" }}>{t.date}</span>
                  <span style={{ color: "#7048e8", fontSize: 11 }}>{t.turn + 1}턴 →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 20px 32px", display: "flex", gap: 10, flexShrink: 0, borderTop: "1px solid #e9ecef" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1.5px solid #dee2e6", background: "#fff", color: "#212529", fontSize: 14, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>🏠 로비</button>
          <button onClick={() => setShowSim(true)} style={{ flex: 1.5, padding: "13px", borderRadius: 10, border: "none", background: "#7048e8", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>📽️ 원칙 시뮬</button>
          <button onClick={onRestart} style={{ flex: 1.5, padding: "13px", borderRadius: 10, border: "none", background: "#212529", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>🔄 새 게임</button>
        </div>
      </div>
      {/* 원칙 시뮬레이터 */}
      {showSim && (
        <PrincipleSimulator
          allCandles={allCandles} gameStart={gameStart}
          initCash={initCash} isQQQ={isQQQProp}
          myTotalAsset={totalAsset} myPnl={pnl} myTrades={trades}
          onClose={() => setShowSim(false)}
          fmtKRW={fmtKRW} fmtPct={fmtPct} fmtDate={fmtDate}
          market={market} stockMeta={stockMeta} interval={interval}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 📽️ 원칙 시뮬레이션 컴포넌트
// ══════════════════════════════════════════════════════════════════════════════
const MA240_PERIOD_SIM = 240;
const WINDOW_SIM       = 60;

function calcMAat(candles: Candle[], idx: number, period: number): number | null {
  if (idx < period - 1) return null;
  let s = 0;
  for (let i = idx - period + 1; i <= idx; i++) s += candles[i].close;
  return s / period;
}

interface SimTrade {
  turn:     number;
  type:     "매수" | "매도";
  price:    number;
  qty:      number;
  reason:   string;
  pnlKrw?:  number;
  pnlPct?:  number;
  gap10?:   number;   // 매수 시 이격도
  avgCost?: number;   // 매수 후 평단
  holdings?:number;   // 매수 후 보유 주수
}

function decidePrinciple(
  candles: Candle[], absIdx: number, holdings: number, cash: number, initCash: number, isQQQ: boolean
): { action: "매수" | "매도" | "관망"; reason: string; ratio: number } {
  const ma5  = calcMAat(candles, absIdx,   5);
  const ma10 = calcMAat(candles, absIdx,  10);
  const ma240= calcMAat(candles, absIdx, 240);
  const pma5 = calcMAat(candles, absIdx - 1,  5);
  const pma10= calcMAat(candles, absIdx - 1, 10);
  if (!ma10 || !ma5) return { action: "관망", reason: "이평선 계산 중", ratio: 0 };

  const price      = candles[absIdx].close;
  const above10    = price > ma10;
  const above240   = !ma240 || price > ma240;
  const goldenCross= !!pma5 && !!pma10 && pma5 < pma10 && ma5 >= ma10;
  const deadCross  = !!pma5 && !!pma10 && pma5 > pma10 && ma5 <= ma10;
  const gap10      = ma10 > 0 ? (price - ma10) / ma10 * 100 : 0;
  const nearMA10   = above10 && gap10 >= 0 && gap10 <= 3;
  const vol20Avg   = (() => { const sl = candles.slice(Math.max(0, absIdx - 20), absIdx); return sl.length ? sl.reduce((s,c)=>s+c.vol,0)/sl.length : 0; })();
  const volDec     = vol20Avg > 0 && candles[absIdx].vol < vol20Avg * 0.8;
  const holdRatio  = holdings * price / initCash;
  const exchRate   = isQQQ ? 1350 : 1;

  if ((deadCross || !above10) && holdings > 0)
    return { action: "매도", reason: deadCross ? "데드크로스 — 즉시 전량 매도" : "10MA 이탈 — 원칙 손절", ratio: 1 };
  if (goldenCross && above240 && holdRatio < 0.4 && cash >= price * exchRate)
    return { action: "매수", reason: "골든크로스 — 10% 매수", ratio: 0.10 };
  if (nearMA10 && volDec && above240 && holdRatio < 0.3 && cash >= price * exchRate)
    return { action: "매수", reason: "눌림목 + 거래량 감소 — 5% 분할 매수", ratio: 0.05 };
  if (above10 && holdings > 0)
    return { action: "관망", reason: "추세 유지 중 — 보유", ratio: 0 };
  if (!above10 && holdings === 0)
    return { action: "관망", reason: "10MA 아래 — 관망", ratio: 0 };
  return { action: "관망", reason: "조건 미충족 — 대기", ratio: 0 };
}

function PrincipleSimulator({
  allCandles, gameStart, initCash, isQQQ, myTotalAsset, myPnl, myTrades,
  onClose, fmtKRW, fmtPct, fmtDate, market, stockMeta, interval,
}: {
  allCandles: Candle[]; gameStart: number; initCash: number; isQQQ: boolean;
  myTotalAsset: number; myPnl: number; myTrades: Trade[]; onClose: () => void;
  fmtKRW: (n:number)=>string; fmtPct: (n:number)=>string;
  fmtDate: (d:Date|undefined)=>string;
  market: string; stockMeta: StockMeta|null; interval: string;
}) {
  const MAX_TURNS = 50;
  const exchRate  = isQQQ ? 1350 : 1;

  const [simTurn,    setSimTurn]    = React.useState(0);
  const [playing,    setPlaying]    = React.useState(true);
  const [speed,      setSpeed]      = React.useState(1);
  const [done,       setDone]       = React.useState(false);
  const [cash,       setCash]       = React.useState(initCash);
  const [holdings,   setHoldings]   = React.useState(0);
  const [avgCost,    setAvgCost]    = React.useState(0);
  const [simTrades,  setSimTrades]  = React.useState<SimTrade[]>([]);
  const [lastAction, setLastAction] = React.useState<{ action:string; reason:string; color:string; simAct?:string; myAct?:string; afterResult?:string } | null>(null);
  // 1번: 수익 곡선 히스토리
  const [simPnlHist, setSimPnlHist] = React.useState<number[]>([0]);
  // 2번: 핵심 학습 구간 팝업
  const [highlightInfo, setHighlightInfo] = React.useState<{ title:string; desc:string; simAct:string; myAct:string; afterPct?:number } | null>(null);
  const [hlCollapsed,   setHlCollapsed]   = React.useState(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval>|null>(null);

  // 내부 ref — interval에서 최신 state 참조
  const stateRef = React.useRef({ cash: initCash, holdings: 0, avgCost: 0, trades: [] as SimTrade[] });

  const absIdx   = gameStart + simTurn;
  const windowSt = Math.max(absIdx - MA240_PERIOD_SIM - WINDOW_SIM + 1, 0);
  const visible  = allCandles.slice(windowSt, absIdx + 1);
  const chartSt  = Math.max(visible.length - WINDOW_SIM, 0);
  const chartC   = visible.slice(chartSt);
  const chartMa5:  (number|null)[] = chartC.map((_, i) => {
    const ai = windowSt + chartSt + i; return calcMAat(allCandles, ai, 5);
  });
  const chartMa10: (number|null)[] = chartC.map((_, i) => {
    const ai = windowSt + chartSt + i; return calcMAat(allCandles, ai, 10);
  });
  const chartMa240:(number|null)[] = chartC.map((_, i) => {
    const ai = windowSt + chartSt + i; return calcMAat(allCandles, ai, 240);
  });

  // 원칙 마커 (source: "sim")
  const simMarkers = simTrades.map(t => {
    const tAbs = gameStart + t.turn;
    const tVis = tAbs - (windowSt + chartSt);
    if (tVis < 0 || tVis >= chartC.length) return null;
    return { idx: tVis, type: t.type, source: "sim" as const,
             gap10: t.gap10, avgCost: t.avgCost, pnlPct: t.pnlPct, qty: t.qty };
  }).filter(Boolean) as { idx:number; type:"매수"|"매도"; source:"sim"|"mine"; gap10?:number; avgCost?:number; pnlPct?:number; qty?:number; krwPrice?:number }[];

  // 내 마커 (source: "mine") — simTurn까지만
  const myMarkersArr = myTrades
    .filter(t => t.turn <= simTurn)
    .map(t => {
      const tAbs = gameStart + t.turn;
      const tVis = tAbs - (windowSt + chartSt);
      if (tVis < 0 || tVis >= chartC.length) return null;
      // 내 매도 수익률 계산
      let myPnlP: number | undefined;
      if (t.type === "매도") {
        const buyTrades = myTrades.filter(b => b.type === "매수" && b.turn < t.turn);
        if (buyTrades.length > 0) {
          const avgB = buyTrades.reduce((s, b) => s + b.krwPrice * b.qty, 0) /
                       buyTrades.reduce((s, b) => s + b.qty, 0);
          myPnlP = avgB > 0 ? (t.krwPrice - avgB) / avgB * 100 : undefined;
        }
      }
      return { idx: tVis, type: t.type, source: "mine" as const,
               qty: t.qty, krwPrice: t.krwPrice, pnlPct: myPnlP };
    }).filter(Boolean) as { idx:number; type:"매수"|"매도"; source:"sim"|"mine"; gap10?:number; avgCost?:number; pnlPct?:number; qty?:number; krwPrice?:number }[];

  // 합산 (원칙 먼저, 내꺼 나중 → 렌더 순서상 내꺼가 위)
  const markers = [...simMarkers, ...myMarkersArr];

  const curPrice   = allCandles[absIdx]?.close ?? 0;

  // 평단 가로선: 보유 중일 때만 표시
  const avgCostLines = React.useMemo(() => {
    const lines: { price: number; source: "sim"|"mine"; label?: string }[] = [];
    // 원칙 평단 (avgCost는 이미 KRW 단위 — 추가 환산 불필요)
    if (stateRef.current.holdings > 0 && stateRef.current.avgCost > 0) {
      lines.push({ price: stateRef.current.avgCost, source: "sim", label: "원칙평단" });
    }
    // 내 평단 계산
    let myHold = 0, myAvg = 0;
    myTrades.filter(t => t.turn <= simTurn).forEach(t => {
      if (t.type === "매수") {
        myAvg  = (myAvg * myHold + t.qty * t.krwPrice) / (myHold + t.qty);
        myHold += t.qty;
      } else {
        myHold = 0; myAvg = 0;
      }
    });
    if (myHold > 0 && myAvg > 0) {
      lines.push({ price: myAvg, source: "mine", label: "내평단" });
    }
    return lines;
  }, [simTurn, myTrades, exchRate]);
  const curKrw     = curPrice * exchRate;
  const totalAsset = stateRef.current.cash + stateRef.current.holdings * curKrw;
  const pnlPct     = (totalAsset / initCash - 1) * 100;

  // 한 턴 처리
  const processTurn = React.useCallback((turn: number) => {
    const idx = gameStart + turn;
    if (idx >= allCandles.length || turn >= MAX_TURNS) return;
    const { cash: c, holdings: h, avgCost: ac, trades: tr } = stateRef.current;
    const price  = allCandles[idx].close;
    const krwP   = price * exchRate;
    const { action, reason, ratio } = decidePrinciple(allCandles, idx, h, c, initCash, isQQQ);

    let nc = c, nh = h, nac = ac;
    let newTrade: SimTrade | null = null;
    let aColor = "#6c757d";

    if (action === "매수" && ratio > 0) {
      const buyKrw = Math.floor(initCash * ratio);
      const qty    = Math.max(1, Math.floor(buyKrw / krwP));
      const cost   = qty * krwP;
      if (cost <= nc) {
        nc  = nc - cost;
        nac = (nac * nh + cost) / (nh + qty);
        nh  = nh + qty;
        const gap10 = (() => { const m = calcMAat(allCandles, idx, 10); return m && m > 0 ? (price - m) / m * 100 : 0; })();
        newTrade = { turn, type:"매수", price, qty, reason, gap10, avgCost: nac, holdings: nh };
        aColor = "#e03131";
      }
    } else if (action === "매도" && h > 0) {
      const pnl    = (krwP - ac) * h;
      const pnlPct = ac > 0 ? (krwP - ac) / ac * 100 : 0;
      nc = nc + h * krwP;
      newTrade = { turn, type:"매도", price, qty: h, reason, pnlKrw: pnl, pnlPct };
      nh = 0; nac = 0;
      aColor = "#1971c2";
    }

    stateRef.current = { cash: nc, holdings: nh, avgCost: nac, trades: newTrade ? [...tr, newTrade] : tr };
    setCash(nc);
    setHoldings(nh);
    setAvgCost(nac);
    if (newTrade) setSimTrades(prev => [...prev, newTrade!]);

    // 1번: 수익 곡선 히스토리 업데이트
    const curKrw2 = (allCandles[gameStart + turn]?.close ?? 0) * exchRate;
    const curAsset = nc + nh * curKrw2;
    setSimPnlHist(prev => [...prev, (curAsset / initCash - 1) * 100]);

    // 내 판단 확인 (같은 턴에 내가 한 행동)
    const myTradeThisTurn = stateRef.current.trades; // 비교용 — props myTrades에서 직접 참조

    // 배너 상세 메시지
    let bannerTitle = "";
    let bannerSub   = "";
    if (action === "관망") {
      bannerTitle = `👀 ${reason}`;
      bannerSub   = nh > 0
        ? `보유 ${nh}주 · 평단 ${Math.round(nac).toLocaleString()}원 · 현재 ${(curPrice > 0 ? ((curKrw - nac) / nac * 100) : 0).toFixed(1)}% 수익`
        : "";
    } else if (action === "매수" && newTrade) {
      const g = newTrade.gap10 ?? 0;
      bannerTitle = `▲ 매수 — ${reason}`;
      bannerSub   = `${newTrade.qty}주 @ ${Math.round(newTrade.price).toLocaleString()}원 · 이격도 ${g >= 0 ? "+" : ""}${g.toFixed(1)}% · 평단 ${Math.round(nac).toLocaleString()}원`;
    } else if (action === "매도" && newTrade) {
      const pp = newTrade.pnlPct ?? 0;
      bannerTitle = `▼ 매도 — ${reason}`;
      bannerSub   = `${newTrade.qty}주 · 수익률 ${pp >= 0 ? "+" : ""}${pp.toFixed(1)}% · ${pp >= 0 ? "+" : ""}${fmtKRW(Math.round(newTrade.pnlKrw ?? 0))}`;
    }
    setLastAction({ action: bannerTitle, reason: bannerSub, color: aColor });

    // 2번: 핵심 학습 구간 감지 → 자동 일시정지
    // 골든크로스/데드크로스/매매 발생 시만 감지 (관망은 제외)
    const ma5v   = calcMAat(allCandles, gameStart + turn, 5);
    const ma10v  = calcMAat(allCandles, gameStart + turn, 10);
    const pma5v  = calcMAat(allCandles, gameStart + turn - 1, 5);
    const pma10v = calcMAat(allCandles, gameStart + turn - 1, 10);
    const isGolden = !!(ma5v && ma10v && pma5v && pma10v && pma5v < pma10v && ma5v >= ma10v);
    const isDead   = !!(ma5v && ma10v && pma5v && pma10v && pma5v > pma10v && ma5v <= ma10v);
    // 관망인 경우 핵심 구간 팝업 표시 안 함
    const shouldHighlight = isGolden || isDead || (action !== "관망" && !!newTrade);
    if (shouldHighlight) {
      const title = isGolden ? "골든크로스 발생"
                  : isDead   ? "데드크로스 발생"
                  : action === "매수" ? "매수 신호 감지" : "매도 신호 감지";
      const desc  = isGolden ? "5MA가 10MA를 상향 돌파 — 원칙 #12 진입 타이밍"
                  : isDead   ? "5MA가 10MA를 하향 돌파 — 원칙 #7 손절 타이밍"
                  : reason;
      const futureIdx   = Math.min(gameStart + turn + 3, allCandles.length - 1);
      const futurePrice = allCandles[futureIdx]?.close ?? allCandles[gameStart + turn].close;
      const afterPct    = (futurePrice / allCandles[gameStart + turn].close - 1) * 100;
      // 내 판단: 해당 턴에 실제로 내가 한 행동
      // (processTurn 시점엔 myTrades가 클로저 밖이므로 "관망"으로 기본 표시, 배너에서 보정)
      setHighlightInfo({ title, desc, simAct: action, myAct: "관망", afterPct });
      setHlCollapsed(false);
    } else {
      // 관망 턴에선 이전 핵심 구간 팝업 닫기 (턴이 넘어갔으므로)
      setHighlightInfo(null);
    }
  }, [allCandles, gameStart, initCash, isQQQ, exchRate]);

  // 재생 루프
  React.useEffect(() => {
    if (!playing || done) return;
    const ms = speed === 3 ? 200 : speed === 2 ? 500 : 1000;
    intervalRef.current = setInterval(() => {
      setSimTurn(prev => {
        const next = prev + 1;
        processTurn(next);
        if (next >= MAX_TURNS - 1) {
          setPlaying(false);
          setDone(true);
          return MAX_TURNS - 1;
        }
        return next;
      });
    }, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, done, speed, processTurn]);

  // 초기 첫 턴 처리
  React.useEffect(() => { processTurn(0); }, []);

  const simFinalPnl = (totalAsset / initCash - 1) * 100;
  const diff        = simFinalPnl - myPnl;

  // 내 수익 곡선 사전 계산 (myTrades 기반)
  const myPnlHist = React.useMemo(() => {
    const hist: number[] = [];
    let myCash = initCash, myHold = 0, myAvg = 0;
    for (let t = 0; t < MAX_TURNS; t++) {
      const idx2 = gameStart + t;
      if (idx2 >= allCandles.length) break;
      const price2 = allCandles[idx2].close * exchRate;
      // 해당 턴 내 매매 반영
      myTrades.filter(tr => tr.turn === t).forEach(tr => {
        if (tr.type === "매수") {
          const cost = tr.qty * tr.krwPrice;
          myAvg  = (myAvg * myHold + cost) / (myHold + tr.qty);
          myHold += tr.qty; myCash -= cost;
        } else {
          myCash += tr.qty * price2; myHold = 0; myAvg = 0;
        }
      });
      const asset = myCash + myHold * price2;
      hist.push((asset / initCash - 1) * 100);
    }
    return hist;
  }, [myTrades, allCandles, gameStart, initCash, exchRate]);

  const C2 = { bg:"#fff", border:"#e9ecef", text:"#212529", sub:"#495057", muted:"#adb5bd", accent:"#7048e8", red:"#e03131", blue:"#1971c2", green:"#2f9e44", surface:"#f8f9fa" };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:10000, display:"flex", flexDirection:"column" }}>
      {/* 헤더 */}
      <div style={{ background:"#111", padding:"8px 12px", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#adb5bd", fontSize:13, cursor:"pointer", padding:"2px 6px", fontFamily:"inherit" }}>← 결과로</button>
        <span style={{ color:"#fff", fontSize:13, fontWeight:700, flex:1 }}>📽️ 원칙 시뮬레이션</span>
        {/* 속도 */}
        <div style={{ display:"flex", gap:4 }}>
          {([1,2,3] as const).map(s => (
            <button key={s} onClick={()=>setSpeed(s)} style={{ padding:"3px 8px", borderRadius:6, border:"none", background: speed===s ? C2.accent : "#333", color: speed===s ? "#fff" : "#adb5bd", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
              {s===1?"1x":s===2?"2x":"⏩"}
            </button>
          ))}
        </div>
        {/* 재생/일시정지 */}
        <button onClick={()=>setPlaying(p=>!p)} disabled={done}
          style={{ padding:"4px 12px", borderRadius:6, border:"none", background: playing ? "#444" : C2.accent, color:"#fff", fontSize:12, cursor:done?"default":"pointer", fontFamily:"inherit" }}>
          {playing ? "⏸" : done ? "완료" : "▶ 재생"}
        </button>
      </div>

      {/* 진행 바 */}
      <div style={{ height:3, background:"#222", flexShrink:0 }}>
        <div style={{ width:`${(simTurn+1)/MAX_TURNS*100}%`, height:"100%", background:C2.accent, transition:"width .2s" }} />
      </div>

      {/* 차트 */}
      <div style={{ flex:1, minHeight:0, position:"relative", background:"#fff" }}>
        <div style={{ position:"absolute", inset:0 }}>
          <CandleChart
            candles={chartC} ma5={chartMa5} ma10={chartMa10} ma240={chartMa240}
            width={700} height={400}
            svgHeight="100%"
            style={{ height:"100%", width:"100%" }}
            markers={markers}
            avgCostLines={avgCostLines}
          />
        </div>
      </div>

      {/* 2번: 핵심 학습 구간 팝업 (접기/펼치기) */}
      {highlightInfo && !playing && (
        <div style={{ flexShrink:0, background:"#f3f0ff", borderTop:"2px solid #7048e8" }}>
          {/* 헤더 — 항상 표시, 탭해서 접기/펼치기 */}
          <div
            onClick={() => setHlCollapsed(c => !c)}
            style={{ padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:14 }}>📍</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#3c3489" }}>핵심 구간 — {highlightInfo.title}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:9, color:"#534ab7", background:"#EEEDFE", padding:"2px 6px", borderRadius:99 }}>턴 {simTurn+1}</span>
              <span style={{ fontSize:12, color:"#7048e8", fontWeight:700 }}>{hlCollapsed ? "∧" : "∨"}</span>
            </div>
          </div>

          {/* 내용 — 접기 시 숨김 */}
          {!hlCollapsed && (
            <div style={{ padding:"0 12px 10px" }}>
              <div style={{ background:"#fff", border:"1px solid #afa9ec", borderRadius:8, padding:"8px 10px", marginBottom:8, fontSize:11, color:"#534ab7" }}>
                {highlightInfo.desc}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
                <div style={{ background:"#fff5f5", borderRadius:6, padding:"6px 8px", border:"1px solid #fca5a5" }}>
                  <div style={{ fontSize:9, color:"#a32d2d", marginBottom:2 }}>나의 판단</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#a32d2d" }}>{highlightInfo.myAct}</div>
                </div>
                <div style={{ background:"#f0fdf4", borderRadius:6, padding:"6px 8px", border:"1px solid #86efac" }}>
                  <div style={{ fontSize:9, color:"#3b6d11", marginBottom:2 }}>원칙 판단</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#3b6d11" }}>
                    {highlightInfo.simAct === "매수" ? "▲ 매수" : highlightInfo.simAct === "매도" ? "▼ 매도" : "👀 관망"}
                  </div>
                </div>
              </div>
              {highlightInfo.afterPct !== undefined && (
                <div style={{ fontSize:11, color: highlightInfo.afterPct >= 0 ? "#3b6d11" : "#991b1b", background: highlightInfo.afterPct >= 0 ? "#f0fdf4" : "#fff5f5", borderRadius:6, padding:"5px 10px", marginBottom:8, border:`1px solid ${highlightInfo.afterPct >= 0 ? "#86efac" : "#fca5a5"}` }}>
                  이후 3봉 {highlightInfo.afterPct >= 0 ? "+" : ""}{highlightInfo.afterPct.toFixed(1)}% 변동
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                <button onClick={() => setHlCollapsed(true)}
                  style={{ padding:"7px", borderRadius:7, border:"1px solid #afa9ec", background:"#fff", color:"#534ab7", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>∨ 접기</button>
                <button onClick={() => { setHlCollapsed(true); setPlaying(true); }}
                  style={{ padding:"7px", borderRadius:7, border:"none", background:"#7048e8", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>계속 재생 ▶</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1번: 내 판단 vs 원칙 비교 배너 */}
      {lastAction && (() => {
        const myTradeThisTurn = myTrades.find(t => t.turn === simTurn);
        const myActLabel = myTradeThisTurn ? (myTradeThisTurn.type === "매수" ? `▲ ${myTradeThisTurn.type}` : `▼ ${myTradeThisTurn.type}`) : "👀 관망";
        const simActLabel = lastAction.action;
        const isDiff = (myTradeThisTurn?.type ?? "관망") !== (lastAction.color === "#e03131" ? "매수" : lastAction.color === "#1971c2" ? "매도" : "관망");
        const simBg  = lastAction.color === "#e03131" ? "#fff5f5" : lastAction.color === "#1971c2" ? "#e7f5ff" : "#f8f9fa";
        const simClr = lastAction.color;

        return (
          <div style={{ flexShrink:0, borderTop:"1px solid #e9ecef" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
              {/* 내 판단 */}
              <div style={{ padding:"7px 10px", background: myTradeThisTurn ? (myTradeThisTurn.type === "매수" ? "#fff5f5" : "#e7f5ff") : "#f8f9fa", borderRight:"1px solid #e9ecef" }}>
                <div style={{ fontSize:9, color:"#868e96", marginBottom:2 }}>나의 판단 ({simTurn+1}턴)</div>
                <div style={{ fontSize:12, fontWeight:700, color: myTradeThisTurn ? (myTradeThisTurn.type === "매수" ? "#e03131" : "#1971c2") : "#495057" }}>{myActLabel}</div>
              </div>
              {/* 원칙 판단 */}
              <div style={{ padding:"7px 10px", background: simBg }}>
                <div style={{ fontSize:9, color:"#868e96", marginBottom:2 }}>원칙 판단 ({simTurn+1}턴)</div>
                <div style={{ fontSize:12, fontWeight:700, color: simClr }}>{simActLabel.split("—")[0].trim()}</div>
              </div>
            </div>
            {lastAction.reason && (
              <div style={{ padding:"4px 10px", background:"#f8f9fa", fontSize:10, color:"#495057", borderTop:"1px solid #e9ecef" }}>
                {lastAction.reason}
              </div>
            )}
            <div style={{ padding:"2px 10px 4px", background:"#f8f9fa", fontSize:9, color:"#adb5bd" }}>
              {allCandles[absIdx] ? fmtDate(new Date(allCandles[absIdx].date)) : ""}
            </div>
          </div>
        );
      })()}

      {/* 3번: 실시간 수익 곡선 비교 */}
      {(() => {
        const len = Math.max(simPnlHist.length, myPnlHist.length, 2);
        const W = 316, H = 56, padL = 2, padR = 36, padT = 4, padB = 4;
        const allVals = [...simPnlHist, ...myPnlHist].filter(v => isFinite(v));
        const minV = Math.min(...allVals, -2);
        const maxV = Math.max(...allVals,  2);
        const rng  = maxV - minV || 1;
        const sx2 = (i: number) => padL + (i / Math.max(len - 1, 1)) * (W - padL - padR);
        const sy2 = (v: number) => padT + H - ((v - minV) / rng) * (H - padT - padB);
        const zeroY = sy2(0);
        const toPath = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${sx2(i).toFixed(1)},${sy2(v).toFixed(1)}`).join(" ");
        const simPath = toPath(simPnlHist);
        const myPath  = toPath(myPnlHist.slice(0, simTurn + 1));
        const curSimV = simPnlHist[simPnlHist.length - 1] ?? 0;
        const curMyV  = myPnlHist[simTurn] ?? 0;
        return (
          <div style={{ flexShrink:0, background:"#fff", borderTop:"1px solid #e9ecef", padding:"6px 12px 4px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:16, height:2, background:"#2f9e44" }} />
                  <span style={{ fontSize:9, color:"#3b6d11", fontWeight:700 }}>원칙 {curSimV >= 0 ? "+" : ""}{curSimV.toFixed(1)}%</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:16, height:2, background:"#1971c2", opacity:.7 }} />
                  <span style={{ fontSize:9, color:"#185fa5" }}>나 {curMyV >= 0 ? "+" : ""}{curMyV.toFixed(1)}%</span>
                </div>
              </div>
              <span style={{ fontSize:9, color:"#adb5bd" }}>{simTurn+1}/{MAX_TURNS}턴</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display:"block" }}>
              <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#e9ecef" strokeWidth="1"/>
              <text x={W - padR + 2} y={zeroY + 3} fontSize="7" fill="#adb5bd">0%</text>
              {/* 내 곡선 */}
              {myPnlHist.length > 1 && <path d={myPath} fill="none" stroke="#1971c2" strokeWidth="1.5" strokeOpacity=".6" strokeDasharray="4,2"/>}
              {/* 원칙 곡선 */}
              {simPnlHist.length > 1 && <path d={simPath} fill="none" stroke="#2f9e44" strokeWidth="2"/>}
              {/* 현재 위치 도트 */}
              {simPnlHist.length > 0 && <circle cx={sx2(simPnlHist.length - 1)} cy={sy2(curSimV)} r="3" fill="#2f9e44"/>}
              {myPnlHist.length > 0 && <circle cx={sx2(Math.min(simTurn, myPnlHist.length - 1))} cy={sy2(curMyV)} r="3" fill="#1971c2" fillOpacity=".7"/>}
            </svg>
          </div>
        );
      })()}

      {/* 자산 현황 */}
      <div style={{ flexShrink:0, padding:"5px 12px 6px", background:"#f8f9fa", borderTop:"1px solid #e9ecef" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
          <div>
            <div style={{ fontSize:9, color:C2.muted }}>시뮬 자산</div>
            <div style={{ fontSize:13, fontWeight:800, color: simFinalPnl>=0 ? C2.red : C2.blue }}>{fmtPct(simFinalPnl)}</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:C2.muted }}>내 결과</div>
            <div style={{ fontSize:13, fontWeight:700, color: myPnl>=0 ? C2.red : C2.blue }}>{fmtPct(myPnl)}</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:C2.muted }}>차이</div>
            <div style={{ fontSize:13, fontWeight:800, color: diff>=0 ? C2.green : C2.red }}>{diff>=0?"+":""}{diff.toFixed(1)}%p</div>
          </div>
        </div>
      </div>

      {/* 네비게이션 바 — 자산 현황 아래 */}
      {(() => {
        // 전체 재계산 후 target 턴으로 점프 (다음 매매 버그 수정)
        const jumpToTurn = (target: number) => {
          setPlaying(false);
          const s = { cash: initCash, holdings: 0, avgCost: 0, trades: [] as SimTrade[] };
          for (let i = 0; i <= target; i++) {
            const idx2 = gameStart + i;
            if (idx2 >= allCandles.length) break;
            const price2 = allCandles[idx2].close;
            const krwP2  = price2 * exchRate;
            const ma102  = calcMAat(allCandles, idx2, 10);
            const { action: a2, reason: r2, ratio: rt2 } = decidePrinciple(allCandles, idx2, s.holdings, s.cash, initCash, isQQQ);
            if (a2 === "매수" && rt2 > 0) {
              const qty2 = Math.max(1, Math.floor(initCash * rt2 / krwP2));
              const cost2 = qty2 * krwP2;
              if (cost2 <= s.cash) {
                s.avgCost = (s.avgCost * s.holdings + cost2) / (s.holdings + qty2);
                s.holdings += qty2; s.cash -= cost2;
                const g2 = ma102 && ma102 > 0 ? (price2 - ma102) / ma102 * 100 : 0;
                s.trades.push({ turn:i, type:"매수", price:price2, qty:qty2, reason:r2, gap10:g2, avgCost:s.avgCost });
              }
            } else if (a2 === "매도" && s.holdings > 0) {
              const pnl2 = (krwP2 - s.avgCost) * s.holdings;
              const pp2  = s.avgCost > 0 ? (krwP2 - s.avgCost) / s.avgCost * 100 : 0;
              s.trades.push({ turn:i, type:"매도", price:price2, qty:s.holdings, reason:r2, pnlKrw:pnl2, pnlPct:pp2 });
              s.cash += s.holdings * krwP2; s.holdings = 0; s.avgCost = 0;
            }
          }
          stateRef.current = s;
          setCash(s.cash); setHoldings(s.holdings); setAvgCost(s.avgCost);
          setSimTrades(s.trades);
          setSimTurn(target);
        };

        // 전체 미래 매매 턴 목록 (재계산 기반)
        const allFutureTrades = (() => {
          const s2 = { cash: initCash, holdings: 0, avgCost: 0 };
          const turns: number[] = [];
          for (let i = 0; i < MAX_TURNS; i++) {
            const idx2 = gameStart + i;
            if (idx2 >= allCandles.length) break;
            const price2 = allCandles[idx2].close;
            const krwP2  = price2 * exchRate;
            const ma102  = calcMAat(allCandles, idx2, 10);
            const { action: a2, ratio: rt2 } = decidePrinciple(allCandles, idx2, s2.holdings, s2.cash, initCash, isQQQ);
            if (a2 === "매수" && rt2 > 0) {
              const qty2 = Math.max(1, Math.floor(initCash * rt2 / krwP2));
              const cost2 = qty2 * krwP2;
              if (cost2 <= s2.cash) {
                s2.avgCost = (s2.avgCost * s2.holdings + cost2) / (s2.holdings + qty2);
                s2.holdings += qty2; s2.cash -= cost2;
                turns.push(i);
              }
            } else if (a2 === "매도" && s2.holdings > 0) {
              s2.cash += s2.holdings * krwP2; s2.holdings = 0; s2.avgCost = 0;
              turns.push(i);
            }
          }
          return turns;
        })();

        const prevTurnIdx = [...allFutureTrades].reverse().find(t => t < simTurn);
        const nextTurnIdx = allFutureTrades.find(t => t > simTurn);
        const hasPrev = prevTurnIdx !== undefined;
        const hasNext = nextTurnIdx !== undefined;

        const btnStyle = (active: boolean) => ({
          padding:"5px 10px", borderRadius:6, border:"none",
          background: active ? "#7048e8" : "#333",
          color: active ? "#fff" : "#555",
          fontSize:11, cursor: active ? "pointer" : "default",
          fontFamily:"inherit", whiteSpace:"nowrap" as const,
        });

        return (
          <div style={{ background:"#1a1a1a", padding:"6px 10px", display:"grid", gridTemplateColumns:"1fr auto auto auto 1fr", alignItems:"center", gap:5, flexShrink:0, borderTop:"1px solid #222" }}>
            <button onClick={() => hasPrev && jumpToTurn(prevTurnIdx!)} style={btnStyle(hasPrev)}>◀◀ 이전 매매</button>
            <button onClick={() => { setPlaying(false); if (simTurn > 0) { processTurn(simTurn); setSimTurn(t => Math.max(0, t-1)); } }}
              style={btnStyle(simTurn > 0)}>◀ 1턴</button>
            <div style={{ textAlign:"center", fontSize:10, color:"#888" }}>
              <div>{simTurn+1} / {MAX_TURNS}</div>
              <div style={{ color:"#7048e8" }}>{allFutureTrades.length}건</div>
            </div>
            <button onClick={() => {
              setPlaying(false);
              if (simTurn < MAX_TURNS - 1) {
                const next = simTurn + 1;
                processTurn(next);
                if (next >= MAX_TURNS - 1) setDone(true);
                setSimTurn(next);
              }
            }} style={btnStyle(simTurn < MAX_TURNS - 1)}>1턴 ▶</button>
            <button onClick={() => hasNext && jumpToTurn(nextTurnIdx!)} style={{ ...btnStyle(hasNext), justifySelf:"end" as const }}>다음 매매 ▶▶</button>
          </div>
        );
      })()}

      {/* 완료 비교 오버레이 */}
      {done && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"min(360px,90vw)", maxHeight:"88vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

            {/* 고정 헤더 */}
            <div style={{ padding:"16px 20px 12px", flexShrink:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C2.text, marginBottom:10, textAlign:"center" }}>📊 시뮬레이션 완료</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                <div style={{ background:"#f8f9fa", borderRadius:10, padding:"12px", border:"1px solid #e9ecef" }}>
                  <div style={{ fontSize:10, color:C2.muted, marginBottom:3 }}>내 플레이</div>
                  <div style={{ fontSize:22, fontWeight:800, color: myPnl>=0?C2.red:C2.blue }}>{fmtPct(myPnl)}</div>
                  <div style={{ fontSize:10, color:C2.sub, marginTop:2 }}>{fmtKRW(myTotalAsset)}</div>
                </div>
                <div style={{ background: simFinalPnl>=0?"#f0fdf4":"#fff5f5", borderRadius:10, padding:"12px", border:`1px solid ${simFinalPnl>=0?"#bbf7d0":"#fca5a5"}` }}>
                  <div style={{ fontSize:10, color:C2.muted, marginBottom:3 }}>원칙 시뮬</div>
                  <div style={{ fontSize:22, fontWeight:800, color: simFinalPnl>=0?C2.red:C2.blue }}>{fmtPct(simFinalPnl)}</div>
                  <div style={{ fontSize:10, color:C2.sub, marginTop:2 }}>{fmtKRW(Math.round(totalAsset))}</div>
                </div>
              </div>
              <div style={{ padding:"8px 12px", background: diff>=0?"#f0fdf4":"#fff7ed", borderRadius:8, border:`1px solid ${diff>=0?"#bbf7d0":"#fed7aa"}`, textAlign:"center" }}>
                <span style={{ fontSize:13, fontWeight:800, color: diff>=0?C2.green:"#e65100" }}>
                  {diff>=0 ? (simFinalPnl >= 0 ? `원칙대로 했다면 ${diff.toFixed(1)}%p 더 벌었습니다` : `원칙대로 했다면 ${diff.toFixed(1)}%p 덜 잃었습니다`) : `이번엔 내 판단이 ${Math.abs(diff).toFixed(1)}%p 앞섰습니다 🎉`}
                </span>
              </div>
            </div>

            {/* 스크롤 가능한 매매 내역 */}
            <div style={{ flex:1, overflowY:"auto", padding:"0 20px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:C2.text, marginBottom:6 }}>원칙 매매 내역 ({simTrades.length}건)</div>
              {simTrades.length === 0
                ? <div style={{ fontSize:12, color:C2.muted, textAlign:"center", padding:"10px 0" }}>매매 없음 (조건 미충족)</div>
                : <div style={{ display:"flex", flexDirection:"column", gap:5, paddingBottom:8 }}>
                    {simTrades.map((t,i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", borderRadius:8, background: t.type==="매수"?"#fff5f5":"#e7f5ff", border:`1px solid ${t.type==="매수"?"#fca5a5":"#74c0fc"}`, fontSize:11 }}>
                        <span style={{ fontWeight:700, color: t.type==="매수"?C2.red:C2.blue, width:36 }}>{t.type}</span>
                        <span style={{ color:C2.sub, flex:1, paddingLeft:6, fontSize:10 }}>{t.reason}</span>
                        {t.type==="매도" && t.pnlKrw !== undefined && (
                          <span style={{ fontWeight:700, color: t.pnlKrw>=0?C2.green:C2.red, width:70, textAlign:"right" }}>
                            {t.pnlKrw>=0?"+":""}{fmtKRW(Math.round(t.pnlKrw))}
                          </span>
                        )}
                        <span style={{ color:C2.muted, marginLeft:6, width:28 }}>{t.turn+1}턴</span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* 고정 하단 버튼 */}
            <div style={{ padding:"12px 20px 16px", flexShrink:0, borderTop:"1px solid #e9ecef", display:"flex", gap:8 }}>
              <button onClick={()=>{ setDone(false); setSimTurn(0); setCash(initCash); setHoldings(0); setAvgCost(0); setSimTrades([]); setSimPnlHist([0]); stateRef.current={cash:initCash,holdings:0,avgCost:0,trades:[]}; processTurn(0); }}
                style={{ flex:1, padding:"11px", borderRadius:10, border:"1.5px solid #dee2e6", background:"#fff", color:C2.text, fontSize:13, cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>
                🔁 다시 보기
              </button>
              <button onClick={onClose}
                style={{ flex:1, padding:"11px", borderRadius:10, border:"none", background:C2.text, color:"#fff", fontSize:13, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>
                결과로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// 📊 누적 통계 유틸 (localStorage)
// ══════════════════════════════════════════════════════════════════════════════
const STATS_KEY = "chartgame_stats_v2";
interface GameStats {
  totalGames: number;
  totalPnl:   number;
  winGames:   number;
  entryPatterns: Record<string, { count: number; wins: number; pnlSum: number }>;
  nextGoal?: { text: string; tag: string; createdAt: string };
  scatterData?: { pnl: number; followScore: number }[];
}
function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw) as GameStats;
  } catch { /* ignore */ }
  return { totalGames: 0, totalPnl: 0, winGames: 0, entryPatterns: {} };
}
function saveStats(s: GameStats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
function appendGameToStats(pnlPct: number, trades: Trade[]): GameStats {
  const stats = loadStats();
  stats.totalGames += 1;
  stats.totalPnl   += pnlPct;
  if (pnlPct > 0) stats.winGames += 1;
  const addPattern = (key: string) => {
    if (!stats.entryPatterns[key])
      stats.entryPatterns[key] = { count: 0, wins: 0, pnlSum: 0 };
    stats.entryPatterns[key].count  += 1;
    stats.entryPatterns[key].pnlSum += pnlPct;
    if (pnlPct > 0) stats.entryPatterns[key].wins += 1;
  };
  trades.filter(t => t.type === "매수").forEach(t => {
    const snap = t.snap as Record<string, unknown>;
    // D안: 패턴별 세분화 — 거래량/윗꼬리 패턴도 함께 기록
    if (snap.goldenCross) addPattern("골든크로스 매수");
    else if (!snap.above10) addPattern("10MA 아래 매수");
    else if (snap.overheat10) addPattern("과열구간 매수");
    else if (snap.nearMA10) addPattern("눌림목 매수");
    else addPattern("10MA 위 매수");

    if (snap.volSurge) addPattern("거래량 확인 매수");
    if (snap.upperTailSignal) addPattern("윗꼬리 무시 매수");
  });
  trades.filter(t => t.type === "매도").forEach(t => {
    const snap = t.snap as Record<string, unknown>;
    if (snap.deadCross) addPattern("데드크로스 매도");
    if (!snap.above10) addPattern("10MA 이탈 매도");
  });
  saveStats(stats);
  return stats;
}

// ④ 다음 게임 목표 저장
function saveNextGoal(goal: { text: string; tag: string }) {
  const stats = loadStats();
  stats.nextGoal = { ...goal, createdAt: new Date().toISOString() };
  saveStats(stats);
}

// ⑤ 산점도 데이터 추가
function appendScatterPoint(pnl: number, followScore: number) {
  const stats = loadStats();
  if (!stats.scatterData) stats.scatterData = [];
  stats.scatterData.push({ pnl, followScore });
  if (stats.scatterData.length > 50) stats.scatterData = stats.scatterData.slice(-50);
  saveStats(stats);
}

// ══════════════════════════════════════════════════════════════════════════════
// 📈 N차 파동 감지
// ══════════════════════════════════════════════════════════════════════════════
interface WaveSegment {
  startIdx: number;
  endIdx:   number;
  type:     "상승" | "눌림";
  waveNum?: number;
}
function detectWaves(candles: Candle[], ma10: (number | null)[]): WaveSegment[] {
  if (candles.length < 4) return [];
  const segs: WaveSegment[] = [];
  let segStart = 0;
  let prevAbove = candles[0].close > (ma10[0] ?? candles[0].close);
  let riseCount = 0;
  for (let i = 1; i < candles.length; i++) {
    const above = candles[i].close > (ma10[i] ?? candles[i].close);
    if (above !== prevAbove) {
      const type: "상승" | "눌림" = prevAbove ? "상승" : "눌림";
      if (type === "상승") riseCount++;
      segs.push({ startIdx: segStart, endIdx: i - 1, type, waveNum: type === "상승" ? riseCount : undefined });
      segStart = i;
      prevAbove = above;
    }
  }
  const lastType: "상승" | "눌림" = prevAbove ? "상승" : "눌림";
  if (lastType === "상승") riseCount++;
  segs.push({ startIdx: segStart, endIdx: candles.length - 1, type: lastType, waveNum: lastType === "상승" ? riseCount : undefined });
  return segs;
}

// ══════════════════════════════════════════════════════════════════════════════
// 💬 코치 메시지 생성
// ══════════════════════════════════════════════════════════════════════════════
interface CoachMsg {
  level:     "good" | "warn" | "danger" | "info";
  title:     string;
  body:      string;
  principle?: string;
}
function getCoachMsg(
  above10: boolean, goldenCross: boolean, deadCross: boolean,
  volMassiveSell: boolean, nearMA10: boolean, overheat10: boolean,
  volDecreasing: boolean, gap10: number | null, holdings: number, turn: number
): CoachMsg {
  const g = gap10 ?? 0;
  if (deadCross)
    return { level:"danger", title:"데드크로스 발생!", body:"5MA가 10MA를 하향 돌파했습니다. 보유 중이라면 즉시 매도를 검토하세요.", principle:"원칙 #7" };
  if (volMassiveSell)
    return { level:"danger", title:"대량 매도 출현", body:"세력이 이탈하는 신호일 수 있습니다. 비중 축소를 고려하세요.", principle:"원칙 #6" };
  if (!above10 && holdings > 0)
    return { level:"danger", title:"10MA 이탈!", body:"보유 종목이 10MA 아래로 내려왔습니다. 원칙대로 손절을 검토하세요.", principle:"원칙 #7" };
  if (goldenCross)
    return { level:"good", title:"골든크로스 발생", body:"5MA가 10MA를 상향 돌파했습니다. 거래량 확인 후 진입을 고려하세요.", principle:"원칙 #12" };
  if (above10 && nearMA10 && volDecreasing)
    return { level:"good", title:"눌림목 진입 구간", body:`이격도 ${g.toFixed(1)}%, 거래량 감소. 분할 매수 최적 타이밍입니다.`, principle:"원칙 #13" };
  if (above10 && g > 10)
    return { level:"warn", title:`과열 구간 (이격도 ${g.toFixed(1)}%)`, body:"추격 매수를 피하고 눌림목을 기다리세요. 보유 중이면 절반 매도 고려.", principle:"원칙 #4" };
  if (above10 && g > 5)
    return { level:"warn", title:`이격도 ${g.toFixed(1)}% — 추가 매수 주의`, body:"이격도가 벌어지고 있습니다. 신규 진입보다 보유 유지를 권장합니다.", principle:"원칙 #3" };
  if (above10 && holdings > 0)
    return { level:"good", title:"추세 유지 중", body:`이격도 ${g.toFixed(1)}%. 10MA 위를 지키는 동안 보유를 유지하세요.`, principle:"원칙 #2" };
  if (above10 && g <= 5)
    return { level:"good", title:"초입 구간", body:`이격도 ${g.toFixed(1)}%. 손절선 짧고 수익 기대치 높은 이상적 진입 구간입니다.`, principle:"원칙 #3" };
  if (!above10 && holdings === 0)
    return { level:"info", title:"10MA 아래 — 관망", body:"상승 추세가 아닙니다. 10MA 돌파 확인 후 진입을 기다리세요.", principle:"원칙 #10" };
  return { level:"info", title:`${turn + 1}턴 진행 중`, body:"차트를 분석하고 매수/매도/다음 턴을 선택하세요." };
}

export default function GameApp({ initialMarket, initialInterval, initialMission, initialCash = 10_000_000, customTicker = null, customTickerName = null, onGameEnd, onBackToLobby }: GameAppProps) {
  const INIT_CASH = initialCash, MAX_TURNS = 50, EXCHANGE = 1350;

  const [screen,       setScreen]      = useState<string>("loading");
  const [market,       setMarket]      = useState<string>(initialMarket);
  const [intervalMode, setIntervalMode]= useState(initialInterval);
  const [mission,      setMission]     = useState<string | null>(initialMission);
  const [isQQQ,        setIsQQQ]       = useState(false);
  const [stockMeta,    setStockMeta]   = useState<StockMeta | null>(null);
  const [allCandles,   setAllCandles]  = useState<Candle[]>([]);
  const [curIdx,       setCurIdx]      = useState(0);
  const [gameStart,    setGameStart]   = useState(0);
  const [loadErr,      setLoadErr]     = useState("");
  const [cash,         setCash]        = useState(INIT_CASH);
  const [holdings,     setHoldings]    = useState(0);
  const [avgCostKRW,   setAvgCostKRW]  = useState(0);
  const [trades,       setTrades]      = useState<Trade[]>([]);
  const [turnScores,   setTurnScores]  = useState<TurnScore[]>([]);
  const [buyPct,       setBuyPct]      = useState(10);
  const [customQty,    setCustomQty]   = useState("");
  const [buyMode,      setBuyMode]     = useState("pct");
  const [sellMode,     setSellMode]    = useState("all");
  const [turn,         setTurn]        = useState(0);
  const [tradeModal,   setTradeModal]  = useState<{ type: string; qty: number; amount: string } | null>(null);
  const [scoreModal,   setScoreModal]  = useState<TurnScore | null>(null);
  const [showResult,   setShowResult]  = useState(false);
  const [diagOpen,     setDiagOpen]    = useState(false);
  const [showBattle,   setShowBattle]  = useState(false);
  const [showPatternMarks, setShowPatternMarks] = useState(false);
  const [banner,       setBanner]      = useState<{ text: string; color: string; bg: string; border: string } | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastGameAsset, setLastGameAsset] = useState<number>(INIT_CASH);
  const [gameStats,     setGameStats]     = useState<GameStats>(() => loadStats());
  const modalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const WINDOW = 36;

  // ── 원칙 배너 표시 (3초 후 자동 사라짐, 탭하면 진단 시트 열림)
  const showBanner = (text: string, color: string, bg: string, border: string) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner({ text, color, bg, border });
    bannerTimer.current = setTimeout(() => setBanner(null), 3500);
  };

  const startGame = async (mkt: "KOSPI" | "QQQ", itv = intervalMode, ms = mission, nextCash?: number, forceTicker?: string | null, forceTickerName?: string | null) => {
    const useCustom = !!forceTicker;
    const isQ = useCustom ? !forceTicker!.includes(".KS") : mkt === "QQQ";
    setLoadErr(""); setScreen("loading");
    const shuffled = useCustom
      ? [{ name: forceTickerName ?? forceTicker!, ticker: forceTicker! }]
      : [...UNIVERSE[mkt]].sort(() => Math.random() - 0.5);
    for (const candidate of shuffled) {
      try {
        const candles = await fetchCandles(candidate.ticker, itv);
        const isMonthly = itv === "1mo";
        // 검색으로 직접 고른 종목은 최근 상장사일 수 있어 240MA(약 5년치) 요구치를 완화
        // — has240 분기 처리가 이미 코드 전반에 있어 240MA 없이도 게임 진행 가능
        const MA_MIN = useCustom ? (isMonthly ? 11 : 15) : (isMonthly ? 15 : 250);
        if (candles.length < MAX_TURNS + MA_MIN + 5) continue;
        const minStart = MA_MIN, maxStart = candles.length - MAX_TURNS - 5;
        if (maxStart <= minStart) continue;
        let validStart = -1;
        for (let a = 0; a < 30; a++) {
          const s = minStart + Math.floor(Math.random() * (maxStart - minStart));
          const p = isQ ? candles[s].close * EXCHANGE : candles[s].close;
          if (p < (nextCash ?? INIT_CASH)) { validStart = s; break; }
        }
        if (validStart < 0) continue;
        setMarket(useCustom ? "CUSTOM" : mkt); setIsQQQ(isQ); setIntervalMode(itv); setMission(ms);
        setStockMeta(candidate); setAllCandles(candles);
        setGameStart(validStart); setCurIdx(validStart);
        setCash(nextCash ?? INIT_CASH); setHoldings(0); setAvgCostKRW(0);
        setTrades([]); setTurnScores([]);
        setBuyPct(10); setCustomQty(""); setBuyMode("pct"); setSellMode("all");
        setTurn(0); setTradeModal(null); setScoreModal(null); setShowResult(false);
        setScreen("game"); return;
      } catch { continue; }
    }
    setLoadErr(useCustom
      ? `"${forceTickerName ?? forceTicker}" 종목은 데이터가 부족해 게임을 시작할 수 없습니다.`
      : "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    setScreen("lobby");
  };

  // 게임 시작 시 자동으로 데이터 로드 (customTicker 있으면 해당 종목으로)
  useState(() => { startGame(initialMarket, initialInterval, initialMission, undefined, customTicker, customTickerName); });

  // 파생값
  const MA240_PERIOD = 240;
  const windowStart  = intervalMode === "1mo"
    ? Math.max(gameStart - 10, 0)
    : Math.max(curIdx - MA240_PERIOD - WINDOW + 1, 0);
  const visibleCandles = allCandles.slice(windowStart, curIdx + 1);
  const ma5   = calcMA(visibleCandles, 5);
  const ma10  = calcMA(visibleCandles, 10);
  const ma240 = calcMA(visibleCandles, MA240_PERIOD);
  const vLen  = visibleCandles.length;
  const chartLen     = Math.min(WINDOW, vLen);
  const chartStart   = vLen - chartLen;
  const chartCandles = visibleCandles.slice(chartStart);
  const chartMa5     = ma5.slice(chartStart);
  const chartMa10    = ma10.slice(chartStart);
  const chartMa240   = ma240.slice(chartStart);

  // B안: 차트 윈도우 내 패턴 스캔 — 골든/데드크로스, 윗/아랫꼬리, 양음양/음양음
  const chartPatternMarks = (() => {
    type Cls = "up_cont" | "up_rev" | "down_cont" | "down_rev";
    const marks: { idx: number; type: "golden" | "dead" | "uppertail" | "lowertail" | "threebar" | "pullback"; label: string; cls: Cls }[] = [];
    const usedIdx = new Set<number>(); // 한 캔들에 한 마크만 — 겹침 방지

    // 분류 판정 헬퍼: 이 시점의 240MA/10MA 상태로 지속/반전 구분
    // above240: 장기 추세, above10: 단기 추세
    const classify = (i: number, signalUp: boolean): Cls => {
      const m240 = chartMa240[i];
      const price = chartCandles[i].close;
      const isAbove240 = m240 ? price > m240 : null;
      if (signalUp) {
        // 상승 신호 — 이미 240MA 위(상승추세 중)면 지속, 아래/불명확이면 반전(전환 시도)
        return isAbove240 === true ? "up_cont" : "up_rev";
      } else {
        // 하락 신호 — 이미 240MA 아래(하락추세 중)면 지속, 위면 반전(전환 시도)
        return isAbove240 === false ? "down_cont" : "down_rev";
      }
    };

    // 1순위: 골든/데드크로스 (가장 중요한 추세 신호)
    for (let i = 1; i < chartCandles.length; i++) {
      const m5 = chartMa5[i], m10 = chartMa10[i], pm5 = chartMa5[i - 1], pm10 = chartMa10[i - 1];
      if (m5 && m10 && pm5 && pm10) {
        if (pm5 < pm10 && m5 >= m10) {
          marks.push({ idx: i, type: "golden", label: "골든크로스", cls: classify(i, true) });
          usedIdx.add(i);
        } else if (pm5 > pm10 && m5 <= m10) {
          marks.push({ idx: i, type: "dead", label: "데드크로스", cls: classify(i, false) });
          usedIdx.add(i);
        }
      }
    }
    // 2순위: 양음양/음양음 (3봉 패턴 — 강한 신호만)
    for (let i = 2; i < chartCandles.length; i++) {
      if (usedIdx.has(i)) continue;
      const c1 = chartCandles[i - 2], c2 = chartCandles[i - 1], c3 = chartCandles[i];
      const up1 = c1.close >= c1.open, up2 = c2.close >= c2.open, up3 = c3.close >= c3.open;
      if (up1 && !up2 && up3) {
        marks.push({ idx: i, type: "threebar", label: "양음양", cls: classify(i, true) });
        usedIdx.add(i);
      } else if (!up1 && up2 && !up3) {
        marks.push({ idx: i, type: "threebar", label: "음양음", cls: classify(i, false) });
        usedIdx.add(i);
      }
    }
    // 3순위: 강한 윗꼬리/아랫꼬리만 (기준 강화: 꼬리가 몸통의 2.5배 이상 + 전체 캔들 중 상대적으로 긴 경우)
    const allRanges = chartCandles.map(c => c.high - c.low).filter(r => r > 0);
    const avgRange = allRanges.length ? allRanges.reduce((a,b)=>a+b,0) / allRanges.length : 0;
    for (let i = 1; i < chartCandles.length; i++) {
      if (usedIdx.has(i)) continue;
      const c = chartCandles[i];
      const body  = Math.abs(c.close - c.open);
      const upper = c.high - Math.max(c.open, c.close);
      const lower = Math.min(c.open, c.close) - c.low;
      const range = c.high - c.low;
      // 강한 꼬리: 몸통의 2.5배 이상 AND 전체 변동폭의 60% 이상 차지
      // 윗꼬리 = 매도압력(하락 신호), 아랫꼬리 = 매수지지(상승 신호)
      if (upper > body * 2.5 && upper > avgRange * 0.5 && range > 0) {
        marks.push({ idx: i, type: "uppertail", label: "윗꼬리", cls: classify(i, false) });
        usedIdx.add(i);
      } else if (lower > body * 2.5 && lower > avgRange * 0.5 && range > 0) {
        marks.push({ idx: i, type: "lowertail", label: "아랫꼬리", cls: classify(i, true) });
        usedIdx.add(i);
      }
    }
    // 4순위: 눌림목 끝 지점 (구간 마지막 캔들에 마크)
    // chartPullbackZones는 아래에서 별도 계산, 여기서는 구간 끝점만 마크로 추가
    for (let i = 5; i < chartCandles.length; i++) {
      if (usedIdx.has(i)) continue;
      const m240i = chartMa240[i], price = chartCandles[i].close;
      const m10i = chartMa10[i];
      const isAbove240 = m240i ? price > m240i : true; // 240MA 없으면 통과
      const nearMA10 = m10i ? Math.abs(price - m10i) / m10i <= 0.03 && price >= m10i * 0.97 : false;
      if (!isAbove240 || !nearMA10) continue;
      // 거래량 감소 확인 (최근 4봉 평균 대비 현재봉)
      const window4 = chartCandles.slice(Math.max(0, i - 3), i + 1);
      if (window4.length < 4) continue;
      const avgVol4 = window4.slice(0, 3).reduce((s,c)=>s+c.vol,0) / 3;
      const volDecreasing = avgVol4 > 0 && window4[3].vol < avgVol4 * 0.7;
      // 직전 캔들도 눌림목 조건이면 "구간 진행 중"이라 끝점이 아님 → 다음 캔들이 이탈하거나 끝까지 가면 여기서 마크
      const isLastInWindow = i === chartCandles.length - 1;
      const nextBreaksOut = i + 1 < chartCandles.length && (() => {
        const nm10 = chartMa10[i+1], np = chartCandles[i+1].close;
        return !(nm10 ? Math.abs(np - nm10) / nm10 <= 0.03 : false);
      })();
      if (volDecreasing && (isLastInWindow || nextBreaksOut)) {
        marks.push({ idx: i, type: "pullback", label: "거래량 감소 확인", cls: "up_cont" });
        usedIdx.add(i);
      }
    }
    return marks;
  })();

  // C안: 눌림목 구간 — 240MA 위 + 10MA 근접(±3%)이 연속되는 구간을 전체 감지
  const chartPullbackZones = (() => {
    const zones: { startIdx: number; endIdx: number }[] = [];
    let start: number | null = null;
    for (let i = 0; i < chartCandles.length; i++) {
      const m240i = chartMa240[i], m10i = chartMa10[i], price = chartCandles[i].close;
      const isAbove240 = m240i ? price > m240i : true;
      const nearMA10 = m10i ? Math.abs(price - m10i) / m10i <= 0.03 && price >= m10i * 0.97 : false;
      const inZone = isAbove240 && nearMA10;
      if (inZone && start === null) start = i;
      if (!inZone && start !== null) {
        if (i - 1 - start >= 1) zones.push({ startIdx: start, endIdx: i - 1 }); // 최소 2봉 이상 구간만
        start = null;
      }
    }
    if (start !== null && chartCandles.length - 1 - start >= 1) {
      zones.push({ startIdx: start, endIdx: chartCandles.length - 1 });
    }
    return zones;
  })();

  const lastCandle   = allCandles[curIdx]     ?? null;
  const prevCandle   = allCandles[curIdx - 1] ?? null;
  const currentPrice = lastCandle?.close ?? 0;
  const prevPrice    = prevCandle?.close ?? 0;
  const krwPrice     = isQQQ ? currentPrice * EXCHANGE : currentPrice;
  const holdingValue = holdings * krwPrice;
  const totalAsset   = cash + holdingValue;
  const pnlPct       = ((totalAsset / INIT_CASH) - 1) * 100;
  const holdPnlPct   = avgCostKRW > 0 ? ((krwPrice - avgCostKRW) / avgCostKRW) * 100 : 0;
  const isUp         = lastCandle ? lastCandle.close >= lastCandle.open : true;
  const candleState  = analyzeCandleState(lastCandle);

  const ma5Cur   = ma5[vLen - 1],  ma5Prev   = ma5[vLen - 2];
  const ma10Cur  = ma10[vLen - 1], ma10Prev  = ma10[vLen - 2];
  const ma240Cur = ma240[vLen - 1];
  const prevVisClose = visibleCandles[vLen - 2]?.close ?? null;

  const maStatus5   = analyzeMAStatus(currentPrice, prevVisClose, ma5Cur,  ma5Prev ?? null);
  const maStatus10  = analyzeMAStatus(currentPrice, prevVisClose, ma10Cur, ma10Prev ?? null);
  const maStatus240 = analyzeMAStatus(currentPrice, prevVisClose, ma240Cur ?? null, ma240[vLen - 2] ?? null);

  const gap5   = ma5Cur   ? ((currentPrice - ma5Cur)   / ma5Cur)   * 100 : null;
  const gap10  = ma10Cur  ? ((currentPrice - ma10Cur)  / ma10Cur)  * 100 : null;
  const gap240 = ma240Cur ? ((currentPrice - ma240Cur) / ma240Cur) * 100 : null;
  const overheat10  = gap10 !== null && gap10 > 5;  // 5% 이상이면 과열
  const above240    = ma240Cur ? currentPrice > ma240Cur : false;
  const above10     = ma10Cur  ? currentPrice > ma10Cur  : false;
  const goldenCross = !!(ma5Cur && ma10Cur && ma5Prev && ma10Prev && ma5Prev < ma10Prev && ma5Cur > ma10Cur);
  const deadCross   = !!(ma5Cur && ma10Cur && ma5Prev && ma10Prev && ma5Prev > ma10Prev && ma5Cur < ma10Cur);
  const nearMA10    = ma10Cur ? Math.abs(currentPrice - ma10Cur) / ma10Cur < 0.03 : false;
  const volDecreasing = (() => {
    if (visibleCandles.length < 4) return false;
    const r = visibleCandles.slice(-4);
    const avg = r.slice(0, 3).reduce((s, c) => s + c.vol, 0) / 3;
    return r[3].vol < avg * 0.7;
  })();

  // ── 거래량 20봉 평균 (돌파 확인 기준)
  const vol20Avg = (() => {
    const n = Math.min(20, visibleCandles.length - 1);
    if (n < 5) return 0;
    const slice = visibleCandles.slice(-n - 1, -1);
    return slice.reduce((s, c) => s + c.vol, 0) / slice.length;
  })();
  const currentVol   = lastCandle?.vol ?? 0;
  const volRatio     = vol20Avg > 0 ? currentVol / vol20Avg : 0; // 1.0 = 평균
  const volSurge     = volRatio >= 1.5;   // 1번: 돌파 거래량 (150% 이상)
  const volMassiveSell = !!(volRatio >= 2.0 && lastCandle && lastCandle.close < lastCandle.open); // 5번: 대량 음봉
  const volShrink    = (() => {           // 4번: 수축 (연속 3봉 이상 50% 이하)
    if (visibleCandles.length < 4) return false;
    const r = visibleCandles.slice(-4);
    return r.every(c => vol20Avg > 0 && c.vol < vol20Avg * 0.5);
  })();


  const diagnosis = diagnoseTrend(currentPrice, prevPrice, ma5Cur ?? null, ma10Cur ?? null, ma240Cur ?? null, ma5Prev ?? null, ma10Prev ?? null, lastCandle, visibleCandles);
  const above5 = ma5Cur ? currentPrice > ma5Cur : null;

  // 5MA 이탈 + 급등 종목 전량매도 신호
  // 급등 = 최근 10봉 내 +30% 이상 상승 후 현재 5MA 아래
  const isBreakAbove5MA = above5 === false && (() => {
    if (visibleCandles.length < 11) return false;
    const tenBack = visibleCandles[visibleCandles.length - 11]?.close ?? 0;
    const peak    = Math.max(...visibleCandles.slice(-10).map(c => c.high));
    return tenBack > 0 && (peak / tenBack - 1) > 0.30;
  })();
  // ── 3봉 패턴 감지 (양음양 / 음양음)
  const threeBarPattern = (() => {
    if (visibleCandles.length < 3) return null;
    const [c1, c2, c3] = visibleCandles.slice(-3);
    const up1 = c1.close >= c1.open;
    const up2 = c2.close >= c2.open;
    const up3 = c3.close >= c3.open;
    // 양음양: 상승 추세 중 눌림 후 재상승
    if (up1 && !up2 && up3) {
      // 조건 강화: c3가 c1 고점 근처까지 회복 (80% 이상)
      const recovery = (c3.close - c2.low) / (c1.high - c2.low);
      if (recovery >= 0.5) {
        const isStrong = c3.close > c1.close; // c3가 c1 종가 돌파 시 강한 신호
        return {
          type: "양음양" as const,
          label: isStrong ? "양음양 돌파" : "양음양",
          icon: "🕯️",
          color: "#e03131",
          bg: "#fff5f5",
          desc: isStrong ? "눌림 후 전고점 돌파 — 강한 매수 신호" : "눌림목 소화 후 재상승 — 상승 지속 가능",
          suggestion: isStrong ? "비중 추가 적극 검토" : "보유 유지 또는 소량 추가",
          strong: isStrong,
        };
      }
    }
    // 음양음: 하락 추세 중 반등 후 재하락
    if (!up1 && up2 && !up3) {
      return {
        type: "음양음" as const,
        label: "음양음",
        icon: "🕯️",
        color: "#1971c2",
        bg: "#e7f5ff",
        desc: "반등 소화 후 재하락 — 하락 지속 가능",
        suggestion: "매도 검토 또는 관망",
        strong: false,
      };
    }
    return null;
  })();

  // 윗꼬리 감지: 윗꼬리 > 몸통 * 1.5
  const upperTailSignal = (() => {
    if (!lastCandle) return false;
    const body  = Math.abs(lastCandle.close - lastCandle.open);
    const upper = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
    return upper > body * 1.5;
  })();

  const snap: Record<string, unknown> = { price: currentPrice, prevPrice, ma5: ma5Cur, ma10: ma10Cur, ma240: ma240Cur, prevMa5: ma5Prev, prevMa10: ma10Prev, above240, above5, above10, goldenCross, deadCross, nearMA10, volDecreasing, volSurge, volMassiveSell, volShrink, volRatio, overheat10, upperTailSignal, holdingQty: holdings };
  // 📈 N차 파동 감지 (chartCandles 기준)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const waveSegments = useMemo(() => detectWaves(chartCandles, chartMa10), [curIdx]);

  // 💬 코치 메시지
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const coachMsg: CoachMsg = useMemo(() => getCoachMsg(
    above10, goldenCross, deadCross, volMassiveSell,
    nearMA10, overheat10, volDecreasing, gap10, holdings, turn
  ), [curIdx, holdings, turn]);


  const buyableQty    = krwPrice > 0 ? Math.floor(cash / krwPrice) : 0;
  const buyablePctQty = (pct: number) => krwPrice > 0 ? Math.floor((totalAsset * pct / 100) / krwPrice) : 0;
  const previewQty    = buyMode === "pct" ? buyablePctQty(buyPct) : (parseInt(customQty) || 0);

  const gameStartDate = allCandles[gameStart]?.date;
  const curDate       = lastCandle?.date;
  const gameEndDate   = allCandles[Math.min(gameStart + MAX_TURNS - 1, allCandles.length - 1)]?.date;
  const intervalLabel = intervalMode === "1wk" ? "주봉" : "월봉";

  const missionSnap = { ma5Cur: ma5Cur ?? null, ma10Cur: ma10Cur ?? null, ma5Prev: ma5Prev ?? null, ma10Prev: ma10Prev ?? null, price: currentPrice, prevPrice, ma240: ma240Cur ?? null, prevMa240: ma240[vLen - 2] ?? null };
  const missionHit  = mission ? MISSIONS.find(m => m.id === mission)?.check(missionSnap as Record<string, number | null>) : false;

  const showModal = (type: string, qty: number, krwAmt: number) => {
    if (modalTimer.current) clearTimeout(modalTimer.current);
    setTradeModal({ type, qty, amount: fmtKRW(krwAmt) });
    modalTimer.current = setTimeout(() => setTradeModal(null), 500);
  };

  const recordTurnScore = (action: string) => {
    const sc = scoreTurnAction(action, snap, diagnosis);
    setTurnScores(p => [...p, sc]);
    setScoreModal({ ...sc, diagnosis });
  };

  const doBuy = () => {
    let qty = buyMode === "pct" ? Math.floor((totalAsset * (buyPct / 100)) / krwPrice) : (parseInt(customQty) || 0);
    if (qty <= 0 || krwPrice * qty > cash) return;
    const newAvg = (avgCostKRW * holdings + krwPrice * qty) / (holdings + qty);
    setAvgCostKRW(newAvg);
    setHoldings(h => h + qty);
    setCash(c => c - qty * krwPrice);
    setTrades(p => [...p, { turn, type: "매수", qty, priceNative: currentPrice, krwPrice, date: fmtDate(curDate), snap: { ...snap } }]);
    showModal("매수", qty, qty * krwPrice);
    recordTurnScore("buy");
  };

  const doSell = () => {
    if (holdings <= 0) return;
    const qty = sellMode === "half" ? Math.floor(holdings / 2) : holdings;
    if (qty <= 0) return;
    setHoldings(h => h - qty);
    setCash(c => c + qty * krwPrice);
    if (holdings - qty === 0) setAvgCostKRW(0);
    setTrades(p => [...p, { turn, type: "매도", qty, priceNative: currentPrice, krwPrice, date: fmtDate(curDate), snap: { ...snap } }]);
    showModal("매도", qty, qty * krwPrice);
    recordTurnScore("sell");
    setSellMode("all");  // 절반 매도 후 전체 매도로 리셋
  };

	const nextTurn = () => {
	  const lastTrade = trades[trades.length - 1];
	  const didTradeThisTurn = lastTrade && lastTrade.turn === turn;

	  // 최신 turnScores 직접 계산 (클로저 문제 방지)
	  // 보유 중 + 상승 추세 관망 → scoreTurnAction 내에서 만점 처리 (holdingQty snap으로 전달됨)
	  const latestScores = didTradeThisTurn
		? turnScores
		: [...turnScores, scoreTurnAction("hold", snap, diagnosis)];

	  if (!didTradeThisTurn) {
		setTurnScores(latestScores);
	  }

	  if (turn >= MAX_TURNS - 1) {
		setShowResult(true);
		const scoredLatest  = latestScores.filter(t => t.maxScore > 0);
		const totalMaxScore = scoredLatest.reduce((s, t) => s + t.maxScore, 0);
		const totalGained   = scoredLatest.reduce((s, t) => s + t.score, 0);
		const followScore   = totalMaxScore > 0 ? Math.round((totalGained / totalMaxScore) * 100) : 0;
		setLastGameAsset(totalAsset);
		// 📊 통계 저장
		const _finalPnl = ((totalAsset / INIT_CASH) - 1) * 100;
		const _updStats = appendGameToStats(_finalPnl, trades);
		setGameStats(_updStats);
		// ⑤ 산점도 데이터 추가
		appendScatterPoint(_finalPnl, followScore);
		// ④ 다음 게임 목표 자동 생성 (가장 많이 틀린 패턴 기반)
		const _patterns = Object.entries(_updStats.entryPatterns)
		  .filter(([,v]) => v.count >= 1)
		  .sort(([,a],[,b]) => (a.wins/a.count) - (b.wins/b.count));
		if (_patterns.length > 0) {
		  const [worstKey] = _patterns[0];
		  const goalMap: Record<string, { text: string; tag: string }> = {
		    "골든크로스":     { text: "골든크로스 발생 시 거래량 150% 이상 확인 후 매수", tag: "거래량 확인" },
		    "10MA아래진입":   { text: "10MA 회복 확인 후에만 매수 진입", tag: "10MA 필터" },
		    "과열구간진입":   { text: "10MA 이격 5% 이상 구간 매수 자제", tag: "과열 주의" },
		    "눌림목진입":     { text: "눌림목 진입 시 거래량 감소 필수 확인", tag: "눌림목" },
		    "10MA위진입":     { text: "상승 추세 중 매수 후 비중 유지 연습", tag: "비중 유지" },
		  };
		  const goal = goalMap[worstKey] ?? { text: "추세 원칙 복습 후 재도전", tag: "원칙 복습" };
		  saveNextGoal(goal);
		}
		onGameEnd({
		  trades,
		  turnScores: latestScores,
		  totalAsset,
		  market,
		  stockMeta: stockMeta!,
		  interval: intervalMode,
		  mission,
		  followScore,
		});
		return;
	  }
	  // ── 원칙 배너 트리거 (다음 턴으로 넘어가기 전 신호 감지)
	  if (goldenCross && volSurge) {
	    showBanner("✅ 골든크로스 + 거래량 확인 — 분할 매수 적기", "#166534", "#f0fdf4", "#86efac");
	  } else if (goldenCross && !volSurge) {
	    showBanner("⚠️ 골든크로스 발생 — 거래량 부족 (150% 필요), 눌림 후 재진입 검토", "#854f0b", "#fff7ed", "#fed7aa");
	  } else if (deadCross) {
	    showBanner("🚨 데드크로스 — 10MA 이탈 시 손절 또는 전량 매도 검토", "#991b1b", "#fff5f5", "#fca5a5");
	  } else if (isBreakAbove5MA) {
	    showBanner("🚨 급등 후 5MA 이탈 — 전량 매도 권고", "#991b1b", "#fff5f5", "#fca5a5");
	  } else if (volMassiveSell) {
	    showBanner("⚠️ 대량 매도 출현 — 세력 이탈 가능성, 비중 축소 검토", "#854f0b", "#fff7ed", "#fed7aa");
	  } else if (volShrink) {
	    showBanner("💤 거래량 수축 — 큰 변동 임박, 돌파 방향 확인 후 진입", "#534AB7", "#f3f0ff", "#d0bfff");
	  } else if (threeBarPattern?.type === "양음양" && threeBarPattern.strong) {
	    showBanner("🕯️ 양음양 돌파 — 전고점 돌파, 강한 매수 신호", "#166534", "#f0fdf4", "#86efac");
	  } else if (!above240 && above10 === false) {
	    showBanner("📉 240MA + 10MA 아래 — 하락 추세 구간, 매수 자제", "#1e40af", "#eff6ff", "#bfdbfe");
	  } else {
	    setBanner(null);
	  }

	  setCurIdx(i => i + 1);
	  setTurn(t => t + 1);
	};

  const pnlColor = pnlPct >= 0 ? C.red : C.blue;

  // ════ 로딩 ════
  if (screen === "loading") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pretendard','Noto Sans KR',sans-serif", gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeInScale{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <div style={{ color: C.sub, fontSize: 14 }}>주가 데이터 불러오는 중...</div>
      {loadErr && <div style={{ color: C.red, fontSize: 13 }}>{loadErr}</div>}
    </div>
  );

  // ════ 게임 ════
  return (
    <div style={{ height: "100dvh", maxHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "'Pretendard','Noto Sans KR',sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@keyframes fadeInScale{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <TradeModal msg={tradeModal} />
      {showBattle && (
        <BattleModal
          candles={chartCandles} ma5={chartMa5} ma10={chartMa10} vol20Avg={vol20Avg}
          holdings={holdings} above5={above5} above10={above10}
          onClose={() => setShowBattle(false)}
          onGoDiag={() => { setShowBattle(false); setDiagOpen(true); }}
          onGoSell={() => { setShowBattle(false); setSellMode("all"); }}
        />
      )}
      {scoreModal && <ScoreModal data={scoreModal} onClose={() => setScoreModal(null)} />}
      {showResult && (
        <ResultReport
          trades={trades} turnScores={turnScores} totalAsset={totalAsset} initCash={INIT_CASH}
          stockMeta={stockMeta} market={market} interval={intervalMode}
          startDate={gameStartDate} endDate={gameEndDate}
          allCandles={allCandles} gameStart={gameStart} isQQQ={isQQQ}
          onClose={onBackToLobby}
          onRestart={() => startGame(market, intervalMode, mission, lastGameAsset)}
        />
      )}

      {/* 헤더 */}
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "4px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, minWidth: 0 }}>
        {/* 좌측: 로비 + 시장/봉 배지만 (개행 방지) */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flexShrink: 1, overflow: "hidden" }}>
          <button onClick={onBackToLobby} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" }}>← 로비</button>
          <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>차트게임 {isQQQ ? "🇺🇸" : "🇰🇷"}</span>
          <span style={{ fontSize: 10, color: C.muted, background: C.surface, padding: "2px 6px", borderRadius: 5, border: `1px solid ${C.border}`, flexShrink: 0, whiteSpace: "nowrap" }}>{market === "CUSTOM" ? (isQQQ ? "검색" : "검색") : market}</span>
          <span style={{ fontSize: 10, color: C.accent, background: "#f3f0ff", padding: "2px 6px", borderRadius: 5, border: "1px solid #d0bfff", flexShrink: 0, whiteSpace: "nowrap" }}>{intervalLabel}</span>
        </div>
        {/* 우측: 날짜 + 턴 + 진행바 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(curDate)}</span>
          <span style={{ fontSize: 11, color: C.sub, whiteSpace: "nowrap" }}>턴 <b>{turn + 1}</b>/{MAX_TURNS}</span>
          <div style={{ width: 52, height: 4, background: C.border, borderRadius: 2, flexShrink: 0 }}>
            <div style={{ width: `${((turn + 1) / MAX_TURNS) * 100}%`, height: "100%", background: C.accent, borderRadius: 2, transition: "width .3s" }} />
          </div>
        </div>
      </div>

      {/* 원칙 배너 (B안) */}
      {banner && (
        <div
          onClick={() => { setBanner(null); setDiagOpen(true); }}
          style={{
            background: banner.bg, borderBottom: `1px solid ${banner.border}`,
            padding: "7px 12px", display: "flex", alignItems: "center", gap: 8,
            flexShrink: 0, cursor: "pointer",
            animation: "fadeInScale .2s ease",
          }}
        >
          <span style={{ fontSize: 12, color: banner.color, fontWeight: 700, lineHeight: 1.4, flex: 1 }}>{banner.text}</span>
          <span style={{ fontSize: 10, color: banner.color, opacity: 0.7, flexShrink: 0 }}>진단 ›</span>
        </div>
      )}

      {/* 자산 요약 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "3px 8px", display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "hidden", flexShrink: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: C.muted }}>총 자산</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: pnlColor }}>{isQQQ ? fmtUSD(totalAsset / EXCHANGE) : fmtKRW(totalAsset)}</div>
        </div>
        <div style={{ flexShrink: 0 }}><div style={{ fontSize: 8, color: C.muted }}>수익률</div><div style={{ fontSize: 11, fontWeight: 700, color: pnlColor }}>{fmtPct(pnlPct)}</div></div>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: C.muted }}>현금</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{isQQQ ? fmtUSD(cash / EXCHANGE) : fmtKRW(cash)}</div>
        </div>
        <div style={{ flexShrink: 0 }}><div style={{ fontSize: 8, color: C.muted }}>보유</div><div style={{ fontSize: 11, fontWeight: 700 }}>{holdings}주</div></div>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: C.muted }}>평단</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{avgCostKRW > 0 ? (isQQQ ? fmtUSD(avgCostKRW / EXCHANGE) : fmtKRW(avgCostKRW)) : "—"}</div>
        </div>
        <div style={{ flexShrink: 0 }}><div style={{ fontSize: 8, color: C.muted }}>평가손익</div><div style={{ fontSize: 11, fontWeight: 700, color: holdPnlPct >= 0 ? C.red : C.blue }}>{avgCostKRW > 0 ? fmtPct(holdPnlPct) : "—"}</div></div>
      </div>

      {/* 차트 — 남은 공간 탄력적으로 채움 */}
      <div style={{ flex: 1, minHeight: 0, padding: "4px 10px 0", overflow: "hidden" }}>
        <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "4px 10px", display: "flex", flexDirection: "column", gap: 3, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {[["5MA","#7048e8"],["10MA","#f97316"],["240MA","#adb5bd"]].map(([l,col]) => (
                <span key={l} style={{ fontSize: 9, color: col, display: "flex", alignItems: "center", gap: 2 }}>
                  <span style={{ display: "inline-block", width: 12, height: 2, background: col, borderRadius: 1 }} />{l}
                </span>
              ))}
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: isUp ? C.red : C.blue, lineHeight: 1 }}>{isQQQ ? fmtUSD(currentPrice) : fmtKRW(currentPrice)}</div>
                {isQQQ && <div style={{ fontSize: 9, color: C.muted }}>≈ {fmtKRW(krwPrice)}</div>}
              </div>
            </div>
            {/* 패턴 오버레이 4색 범례 — 토글 켜졌을 때만 표시 */}
            {showPatternMarks && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  ["▲ 상승지속", "#2f9e44"],
                  ["⤴ 상승반전", "#e03131"],
                  ["▼ 하락지속", "#7048e8"],
                  ["⤵ 하락반전", "#1971c2"],
                  ["🎯 눌림목", "#f97316"],
                ].map(([l, col]) => (
                  <span key={l} style={{ fontSize: 8, color: col, fontWeight: 700 }}>{l}</span>
                ))}
              </div>
            )}
          </div>
          <CandleChart candles={chartCandles} ma5={chartMa5} ma10={chartMa10} ma240={chartMa240} style={{ flex: 1, minHeight: 0 }} svgHeight="100%" patternMarks={showPatternMarks ? chartPatternMarks : undefined} pullbackZones={showPatternMarks ? chartPullbackZones : undefined} />
          <div style={{ borderTop: `1px solid ${C.border}`, flexShrink: 0 }}><VolumeChart candles={chartCandles} height={40} interval={intervalMode} vol20Avg={vol20Avg} highlightLast={true} /></div>
        </div>
      </div>

      {/* 하단 고정 영역: 코치 + 파동 + MA카드 + 매매패널 */}
      <div style={{ flexShrink: 0 }}>
      {(() => {
        const bgMap  = { good:"#f0fdf4", warn:"#fff7ed", danger:"#fff5f5", info:"#f8f9ff" } as const;
        const clrMap = { good:"#166534", warn:"#9a3412", danger:"#991b1b", info:"#3730a3" } as const;
        const bdrMap = { good:"#bbf7d0", warn:"#fed7aa", danger:"#fca5a5", info:"#c7d2fe" } as const;
        const icnMap = { good:"✅", warn:"⚠️", danger:"🚨", info:"💡" } as const;
        const lv = coachMsg.level;
        return (
          <div style={{ padding: "4px 10px 0", flexShrink: 0 }}>
            <div style={{ background: bgMap[lv], border: `1px solid ${bdrMap[lv]}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{icnMap[lv]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: clrMap[lv] }}>{coachMsg.title}</span>
                  {coachMsg.principle && (
                    <span style={{ fontSize: 9, color: clrMap[lv], background: "rgba(255,255,255,0.6)", borderRadius: 4, padding: "1px 6px", flexShrink: 0 }}>
                      {coachMsg.principle}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: clrMap[lv], opacity: 0.85, lineHeight: 1.3 }}>{coachMsg.body}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 📈 N차 파동 라벨 */}
      {waveSegments.length > 1 && (() => {
        const rises  = waveSegments.filter(w => w.type === "상승");
        const curSeg = waveSegments[waveSegments.length - 1];
        const labels = rises.slice(-3);
        return (
          <div style={{ padding: "3px 10px 0", flexShrink: 0 }}>
            <div style={{ background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#4338ca", fontWeight: 700, flexShrink: 0 }}>📈 파동</span>
              {labels.map(seg => {
                const isCur = seg === curSeg;
                const bg  = isCur ? "#4338ca" : "#e0e7ff";
                const col = isCur ? "#fff"     : "#4338ca";
                const bdr = isCur ? "none"     : "1px solid #c7d2fe";
                return (
                  <span key={seg.startIdx} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: bg, color: col, fontWeight: isCur ? 700 : 400, border: bdr, flexShrink: 0 }}>
                    {seg.waveNum}차 상승{isCur ? " 진행중" : " ✓"}
                  </span>
                );
              })}
              {curSeg.type === "눌림" && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a", fontWeight: 700, flexShrink: 0 }}>
                  눌림목 구간
                </span>
              )}
              {rises.length >= 3 && (
                <span style={{ fontSize: 9, color: "#6366f1", marginLeft: "auto" }}>3차↑ 주의</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* MA 상태 + 거래량 카드 (4개) */}
      <div style={{ padding: "3px 10px 0", display: "flex", gap: 4, flexShrink: 0 }}>
        {([{ label:"5MA", st: maStatus5, col:"#7048e8", gap: gap5 }, { label:"10MA", st: maStatus10, col:"#f97316", gap: gap10 }, { label:"240MA", st: maStatus240, col:"#adb5bd", gap: gap240 }]).map(({ label, st, col, gap }) => {
          const isOver10 = label === "10MA" && overheat10;
          const fmtGap = (g: number | null) => g === null ? "—" : (g >= 0 ? "+" : "") + g.toFixed(1) + "%";
          const gapColor = gap === null ? C.muted : gap > 0 ? "#e03131" : "#1971c2";
          return (
            <div key={label} style={{ flex: 1, borderRadius: 9, border: `1px solid ${isOver10 ? "#fb923c44" : (st ? st.color + "44" : C.border)}`, background: isOver10 ? "#fff7ed" : (st ? st.bg : C.surface), padding: "5px 7px" }}>
              <div style={{ fontSize: 9, color: col, fontWeight: 700, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: (st as {bold?:boolean})?.bold ? 12 : 11, fontWeight: (st as {bold?:boolean})?.bold ? 800 : 600, color: st?.color ?? C.muted }}>{st?.status ?? "—"}</div>
              <div style={{ fontSize: 10, color: gapColor, marginTop: 1, fontWeight: 600 }}>이격 {fmtGap(gap)}</div>
              {isOver10 && <div style={{ fontSize: 7, color: "#c2410c", marginTop: 0, fontWeight: 700 }}>⚠️ 과열주의</div>}
            </div>
          );
        })}
        {/* 거래량 카드 */}
        {(() => {
          const volState = volMassiveSell
            ? { label: "대량 매도", color: "#e03131", bg: "#fff5f5", icon: "🔴", sub: "세력 이탈 주의" }
            : volSurge && lastCandle && lastCandle.close >= lastCandle.open
            ? { label: "거래량 급증", color: "#2f9e44", bg: "#f0fdf4", icon: "📈", sub: "양봉 돌파 신호" }
            : volSurge
            ? { label: "거래량 급증", color: "#f97316", bg: "#fff4e6", icon: "⚠️", sub: "음봉+급증 주의" }
            : volShrink
            ? { label: "거래량 수축", color: "#7048e8", bg: "#f3f0ff", icon: "💤", sub: "방향 확인 대기" }
            : { label: "거래량 보통", color: "#868e96", bg: "#f8f9fa", icon: "➡️", sub: "특이 신호 없음" };
          return (
            <div style={{ flex: 1, borderRadius: 9, border: `1px solid ${volState.color}44`, background: volState.bg, padding: "5px 7px" }}>
              <div style={{ fontSize: 9, color: volState.color, fontWeight: 700, marginBottom: 2 }}>거래량</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: volState.color }}>{volState.icon} {volState.label}</div>
              <div style={{ fontSize: 8, color: volState.color, marginTop: 0, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{volState.sub}</div>
            </div>
          );
        })()}
      </div>

      {/* 추세 진단 하단 시트 오버레이 */}
      {diagnosis && diagOpen && (
        <div
          onClick={() => setDiagOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: C.bg, borderRadius: "16px 16px 0 0", padding: "0 16px 32px", maxHeight: "60dvh", overflowY: "auto" }}
          >
            {/* 핸들 + 헤더 */}
            <div style={{ display: "flex", alignItems: "center", paddingTop: 10, paddingBottom: 10 }}>
              <div style={{ flex: 1 }} />
              <div style={{ width: 36, height: 4, background: C.border2, borderRadius: 2 }} />
              <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setDiagOpen(false)}
                  style={{
                    background: C.surface, border: `1px solid ${C.border2}`,
                    borderRadius: 20, width: 28, height: 28,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 14, color: C.muted, fontFamily: "inherit",
                  }}
                >✕</button>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>📊 추세 진단</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: diagnosis.stageColor + "12", border: `1px solid ${diagnosis.stageColor}33` }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>추세 단계</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: diagnosis.stageColor }}>{diagnosis.stageIcon} {diagnosis.stage}</div>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: diagnosis.buyFitColor + "12", border: `1px solid ${diagnosis.buyFitColor}33` }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>매수 적합도</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: diagnosis.buyFitColor }}>{diagnosis.buyFit}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.sub, padding: "10px 12px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, lineHeight: 1.7, marginBottom: 8 }}>
              <div>💬 {diagnosis.buyReason}</div>
              <div style={{ color: C.accent, marginTop: 3 }}>→ {diagnosis.suggestion}</div>
              {diagnosis.risk && <div style={{ color: "#c2410c", marginTop: 3 }}>{diagnosis.risk}</div>}
            </div>
            {/* ── 거래량 분석 섹션 ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 6 }}>📊 거래량 분석</div>

              {/* 거래량 바 (항상 표시) */}
              <div style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: C.sub }}>현재 거래량 / 20봉 평균</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: volMassiveSell ? "#e03131" : volSurge ? "#2f9e44" : C.muted }}>
                    {Math.round(volRatio * 100)}%
                  </span>
                </div>
                <div style={{ height: 6, background: "#e9ecef", borderRadius: 3, marginBottom: 4 }}>
                  <div style={{ width: `${Math.min(volRatio / 2.5 * 100, 100)}%`, height: "100%", borderRadius: 3,
                    background: volMassiveSell ? "#e03131" : volSurge ? "#2f9e44" : volShrink ? "#7048e8" : "#adb5bd" }} />
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>
                  {volMassiveSell ? "⚠️ 기준 150% 초과 + 음봉 — 대량 매도 출현" :
                   volSurge && lastCandle && lastCandle.close >= lastCandle.open ? "✅ 기준 150% 초과 + 양봉 — 추세 신뢰도 높음" :
                   volSurge ? "⚠️ 기준 150% 초과 + 음봉 — 매도 압력 주의" :
                   volShrink ? "💤 4봉 연속 50% 이하 — 방향 확인 대기" :
                   volDecreasing ? "↘ 거래량 감소 — 매도세 약화" : "→ 보통 수준"}
                </div>
              </div>

              {/* 케이스 1: 골든크로스 + 거래량 */}
              {goldenCross && (
                <div style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${volSurge ? "#bbf7d0" : "#fca5a5"}`, background: volSurge ? "#f0fdf4" : "#fff5f5", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: volSurge ? "#166534" : "#991b1b", marginBottom: 4 }}>
                    {volSurge ? "✅ 거래량 확인 돌파 (182%)" : `⚠️ 거래량 미확인 돌파 (${Math.round(volRatio * 100)}%)`}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    <div style={{ flex: 1, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                      <div style={{ color: C.muted }}>추세 신호</div>
                      <div style={{ fontWeight: 700, color: volSurge ? "#166534" : "#991b1b" }}>{volSurge ? "강함" : "약함"}</div>
                    </div>
                    <div style={{ flex: 1, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                      <div style={{ color: C.muted }}>매수 적합</div>
                      <div style={{ fontWeight: 700, color: volSurge ? "#166534" : "#f97316" }}>{volSurge ? "✅ 적합" : "⏳ 대기"}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    {volSurge ? "돌파 매수 조건 충족 — 1차 매수 진입 고려" : "거래량 부족 — 눌림 확인 후 재진입 대기 (150% 필요)"}
                  </div>
                </div>
              )}

              {/* 케이스 2: 상승 추세 + 거래량 흐름 */}
              {!goldenCross && above10 && (
                <div style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${volDecreasing ? "#bbf7d0" : C.border}`, background: volDecreasing ? "#f0fdf4" : C.bg, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: volDecreasing ? "#166534" : C.sub, marginBottom: 4 }}>
                    {volDecreasing ? "📉 거래량 감소 중 (눌림목 신호)" : "📊 상승 추세 + 거래량 흐름"}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    <div style={{ flex: 1, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.7)", border: `1px solid ${C.border}`, fontSize: 10 }}>
                      <div style={{ color: C.muted }}>거래량 상태</div>
                      <div style={{ fontWeight: 700, color: volDecreasing ? "#166534" : C.text }}>
                        {volMassiveSell ? "대량 매도" : volSurge ? "급증" : volShrink ? "수축" : volDecreasing ? "감소" : "보통"}
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.7)", border: `1px solid ${C.border}`, fontSize: 10 }}>
                      <div style={{ color: C.muted }}>추가 매수</div>
                      <div style={{ fontWeight: 700, color: volDecreasing ? "#166534" : "#f97316" }}>
                        {volDecreasing ? "✅ 검토" : volMassiveSell ? "❌ 자제" : "➡️ 유지"}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    {volDecreasing ? "거래량 감소 눌림 — 분할 매수 적기 (5%)" : volMassiveSell ? "대량 매도 출현 — 비중 축소 검토" : "비중 유지 / 이탈 시 손절"}
                  </div>
                </div>
              )}

              {/* 케이스 3: 거래량 수축 */}
              {volShrink && (
                <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d0bfff", background: "#f3f0ff", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 3 }}>💤 거래량 수축 구간</div>
                  <div style={{ fontSize: 10, color: "#534AB7", marginBottom: 2 }}>4봉 연속 20봉 평균의 50% 이하</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    <div style={{ flex: 1, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                      <div style={{ color: C.muted }}>수축 강도</div>
                      <div style={{ fontWeight: 700, color: C.accent }}>{Math.round(volRatio * 100)}%</div>
                    </div>
                    <div style={{ flex: 1, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                      <div style={{ color: C.muted }}>전략</div>
                      <div style={{ fontWeight: 700, color: C.accent }}>관망</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#534AB7" }}>큰 방향성 변동 임박 — 돌파 방향 확인 후 진입</div>
                </div>
              )}

              {/* 케이스 4: 대량 매도 */}
              {volMassiveSell && (
                <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #fca5a5", background: "#fff5f5", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 3 }}>🔴 대량 매도 출현</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    <div style={{ flex: 1, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                      <div style={{ color: C.muted }}>세력 이탈</div>
                      <div style={{ fontWeight: 700, color: "#e03131" }}>가능성 높음</div>
                    </div>
                    <div style={{ flex: 1, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                      <div style={{ color: C.muted }}>대응</div>
                      <div style={{ fontWeight: 700, color: "#e03131" }}>매도 검토</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#c2410c" }}>
                    {above240 ? "240MA 위 → 단기 조정 가능성, 비중 축소 검토" : "240MA 아래 → 추세 이탈 가능, 매도 검토"}
                  </div>
                </div>
              )}
            </div>

            {/* ── 3봉 패턴 + 급등이탈 섹션 ── */}
            {(threeBarPattern || isBreakAbove5MA) && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 6 }}>🕯️ 캔들 패턴</div>
                {threeBarPattern && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${threeBarPattern.color}44`, background: threeBarPattern.bg, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: threeBarPattern.color }}>
                        {threeBarPattern.icon} {threeBarPattern.label} 패턴{threeBarPattern.strong ? " ⭐" : ""}
                      </div>
                      {(() => {
                        const bars = threeBarPattern.type === "양음양"
                          ? [{ h: 16, up: true }, { h: 10, up: false }, { h: 20, up: true }]
                          : [{ h: 16, up: false }, { h: 10, up: true }, { h: 20, up: false }];
                        return (
                          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 24 }}>
                            {bars.map((b, i) => (
                              <div key={i} style={{ width: 7, height: b.h, borderRadius: 2, background: b.up ? "#e03131" : "#1971c2" }} />
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ fontSize: 10, color: threeBarPattern.color, marginBottom: 3 }}>{threeBarPattern.desc}</div>
                    <div style={{ fontSize: 10, color: "#495057", background: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "4px 8px" }}>
                      → {threeBarPattern.suggestion}
                    </div>
                  </div>
                )}
                {isBreakAbove5MA && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #fca5a5", background: "#fff5f5", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 3 }}>🚨 급등 후 5MA 이탈</div>
                    <div style={{ fontSize: 10, color: "#991b1b" }}>최근 10봉 내 +30% 이상 급등 후 5MA 하향 이탈</div>
                    <div style={{ fontSize: 10, color: "#c2410c", marginTop: 2, fontWeight: 700 }}>→ 전량 매도 권고 — 추세 전환 가능성</div>
                  </div>
                )}
              </div>
            )}

            {!ma240Cur && (
              <div style={{ padding: "8px 12px", background: "#f8f9fa", borderRadius: 10, border: "1px solid #e9ecef", fontSize: 11, color: "#868e96", marginBottom: 8 }}>
                ℹ️ 월봉은 240봉 데이터가 부족하여 240MA 없이 진행됩니다.
              </div>
            )}
            {mission && missionHit && (
              <div style={{ padding: "10px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 700, color: C.green }}>
                🎯 미션 조건 달성! 지금이 {MISSIONS.find(m => m.id === mission)?.title} 타이밍입니다
              </div>
            )}
          </div>
        </div>
      )}

      {/* 매매 패널 */}
      <div style={{ padding: "3px 10px 6px", flexShrink: 0 }}>
        <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "8px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9, padding: "6px 10px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {candleState && <span style={{ fontSize: 13 }}>{candleState.icon}</span>}
                <div style={{ fontSize: 13, fontWeight: 800, color: isUp ? C.red : C.blue }}>
                  {isQQQ ? fmtUSD(currentPrice) : fmtKRW(currentPrice)}
                  {isQQQ && <span style={{ fontSize: 9, color: C.muted, marginLeft: 4 }}>≈ {fmtKRW(krwPrice)}</span>}
                </div>
              </div>
              {volMassiveSell
                ? <div style={{ fontSize: 9, color: "#e03131", fontWeight: 700, marginTop: 1 }}>⚠️ 대량 매도 출현 — 세력 이탈 가능</div>
                : isBreakAbove5MA
                ? <div style={{ fontSize: 9, color: "#1971c2", fontWeight: 700, marginTop: 1 }}>🚨 급등 후 5MA 이탈 — 전량 매도 고려</div>
                : threeBarPattern
                ? <div style={{ fontSize: 9, color: threeBarPattern.color, fontWeight: 700, marginTop: 1 }}>
                    {threeBarPattern.icon} {threeBarPattern.label} — {threeBarPattern.desc}
                  </div>
                : candleState && <div style={{ fontSize: 9, color: C.sub, marginTop: 1 }}>{candleState.label} · {candleState.desc}</div>
              }
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setShowPatternMarks(v => !v)} style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: showPatternMarks ? "#f3f0ff" : "#f8f9fa",
                  border: `1px solid ${showPatternMarks ? "#7048e8" : "#dee2e6"}`,
                  borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit",
                }}>
                  <span style={{ fontSize: 11 }}>🔍</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: showPatternMarks ? "#7048e8" : "#868e96" }}>패턴</span>
                </button>
                {/* 줄다리기 버튼 — 숨김 처리 (필요 시 주석 해제) */}
              </div>
              <div style={{ fontSize: 8, color: C.muted }}>현금최대 / {buyPct}%</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: C.accent }}>{buyableQty.toLocaleString()}</span>
                <span style={{ color: C.muted, fontSize: 10 }}>주 / </span>
                <span style={{ color: C.text }}>{buyablePctQty(buyPct).toLocaleString()}</span>
                <span style={{ color: C.muted, fontSize: 10 }}>주</span>
              </div>
            </div>
          </div>

          {/* 추세 진단 버튼 */}
          {diagnosis && (
            <button onClick={() => setDiagOpen(true)} style={{
              width: "100%", marginBottom: 8, padding: "9px 14px",
              borderRadius: 8, border: `1.5px solid #7048e8`,
              background: "#f3f0ff", color: C.accent,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: "0 1px 4px rgba(112,72,232,0.15)",
              transition: "opacity .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            onTouchStart={e => { e.currentTarget.style.opacity = "0.7"; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>📊</span>
                <span>추세 진단</span>
                <span style={{ fontSize: 10, background: "#7048e8", color: "#fff", borderRadius: 4, padding: "1px 6px" }}>탭하기</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: diagnosis.buyFitColor, fontWeight: 800 }}>{diagnosis.buyFit}</span>
                <span style={{ fontSize: 13 }}>↑</span>
              </span>
            </button>
          )}

          <div style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: C.muted }}>매수 비중</div>
              {previewQty > 0 && <div style={{ fontSize: 10, color: C.accent }}>→ <b>{previewQty.toLocaleString()}주</b> · {fmtKRW(previewQty * krwPrice)}</div>}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[5,10,15].map(p => {
                const a = buyMode === "pct" && buyPct === p;
                return <button key={p} onClick={() => { setBuyPct(p); setBuyMode("pct"); setCustomQty(""); }} style={{ padding: "6px 14px", borderRadius: 7, border: `1.5px solid ${a ? C.red : C.border2}`, background: a ? C.redBg : C.bg, color: a ? C.red : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{p}%</button>;
              })}
              <input type="number" placeholder="직접 입력 (주)" value={customQty} onChange={e => { setCustomQty(e.target.value); setBuyMode("qty"); }}
                style={{ flex: 1, minWidth: 80, padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${buyMode === "qty" ? C.red : C.border2}`, background: C.bg, color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
            </div>
          </div>

          <div style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: C.muted }}>매도 방식</span>
              {isBreakAbove5MA && (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: "#e03131", borderRadius: 5, padding: "1px 6px" }}>
                  🚨 전량 매도 권고
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {([["all", isBreakAbove5MA ? "🚨 전량 매도" : "전체 매도"], ["half","◑ 절반 매도"]] as const).map(([k,v]) => {
                const a = sellMode === k;
                const isFullSell = k === "all" && isBreakAbove5MA;
                return <button key={k} onClick={() => setSellMode(k)} style={{
                  padding: "6px 12px", borderRadius: 7,
                  border: `1.5px solid ${isFullSell ? "#e03131" : a ? C.blue : C.border2}`,
                  background: isFullSell ? "#fff5f5" : a ? C.blueBg : C.bg,
                  color: isFullSell ? "#e03131" : a ? C.blue : C.sub,
                  fontSize: 11, cursor: "pointer", fontWeight: (a || isFullSell) ? 700 : 400, fontFamily: "inherit"
                }}>{v}</button>;
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
            <button onClick={doBuy} style={{ padding: "13px 0", borderRadius: 10, border: "none", background: C.red, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(224,49,49,.25)", fontFamily: "inherit" }}>매수</button>
            <button onClick={doSell} disabled={holdings <= 0} style={{ padding: "13px 0", borderRadius: 10, border: "none", background: holdings > 0 ? C.blue : C.border, color: holdings > 0 ? "#fff" : C.muted, fontSize: 14, fontWeight: 800, cursor: holdings > 0 ? "pointer" : "default", fontFamily: "inherit" }}>매도</button>
            <button onClick={nextTurn} style={{ padding: "13px 0", borderRadius: 10, border: `1.5px solid ${C.border2}`, background: turn >= MAX_TURNS - 1 ? C.text : C.bg, color: turn >= MAX_TURNS - 1 ? "#fff" : C.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{turn >= MAX_TURNS - 1 ? "결과 보기" : "▶ 다음 턴"}</button>
          </div>
        </div>
      </div>
      {/* /하단 고정 영역 */}
      </div>
    </div>
  );
}
