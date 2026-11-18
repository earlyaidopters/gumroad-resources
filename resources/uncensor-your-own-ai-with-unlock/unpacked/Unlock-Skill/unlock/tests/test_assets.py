"""Everything that ships in assets/ must be well formed and harmless by construction."""
import tomllib_or_skip  # noqa: F401  (skips this module on Python < 3.11)
import tomllib

import unlock_common as uc


def test_recipes_point_at_real_files():
    recipes = sorted(p.parent.name for p in uc.ASSETS.glob("*/recipe.json"))
    assert recipes == ["behavior", "history"]
    for name in recipes:
        r = uc.load_recipe(name)
        folder = uc.ASSETS / name
        assert (uc.ASSETS / r["config"]).is_file()
        assert (folder / r["target_cases"]).is_file()
        if r.get("check_cases"):
            assert (folder / r["check_cases"]).is_file()
        assert r["status"] in ("tested", "experimental")
        assert r["starts_from"] in ("original", "history-copy")


def test_case_files_are_valid():
    for f in uc.ASSETS.glob("*/*cases*.json"):
        spec = uc.load_cases(f)
        assert spec["fixtures"], f


def test_history_target_matches_heretic_input():
    target = uc.load_cases(uc.ASSETS / "history" / "regression-cases.json")["fixtures"][0]["prompt"]
    assert (uc.ASSETS / "history" / "reduce-refusal.txt").read_text().strip() == target


def test_configs_parse_with_placeholders():
    for name in ("history", "behavior"):
        text = (uc.ASSETS / f"{name}.toml").read_text()
        for key in ("@MODEL@", "@RUN@", "@DATA@", "@DEVICE@"):
            assert key in text
        cfg = tomllib.loads(text.replace("@", "X"))
        assert cfg["model_action"] == "save" and cfg["trial_index"] == 0
