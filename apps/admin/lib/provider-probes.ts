export type ProviderProbe = {
  key: string;
  name: string;
  category: "MARKET_DATA" | "NEWS";
  ok: boolean;
  latencyMs: number | null;
  checkedAt: string;
  detail: string;
};

async function probeJson(
  key: string,
  name: string,
  category: ProviderProbe["category"],
  url: string,
  validate: (data: any) => boolean,
): Promise<ProviderProbe> {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "UniversalTradingAI/1.0 provider-health" },
    });
    const data = await response.json().catch(() => null);
    const ok = response.ok && validate(data);
    return {
      key,
      name,
      category,
      ok,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      detail: ok ? "Public provider endpoint responded normally." : `HTTP ${response.status} or invalid provider payload.`,
    };
  } catch (error) {
    return {
      key,
      name,
      category,
      ok: false,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      detail: error instanceof Error ? error.message.slice(0, 160) : "Provider request failed.",
    };
  }
}

export async function probePublicProviders(): Promise<ProviderProbe[]> {
  return Promise.all([
    probeJson(
      "CEX_PUBLIC_A",
      "Public CEX Feed A",
      "MARKET_DATA",
      "https://api.binance.com/api/v3/time",
      (data) => Number.isFinite(Number(data?.serverTime)),
    ),
    probeJson(
      "CEX_PUBLIC_B",
      "Public CEX Feed B",
      "MARKET_DATA",
      "https://www.okx.com/api/v5/public/time",
      (data) => data?.code === "0" && Array.isArray(data?.data),
    ),
    probeJson(
      "NEWS_PUBLIC_A",
      "Global Market News Feed",
      "NEWS",
      "https://api.gdeltproject.org/api/v2/doc/doc?query=bitcoin&mode=artlist&format=json&timespan=1h&maxrecords=1&sort=datedesc",
      (data) => Array.isArray(data?.articles),
    ),
  ]);
}

export async function fetchAdminLiveNews(limit = 12) {
  const params = new URLSearchParams({
    query: '(bitcoin OR ethereum OR cryptocurrency OR forex OR "Federal Reserve" OR "stock market")',
    mode: "artlist",
    format: "json",
    timespan: "24h",
    maxrecords: String(Math.max(1, Math.min(50, limit))),
    sort: "datedesc",
  });

  const started = Date.now();
  try {
    const response = await fetch(
      "https://api.gdeltproject.org/api/v2/doc/doc?" + params.toString(),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(7000),
        headers: { "User-Agent": "UniversalTradingAI/1.0 admin-news" },
      },
    );
    const payload = await response.json().catch(() => ({}));
    const articles = Array.isArray(payload?.articles)
      ? payload.articles.slice(0, limit).map((item: any) => ({
          title: String(item?.title ?? "").slice(0, 300),
          url: String(item?.url ?? ""),
          source: String(item?.domain ?? "Unknown source"),
          publishedAt: String(item?.seendate ?? ""),
          sourceCountry: String(item?.sourcecountry ?? ""),
        }))
      : [];

    return {
      ok: response.ok && Array.isArray(payload?.articles),
      latencyMs: Date.now() - started,
      fetchedAt: new Date().toISOString(),
      articles,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      fetchedAt: new Date().toISOString(),
      articles: [],
      error: error instanceof Error ? error.message : "News provider request failed.",
    };
  }
}
