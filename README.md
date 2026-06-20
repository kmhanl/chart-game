# 차트게임 — Next.js + Supabase 세팅 가이드

## 1. 프로젝트 생성 & 의존성 설치

```bash
npx create-next-app@latest chartgame --typescript --app --no-tailwind
cd chartgame

# 이 폴더의 파일들을 복사
cp -r /path/to/this/folder/* .

# 의존성 설치
npm install
```

## 2. Supabase 프로젝트 생성

1. https://supabase.com → New project
2. **SQL Editor** → `supabase-schema.sql` 전체 붙여넣고 실행
3. **Project Settings > API**에서 URL과 anon key 복사

## 3. 환경변수 설정

```bash
cp .env.local.example .env.local
# .env.local 파일 열어서 URL, ANON_KEY 입력
```

## 4. Google OAuth 설정 (Supabase)

```
Supabase 대시보드
  → Authentication
  → Providers
  → Google 활성화
  → Client ID / Secret 입력 (Google Cloud Console에서 발급)

Authentication > URL Configuration
  → Site URL: http://localhost:3000
  → Redirect URLs에 추가:
      http://localhost:3000/auth/callback
      https://your-domain.vercel.app/auth/callback   ← 배포 후
```

## 5. Google Cloud Console OAuth 설정

```
https://console.cloud.google.com
  → APIs & Services > Credentials
  → OAuth 2.0 Client IDs 생성
  → 승인된 리디렉션 URI:
      https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

## 6. App.jsx 연결 (핵심 단계)

기존 `App.jsx`를 `components/GameApp.tsx`로 이동 후 수정:

```tsx
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
```

그리고 `components/GameClient.tsx`의 주석 해제:

```tsx
import GameApp from "@/components/GameApp";

// return 문에서:
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
```

## 7. 로컬 실행

```bash
npm run dev
# http://localhost:3000
```

## 8. Vercel 배포

```bash
npm install -g vercel
vercel

# 환경변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL  # https://your-domain.vercel.app
```

## 파일 구조

```
chartgame/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (폰트)
│   ├── globals.css
│   ├── page.tsx                # 로비 (서버 컴포넌트)
│   ├── game/
│   │   └── page.tsx            # 게임 페이지 (서버 → 클라이언트)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts        # OAuth 콜백
│   └── api/
│       └── yahoo/
│           └── [...path]/
│               └── route.ts    # Yahoo Finance 프록시
├── components/
│   ├── AuthButton.tsx          # 구글 로그인 버튼
│   ├── LobbyClient.tsx         # 로비 UI (클라이언트)
│   ├── GameClient.tsx          # 게임 래퍼 (클라이언트)
│   └── GameApp.tsx             # ← App.jsx 이동 후 이름 변경
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 브라우저용 Supabase
│   │   └── server.ts           # 서버용 Supabase
│   ├── saveGameResult.ts       # 결과 저장
│   └── saveFeedback.ts         # 피드백 저장
├── types/
│   └── supabase.ts             # DB 타입 정의
├── middleware.ts               # 세션 갱신 + 라우트 보호
├── supabase-schema.sql         # DB 스키마 (1회 실행)
├── next.config.ts
├── tsconfig.json
└── .env.local                  # 환경변수 (git 제외)
```
# chart-game
