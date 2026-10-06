from execution_engine import ExecutionRequest,authorize
def test_risk_cannot_be_bypassed(): assert authorize(ExecutionRequest("REJECT","FULL_AUTO",False,False,"k"))[0] is False
def test_withdrawal_permission_forbidden(): assert authorize(ExecutionRequest("APPROVE","FULL_AUTO",False,True,"k"))[1]=="WITHDRAWAL_PERMISSION_FORBIDDEN"
def test_copilot_blocked(): assert authorize(ExecutionRequest("APPROVE","COPILOT",False,False,"k"))[0] is False
