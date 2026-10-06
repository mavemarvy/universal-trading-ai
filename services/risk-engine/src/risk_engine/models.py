from dataclasses import dataclass, field
from typing import Literal
ExecutionClass=Literal["FULL_AUTO","LIMITED_AUTO","COPILOT","UNSUPPORTED"]
@dataclass(frozen=True)
class RiskLimits:
    max_trading_allocation: float; max_risk_per_trade: float; max_daily_loss: float; max_drawdown: float; max_leverage: float; max_positions: int; max_correlated_exposure: float; max_platform_exposure: float; max_asset_exposure: float; max_memecoin_exposure: float; max_slippage_bps: float; min_liquidity: float; min_confidence: float; min_expected_edge: float; max_spread_bps: float
@dataclass(frozen=True)
class RiskContext:
    equity: float; allocated_capital: float; current_daily_loss: float; current_drawdown: float; leverage: float; open_positions: int; correlated_exposure: float; platform_exposure: float; asset_exposure: float; memecoin_exposure: float; slippage_bps: float; liquidity: float; confidence: float; expected_edge: float; spread_bps: float; proposed_risk: float; proposed_notional: float; is_memecoin: bool=False; news_blocked: bool=False; data_stale: bool=False; kill_switch: bool=False; connection_healthy: bool=True; execution_class: ExecutionClass="COPILOT"; live_requested: bool=False
@dataclass(frozen=True)
class RiskDecision:
    status: Literal["APPROVE","MODIFY","REJECT"]; approved_notional: float; reasons: tuple[str,...]=field(default_factory=tuple)
