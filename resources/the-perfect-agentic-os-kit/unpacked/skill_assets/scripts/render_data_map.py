"""Render a data_map.json into a self-contained Pantry -> Prep -> Plate HTML.

Usage:
    python3 render_data_map.py --input data_map.json --output data_map.html

The output is a single HTML file with inline CSS and inline SVG. No external
dependencies. The operator can email the file or share it directly.

Schema: see SKILL.md Stage 6.
"""
import argparse
import json
from pathlib import Path

# Jinja2 required: pip install jinja2
try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
except ImportError:
    raise SystemExit(
        "Jinja2 required. Install with: pip install jinja2"
    )

THIS_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = THIS_DIR / "templates"


def render(data_map: dict, template_dir: Path = TEMPLATE_DIR) -> str:
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    tpl = env.get_template("data_map.html.j2")

    # Pre-compute connection tuples for the template: (from_id, to_id, is_opportunity)
    connections = []
    for prep_item in data_map.get("prep", []):
        for source_id in prep_item.get("sources", []):
            connections.append({
                "from": source_id,
                "to": prep_item["id"],
                "is_opportunity": prep_item.get("status") == "missing",
            })
    for plate_item in data_map.get("plate", []):
        for prep_id in plate_item.get("reads_from", []):
            connections.append({
                "from": prep_id,
                "to": plate_item["id"],
                "is_opportunity": plate_item.get("status") == "missing",
            })

    # Group opportunities by surface for badges on cards
    opp_by_id = {}
    for opp in data_map.get("opportunities", []):
        surface = opp.get("surface", "")
        # surface format: "pantry/<id>" / "prep/<id>" / "plate/<id>"
        if "/" in surface:
            _, item_id = surface.split("/", 1)
            opp_by_id.setdefault(item_id, []).append(opp)

    return tpl.render(
        business=data_map.get("business", {}),
        pantry=data_map.get("pantry", []),
        prep=data_map.get("prep", []),
        plate=data_map.get("plate", []),
        connections=connections,
        opportunities=data_map.get("opportunities", []),
        opp_by_id=opp_by_id,
        recipes=data_map.get("recipes", []),
        setup_priority=data_map.get("setup_priority", []),
        setup_total_time=data_map.get("setup_total_time"),
        interaction_layer=data_map.get("interaction_layer", []),
    )


def main():
    parser = argparse.ArgumentParser(description="Render a silver-platter data map to HTML")
    parser.add_argument("--input", "-i", required=True, help="Path to data_map.json")
    parser.add_argument("--output", "-o", required=True, help="Path for output data_map.html")
    parser.add_argument("--template-dir", default=str(TEMPLATE_DIR), help="Override template directory")
    args = parser.parse_args()

    data_map = json.loads(Path(args.input).read_text(encoding="utf-8"))
    html = render(data_map, template_dir=Path(args.template_dir))
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    print(f"[ok] wrote {out_path} ({out_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
