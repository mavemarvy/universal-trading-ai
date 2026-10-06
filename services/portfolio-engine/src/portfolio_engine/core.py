from dataclasses import dataclass
@dataclass(frozen=True)
class Position: asset:str; direction:str; notional:float; quantity:float

def aggregate(positions:list[Position])->dict[str,float]:
    gross=sum(abs(p.notional) for p in positions)
    net=sum(p.notional if p.direction.upper()=="LONG" else -p.notional for p in positions)
    by_asset={}
    for p in positions: by_asset[p.asset]=by_asset.get(p.asset,0.0)+abs(p.notional)
    return {"gross":gross,"net":net,**{f"asset:{k}":v for k,v in by_asset.items()}}
