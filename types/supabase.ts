// ──────────────────────────────────────────────────────────
// Supabase DB 타입 정의
// 나중에 `supabase gen types typescript` 로 자동생성 가능
// ──────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          market: string;
          ticker: string;
          ticker_name: string;
          interval: string;
          mission: string | null;
          init_cash: number;
          final_asset: number;
          return_pct: number;
          follow_score: number;
          total_trades: number;
          played_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["game_sessions"]["Row"], "id" | "played_at">;
        Update: Partial<Database["public"]["Tables"]["game_sessions"]["Insert"]>;
      };
      trade_logs: {
        Row: {
          id: string;
          session_id: string;
          turn: number;
          type: "매수" | "매도";
          qty: number;
          krw_price: number;
          score: number;
          snap_json: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trade_logs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["trade_logs"]["Insert"]>;
      };
      feedbacks: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          rating: number;
          difficulty: "쉬움" | "보통" | "어려움" | null;
          comment: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feedbacks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["feedbacks"]["Insert"]>;
      };
    };
  };
}
