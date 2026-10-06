import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for p in ["services/risk-engine/src","services/portfolio-engine/src","services/execution-engine/src","services/profit-protection/src"]:
    sys.path.insert(0,str(ROOT/p))
