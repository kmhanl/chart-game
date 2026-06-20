import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#7048e8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "차트게임 — 추세추종 트레이딩 시뮬레이터",
  description: "실제 과거 주가 데이터로 배우는 추세추종 매매 연습",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "차트게임",
  },
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
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        {/* iOS 홈 화면 추가 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="차트게임" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Android 홈 화면 추가 */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
