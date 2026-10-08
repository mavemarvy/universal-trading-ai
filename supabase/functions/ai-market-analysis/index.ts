import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function safeSymbol(value: unknown) {
  const symbol = String(value ?? "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
  return symbol || "BTCUSDT";
}

function ema(values: number[], period: number) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let current = values[0];
  for (let i = 1; i < values.length; i += 1) current = values[i] * k + current * (1 - k);
  return current;
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return gains > 0 ? 100 : 50;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}

function atr(candles: Array<{high:number;low:number;close:number}>, period = 14) {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  const start = Math.max(1, candles.length - period);
  for (let i = start; i < candles.length; i += 1) {
    const prev = candles[i - 1].close;
    const row = candles[i];
    trs.push(Math.max(row.high - row.low, Math.abs(row.high - prev), Math.abs(row.low - prev)));
  }
  return trs.length ? trs.reduce((sum, value) => sum + value, 0) / trs.length : 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "authentication_required" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "analyze").toLowerCase();
    const symbol = safeSymbol(body?.symbol);

    const [klineRes, tickerRes] = await Promise.all([
      fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${encodeURIComponent(symbol)}&interval=15&limit=200`, {
        headers: { "User-Agent": "UniversalTradingAI/1.0 quant-analysis" },
      }),
      fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${encodeURIComponent(symbol)}`, {
        headers: { "User-Agent": "UniversalTradingAI/1.0 quant-analysis" },
      }),
    ]);

    const klinePayload = await klineRes.json().catch(() => ({}));
    const tickerPayload = await tickerRes.json().catch(() => ({}));

    if (!klineRes.ok || klinePayload?.retCode !== 0) {
      return json({ error: "market_history_unavailable" }, 502);
    }

    const raw = Array.isArray(klinePayload?.result?.list) ? klinePayload.result.list : [];
    const candles = raw
      .map((row: string[]) => ({
        start: Number(row[0]),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      }))
      .filter((row: any) => Number.isFinite(row.close))
      .reverse();

    if (candles.length < 50) return json({ error: "insufficient_market_history" }, 422);

    const closes = candles.map((row: any) => row.close);
    const volumes = candles.map((row: any) => row.volume);
    const last = closes.at(-1)!;
    const previous = closes.at(-2)!;
    const ema9 = ema(closes.slice(-80), 9);
    const ema21 = ema(closes.slice(-100), 21);
    const ema50 = ema(closes.slice(-150), 50);
    const rsi14 = rsi(closes, 14);
    const atr14 = atr(candles, 14);
    const avgVolume = volumes.slice(-21, -1).reduce((sum, value) => sum + value, 0) / 20 || 1;
    const volumeRatio = volumes.at(-1)! / avgVolume;
    const ticker = tickerPayload?.result?.list?.[0] ?? {};
    const change24h = Number(ticker?.price24hPcnt ?? 0) * 100;

    let score = 0;
    const evidence: string[] = [];

    if (ema9 > ema21) { score += 1.5; evidence.push("EMA 9 is above EMA 21"); }
    else { score -= 1.5; evidence.push("EMA 9 is below EMA 21"); }

    if (last > ema50) { score += 1; evidence.push("price is above EMA 50"); }
    else { score -= 1; evidence.push("price is below EMA 50"); }

    if (rsi14 >= 55 && rsi14 <= 72) { score += 1; evidence.push("RSI supports bullish momentum"); }
    if (rsi14 <= 45 && rsi14 >= 28) { score -= 1; evidence.push("RSI supports bearish momentum"); }
    if (rsi14 > 72) { score -= 0.5; evidence.push("RSI is overbought"); }
    if (rsi14 < 28) { score += 0.5; evidence.push("RSI is oversold"); }

    if (change24h > 1) score += 0.5;
    if (change24h < -1) score -= 0.5;
    if (volumeRatio > 1.2) {
      score += score >= 0 ? 0.5 : -0.5;
      evidence.push("current 15m volume is above its recent average");
    }

    const absolute = Math.abs(score);
    const direction = score >= 2.25 ? "BUY" : score <= -2.25 ? "SELL" : "WAIT";
    const confidence = Math.min(0.9, Math.max(0.5, 0.5 + absolute * 0.075));
    const regime =
      Math.abs(ema9 - ema21) / Math.max(last, 1e-12) > 0.006
        ? (ema9 > ema21 ? "TRENDING_UP" : "TRENDING_DOWN")
        : "RANGE_OR_TRANSITION";

    const stopDistance = Math.max(atr14 * 1.5, last * 0.003);
    const stop =
      direction === "BUY" ? last - stopDistance :
      direction === "SELL" ? last + stopDistance :
      null;
    const target1 =
      direction === "BUY" ? last + stopDistance * 1.5 :
      direction === "SELL" ? last - stopDistance * 1.5 :
      null;
    const target2 =
      direction === "BUY" ? last + stopDistance * 2.5 :
      direction === "SELL" ? last - stopDistance * 2.5 :
      null;

    const reasonSummary =
      direction === "WAIT"
        ? `${symbol}: mixed technical evidence; no directional TradeIntent is recommended yet.`
        : `${symbol}: ${direction} bias from EMA alignment, RSI, 24h momentum and volume confirmation. Independent risk sizing is still required.`;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [{ data: riskProfile }, { data: riskLimits }, { count: connections }, { count: paperAccounts }] =
      await Promise.all([
        admin.from("risk_profiles").select("id,mode,trading_capital").eq("user_id", user.id).maybeSingle(),
        admin.from("risk_limits").select("id,min_confidence,max_slippage_bps").eq("user_id", user.id).limit(1).maybeSingle(),
        admin.from("platform_connections").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "CONNECTED"),
        admin.from("paper_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

    let intentId: string | null = null;

    if (action === "create_intent") {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const minConfidence = Number(riskLimits?.min_confidence ?? 0);
      const blockedByConfidence = minConfidence > 0 && confidence < minConfidence;
      const finalAction = blockedByConfidence ? "NO_TRADE" : direction;

      const { data: intent, error: insertError } = await admin
        .from("trade_intents")
        .insert({
          user_id: user.id,
          instrument_key: symbol,
          venue_symbol: symbol,
          market_type: "SPOT",
          action: finalAction,
          strategy_key: "UTAI_QUANT_CORE",
          strategy_version: "1.0.0",
          market_regime: regime,
          order_type: direction === "WAIT" ? null : "MARKET",
          proposed_entry: last,
          proposed_size: 0,
          stop_invalidation: stop,
          profit_targets: [target1, target2].filter((value) => value != null),
          profit_protection_policy: { mode: "DEFER_TO_RISK_ENGINE" },
          max_slippage_bps: Number(riskLimits?.max_slippage_bps ?? 0),
          max_fee_bps: 0,
          leverage: 1,
          confidence,
          calibration_metadata: {
            source: "BYBIT_PUBLIC_SPOT",
            interval: "15m",
            ema9,
            ema21,
            ema50,
            rsi14,
            atr14,
            volumeRatio,
            change24h,
            score,
          },
          specialist_scores: {
            trend: ema9 > ema21 ? 1 : -1,
            momentum: rsi14,
            volume: volumeRatio,
          },
          news_risk: "UNKNOWN",
          liquidity_state: "PUBLIC_MARKET",
          expires_at: expiresAt,
          model_versions: {
            quant_core: "1.0.0",
            llm_model: null,
          },
          reason_summary: blockedByConfidence
            ? reasonSummary + " The user's minimum-confidence limit blocked this proposal."
            : reasonSummary,
          schema_version: 1,
        })
        .select("id")
        .single();

      if (insertError) return json({ error: insertError.message }, 400);
      intentId = intent.id;
    }

    return json({
      ok: true,
      symbol,
      analysis: {
        direction,
        confidence,
        score,
        regime,
        lastPrice: last,
        previousPrice: previous,
        change24h,
        ema9,
        ema21,
        ema50,
        rsi14,
        atr14,
        volumeRatio,
        stop,
        targets: [target1, target2].filter((value) => value != null),
        evidence,
        reasonSummary,
      },
      gates: {
        riskProfile: Boolean(riskProfile),
        riskLimits: Boolean(riskLimits),
        connectedExchange: (connections ?? 0) > 0,
        paperAccount: (paperAccounts ?? 0) > 0,
        directExecution: false,
      },
      intentId,
      engine: {
        name: "UTAI Quant Core",
        version: "1.0.0",
        modelType: "deterministic_technical_analysis",
        generativeModelConfigured: false,
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "analysis_failed" }, 400);
  }
});
