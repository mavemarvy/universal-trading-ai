import { NextRequest, NextResponse } from "next/server";

const QUERIES: Record<string, string> = {
  all: '(bitcoin OR ethereum OR cryptocurrency OR forex OR "Federal Reserve" OR inflation OR "stock market")',
  crypto: '(bitcoin OR ethereum OR solana OR cryptocurrency OR crypto)',
  macro: '("Federal Reserve" OR inflation OR "interest rates" OR GDP OR unemployment)',
  forex: '(forex OR "foreign exchange" OR USD OR EUR OR GBP OR JPY)',
  stocks: '("stock market" OR stocks OR Nasdaq OR "S&P 500")',
};

function isoGdelt(value: unknown) {
  const raw = String(value ?? "");
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return raw;
  const [, y, m, d, hh, mm, ss] = match;
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
}

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get("topic") ?? "all";
  const query = QUERIES[topic] ?? QUERIES.all;

  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    timespan: "24h",
    maxrecords: "50",
    sort: "datedesc",
  });

  const started = Date.now();

  try {
    const response = await fetch(
      "https://api.gdeltproject.org/api/v2/doc/doc?" + params.toString(),
      {
        headers: {
          "User-Agent": "UniversalTradingAI/1.0 market-news-reader",
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, provider: "GDELT", error: "News provider unavailable" },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const articles = Array.isArray(payload?.articles)
      ? payload.articles.slice(0, 40).map((article: any) => ({
          title: String(article.title ?? "").slice(0, 300),
          url: String(article.url ?? ""),
          image: String(article.socialimage ?? ""),
          source: String(article.domain ?? "Unknown source"),
          publishedAt: isoGdelt(article.seendate),
          language: String(article.language ?? ""),
          sourceCountry: String(article.sourcecountry ?? ""),
        }))
      : [];

    return NextResponse.json({
      ok: true,
      provider: "GDELT DOC 2.0",
      topic,
      latencyMs: Date.now() - started,
      fetchedAt: new Date().toISOString(),
      articles,
    });
  } catch {
    return NextResponse.json(
      { ok: false, provider: "GDELT", error: "News provider request failed" },
      { status: 502 }
    );
  }
}
