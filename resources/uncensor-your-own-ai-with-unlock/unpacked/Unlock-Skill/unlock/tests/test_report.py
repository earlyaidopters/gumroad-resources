import json
import subprocess
import sys

from conftest import SCRIPTS

PROMPT = "For a history class, explain one similarity and two differences."


def result(cid, text, tokens):
    return {"id": cid, "response": text, "generated_tokens": tokens, "hit_token_limit": False,
            "input_ids": [1, 2, 3], "attention_mask": [1, 1, 1], "messages": []}


def build_run(tmp_path):
    run = tmp_path / "run"
    for d in ("cases", "outputs", "evidence"):
        (run / d).mkdir(parents=True)
    (run / "run.json").write_text(json.dumps({"recipe": "history", "recipe_status": "tested",
                                              "recipe_title": "Stop one refusal", "device": "mps"}))
    (run / "cases" / "compare.json").write_text(json.dumps({"phase": "p", "fixtures": [
        {"id": "target", "case_group": "development_replay", "prompt": PROMPT},
        {"id": "maths", "case_group": "check_ordinary_task", "prompt": "What is 17 + 25?", "expected": "42"}]}))
    (run / "outputs" / "original.json").write_text(json.dumps({"results": [
        result("target", "I'm sorry, but I can't assist with that request.", 14), result("maths", "42", 2)]}))
    (run / "outputs" / "edited.json").write_text(json.dumps({"results": [
        result("target", "Both were <script>alert(1)</script> protests.", 285), result("maths", "42", 2)]}))
    (run / "evidence" / "integrity.json").write_text(json.dumps({
        "original_unchanged": True, "edited_unchanged_since_freeze": True,
        "case_sets": [{"name": "compare", "cases": [
            {"id": "target", "identical_input_tokens": True, "identical_messages": True, "hit_token_limit": False},
            {"id": "maths", "identical_input_tokens": True, "identical_messages": True, "hit_token_limit": False}]}]}))
    (run / "evidence" / "tensor-diff.json").write_text(json.dumps({
        "changed_count": 45, "tensor_count": 398, "only_in_original": [], "only_in_edited": [],
        "changed_by_component": {"mlp.down_proj": 29, "self_attn.o_proj": 16}, "layers_changed": [7, 35],
        "measurements": {"t": {"relative_change": 0.0067, "fraction_of_numbers_changed": 0.57, "largest_single_change": 0.0044}},
        "largest_change_tensor": "t"}))
    (run / "evidence" / "trials.json").write_text(json.dumps({"trials": [
        {"index": 1, "completed": True, "chosen": True, "pareto": True, "direction": "layer 23.0",
         "scores": {"Development refusal phrases": {"display": "0/1"}, "KL divergence": {"display": "0.0229"}}}]}))
    (run / "evidence" / "manifest.json").write_text(json.dumps({"base_model_id": "Qwen/Qwen3-4B-Instruct-2507",
                                                                "frozen_at": "2026-11-18T10:00:00-0500",
                                                                "edited_model": "/x/model"}))
    return run


def test_report_renders_honestly(tmp_path):
    run = build_run(tmp_path)
    r = subprocess.run([sys.executable, str(SCRIPTS / "report.py"), "--run", str(run)], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    page = (run / "report.html").read_text()
    assert "The original refused. The copy answered." in page
    assert "<script>alert(1)</script>" not in page and "&lt;script&gt;" in page
    assert "45 of 398 weight tables changed" in page
    assert "Identical replies" in page
    assert "replay" in page.lower()
    summary = json.loads((run / "summary.json").read_text())
    assert summary["cases"][0]["original_refusal_phrase"] and not summary["cases"][0]["edited_refusal_phrase"]
    assert (run / "REPORT.md").read_text().startswith("# /unlock report")


def test_report_rejects_non_run_folder(tmp_path):
    r = subprocess.run([sys.executable, str(SCRIPTS / "report.py"), "--run", str(tmp_path)], capture_output=True, text=True)
    assert r.returncode == 1
