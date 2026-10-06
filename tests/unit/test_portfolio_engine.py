from portfolio_engine import Position,aggregate
def test_aggregate_same_direction_positions():
    result=aggregate([Position("XAUUSD","LONG",2000,.02) for _ in range(10)])
    assert result["gross"]==20000
    assert result["asset:XAUUSD"]==20000
