// components/GameApp.tsx 상단에 추가
"use client";

// props 타입 추가
interface GameAppProps {
  user: User;
  initialMarket: "KOSPI" | "QQQ";
  initialInterval: "1wk" | "1mo";
  initialMission: string | null;
  onGameEnd: (result: GameResult) => Promise<string | null>;
  onBackToLobby: () => void;
}

// 함수 시그니처 변경
export default function GameApp({
  user,
  initialMarket,
  initialInterval,
  initialMission,
  onGameEnd,
  onBackToLobby,
}: GameAppProps) {
  // 기존 App() 내부 코드 그대로 유지
  // 단, 초기값 변경:
  const [market, setMarket] = useState(initialMarket);
  const [intervalMode, setIntervalMode] = useState(initialInterval);
  const [mission, setMission] = useState(initialMission);

  // ResultReport의 onClose를 onBackToLobby로 교체:
  // onClose={() => setScreen("lobby")} → onClose={onBackToLobby}

  // ResultReport 렌더 전에 onGameEnd 호출:
  // showResult && 를 조건으로 쓰는 곳에서
  // useEffect(() => { if (showResult) onGameEnd({...}) }, [showResult])
}