import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "차트게임 — 추세추종 트레이딩 시뮬레이터",
  description: "실제 과거 주가 데이터로 배우는 추세추종 매매 연습",
  openGraph: {
    title: "차트게임",
    description: "실제 과거 주가 데이터로 배우는 추세추종 매매 연습",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Pretendard 폰트 — 기존 App.jsx와 동일하게 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
