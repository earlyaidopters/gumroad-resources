"""How would the wake spotter have done on real life so far?

The spotter runs beside the old wake check and its verdict is logged with
every transcription ("ears: heard ... wake=True spotter=True"). This reads
logs/gateway.log and answers the two questions that decide whether to turn
the gate on (STACKCHAN_WAKE_GATE=1 in run-gateway-daemon.sh):

  of the times Lil Token really woke, how many did the spotter also flag?
  of everything else it transcribed, how much would the gate have skipped?

    python3 tools/wake/shadow_report.py
"""

import re
from pathlib import Path

rows = [ln for ln in (Path(__file__).resolve().parents[2] / "logs" / "gateway.log").read_text(errors="replace").splitlines()
        if "ears: heard" in ln and "spotter=" in ln]
wakes = [ln for ln in rows if "wake=True" in ln]
other = [ln for ln in rows if "wake=False" in ln]
caught = sum("spotter=True" in ln for ln in wakes)
flagged = sum("spotter=True" in ln for ln in other)
print(f"{len(rows)} transcriptions with a spotter verdict since {rows[0][:16] if rows else 'never'}")
print(f"real wakes: {len(wakes)}, of which the spotter flagged {caught}" + (f" ({caught / len(wakes):.0%})" if wakes else ""))
print(f"everything else: {len(other)}, of which the gate would have skipped {len(other) - flagged}"
      + (f" ({(len(other) - flagged) / len(other):.0%})" if other else ""))
missed = [re.search(r"heard (.*?) wake=", ln).group(1)[:60] for ln in wakes if "spotter=False" in ln][:8]
if missed:
    print("wakes the gate would have lost:", missed)
