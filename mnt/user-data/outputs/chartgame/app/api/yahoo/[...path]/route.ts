import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────────────
// Yahoo Finance API 프록시
// 기존 App.jsx의 fetchCandles()가 /api/yahoo/v8/finance/chart/...
// 로 요청 → 그대로 Yahoo로 전달
//
// next.config.ts의 rewrites로도 처리 가능하지만
// Route Handler로 두면 에러 핸들링과 캐싱 설정이 더 자유로움
// ──────────────────────────────────────────────────────────

const YAHOO_BASE = "https://query1.finance.yahoo.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const { searchParams } = new URL(request.url);

  const yahooUrl = `${YAHOO_BASE}/${path.join("/")}?${searchParams.toString()}`;

  try {
    const res = await fetch(yahooUrl, {
      headers: {
        // Yahoo가 브라우저로 인식하도록
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      // Next.js 캐싱: 1시간 (주가 데이터는 자주 바뀌지 않음)
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Yahoo Proxy Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch from Yahoo Finance" },
      { status: 500 }
    );
  }
}
