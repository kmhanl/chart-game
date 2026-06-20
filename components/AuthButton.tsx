"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
}

export default function AuthButton({ user }: Props) {
  const [loading, setLoading] = useState(false);
  // ─────────────────────────────────────────────────────────
  // Hydration 에러 원인: 서버는 user=null로 렌더, 클라이언트는
  // 세션 쿠키 읽어서 user가 있을 수도 있음 → HTML 불일치
  // 해결: mounted 이전엔 아무것도 렌더하지 않음 (suppressHydrationWarning 대신)
  // ─────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const supabase = createClient();

  const signInWithGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // 마운트 전엔 빈 placeholder (서버 HTML과 일치)
  if (!mounted) {
    return <div style={{ width: 120, height: 34 }} />;
  }

  // ── 로그인 상태 ──
  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="프로필"
            style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #dee2e6" }}
          />
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#7048e8", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
          }}>
            {(user.user_metadata?.name ?? user.email ?? "?")[0].toUpperCase()}
          </div>
        )}
        <span style={{
          fontSize: 12, color: "#495057",
          maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {user.user_metadata?.name ?? user.email}
        </span>
        <button
          onClick={signOut}
          disabled={loading}
          style={{
            padding: "5px 10px", borderRadius: 7,
            border: "1.5px solid #dee2e6", background: "#fff",
            color: "#868e96", fontSize: 11, cursor: "pointer",
            opacity: loading ? 0.6 : 1, fontFamily: "inherit",
          }}
        >
          {loading ? "..." : "로그아웃"}
        </button>
      </div>
    );
  }

  // ── 비로그인 상태 ──
  return (
    <button
      onClick={signInWithGoogle}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "8px 16px", borderRadius: 8,
        border: "1.5px solid #dee2e6", background: "#fff",
        color: "#212529", fontSize: 13, fontWeight: 600,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
        boxShadow: "0 1px 4px rgba(0,0,0,.08)",
        fontFamily: "inherit",
      }}
    >
      {loading ? (
        <span style={{ fontSize: 14 }}>⏳</span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      {loading ? "로그인 중..." : "Google로 로그인"}
    </button>
  );
}
