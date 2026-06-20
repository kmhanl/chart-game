import { createClient } from "@/lib/supabase/client";

interface SaveFeedbackParams {
  sessionId: string;
  userId: string;
  rating: number;         // 1-5
  difficulty: "쉬움" | "보통" | "어려움" | null;
  comment: string | null;
}

// ──────────────────────────────────────────────────────────
// 게임 결과 모달에서 피드백 제출 시 호출
// ──────────────────────────────────────────────────────────
export async function saveFeedback({
  sessionId,
  userId,
  rating,
  difficulty,
  comment,
}: SaveFeedbackParams): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("feedbacks").insert({
    session_id: sessionId,
    user_id:    userId,
    rating,
    difficulty: difficulty ?? null,
    comment:    comment?.trim() || null,
  });

  if (error) {
    console.error("[saveFeedback] 저장 실패:", error);
    return false;
  }

  return true;
}
