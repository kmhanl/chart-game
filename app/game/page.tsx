import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GameClient from "@/components/GameClient";

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string; interval?: string; mission?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?message=login_required");

  const params = await searchParams;
  const market   = (params.market   === "QQQ" ? "QQQ"  : "KOSPI") as "KOSPI" | "QQQ";
  const interval = (params.interval === "1mo" ? "1mo"  : "1wk")   as "1wk" | "1mo";
  const mission  = params.mission ?? null;

  return <GameClient user={user} initialMarket={market} initialInterval={interval} initialMission={mission} />;
}