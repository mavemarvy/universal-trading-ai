from profit_protection import ProtectionState,update,action
def test_target_activates_protection_but_does_not_force_close():
    state=update(ProtectionState(target=100),120)
    assert state.active and action(state,120)=="LET_WINNER_RUN"
def test_material_giveback_exits():
    state=update(ProtectionState(target=100),300,.15)
    assert state.floor==255
    assert action(state,250)=="EXIT"
