"""Prepare isolated Heretic recipe files; never execute a model edit."""
import argparse
import hashlib
import json
import os
import platform
import shlex
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import unlock_common as uc  # noqa: E402

SKILL = Path(__file__).resolve().parent.parent
COMMIT = '8b0dbac4dd180dc23d62fdf9714dc9d8b31f3d2c'
MODEL = 'Qwen/Qwen3-4B-Instruct-2507'
REVISION = 'cdbee75f17c01a7cc42f958dc650907174af0554'

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--model', type=Path, required=True, help='Local model folder (sharded or single-file safetensors)')
    p.add_argument('--out', type=Path, required=True, help='New directory; existing paths are refused')
    p.add_argument('--heretic', type=Path, required=True, help='Heretic executable in its isolated environment')
    p.add_argument('--device', choices=['mps','cuda','cpu'], default='mps')
    p.add_argument('--mode', choices=['history','behavior','both'], default='both')
    p.add_argument('--check-only', action='store_true')
    args = p.parse_args()
    model, out, executable = args.model.resolve(), args.out.absolute(), args.heretic.resolve()
    # Do not follow an existing output symlink or write inside the original model.
    if out.exists() or out.is_symlink():
        p.error('Output already exists; choose a new directory.')
    out = out.resolve()
    if out == model or model in out.parents or out in model.parents:
        p.error('Output and input model directories must be separate, not nested.')
    # Sharded (model.safetensors.index.json) or single-file (model.safetensors) models.
    # Hugging Face snapshots legitimately symlink weights into sibling blob storage.
    try:
        weight_files = uc.weight_files(model)
    except ValueError as e:
        p.error(str(e))
    if not executable.is_file() or not os.access(executable, os.X_OK): p.error('Heretic executable is not available.')
    parent = out.parent
    while not parent.exists(): parent=parent.parent
    copies = 2 if args.mode == 'both' else 1
    size = sum(f.stat().st_size for f in weight_files)
    free = shutil.disk_usage(parent).free
    estimate = copies*size + 5*1024**3
    if free < estimate: p.error('Not enough free disk for output copies and temporary files.')
    ram = None
    if platform.system() == 'Darwin':
        ram = int(subprocess.check_output(['sysctl','-n','hw.memsize'], text=True))
    elif hasattr(os, 'sysconf'):
        try: ram=os.sysconf('SC_PAGE_SIZE')*os.sysconf('SC_PHYS_PAGES')
        except (ValueError,OSError): pass
    plan = {'status':'checked only; no model edit has run','platform':platform.platform(),
      'physical_memory_bytes':ram,'device':args.device,'input_model':str(model),'input_kind':'existing_history_copy' if args.mode=='behavior' else 'original',
      'expected_base_model':MODEL,'expected_base_revision':REVISION,'source_commit':COMMIT,
      'weights_bytes':size,'disk_free_bytes':free,'output_disk_estimate_bytes':estimate,
      'note':'Disk estimate is not a RAM/VRAM fit guarantee. This recipe was observed on M5 Max, 128 GiB RAM; verify the actual accelerator before editing.'}
    if args.check_only:
        print(json.dumps(plan,indent=2));return
    out.mkdir(parents=True)
    copied=[]
    def copy(src,dest):
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(src,dest)
        copied.append({'source':str(src.relative_to(SKILL)), 'copy':str(dest.relative_to(out)),
                       'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
    modes=['history','behavior'] if args.mode=='both' else [args.mode]
    for mode in modes:
        for f in (SKILL/'assets'/mode).iterdir():copy(f,out/'inputs'/mode/f.name)
        (out/mode).mkdir()
    if 'behavior' in modes:
        for n in ['clarification_mpoa.py','clarification_objective.py']:copy(SKILL/'scripts'/n,out/'helpers'/n)
    commands=[]
    for mode in modes:
        cfg=(SKILL/'assets'/f'{mode}.toml').read_text()
        mapping={'@MODEL@':str(model if mode=='history' or args.mode=='behavior' else out/'history/model'),
                 '@RUN@':str(out/mode),'@DATA@':str(out/'inputs'/mode),
                 '@HELPERS@':str(out/'helpers'),'@DEVICE@':args.device}
        for old,new in mapping.items():cfg=cfg.replace(old,json.dumps(new)[1:-1])
        parsed=tomllib.loads(cfg)
        assert Path(parsed['save_directory']).is_relative_to(out)
        assert Path(parsed['study_checkpoint_dir']).is_relative_to(out)
        if mode=='behavior':
            assert Path(parsed['scorer']['ClarificationObjective']['log_file']).is_relative_to(out)
        path=out/f'{mode}.toml';path.write_text(cfg)
        commands.append('HERETIC_CONFIG_FILE='+shlex.quote(str(path))+' '+shlex.quote(str(executable)))
    plan.update(status='prepared only; no model edit has run',order=modes,commands=commands,copied_files=copied)
    (out/'RUN-PLAN.json').write_text(json.dumps(plan,indent=2)+'\n')
    print(json.dumps(plan,indent=2))

if __name__=='__main__':main()
