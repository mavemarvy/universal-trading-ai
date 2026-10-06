from dataclasses import dataclass
@dataclass(frozen=True)
class ExecutionRequest: risk_status:str; execution_class:str; kill_switch:bool; withdrawal_permission:bool; idempotency_key:str

def authorize(req:ExecutionRequest)->tuple[bool,str]:
    if req.kill_switch: return False,"KILL_SWITCH_ACTIVE"
    if req.withdrawal_permission: return False,"WITHDRAWAL_PERMISSION_FORBIDDEN"
    if req.risk_status not in {"APPROVE","MODIFY"}: return False,"RISK_NOT_APPROVED"
    if req.execution_class not in {"FULL_AUTO","LIMITED_AUTO"}: return False,"AUTOMATION_NOT_PERMITTED"
    if not req.idempotency_key: return False,"IDEMPOTENCY_REQUIRED"
    return True,"AUTHORIZED"
