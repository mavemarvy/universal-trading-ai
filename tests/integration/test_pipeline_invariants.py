from execution_engine import ExecutionRequest,authorize
def test_live_execution_requires_both_risk_and_capability():
    ok,_=authorize(ExecutionRequest("APPROVE","FULL_AUTO",False,False,"intent-1")); assert ok
    ok,_=authorize(ExecutionRequest("APPROVE","UNSUPPORTED",False,False,"intent-2")); assert not ok
