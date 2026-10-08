import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const encoder = new TextEncoder();

async function hmac(secret: string, message: string, format: "hex" | "base64") {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  if (format === "hex") {
    return Array.from(signed).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let binary = "";
  for (const b of signed) binary += String.fromCharCode(b);
  return btoa(binary);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function safeText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

async function verifyBybit(apiKey: string, apiSecret: string, environment: string) {
  const base = environment === "TESTNET" ? "https://api-testnet.bybit.com" : "https://api.bybit.com";
  const recvWindow = "5000";
  const timestamp = Date.now().toString();
  const signature = await hmac(apiSecret, timestamp + apiKey + recvWindow, "hex");

  const response = await fetch(base + "/v5/user/query-api", {
    headers: {
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": recvWindow,
      "X-BAPI-SIGN": signature,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.retCode !== 0) {
    throw new Error(payload?.retMsg || "Bybit rejected the credentials");
  }

  const info = payload.result ?? {};
  const walletPerms = Array.isArray(info.permissions?.Wallet) ? info.permissions.Wallet : [];
  const withdrawal = walletPerms.includes("Withdraw");
  if (withdrawal) throw new Error("This Bybit API key has withdrawal permission. Create a key without withdrawal access.");

  const spotPerms = Array.isArray(info.permissions?.Spot) ? info.permissions.Spot : [];
  const contractPerms = Array.isArray(info.permissions?.ContractTrade) ? info.permissions.ContractTrade : [];
  const derivativesPerms = Array.isArray(info.permissions?.Derivatives) ? info.permissions.Derivatives : [];

  let accountSummary: Record<string, unknown> = {};
  try {
    const q = "accountType=UNIFIED";
    const ts2 = Date.now().toString();
    const sig2 = await hmac(apiSecret, ts2 + apiKey + recvWindow + q, "hex");
    const balanceRes = await fetch(base + "/v5/account/wallet-balance?" + q, {
      headers: {
        "X-BAPI-API-KEY": apiKey,
        "X-BAPI-TIMESTAMP": ts2,
        "X-BAPI-RECV-WINDOW": recvWindow,
        "X-BAPI-SIGN": sig2,
      },
    });
    const balance = await balanceRes.json().catch(() => ({}));
    const row = balance?.result?.list?.[0];
    if (balanceRes.ok && balance?.retCode === 0 && row) {
      accountSummary = {
        accountType: row.accountType ?? "UNIFIED",
        totalEquity: row.totalEquity ?? null,
        totalWalletBalance: row.totalWalletBalance ?? null,
        assets: Array.isArray(row.coin)
          ? row.coin.filter((c: any) => Number(c.walletBalance || 0) !== 0).slice(0, 12).map((c: any) => ({
              asset: c.coin,
              walletBalance: c.walletBalance,
              usdValue: c.usdValue,
            }))
          : [],
      };
    }
  } catch {
    // Credential verification is authoritative; balance summary is best-effort.
  }

  return {
    externalRef: String(info.userID ?? ""),
    permissions: {
      read: true,
      trade: Number(info.readOnly) === 0,
      withdrawal: false,
      spot: spotPerms.includes("SpotTrade"),
      futures: contractPerms.includes("Order") || derivativesPerms.includes("DerivativesTrade"),
      options: Array.isArray(info.permissions?.Options) && info.permissions.Options.length > 0,
      ipBound: Array.isArray(info.ips) && info.ips.length > 0,
    },
    capabilities: {
      provider: "BYBIT",
      readOnly: Number(info.readOnly) === 1,
      unifiedAccount: Number(info.uta) === 1,
      vipLevel: info.vipLevel ?? null,
      keyType: info.type ?? null,
      account: accountSummary,
    },
  };
}

async function binanceSigned(
  path: string,
  apiKey: string,
  apiSecret: string,
  extra: Record<string, string> = {},
) {
  const params = new URLSearchParams({
    ...extra,
    recvWindow: "5000",
    timestamp: Date.now().toString(),
  });
  const signature = await hmac(apiSecret, params.toString(), "hex");
  params.set("signature", signature);
  const response = await fetch("https://api.binance.com" + path + "?" + params.toString(), {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.code < 0) {
    throw new Error(payload?.msg || "Binance rejected the credentials");
  }
  return payload;
}

async function verifyBinance(apiKey: string, apiSecret: string) {
  const restrictions = await binanceSigned("/sapi/v1/account/apiRestrictions", apiKey, apiSecret);
  if (restrictions?.enableWithdrawals === true) {
    throw new Error("This Binance API key has withdrawal permission. Disable withdrawals before connecting it.");
  }

  let account: Record<string, unknown> = {};
  try {
    const spot = await binanceSigned("/api/v3/account", apiKey, apiSecret, { omitZeroBalances: "true" });
    account = {
      accountType: spot?.accountType ?? "SPOT",
      canTrade: spot?.canTrade ?? null,
      assets: Array.isArray(spot?.balances)
        ? spot.balances.slice(0, 12).map((b: any) => ({
            asset: b.asset,
            free: b.free,
            locked: b.locked,
          }))
        : [],
    };
  } catch {
    // Some permission combinations may not allow the spot-account endpoint.
  }

  return {
    externalRef: null,
    permissions: {
      read: restrictions?.enableReading === true,
      trade:
        restrictions?.enableSpotAndMarginTrading === true ||
        restrictions?.enableFutures === true ||
        restrictions?.enablePortfolioMarginTrading === true,
      withdrawal: false,
      spot: restrictions?.enableSpotAndMarginTrading === true,
      margin: restrictions?.enableMargin === true,
      futures: restrictions?.enableFutures === true,
      options: restrictions?.enableVanillaOptions === true,
      ipBound: restrictions?.ipRestrict === true,
    },
    capabilities: {
      provider: "BINANCE",
      account,
      portfolioMargin: restrictions?.enablePortfolioMarginTrading === true,
      fixReadOnly: restrictions?.enableFixReadOnly === true,
    },
  };
}

function okxBase(region: string) {
  if (region === "US_AU") return "https://us.okx.com";
  if (region === "EEA") return "https://eea.okx.com";
  return "https://www.okx.com";
}

async function okxSigned(
  base: string,
  path: string,
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  demo: boolean,
) {
  const timestamp = new Date().toISOString();
  const signature = await hmac(apiSecret, timestamp + "GET" + path, "base64");
  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": passphrase,
  };
  if (demo) headers["x-simulated-trading"] = "1";
  const response = await fetch(base + path, { headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.code !== "0") {
    throw new Error(payload?.msg || "OKX rejected the credentials");
  }
  return payload;
}

async function verifyOkx(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  environment: string,
  region: string,
) {
  if (!passphrase) throw new Error("OKX requires the API passphrase.");
  const base = okxBase(region);
  const demo = environment === "DEMO";
  const config = await okxSigned(base, "/api/v5/account/config", apiKey, apiSecret, passphrase, demo);
  const info = config?.data?.[0] ?? {};
  const permissions = String(info.perm ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (permissions.includes("withdraw")) {
    throw new Error("This OKX API key has withdrawal permission. Remove withdrawal permission before connecting.");
  }

  let accountSummary: Record<string, unknown> = {};
  try {
    const balance = await okxSigned(base, "/api/v5/account/balance", apiKey, apiSecret, passphrase, demo);
    const row = balance?.data?.[0];
    if (row) {
      const details = Array.isArray(row.details) ? row.details : [];
      accountSummary = {
        totalEquity: row.totalEq ?? null,
        adjustedEquity: row.adjEq ?? null,
        assets: details
          .filter((d: any) => Number(d.eq || 0) !== 0)
          .slice(0, 12)
          .map((d: any) => ({ asset: d.ccy, equity: d.eq, available: d.availBal })),
      };
    }
  } catch {
    // Best-effort account summary.
  }

  return {
    externalRef: safeText(info.uid || info.mainUid || ""),
    permissions: {
      read: permissions.includes("read_only") || permissions.includes("trade"),
      trade: permissions.includes("trade"),
      withdrawal: false,
      spot: true,
      futures: permissions.includes("trade"),
      options: permissions.includes("trade"),
      ipBound: Boolean(String(info.ip ?? "").trim()),
    },
    capabilities: {
      provider: "OKX",
      accountLevel: info.acctLv ?? null,
      positionMode: info.posMode ?? null,
      region,
      demo,
      account: accountSummary,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return jsonResponse({ error: "authentication_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return jsonResponse({ error: "authentication_required" }, 401);

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json();
    const action = safeText(body?.action, 20).toLowerCase();

    if (action === "disconnect") {
      const connectionId = safeText(body?.connectionId, 80);
      if (!connectionId) return jsonResponse({ error: "connection_id_required" }, 400);
      const { data, error } = await adminClient.rpc("service_disconnect_platform_connection", {
        p_user_id: user.id,
        p_connection_id: connectionId,
      });
      if (error) throw error;
      return jsonResponse({ ok: Boolean(data), status: "DISCONNECTED" });
    }

    if (action !== "connect") return jsonResponse({ error: "unsupported_action" }, 400);

    const platform = safeText(body?.platform, 24).toUpperCase();
    const apiKey = safeText(body?.apiKey, 256);
    const apiSecret = safeText(body?.apiSecret, 512);
    const passphrase = safeText(body?.passphrase, 256);
    const label = safeText(body?.label, 80);
    const environment = safeText(body?.environment || "LIVE", 16).toUpperCase();
    const region = safeText(body?.region || "GLOBAL", 16).toUpperCase();

    if (!["BYBIT", "BINANCE", "OKX"].includes(platform)) {
      return jsonResponse({ error: "provider_not_supported_yet" }, 400);
    }
    if (!apiKey || !apiSecret) return jsonResponse({ error: "api_credentials_required" }, 400);

    let verification: any;
    if (platform === "BYBIT") verification = await verifyBybit(apiKey, apiSecret, environment);
    else if (platform === "BINANCE") verification = await verifyBinance(apiKey, apiSecret);
    else verification = await verifyOkx(apiKey, apiSecret, passphrase, environment, region);

    if (verification.permissions?.withdrawal === true) {
      return jsonResponse({ error: "withdrawal_permission_forbidden" }, 400);
    }

    const secretPayload = {
      api_key: apiKey,
      api_secret: apiSecret,
      ...(passphrase ? { passphrase } : {}),
      environment,
      region,
    };

    const { data: connectionId, error: storeError } = await adminClient.rpc(
      "service_store_platform_connection_credentials",
      {
        p_user_id: user.id,
        p_platform_key: platform,
        p_secret_payload: secretPayload,
        p_external_ref: verification.externalRef || null,
        p_permissions: verification.permissions,
        p_capability_snapshot: verification.capabilities,
        p_connection_label: label || null,
        p_environment: environment,
        p_endpoint_region: region,
      },
    );
    if (storeError) throw storeError;

    return jsonResponse({
      ok: true,
      connectionId,
      platform,
      status: "CONNECTED",
      permissions: verification.permissions,
      capabilities: verification.capabilities,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "connection_failed";
    return jsonResponse({ error: message }, 400);
  }
});
