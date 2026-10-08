import { LiveTradingTerminal } from "@/components/live-trading-terminal";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const query = await searchParams;
  const requestedSymbol = String(query.symbol ?? "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24) || "BTCUSDT";
  const { supabase, userId, displayName, notificationCount } = await requireUser();

  const [{ count: connections }, { data: risk }, { count: paperAccounts }] = await Promise.all([
    supabase
      .from("platform_connections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "CONNECTED"),
    supabase
      .from("risk_limits")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("paper_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return (
    <TradingAppShell
      active="trade"
      title="Trade"
      subtitle="Live market terminal with deterministic execution gates"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <LiveTradingTerminal
        initialSymbol={requestedSymbol}
        hasConnection={(connections ?? 0) > 0}
        riskReady={Boolean(risk)}
        paperReady={(paperAccounts ?? 0) > 0}
      />
    </TradingAppShell>
  );
}
