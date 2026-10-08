type Quote={venue:string;symbol:string;price:number|null;change24h:number|null;volume24h:number|null;turnover24h?:number|null};
type DexRow={symbol:string;name:string;chain:string;dex:string;price:number|null;change24h:number|null;volume24h:number|null;marketCap:number|null;liquidity:number|null};

function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:null}
async function get(url:string){
  const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(7000),headers:{"User-Agent":"UniversalTradingAI/1.0 admin-market-data"}});
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.json();
}

export async function fetchMarketOverview(){
  const started=Date.now();
  const [bybit,binance,okx,boosts]=await Promise.allSettled([
    get("https://api.bybit.com/v5/market/tickers?category=spot"),
    get("https://api.binance.com/api/v3/ticker/24hr"),
    get("https://www.okx.com/api/v5/market/tickers?instType=SPOT"),
    get("https://api.dexscreener.com/token-boosts/top/v1"),
  ]);

  const venueMap=new Map<string,Quote[]>();

  if(bybit.status==="fulfilled"){
    for(const row of bybit.value?.result?.list??[]){
      const symbol=String(row.symbol??"");
      if(!symbol.endsWith("USDT")) continue;
      const list=venueMap.get(symbol)??[];
      list.push({venue:"BYBIT",symbol,price:n(row.lastPrice),change24h:n(row.price24hPcnt)==null?null:Number(row.price24hPcnt)*100,volume24h:n(row.volume24h),turnover24h:n(row.turnover24h)});
      venueMap.set(symbol,list);
    }
  }
  if(binance.status==="fulfilled"&&Array.isArray(binance.value)){
    for(const row of binance.value){
      const symbol=String(row.symbol??"");
      if(!symbol.endsWith("USDT")) continue;
      const list=venueMap.get(symbol)??[];
      list.push({venue:"BINANCE",symbol,price:n(row.lastPrice),change24h:n(row.priceChangePercent),volume24h:n(row.volume)});
      venueMap.set(symbol,list);
    }
  }
  if(okx.status==="fulfilled"){
    for(const row of okx.value?.data??[]){
      const inst=String(row.instId??"");
      if(!inst.endsWith("-USDT")) continue;
      const symbol=inst.replaceAll("-","");
      const last=n(row.last),open=n(row.open24h);
      const list=venueMap.get(symbol)??[];
      list.push({venue:"OKX",symbol,price:last,change24h:last!=null&&open!=null&&open!==0?((last-open)/open)*100:null,volume24h:n(row.vol24h)});
      venueMap.set(symbol,list);
    }
  }

  const cex=[...venueMap.entries()].map(([symbol,venues])=>({
    symbol,
    venues,
    primary:venues.find(v=>v.venue==="BYBIT")??venues[0],
    venueCount:venues.length,
    maxPrice:Math.max(...venues.map(v=>v.price??0)),
    minPrice:Math.min(...venues.filter(v=>v.price!=null).map(v=>v.price as number)),
  })).filter(r=>r.primary?.price!=null)
    .sort((a,b)=>Number(b.primary.turnover24h??0)-Number(a.primary.turnover24h??0))
    .slice(0,40);

  const dex:DexRow[]=[];
  if(boosts.status==="fulfilled"&&Array.isArray(boosts.value)){
    const top=boosts.value.slice(0,10);
    await Promise.all(top.map(async(item:any)=>{
      try{
        const chain=String(item.chainId??"");
        const address=String(item.tokenAddress??"");
        if(!chain||!address)return;
        const pairs=await get(`https://api.dexscreener.com/token-pairs/v1/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
        if(!Array.isArray(pairs)||!pairs.length)return;
        const pair=[...pairs].sort((a:any,b:any)=>Number(b?.liquidity?.usd??0)-Number(a?.liquidity?.usd??0))[0];
        dex.push({
          symbol:String(pair?.baseToken?.symbol??"TOKEN"),
          name:String(pair?.baseToken?.name??"Unknown token"),
          chain:String(pair?.chainId??chain),
          dex:String(pair?.dexId??""),
          price:n(pair?.priceUsd),
          change24h:n(pair?.priceChange?.h24),
          volume24h:n(pair?.volume?.h24),
          marketCap:n(pair?.marketCap??pair?.fdv),
          liquidity:n(pair?.liquidity?.usd),
        });
      }catch{}
    }));
  }

  return {
    checkedAt:new Date().toISOString(),
    latencyMs:Date.now()-started,
    sources:{
      bybit:bybit.status==="fulfilled",
      binance:binance.status==="fulfilled",
      okx:okx.status==="fulfilled",
      dexscreener:boosts.status==="fulfilled",
    },
    cex,
    dex:dex.sort((a,b)=>Number(b.volume24h??0)-Number(a.volume24h??0)),
  };
}
