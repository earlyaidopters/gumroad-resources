"""Preserve exact single/multi-turn inputs and unedited local model outputs."""
import argparse
import hashlib
import json
import time
from pathlib import Path
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

p = argparse.ArgumentParser()
p.add_argument("--model", required=True)
p.add_argument("--fixtures", required=True)
p.add_argument("--out", required=True)
p.add_argument("--dtype", default="bfloat16", choices=["bfloat16", "float32"])
p.add_argument("--max-tokens", type=int, default=320)
p.add_argument("--device", default="mps", choices=["mps", "cuda", "cpu"])
a = p.parse_args()
output = Path(a.out)
output.parent.mkdir(parents=True, exist_ok=True)
with output.open("x") as f:
    f.write(json.dumps({"status": "started", "model": a.model}) + "\n")
source = Path(a.fixtures)
spec = json.loads(source.read_text())
tokenizer = AutoTokenizer.from_pretrained(a.model, local_files_only=True, trust_remote_code=False)
model = AutoModelForCausalLM.from_pretrained(a.model, local_files_only=True, trust_remote_code=False,
    dtype=getattr(torch, a.dtype), attn_implementation="eager").to(a.device).eval()
report = {"phase": spec["phase"], "model": str(Path(a.model).resolve()), "dtype": a.dtype,
    "fixtures_sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "do_sample": False,
    "device": a.device, "max_new_tokens": a.max_tokens, "results": []}
for f in spec["fixtures"]:
    messages = f.get("messages") or [{"role": "system", "content": "You are a helpful assistant."},
                                    {"role": "user", "content": f["prompt"]}]
    batch = tokenizer(tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True),
                      return_tensors="pt").to(a.device)
    start = time.monotonic()
    with torch.inference_mode():
        full = model.generate(**batch, max_new_tokens=a.max_tokens, do_sample=False,
                              pad_token_id=tokenizer.eos_token_id)
    tokens = full[0, batch["input_ids"].shape[1]:]
    row = {"id": f["id"], "case_group": f.get("case_group", "fresh"), "messages": messages, "response": tokenizer.decode(tokens, skip_special_tokens=True),
           "input_ids": batch["input_ids"][0].tolist(), "attention_mask": batch["attention_mask"][0].tolist(),
           "hit_token_limit": len(tokens) == a.max_tokens, "generated_tokens": len(tokens),
           "seconds": time.monotonic() - start}
    report["results"].append(row)
    Path(a.out).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(row, ensure_ascii=False), flush=True)
    del batch, full, tokens
    if a.device == "mps": torch.mps.empty_cache()
    elif a.device == "cuda": torch.cuda.empty_cache()
report["completed_at"] = time.time()
Path(a.out).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
