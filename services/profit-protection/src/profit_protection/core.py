from dataclasses import dataclass
@dataclass(frozen=True)
class ProtectionState: target:float; peak:float=0.0; floor:float=0.0; active:bool=False

def update(state:ProtectionState,current_profit:float,max_giveback_pct:float=0.15)->ProtectionState:
    peak=max(state.peak,current_profit)
    active=state.active or current_profit>=state.target
    floor=state.floor
    if active and peak>0: floor=max(floor, peak*(1-max_giveback_pct))
    return ProtectionState(state.target,peak,floor,active)

def action(state:ProtectionState,current_profit:float,edge_valid:bool=True)->str:
    if not edge_valid: return "EXIT"
    if state.active and current_profit<=state.floor: return "EXIT"
    if state.active: return "LET_WINNER_RUN"
    return "HOLD"
