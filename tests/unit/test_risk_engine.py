from risk_engine import RiskContext,RiskLimits,evaluate

def limits(): return RiskLimits(10000,200,500,1000,5,5,12000,8000,6000,1000,50,1000,0.60,0.02,40)
def ctx(**kw):
    base=dict(equity=10000,allocated_capital=1000,current_daily_loss=0,current_drawdown=0,leverage=2,open_positions=1,correlated_exposure=1000,platform_exposure=1000,asset_exposure=1000,memecoin_exposure=0,slippage_bps=5,liquidity=50000,confidence=.8,expected_edge=.05,spread_bps=5,proposed_risk=100,proposed_notional=500,execution_class="FULL_AUTO",live_requested=True)
    base.update(kw); return RiskContext(**base)
def test_approves_inside_limits(): assert evaluate(ctx(),limits()).status=="APPROVE"
def test_kill_switch_is_hard_reject(): assert "KILL_SWITCH_ACTIVE" in evaluate(ctx(kill_switch=True),limits()).reasons
def test_copilot_cannot_live_execute(): assert "AUTOMATION_NOT_PERMITTED" in evaluate(ctx(execution_class="COPILOT"),limits()).reasons
def test_allocation_cannot_be_exceeded(): assert "ALLOCATION_LIMIT" in evaluate(ctx(allocated_capital=9900,proposed_notional=500),limits()).reasons
