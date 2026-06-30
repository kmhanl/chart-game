"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { saveGameResult } from "@/lib/saveGameResult";
import GameApp from "@/components/GameApp";

interface GameResult {
  trades: Trade[]; turnScores: TurnScore[];
  totalAsset: number; market: string;
  stockMeta: { ticker: string; name: string };
  interval: string; mission: string | null; followScore: number;
}
interface Trade {
  turn: number; type: "매수" | "매도"; qty: number;
  krwPrice: number; snap: Record<string, unknown>;
}
interface TurnScore { score: number; maxScore: number; }

interface Props {
  user: User;
  initialMarket: "KOSPI" | "QQQ";
  initialInterval: "1wk" | "1mo";
  initialMission: string | null;
  initialCash?: number;
  customTicker?: string | null;
  customTickerName?: string | null;
}

export default function GameClient({
  user, initialMarket, initialInterval, initialMission, initialCash = 10_000_000,
  customTicker = null, customTickerName = null,
}: Props) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const handleGameEnd = useCallback(async (result: GameResult) => {
    try {
      const sessionId = await saveGameResult({
        userId: user.id,
        initCash: initialCash,
        ...result,
      });
      return sessionId;
    } catch (err) {
      console.error("게임 결과 저장 실패:", err);
      return null;
    }
  }, [user.id, initialCash]);

  const handleBackToLobby = useCallback(() => {
    setNavigating(true);
    router.push("/");
  }, [router]);

  if (navigating) return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif", gap: 16, background: "#fff",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 40, height: 40, border: "3px solid #e9ecef",
        borderTop: "3px solid #7048e8", borderRadius: "50%",
        animation: "spin .8s linear infinite",
      }} />
      <div style={{ color: "#495057", fontSize: 14 }}>로비로 이동 중...</div>
    </div>
  );

  return (
    <GameApp
      user={user}
      initialMarket={initialMarket}
      initialInterval={initialInterval}
      initialMission={initialMission}
      initialCash={initialCash}
      customTicker={customTicker}
      customTickerName={customTickerName}
      onGameEnd={handleGameEnd}
      onBackToLobby={handleBackToLobby}
    />
  );
}
