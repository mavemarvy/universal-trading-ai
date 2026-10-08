import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function finite(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRatio(value: unknown) {
  const n = finite(value);
  if (n <= 0) return 0;
  return n > 1 ? n / 100 : n;
}

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function std(values: number[]) {
  if (values.length < 2) return 0;
  const m = average(values);
  return Math.sqrt(average(values.map((v) => (v - m) ** 2)));
}

function sigmoid(x: number) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function normalizeSymbol(input: unknown) {
  const raw = String(input ?? "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const quote = ["USDT", "USDC", "USD"].find((q) => raw.endsWith(q)) ?? "USDT";
  const base = raw.endsWith(quote) ? raw.slice(0, -quote.length) : raw;
  if (!base || !/^[A-Z0-9]{2,15}$/.test(base)) throw new Error("invalid_symbol");
  return {
    base,
    quote,
    compact: base + quote,
    venue: base + "-" + quote,
    canonical: "CRYPTO:" + base + "/" + quote,
  };
}

function timeframe(input: unknown) {
  const raw = String(input ?? "15m");
  const allowed: Record<string, { okx: string; binance: string; minutes: number }> = {
    "5m": { okx: "5m", binance: "5m", minutes: 5 },
    "15m": { okx: "15m", binance: "15m", minutes: 15 },
    "1h": { okx: "1H", binance: "1h", minutes: 60 },
    "4h": { okx: "4H", binance: "4h", minutes: 240 },
  };
  return allowed[raw] ?? allowed["15m"];
}

async function fetchCandles(symbol: ReturnType<typeof normalizeSymbol>, tf: ReturnType<typeof timeframe>) {
  const started = Date.now();
  try {
    const url =
      "https://www.okx.com/api/v5/market/candles?instId=" +
      encodeURIComponent(symbol.venue) +
      "&bar=" +
      encodeURIComponent(tf.okx) +
      "&limit=240";
    const r = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "UniversalTradingAI/1.0 quant-analysis" },
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    const list = Array.isArray(j?.data) ? j.data : [];
    const candles = list
      .map((row: any[]) => ({
        time: finite(row[0]),
        open: finite(row[1]),
        high: finite(row[2]),
        low: finite(row[3]),
        close: finite(row[4]),
        volume: finite(row[5]),
      }))
      .filter((c: Candle) => c.time > 0 && c.close > 0)
      .reverse();
    if (r.ok && j?.code === "0" && candles.length >= 80) {
      return { candles, source: "CEX-A", latencyMs: Date.now() - started };
    }
  } catch {}

  const fallbackStarted = Date.now();
  const r = await fetch(
    "https://api.binance.com/api/v3/klines?symbol=" +
      encodeURIComponent(symbol.compact) +
      "&interval=" +
      encodeURIComponent(tf.binance) +
      "&limit=240",
    {
      headers: { Accept: "application/json", "User-Agent": "UniversalTradingAI/1.0 quant-analysis" },
      signal: AbortSignal.timeout(8000),
    },
  );
  const j = await r.json();
  const candles = Array.isArray(j)
    ? j
        .map((row: any[]) => ({
          time: finite(row[0]),
          open: finite(row[1]),
          high: finite(row[2]),
          low: finite(row[3]),
          close: finite(row[4]),
          volume: finite(row[5]),
        }))
        .filter((c: Candle) => c.time > 0 && c.close > 0)
    : [];
  if (!r.ok || candles.length < 80) throw new Error("market_candles_unavailable");
  return { candles, source: "CEX-B", latencyMs: Date.now() - fallbackStarted };
}

async function fetchLastPrice(symbol: ReturnType<typeof normalizeSymbol>) {
  try {
    const started = Date.now();
    const r = await fetch(
      "https://www.okx.com/api/v5/market/ticker?instId=" + encodeURIComponent(symbol.venue),
      { signal: AbortSignal.timeout(7000), headers: { "User-Agent": "UniversalTradingAI/1.0 paper-fill" } },
    );
    const j = await r.json();
    const price = finite(j?.data?.[0]?.last);
    if (r.ok && j?.code === "0" && price > 0) return { price, latencyMs: Date.now() - started, source: "CEX-A" };
  } catch {}

  const started = Date.now();
  const r = await fetch(
    "https://api.binance.com/api/v3/ticker/price?symbol=" + encodeURIComponent(symbol.compact),
    { signal: AbortSignal.timeout(7000), headers: { "User-Agent": "UniversalTradingAI/1.0 paper-fill" } },
  );
  const j = await r.json();
  const price = finite(j?.price);
  if (!r.ok || !(price > 0)) throw new Error("latest_price_unavailable");
  return { price, latencyMs: Date.now() - started, source: "CEX-B" };
}

function featureAt(candles: Candle[], i: number) {
  const closes = candles.map((c) => c.close);
  const vols = candles.map((c) => c.volume);
  const returns = (from: number) => closes[i] / closes[i - from] - 1;
  const ma5 = average(closes.slice(i - 4, i + 1));
  const ma20 = average(closes.slice(i - 19, i + 1));
  const recentReturns: number[] = [];
  for (let j = i - 19; j <= i; j++) {
    if (j > 0) recentReturns.push(closes[j] / closes[j - 1] - 1);
  }
  const volMean = average(vols.slice(i - 19, i + 1));
  return [
    returns(1),
    returns(3),
    returns(8),
    ma20 ? ma5 / ma20 - 1 : 0,
    std(recentReturns),
    volMean ? vols[i] / volMean - 1 : 0,
    closes[i] ? (candles[i].high - candles[i].low) / closes[i] : 0,
  ];
}

function trainModel(candles: Candle[]) {
  const x: number[][] = [];
  const y: number[] = [];
  for (let i = 25; i < candles.length - 1; i++) {
    x.push(featureAt(candles, i));
    y.push(candles[i + 1].close > candles[i].close ? 1 : 0);
  }
  if (x.length < 60) throw new Error("insufficient_model_samples");

  const split = Math.max(45, Math.floor(x.length * 0.8));
  const trainX = x.slice(0, split);
  const trainY = y.slice(0, split);
  const validX = x.slice(split);
  const validY = y.slice(split);
  const dims = trainX[0].length;

  const means = Array.from({ length: dims }, (_, d) => average(trainX.map((row) => row[d])));
  const stdevs = Array.from({ length: dims }, (_, d) => Math.max(std(trainX.map((row) => row[d])), 1e-8));
  const z = (row: number[]) => row.map((v, d) => (v - means[d]) / stdevs[d]);

  let weights = Array(dims).fill(0);
  let bias = 0;
  const lr = 0.055;
  const l2 = 0.002;

  for (let iteration = 0; iteration < 360; iteration++) {
    const grad = Array(dims).fill(0);
    let gradBias = 0;
    for (let i = 0; i < trainX.length; i++) {
      const row = z(trainX[i]);
      const score = bias + row.reduce((sum, value, d) => sum + value * weights[d], 0);
      const p = sigmoid(score);
      const error = p - trainY[i];
      gradBias += error;
      for (let d = 0; d < dims; d++) grad[d] += error * row[d];
    }
    bias -= (lr * gradBias) / trainX.length;
    for (let d = 0; d < dims; d++) {
      weights[d] -= lr * (grad[d] / trainX.length + l2 * weights[d]);
    }
  }

  const predict = (row: number[]) => {
    const zr = z(row);
    return sigmoid(bias + zr.reduce((sum, value, d) => sum + value * weights[d], 0));
  };

  let correct = 0;
  for (let i = 0; i < validX.length; i++) {
    const predicted = predict(validX[i]) >= 0.5 ? 1 : 0;
    if (predicted === validY[i]) correct++;
  }
  const validationAccuracy = validX.length ? correct / validX.length : 0.5;
  const probabilityUp = predict(featureAt(candles, candles.length - 1));

  return {
    probabilityUp,
    validationAccuracy,
    samples: x.length,
    weights,
  };
}

function marketMetrics(candles: Candle[]) {
  const latest = candles[candles.length - 1];
  const closes = candles.map((c) => c.close);
  const returns: number[] = [];
  for (let i = Math.max(1, closes.length - 30); i < closes.length; i++) {
    returns.push(closes[i] / closes[i - 1] - 1);
  }
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  const trend = ma20 ? ma5 / ma20 - 1 : 0;
  const volatility = std(returns);
  const tr: number[] = [];
  for (let i = Math.max(1, candles.length - 14); i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1].close;
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev)));
  }
  const atr = average(tr);
  const atrPct = latest.close ? atr / latest.close : 0;
  const regime =
    volatility > 0.02
      ? "HIGH_VOLATILITY"
      : trend > volatility * 0.75
        ? "TRENDING_UP"
        : trend < -volatility * 0.75
          ? "TRENDING_DOWN"
          : "RANGING";
  return { latest, trend, volatility, atr, atrPct, regime };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return response({ error: "authentication_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return response({ error: "authentication_required" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json();
    const action = String(body?.action ?? "analyze").toLowerCase();

    if (action === "paper_execute") {
      const intentId = String(body?.intentId ?? "");
      if (!intentId) return response({ error: "intent_id_required" }, 400);

      const [{ data: intent }, { data: decision }, { data: paperAccount }] = await Promise.all([
        admin.from("trade_intents").select("*").eq("id", intentId).eq("user_id", user.id).maybeSingle(),
        admin.from("trade_decisions").select("*").eq("trade_intent_id", intentId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        admin.from("paper_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      ]);

      if (!intent) return response({ error: "intent_not_found" }, 404);
      if (!decision || decision.status !== "APPROVE" || finite(decision.approved_size) <= 0) {
        return response({ error: "risk_decision_not_approved" }, 400);
      }
      if (!paperAccount) return response({ error: "paper_account_required" }, 400);
      if (!["BUY", "SELL", "LONG", "SHORT"].includes(String(intent.action))) {
        return response({ error: "intent_is_not_executable" }, 400);
      }

      const symbol = normalizeSymbol(intent.venue_symbol || intent.instrument_key);
      const quote = await fetchLastPrice(symbol);
      const maxSlip = finite(intent.max_slippage_bps);
      const slippageBps = maxSlip > 0 ? Math.min(maxSlip, 3) : 2;
      const isBuy = ["BUY", "LONG"].includes(String(intent.action));
      const fillPrice = quote.price * (1 + (isBuy ? 1 : -1) * slippageBps / 10000);
      const quantity = finite(decision.approved_size);
      const fee = fillPrice * quantity * 0.001;

      const { data: order, error: orderError } = await admin
        .from("paper_orders")
        .insert({
          user_id: user.id,
          paper_account_id: paperAccount.id,
          trade_intent_id: intent.id,
          instrument_key: intent.instrument_key,
          side: isBuy ? "BUY" : "SELL",
          order_type: "MARKET",
          quantity,
          requested_price: quote.price,
          status: "FILLED",
          simulated_latency_ms: quote.latencyMs,
          simulated_slippage_bps: slippageBps,
        })
        .select("id")
        .single();
      if (orderError || !order) throw orderError ?? new Error("paper_order_failed");

      const { error: tradeError } = await admin.from("paper_trades").insert({
        user_id: user.id,
        paper_order_id: order.id,
        quantity,
        fill_price: fillPrice,
        fee,
      });
      if (tradeError) throw tradeError;

      const { error: positionError } = await admin.from("paper_positions").insert({
        user_id: user.id,
        paper_account_id: paperAccount.id,
        trade_intent_id: intent.id,
        paper_order_id: order.id,
        instrument_key: intent.instrument_key,
        side: isBuy ? "LONG" : "SHORT",
        quantity,
        entry_price: fillPrice,
        current_price: fillPrice,
        unrealized_pnl: 0,
        realized_pnl: 0,
        status: "OPEN",
      });
      if (positionError) throw positionError;

      await admin
        .from("paper_accounts")
        .update({ current_equity: Math.max(0, finite(paperAccount.current_equity) - fee) })
        .eq("id", paperAccount.id)
        .eq("user_id", user.id);

      return response({
        ok: true,
        action: "paper_execute",
        paperOrderId: order.id,
        fillPrice,
        quantity,
        fee,
        source: "UNIFIED_MARKET_FEED",
      });
    }


    if (action === "paper_refresh" || action === "paper_close") {
      const positionId = String(body?.positionId ?? "");
      if (!positionId) return response({ error: "position_id_required" }, 400);

      const { data: position } = await admin
        .from("paper_positions")
        .select("*")
        .eq("id", positionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!position) return response({ error: "paper_position_not_found" }, 404);
      if (String(position.status) !== "OPEN") return response({ error: "paper_position_not_open" }, 400);

      const symbol = normalizeSymbol(position.instrument_key);
      const quote = await fetchLastPrice(symbol);
      const quantity = finite(position.quantity);
      const entryPrice = finite(position.entry_price);
      const isLong = String(position.side).toUpperCase() === "LONG";
      const grossPnl = (isLong ? quote.price - entryPrice : entryPrice - quote.price) * quantity;

      if (action === "paper_refresh") {
        const { error: refreshError } = await admin
          .from("paper_positions")
          .update({ current_price: quote.price, unrealized_pnl: grossPnl })
          .eq("id", position.id)
          .eq("user_id", user.id);
        if (refreshError) throw refreshError;
        return response({ ok: true, action: "paper_refresh", positionId: position.id, currentPrice: quote.price, unrealizedPnl: grossPnl, source: "UNIFIED_MARKET_FEED" });
      }

      const { data: paperAccount } = await admin
        .from("paper_accounts")
        .select("*")
        .eq("id", position.paper_account_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!paperAccount) return response({ error: "paper_account_not_found" }, 404);

      const exitSide = isLong ? "SELL" : "BUY";
      const exitFee = quote.price * quantity * 0.001;

      const { data: closeOrder, error: closeOrderError } = await admin
        .from("paper_orders")
        .insert({
          user_id: user.id,
          paper_account_id: paperAccount.id,
          trade_intent_id: position.trade_intent_id,
          instrument_key: position.instrument_key,
          side: exitSide,
          order_type: "MARKET",
          quantity,
          requested_price: quote.price,
          status: "FILLED",
          simulated_latency_ms: quote.latencyMs,
          simulated_slippage_bps: 0,
        })
        .select("id")
        .single();
      if (closeOrderError || !closeOrder) throw closeOrderError ?? new Error("paper_close_order_failed");

      const { error: closeTradeError } = await admin.from("paper_trades").insert({
        user_id: user.id,
        paper_order_id: closeOrder.id,
        quantity,
        fill_price: quote.price,
        fee: exitFee,
      });
      if (closeTradeError) throw closeTradeError;

      const { error: positionCloseError } = await admin
        .from("paper_positions")
        .update({
          current_price: quote.price,
          unrealized_pnl: 0,
          realized_pnl: grossPnl,
          status: "CLOSED",
          closed_at: new Date().toISOString(),
        })
        .eq("id", position.id)
        .eq("user_id", user.id);
      if (positionCloseError) throw positionCloseError;

      const nextEquity = Math.max(0, finite(paperAccount.current_equity) + grossPnl - exitFee);
      const { error: equityError } = await admin
        .from("paper_accounts")
        .update({ current_equity: nextEquity })
        .eq("id", paperAccount.id)
        .eq("user_id", user.id);
      if (equityError) throw equityError;

      return response({
        ok: true,
        action: "paper_close",
        positionId: position.id,
        paperOrderId: closeOrder.id,
        exitPrice: quote.price,
        grossPnl,
        exitFee,
        currentEquity: nextEquity,
        source: "UNIFIED_MARKET_FEED",
      });
    }

    if (action !== "analyze") return response({ error: "unsupported_action" }, 400);

    const symbol = normalizeSymbol(body?.symbol);
    const tf = timeframe(body?.timeframe);
    const market = await fetchCandles(symbol, tf);
    const candles = market.candles;
    const model = trainModel(candles);
    const metrics = marketMetrics(candles);

    const probabilityUp = model.probabilityUp;
    const validationAccuracy = model.validationAccuracy;
    const confidence = clamp(
      0.5 + Math.abs(probabilityUp - 0.5) * (1 + validationAccuracy),
      0.5,
      0.99,
    );
    const expectedEdge = Math.abs(probabilityUp - 0.5) * 2;

    let tradeAction: "BUY" | "SELL" | "NO_TRADE" =
      probabilityUp >= 0.58 ? "BUY" : probabilityUp <= 0.42 ? "SELL" : "NO_TRADE";
    if (validationAccuracy < 0.48) tradeAction = "NO_TRADE";

    const [{ data: profile }, { data: limits }, { data: livePositions }, { data: paperPositions }, { data: kills }] =
      await Promise.all([
        admin.from("risk_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        admin.from("risk_limits").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
        admin.from("positions").select("id").eq("user_id", user.id).eq("status", "OPEN"),
        admin.from("paper_positions").select("id").eq("user_id", user.id).eq("status", "OPEN"),
        admin.from("kill_switches").select("scope_type,scope_ref,mode,reason").eq("active", true),
      ]);

    const entry = metrics.latest.close;
    const stopPct = Math.max(metrics.atrPct * 1.5, 0.003);
    const stop =
      tradeAction === "SELL" ? entry * (1 + stopPct) : entry * (1 - stopPct);
    const target =
      tradeAction === "SELL" ? entry * (1 - stopPct * 2) : entry * (1 + stopPct * 2);

    const capital = finite(profile?.trading_capital);
    const riskFraction = normalizeRatio(limits?.max_risk_per_trade);
    const stopDistance = Math.abs(entry - stop);
    const riskBudget = capital * riskFraction;
    const riskSized = stopDistance > 0 ? riskBudget / stopDistance : 0;
    const notionalCap = capital > 0 ? (capital * 0.25) / entry : 0;
    const proposedSize =
      tradeAction === "NO_TRADE" ? 0 : Math.max(0, Math.min(riskSized, notionalCap));

    const rejectionReasons: string[] = [];
    if (!profile || !limits || capital <= 0 || riskFraction <= 0) {
      rejectionReasons.push("RISK_PROFILE_NOT_CONFIGURED");
    }
    if (tradeAction === "NO_TRADE") rejectionReasons.push("MODEL_EDGE_BELOW_THRESHOLD");

    const minConfidence = normalizeRatio(limits?.min_confidence);
    if (minConfidence > 0 && confidence < minConfidence) rejectionReasons.push("MIN_CONFIDENCE_NOT_MET");

    const minEdge = normalizeRatio(limits?.min_expected_edge);
    if (minEdge > 0 && expectedEdge < minEdge) rejectionReasons.push("MIN_EXPECTED_EDGE_NOT_MET");

    const maxPositions = Math.floor(finite(limits?.max_positions));
    const openPositionCount = (livePositions?.length ?? 0) + (paperPositions?.length ?? 0);
    if (maxPositions <= 0) rejectionReasons.push("MAX_POSITIONS_NOT_CONFIGURED");
    else if (openPositionCount >= maxPositions) rejectionReasons.push("MAX_POSITIONS_REACHED");

    const relevantKill = (kills ?? []).find((row: any) => {
      const type = String(row.scope_type ?? "").toUpperCase();
      return type === "GLOBAL" || (type === "USER" && String(row.scope_ref ?? "") === user.id);
    });
    if (relevantKill) rejectionReasons.push("KILL_SWITCH_ACTIVE");

    if (!(proposedSize > 0) && tradeAction !== "NO_TRADE") rejectionReasons.push("PROPOSED_SIZE_ZERO");

    const decisionStatus = rejectionReasons.length ? "REJECT" : "APPROVE";
    const expiresAt = new Date(Date.now() + tf.minutes * 60_000).toISOString();
    const summary =
      tradeAction === "NO_TRADE"
        ? `Local ML/quant model found no sufficiently strong edge. P(up)=${probabilityUp.toFixed(3)}, validation=${validationAccuracy.toFixed(3)}.`
        : `${tradeAction} setup from local ML/quant model. P(up)=${probabilityUp.toFixed(3)}, validation=${validationAccuracy.toFixed(3)}, regime=${metrics.regime}.`;

    const { data: intent, error: intentError } = await admin
      .from("trade_intents")
      .insert({
        user_id: user.id,
        account_id: null,
        platform_id: null,
        instrument_key: symbol.canonical,
        venue_symbol: symbol.venue,
        market_type: "SPOT",
        action: tradeAction,
        strategy_key: "local_ml_quant_copilot",
        strategy_version: "1.0.0",
        market_regime: metrics.regime,
        order_type: tradeAction === "NO_TRADE" ? null : "MARKET",
        proposed_entry: entry,
        proposed_size: proposedSize,
        stop_invalidation: tradeAction === "NO_TRADE" ? null : stop,
        profit_targets: tradeAction === "NO_TRADE" ? [] : [{ price: target, fraction: 1 }],
        profit_protection_policy: { mode: "RISK_MULTIPLE", initialR: 1, targetR: 2 },
        max_slippage_bps: finite(limits?.max_slippage_bps),
        max_fee_bps: 15,
        leverage: 1,
        confidence,
        calibration_metadata: {
          probabilityUp,
          validationAccuracy,
          samples: model.samples,
          timeframeMinutes: tf.minutes,
          latencyMs: market.latencyMs,
          sourceClass: "PUBLIC_CEX",
        },
        specialist_scores: {
          mlProbabilityUp: probabilityUp,
          expectedEdge,
          trend: metrics.trend,
          volatility: metrics.volatility,
          atrPct: metrics.atrPct,
        },
        news_risk: "UNKNOWN",
        liquidity_state: "PUBLIC_MARKET_ACTIVE",
        expires_at: expiresAt,
        model_versions: { local_logistic: "1.0.0" },
        reason_summary: summary,
        schema_version: 1,
      })
      .select("*")
      .single();

    if (intentError || !intent) throw intentError ?? new Error("trade_intent_insert_failed");

    const { data: decision, error: decisionError } = await admin
      .from("trade_decisions")
      .insert({
        user_id: user.id,
        trade_intent_id: intent.id,
        status: decisionStatus,
        approved_size: decisionStatus === "APPROVE" ? proposedSize : 0,
        reasons: rejectionReasons,
        deterministic_policy_version: "utai-risk-v1",
        portfolio_snapshot: {
          liveOpenPositions: livePositions?.length ?? 0,
          paperOpenPositions: paperPositions?.length ?? 0,
          tradingCapital: capital,
        },
        capability_snapshot: {
          analysis: true,
          paperExecution: true,
          liveExecution: false,
          marketSourceClass: "UNIFIED_PUBLIC_MARKET",
        },
      })
      .select("*")
      .single();

    if (decisionError || !decision) throw decisionError ?? new Error("trade_decision_insert_failed");

    return response({
      ok: true,
      action: "analyze",
      intentId: intent.id,
      decisionId: decision.id,
      symbol: symbol.canonical,
      tradeAction,
      decisionStatus,
      confidence,
      probabilityUp,
      validationAccuracy,
      expectedEdge,
      entry,
      stop: tradeAction === "NO_TRADE" ? null : stop,
      target: tradeAction === "NO_TRADE" ? null : target,
      proposedSize,
      reasons: rejectionReasons,
      regime: metrics.regime,
      marketSource: "UNIFIED_MARKET_FEED",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "analysis_failed";
    return response({ error: message }, 400);
  }
});
