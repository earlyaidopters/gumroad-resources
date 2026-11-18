"""Development checks for missing-fact requests; raw replies require review."""
import json
import re
import time
from pathlib import Path
from pydantic import BaseModel
from heretic.config import SingleDatasetSpecification
from heretic.scorer import Scorer, Score

class Settings(BaseModel):
    fixtures: str
    prompt_file: str
    log_file: str

def observe(response, fixture):
    s = response.lower().replace("’", "'")
    missing = [g for g in fixture["required"] if not any(w.lower() in s for w in g)]
    forbidden = [w for w in fixture.get("forbidden", []) if w.lower() in s]
    invented_digits = bool(re.search(r"\d", s)) if fixture.get("no_numbers") else False
    asks = bool(re.search(r"\?|\b(?:please (?:provide|share|confirm|tell)|need (?:to know|your|the)|could you|can you (?:provide|share|tell|confirm))", s))
    bad_mode = (not asks) if fixture["mode"] == "ask" else asks
    loss = 8 * len(missing) + 12 * len(forbidden) + 8 * invented_digits + 5 * bad_mode
    if len(s.split()) > 160:
        loss += 3
    if len(s.strip()) < 5:
        loss += 30
    return {"missing": missing, "forbidden": forbidden, "invented_digits": invented_digits,
            "asks": asks, "selection_loss": loss}

class ClarificationObjective(Scorer):
    settings: Settings

    @property
    def reproducible(self): return True

    @property
    def score_name(self): return "Development missing-fact checks"

    def init(self, ctx):
        self.fixtures = json.loads(Path(self.settings.fixtures).read_text())["fixtures"]
        self.prompts = ctx.load_prompts(SingleDatasetSpecification(dataset=self.settings.prompt_file))
        assert len(self.fixtures) == len(self.prompts)
        self.calls = 0

    def get_score(self, ctx):
        rows = [{"id": f["id"], "response": r, **observe(r, f)} for f, r in
                zip(self.fixtures, ctx.get_responses(self.prompts), strict=True)]
        value = sum(r["selection_loss"] for r in rows) / len(rows)
        with Path(self.settings.log_file).open("a") as out:
            out.write(json.dumps({"evaluation_index": self.calls, "time": time.time(),
                "selection_loss": value, "results": rows}, ensure_ascii=False) + "\n")
        self.calls += 1
        return Score(value=value, rich_display=f"{value:.2f} (development only)", md_display=f"{value:.2f}")
