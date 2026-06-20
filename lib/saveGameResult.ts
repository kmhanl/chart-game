/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";

interface Trade {
  turn: number;
  type: "매수" | "매도";
  qty: number;
  krwPrice: number;
  snap: Record<string, unknown>;
  score?: number;
}

interface TurnScore {
  score: number;
  maxScore: number;
}

interface SaveGameResultParams {
  userId: string;
  trades: Trade[];
  turnScores: TurnScore[];
  totalAsset: number;
  market: string;
  stockMeta: { ticker: string; name: string };
  interval: string;
  mission: string | null;
  followScore: number;
}

const INIT_CASH = 10_000_000;

export async function saveGameResult({
  userId, trades, turnScores, totalAsset,
  market, stockMeta, interval, mission, followScore,
}: SaveGameResultParams): Promise<string | null> {
  const supabase = createClient() as any;
  const returnPct = ((totalAsset / INIT_CASH) - 1) * 100;

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      user_id:      userId,
      market,
      ticker:       stockMeta.ticker,
      ticker_name:  stockMeta.name,
      interval,
      mission:      mission ?? null,
      init_cash:    INIT_CASH,
      final_asset:  Math.round(totalAsset),
      return_pct:   parseFloat(returnPct.toFixed(2)),
      follow_score: followScore,
      total_trades: trades.length,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("[saveGameResult] game_sessions 저장 실패:", sessionError);
    return null;
  }

  if (trades.length > 0) {
    const { error: tradeError } = await supabase
      .from("trade_logs")
      .insert(
        trades.map((t, i) => ({
          session_id: session.id,
          turn:       t.turn,
          type:       t.type,
          qty:        t.qty,
          krw_price:  Math.round(t.krwPrice),
          score:      turnScores[i]?.score ?? 0,
          snap_json:  t.snap,
        }))
      );
    if (tradeError) console.warn("[saveGameResult] trade_logs 저장 실패:", tradeError);
  }

  return session.id;
}
