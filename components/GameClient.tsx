"use client";

// ──────────────────────────────────────────────────────────
// GameClient: 기존 App.jsx 게임 로직을 감싸는 래퍼
//
// App.jsx에서 수정이 필요한 부분:
//   1. export default function App() → export default function GameApp(props)
//   2. props로 user, initialMarket, initialInterval, initialMission 받기
//   3. ResultReport의 onClose/onRestart 전에 saveGameResult() 호출
//
// 이 파일은 그 브릿지 역할
// ──────────────────────────────────────────────────────────

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { saveGameResult } from "@/lib/saveGameResult";
import GameApp from "@/components/GameApp";

// ⬇️ App.jsx를 이 경로로 이동 후 named export로 변경
// import { GameApp } from "@/components/GameApp";
// 아직 이동 전이라면 아래 주석 해제 후 사용:
// import GameApp from "@/components/GameApp";

interface Props {
  user: User;
  initialMarket: "KOSPI" | "QQQ";
  initialInterval: "1wk" | "1mo";
  initialMission: string | null;
}

interface GameResult {
  trades: Trade[];
  turnScores: TurnScore[];
  totalAsset: number;
  market: string;
  stockMeta: { ticker: string; name: string };
  interval: string;
  mission: string | null;
  followScore: number;
}

interface Trade {
  turn: number;
  type: "매수" | "매도";
  qty: number;
  krwPrice: number;
  snap: Record<string, unknown>;
}

interface TurnScore {
  score: number;
  maxScore: number;
}

export default function GameClient({
  user,
  initialMarket,
  initialInterval,
  initialMission,
}: Props) {
  const router = useRouter();

  const handleGameEnd = useCallback(
    async (result: GameResult) => {
      try {
        const sessionId = await saveGameResult({
          userId: user.id,
          ...result,
        });
        // sessionId를 반환해 피드백 모달에서 사용
        return sessionId;
      } catch (err) {
        console.error("게임 결과 저장 실패:", err);
        return null;
      }
    },
    [user.id]
  );

  const handleBackToLobby = useCallback(() => {
    router.push("/");
  }, [router]);

  // ──────────────────────────────────────────────────────
  // TODO: App.jsx를 components/GameApp.tsx 로 이동 후 아래 주석 해제
  //
  return (
     <GameApp
       user={user}
       initialMarket={initialMarket}
       initialInterval={initialInterval}
       initialMission={initialMission}
       onGameEnd={handleGameEnd}
       onBackToLobby={handleBackToLobby}
     />
   );
  //
  // ──────────────────────────────────────────────────────
  // 임시: App.jsx가 이동되기 전까지 안내 표시
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      color: "#212529", gap: 16,
    }}>
      <div style={{ fontSize: 32 }}>⚙️</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>GameClient 연결 필요</div>
      <div style={{ fontSize: 13, color: "#868e96", textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
        App.jsx를 <code>components/GameApp.tsx</code>로 이동하고<br />
        이 파일의 주석을 해제하면 게임이 시작됩니다.
      </div>
      <div style={{ fontSize: 12, color: "#adb5bd" }}>
        시장: {initialMarket} · 봉: {initialInterval} · 유저: {user.email}
      </div>
      <button onClick={handleBackToLobby} style={{
        marginTop: 8, padding: "10px 24px", borderRadius: 8,
        border: "1.5px solid #dee2e6", background: "#fff",
        fontSize: 13, cursor: "pointer",
      }}>
        ← 로비로
      </button>
    </div>
  );
}
