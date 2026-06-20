"use client";

import React, { useState, useRef } from "react";
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
interface TurnScore { score: number; maxScore: number; reasons?: Reason[]; action?: string; diagnosis?: Diagnosis | null; }
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
    { name: "삼성전자", ticker: "005930.KS" },
    { name: "SK하이닉스", ticker: "000660.KS" },
    { name: "현대차", ticker: "005380.KS" },
    { name: "카카오", ticker: "035720.KS" },
    { name: "셀트리온", ticker: "068270.KS" },
    { name: "KB금융", ticker: "105560.KS" },
    { name: "NAVER", ticker: "035420.KS" },
    { name: "LG화학", ticker: "051910.KS" },
    { name: "기아", ticker: "000270.KS" },
    { name: "삼성SDI", ticker: "006400.KS" },
  ],
  QQQ: [
    { name: "Apple", ticker: "AAPL" },
    { name: "Microsoft", ticker: "MSFT" },
    { name: "NVIDIA", ticker: "NVDA" },
    { name: "Amazon", ticker: "AMZN" },
    { name: "Tesla", ticker: "TSLA" },
    { name: "Meta", ticker: "META" },
    { name: "Alphabet", ticker: "GOOGL" },
    { name: "Netflix", ticker: "NFLX" },
    { name: "Broadcom", ticker: "AVGO" },
    { name: "AMD", ticker: "AMD" },
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
  const period1 = Math.floor(new Date("2010-01-01").getTime() / 1000);
  const period2 = Math.floor(new Date("2023-12-31").getTime() / 1000);
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
  } else if (action === "sell") {
    maxScore = has240 ? 40 : 35;
    if (snap.deadCross) { score += 20; reasons.push({ ok: true, text: "데드크로스 매도 (+20)" }); }
    if (!snap.above10)          { score += 15; reasons.push({ ok: true,  text: "10MA 이탈 후 매도 (+15)" }); }
    else if (snap.above5 === false) { score += 10; reasons.push({ ok: true, text: "5MA 이탈 — 절반 매도 전략 (+10)" }); }
    else if (snap.above5 === true)  { score +=  0; reasons.push({ ok: null, text: "5MA 위 매도 — 추세 중 조기 청산 (중립)" }); }
    if (has240) {
      if (!snap.above240) { score += 5; reasons.push({ ok: true, text: "240MA 아래 청산 (+5)" }); }
    } else { reasons.push({ ok: null, text: "240MA 데이터 부족 — 해당 항목 제외" }); }
  } else {
    maxScore = has240 ? 20 : 15;
    if (has240) {
      if (!snap.above240)    { score += 20; reasons.push({ ok: true,  text: "240MA 아래 관망 정석 (+20)" }); }
      else if (!snap.above10){ score += 10; reasons.push({ ok: true,  text: "10MA 이탈 관망 (+10)" }); }
      else                   { score +=  5; reasons.push({ ok: false, text: "상승 추세 중 관망 (+5, 기회 놓침)" }); }
    } else {
      if (!snap.above10){ score += 15; reasons.push({ ok: true,  text: "10MA 이탈 관망 (+10)" }); }
      else              { score +=  5; reasons.push({ ok: false, text: "상승 추세 중 관망 (+5, 기회 놓침)" }); }
      reasons.push({ ok: null, text: "240MA 데이터 부족 — 해당 항목 제외" });
    }
  }
  const clampedScore = Math.max(0, Math.min(maxScore, score));
  return { score: clampedScore, maxScore, reasons, action, diagnosis };
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
function CandleChart({ candles, ma5, ma10, ma240, width = 700, height = 270, style, svgHeight }: { candles: Candle[]; ma5: (number|null)[]; ma10: (number|null)[]; ma240: (number|null)[]; width?: number; height?: number; style?: React.CSSProperties; svgHeight?: string }) {
  if (!candles.length) return null;
  const PAD = { l: 10, r: 50, t: 8, b: 8 };
  const W = width - PAD.l - PAD.r, H = height - PAD.t - PAD.b, n = candles.length;
  const allP = candles.flatMap(c => [c.high, c.low]);
  const maV  = [...ma5, ...ma10, ...ma240].filter((v): v is number => v != null);
  const minP = Math.min(...allP, ...maV) * 0.995;
  const maxP = Math.max(...allP, ...maV) * 1.005;
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
      {lbls.map((l, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={l.y} x2={PAD.l + W} y2={l.y} stroke="#e9ecef" strokeWidth="1" />
          <text x={PAD.l + W + 4} y={l.y + 4} fontSize="9" fill="#adb5bd">{l.label}</text>
        </g>
      ))}
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

function VolumeChart({ candles, width = 700, height = 48, interval = "1wk" }: { candles: Candle[]; width?: number; height?: number; interval?: string }) {
  if (!candles.length) return null;
  const LABEL_H = 14;
  const PAD = { l: 10, r: 66, t: 2, b: LABEL_H };
  const W = width - PAD.l - PAD.r, H = height - PAD.t - PAD.b;
  const n = candles.length, maxV = Math.max(...candles.map(c => c.vol), 1), cw = Math.max(2, (W / n) * 0.7);
  const sx = (i: number) => PAD.l + (i / Math.max(n - 1, 1)) * W;

  // 연도 레이블: 주봉은 1월 첫 주, 월봉은 1월
  const yearLabels: { x: number; year: number }[] = [];
  let lastYear = -1;
  candles.forEach((c, i) => {
    const d = c.date;
    const yr = d.getFullYear();
    const mo = d.getMonth(); // 0=1월
    const isYearStart = interval === "1mo" ? mo === 0 : (mo === 0 && d.getDate() <= 14);
    if (isYearStart && yr !== lastYear) {
      yearLabels.push({ x: sx(i), year: yr });
      lastYear = yr;
    }
  });

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {/* 거래량 바 */}
      {candles.map((c, i) => {
        const x = sx(i), bH = (c.vol / maxV) * H;
        return <rect key={i} x={x - cw / 2} y={PAD.t + H - bH} width={cw} height={bH} fill={c.close >= c.open ? "#e0313155" : "#1971c255"} />;
      })}
      {/* 연도 레이블 */}
      {yearLabels.map(({ x, year }) => (
        <g key={year}>
          <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + H} stroke="#dee2e6" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x={x + 2} y={height - 2} fontSize="8" fill="#adb5bd">{year}</text>
        </g>
      ))}
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

function ResultReport({ trades, turnScores, totalAsset, initCash, stockMeta, market, interval, startDate, endDate, onClose, onRestart }: {
  trades: Trade[]; turnScores: TurnScore[]; totalAsset: number; initCash: number;
  stockMeta: StockMeta | null; market: string; interval: string;
  startDate: Date | undefined; endDate: Date | undefined;
  onClose: () => void; onRestart: () => void;
}) {
  const pnl = ((totalAsset / initCash) - 1) * 100;
  const avgTurnScore = turnScores.length ? Math.round(turnScores.reduce((s, t) => s + t.score, 0) / turnScores.length) : 0;
  const totalMaxScore = turnScores.reduce((s, t) => s + t.maxScore, 0);
  const totalGained   = turnScores.reduce((s, t) => s + t.score, 0);
  const followScore   = totalMaxScore > 0 ? Math.round((totalGained / totalMaxScore) * 100) : 0;
  const goodPoints: string[] = [], badPoints: string[] = [];
  trades.filter(t => t.type === "매수").forEach(t => {
    const snap = t.snap as Record<string, unknown>;
    if (snap?.ma240 != null) {
      if (snap?.above240)  goodPoints.push("240MA 위에서 매수");
      else                 badPoints.push("240MA 아래 매수 — 원칙 위반");
    }
    if (snap?.goldenCross) goodPoints.push("골든크로스 타점 매수");
    if (!snap?.above10)    badPoints.push("10MA 아래 매수 — 조기 진입");
  });
  trades.filter(t => t.type === "매도").forEach(t => {
    const snap = t.snap as Record<string, unknown>;
    if (!snap?.above10)              goodPoints.push("10MA 이탈 후 즉시 매도");
    else if (snap?.above5 === false) goodPoints.push("5MA 이탈 절반 매도 — 추세추종 전략");
    else if (snap?.above5 === true)  badPoints.push("5MA·10MA 위에서 매도 — 추세 중 조기 청산");
    if (snap?.deadCross)             goodPoints.push("데드크로스 매도 타이밍");
  });
  const dedupGood = [...new Set(goodPoints)], dedupBad = [...new Set(badPoints)];
  const iLabel = interval === "1wk" ? "주봉" : "월봉";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 12px 60px rgba(0,0,0,.2)", width: "min(480px, 96vw)", maxHeight: "90vh", overflowY: "auto", animation: "fadeInScale .2s ease" }}>
        <div style={{ background: "#f8f9fa", padding: "24px 24px 20px", borderBottom: "1px solid #e9ecef", borderRadius: "20px 20px 0 0", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#adb5bd", marginBottom: 4 }}>{market} · {stockMeta?.name} · {iLabel}</div>
          <div style={{ fontSize: 11, color: "#adb5bd", marginBottom: 12 }}>{fmtDate(startDate)} ~ {fmtDate(endDate)}</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: pnl >= 0 ? "#e03131" : "#1971c2" }}>{fmtPct(pnl)}</div>
          <div style={{ fontSize: 14, color: "#495057", marginTop: 4 }}>{fmtKRW(totalAsset)}</div>
        </div>
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["수익금", ((totalAsset - initCash) >= 0 ? "+" : "") + fmtKRW(totalAsset - initCash)], ["총 거래", trades.length + "회"], ["추세추종 점수", followScore + "점 / 100점"], ["평균 판단 점수", avgTurnScore + "점"]].map(([k, v]) => (
              <div key={k} style={{ background: "#f8f9fa", borderRadius: 10, padding: "12px 14px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: 11, color: "#adb5bd" }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
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
          {dedupGood.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 8 }}>✅ 잘한 것</div>
              {dedupGood.map((g, i) => <div key={i} style={{ fontSize: 12, padding: "6px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 5, color: "#166534" }}>· {g}</div>)}
            </div>
          )}
          {dedupBad.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>❌ 아쉬운 것</div>
              {dedupBad.map((b, i) => <div key={i} style={{ fontSize: 12, padding: "6px 12px", background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, marginBottom: 5, color: "#991b1b" }}>· {b}</div>)}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#212529", marginBottom: 8 }}>📋 매매내역</div>
            <div style={{ maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
              {!trades.length && <div style={{ color: "#adb5bd", textAlign: "center", padding: "16px 0", fontSize: 13 }}>거래 없음</div>}
              {trades.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "7px 12px", borderRadius: 8, background: t.type === "매수" ? "#fff5f5" : "#e7f5ff", border: `1px solid ${t.type === "매수" ? "#fca5a5" : "#74c0fc"}` }}>
                  <span style={{ fontWeight: 700, color: t.type === "매수" ? "#e03131" : "#1971c2" }}>{t.type}</span>
                  <span style={{ color: "#495057" }}>{t.qty}주</span>
                  <span style={{ color: "#495057" }}>{fmtKRW(t.krwPrice)}</span>
                  <span style={{ color: "#adb5bd" }}>{t.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1.5px solid #dee2e6", background: "#fff", color: "#212529", fontSize: 14, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>🏠 로비</button>
          <button onClick={onRestart} style={{ flex: 2, padding: "13px", borderRadius: 10, border: "none", background: "#212529", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>🔄 새 게임</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 메인 GameApp
// ══════════════════════════════════════════════════════════════════════════════
export default function GameApp({ initialMarket, initialInterval, initialMission, initialCash = 10_000_000, onGameEnd, onBackToLobby }: GameAppProps) {
  const INIT_CASH = initialCash, MAX_TURNS = 50, EXCHANGE = 1350;

  const [screen,       setScreen]      = useState<string>("loading");
  const [market,       setMarket]      = useState(initialMarket);
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
  const [lastGameAsset, setLastGameAsset] = useState<number>(INIT_CASH);
  const modalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const WINDOW = 36;

  const startGame = async (mkt: "KOSPI" | "QQQ", itv = intervalMode, ms = mission, nextCash?: number) => {
    const isQ = mkt === "QQQ";
    setLoadErr(""); setScreen("loading");
    const shuffled = [...UNIVERSE[mkt]].sort(() => Math.random() - 0.5);
    for (const candidate of shuffled) {
      try {
        const candles = await fetchCandles(candidate.ticker, itv);
        const isMonthly = itv === "1mo";
        const MA_MIN = isMonthly ? 15 : 250;
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
        setMarket(mkt); setIsQQQ(isQ); setIntervalMode(itv); setMission(ms);
        setStockMeta(candidate); setAllCandles(candles);
        setGameStart(validStart); setCurIdx(validStart);
        setCash(nextCash ?? INIT_CASH); setHoldings(0); setAvgCostKRW(0);
        setTrades([]); setTurnScores([]);
        setBuyPct(10); setCustomQty(""); setBuyMode("pct"); setSellMode("all");
        setTurn(0); setTradeModal(null); setScoreModal(null); setShowResult(false);
        setScreen("game"); return;
      } catch { continue; }
    }
    setLoadErr("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    setScreen("lobby");
  };

  // 게임 시작 시 자동으로 데이터 로드
  useState(() => { startGame(initialMarket, initialInterval, initialMission); });

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
  const overheat10  = gap10 !== null && gap10 > 10;
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

  const diagnosis = diagnoseTrend(currentPrice, prevPrice, ma5Cur ?? null, ma10Cur ?? null, ma240Cur ?? null, ma5Prev ?? null, ma10Prev ?? null, lastCandle, visibleCandles);
  const above5 = ma5Cur ? currentPrice > ma5Cur : null;
  const snap: Record<string, unknown> = { price: currentPrice, prevPrice, ma5: ma5Cur, ma10: ma10Cur, ma240: ma240Cur, prevMa5: ma5Prev, prevMa10: ma10Prev, above240, above5, above10, goldenCross, deadCross, nearMA10, volDecreasing };

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
  };

	const nextTurn = () => {
	  const lastTrade = trades[trades.length - 1];
	  const didTradeThisTurn = lastTrade && lastTrade.turn === turn;

	  // 최신 turnScores 직접 계산 (클로저 문제 방지)
	  const latestScores = didTradeThisTurn
		? turnScores
		: [...turnScores, scoreTurnAction("hold", snap, diagnosis)];

	  if (!didTradeThisTurn) {
		setTurnScores(latestScores);
	  }

	  if (turn >= MAX_TURNS - 1) {
		setShowResult(true);
		const totalMaxScore = latestScores.reduce((s, t) => s + t.maxScore, 0);
		const totalGained   = latestScores.reduce((s, t) => s + t.score, 0);
		const followScore   = totalMaxScore > 0 ? Math.round((totalGained / totalMaxScore) * 100) : 0;
		setLastGameAsset(totalAsset);
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
    <div style={{ height: "100dvh", background: C.bg, color: C.text, fontFamily: "'Pretendard','Noto Sans KR',sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@keyframes fadeInScale{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <TradeModal msg={tradeModal} />
      {scoreModal && <ScoreModal data={scoreModal} onClose={() => setScoreModal(null)} />}
      {showResult && (
        <ResultReport
          trades={trades} turnScores={turnScores} totalAsset={totalAsset} initCash={INIT_CASH}
          stockMeta={stockMeta} market={market} interval={intervalMode}
          startDate={gameStartDate} endDate={gameEndDate}
          onClose={onBackToLobby}
          onRestart={() => startGame(market, intervalMode, mission, lastGameAsset)}
        />
      )}

      {/* 헤더 */}
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "5px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <button onClick={onBackToLobby} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: "2px 6px", fontFamily: "inherit" }}>← 로비</button>
          <span style={{ fontWeight: 700, fontSize: 14 }}>차트게임 {isQQQ ? "🇺🇸" : "🇰🇷"}</span>
          <span style={{ fontSize: 10, color: C.muted, background: C.surface, padding: "2px 7px", borderRadius: 5, border: `1px solid ${C.border}` }}>{market}</span>
          <span style={{ fontSize: 10, color: C.accent, background: "#f3f0ff", padding: "2px 7px", borderRadius: 5, border: "1px solid #d0bfff" }}>{intervalLabel}</span>
          {mission && <span style={{ fontSize: 10, color: C.green, background: "#f0fdf4", padding: "2px 7px", borderRadius: 5, border: "1px solid #bbf7d0" }}>{MISSIONS.find(m => m.id === mission)?.icon} {MISSIONS.find(m => m.id === mission)?.title}</span>}
          <span style={{ fontSize: 10, color: C.sub, background: C.surface, padding: "2px 8px", borderRadius: 5, border: `1px solid ${C.border}` }}>📅 {fmtDate(curDate)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.sub }}>턴 <b>{turn + 1}</b>/{MAX_TURNS}</span>
          <div style={{ width: 72, height: 4, background: C.border, borderRadius: 2 }}>
            <div style={{ width: `${((turn + 1) / MAX_TURNS) * 100}%`, height: "100%", background: C.accent, borderRadius: 2, transition: "width .3s" }} />
          </div>
        </div>
      </div>

      {/* 자산 요약 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "4px 10px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, color: C.muted }}>총 자산</div>
          {isQQQ ? <><div style={{ fontSize: 12, fontWeight: 700, color: pnlColor }}>{fmtUSD(totalAsset / EXCHANGE)}</div><div style={{ fontSize: 9, color: C.muted }}>({fmtKRW(totalAsset)})</div></> : <div style={{ fontSize: 12, fontWeight: 700, color: pnlColor }}>{fmtKRW(totalAsset)}</div>}
        </div>
        <div><div style={{ fontSize: 9, color: C.muted }}>수익률</div><div style={{ fontSize: 12, fontWeight: 700, color: pnlColor }}>{fmtPct(pnlPct)}</div></div>
        <div>
          <div style={{ fontSize: 9, color: C.muted }}>현금</div>
          {isQQQ ? <><div style={{ fontSize: 12, fontWeight: 700 }}>{fmtUSD(cash / EXCHANGE)}</div><div style={{ fontSize: 9, color: C.muted }}>({fmtKRW(cash)})</div></> : <div style={{ fontSize: 12, fontWeight: 700 }}>{fmtKRW(cash)}</div>}
        </div>
        <div><div style={{ fontSize: 9, color: C.muted }}>보유</div><div style={{ fontSize: 12, fontWeight: 700 }}>{holdings}주</div></div>
        <div>
          <div style={{ fontSize: 9, color: C.muted }}>평단</div>
          {avgCostKRW > 0 ? (isQQQ ? <><div style={{ fontSize: 12, fontWeight: 700 }}>{fmtUSD(avgCostKRW / EXCHANGE)}</div><div style={{ fontSize: 9, color: C.muted }}>({fmtKRW(avgCostKRW)})</div></> : <div style={{ fontSize: 12, fontWeight: 700 }}>{fmtKRW(avgCostKRW)}</div>) : <div style={{ fontSize: 12, fontWeight: 700 }}>—</div>}
        </div>
        <div><div style={{ fontSize: 9, color: C.muted }}>평가손익</div><div style={{ fontSize: 12, fontWeight: 700, color: holdPnlPct >= 0 ? C.red : C.blue }}>{avgCostKRW > 0 ? fmtPct(holdPnlPct) : "—"}</div></div>
      </div>

      {/* 차트 */}
      <div style={{ padding: "4px 10px 0", flexShrink: 0 }}>
        <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
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
          <CandleChart candles={chartCandles} ma5={chartMa5} ma10={chartMa10} ma240={chartMa240} svgHeight="calc(100dvh - 418px)" />
          <div style={{ borderTop: `1px solid ${C.border}`, flexShrink: 0 }}><VolumeChart candles={chartCandles} height={28} interval={intervalMode} /></div>
        </div>
      </div>

      {/* 캔들 상태 + MA 상태 */}
      {candleState && (
        <div style={{ padding: "4px 10px 0", display: "flex", gap: 5, flexShrink: 0 }}>
          <div style={{ flex: "0 0 auto", minWidth: 118, background: candleState.bg, borderRadius: 9, border: `1px solid ${candleState.color}33`, padding: "8px 10px", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16 }}>{candleState.icon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: candleState.color }}>{candleState.label}</div>
              <div style={{ fontSize: 10, color: C.sub }}>{candleState.desc}</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", gap: 5 }}>
            {([{ label:"5MA", st: maStatus5, col:"#7048e8", gap: gap5 }, { label:"10MA", st: maStatus10, col:"#f97316", gap: gap10 }, { label:"240MA", st: maStatus240, col:"#adb5bd", gap: gap240 }]).map(({ label, st, col, gap }) => {
              const isOver10 = label === "10MA" && overheat10;
              const fmtGap = (g: number | null) => g === null ? "—" : (g >= 0 ? "+" : "") + g.toFixed(1) + "%";
              const gapColor = gap === null ? C.muted : gap > 0 ? "#e03131" : "#1971c2";
              return (
                <div key={label} style={{ flex: 1, borderRadius: 9, border: `1px solid ${isOver10 ? "#fb923c44" : (st ? st.color + "44" : C.border)}`, background: isOver10 ? "#fff7ed" : (st ? st.bg : C.surface), padding: "7px 8px" }}>
                  <div style={{ fontSize: 9, color: col, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: (st as {bold?:boolean})?.bold ? 12 : 11, fontWeight: (st as {bold?:boolean})?.bold ? 800 : 600, color: st?.color ?? C.muted }}>{st?.status ?? "—"}</div>
                  <div style={{ fontSize: 10, color: gapColor, marginTop: 2, fontWeight: 600 }}>이격 {fmtGap(gap)}</div>
                  {isOver10 && <div style={{ fontSize: 9, color: "#c2410c", marginTop: 2, fontWeight: 700, lineHeight: 1.3 }}>⚠️ 과열 매수 주의</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
      <div style={{ padding: "4px 10px 10px", flexShrink: 0 }}>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9, padding: "7px 10px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 9, color: C.muted }}>현재 주가</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: isUp ? C.red : C.blue }}>
                {isQQQ ? fmtUSD(currentPrice) : fmtKRW(currentPrice)}
                {isQQQ && <span style={{ fontSize: 9, color: C.muted, marginLeft: 5 }}>≈ {fmtKRW(krwPrice)}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: C.muted }}>현금최대 / {buyPct}%</div>
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
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>매도 방식</div>
            <div style={{ display: "flex", gap: 5 }}>
              {([["all","전체 매도"],["half","◑ 절반 매도"]] as const).map(([k,v]) => {
                const a = sellMode === k;
                return <button key={k} onClick={() => setSellMode(k)} style={{ padding: "6px 12px", borderRadius: 7, border: `1.5px solid ${a ? C.blue : C.border2}`, background: a ? C.blueBg : C.bg, color: a ? C.blue : C.sub, fontSize: 11, cursor: "pointer", fontWeight: a ? 700 : 400, fontFamily: "inherit" }}>{v}</button>;
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
    </div>
  );
}
