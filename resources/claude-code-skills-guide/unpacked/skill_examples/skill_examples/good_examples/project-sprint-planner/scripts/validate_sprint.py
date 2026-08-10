"""
Validate sprint plan before creating tasks in Linear.
Run: python scripts/validate_sprint.py --tasks tasks.json
"""

import json
import sys
import argparse


def validate_sprint(tasks: list[dict], capacity: int) -> dict:
    """Check sprint plan for common issues."""
    issues = []
    total_points = 0

    for i, task in enumerate(tasks):
        # Required fields
        if not task.get("title"):
            issues.append(f"Task {i+1}: Missing title")
        if not task.get("estimate"):
            issues.append(f"Task {i+1} '{task.get('title', '?')}': Missing estimate")
        if task.get("estimate", 0) > 8:
            issues.append(
                f"Task {i+1} '{task['title']}': Estimate {task['estimate']} pts "
                f"is too large — break into smaller tasks (max 8)"
            )

        total_points += task.get("estimate", 0)

    # Capacity check
    utilization = (total_points / capacity * 100) if capacity > 0 else 0
    if utilization > 100:
        issues.append(
            f"OVERCOMMITTED: {total_points} pts planned vs {capacity} pts capacity "
            f"({utilization:.0f}%)"
        )
    elif utilization > 85:
        issues.append(
            f"WARNING: Sprint at {utilization:.0f}% capacity — leave buffer for unknowns"
        )

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "total_points": total_points,
        "capacity": capacity,
        "utilization_pct": round(utilization, 1),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate sprint plan")
    parser.add_argument("--tasks", required=True, help="Path to tasks JSON file")
    parser.add_argument("--capacity", type=int, default=40, help="Sprint capacity in points")
    args = parser.parse_args()

    with open(args.tasks) as f:
        tasks = json.load(f)

    result = validate_sprint(tasks, args.capacity)

    if result["valid"]:
        print(f"Sprint plan OK — {result['total_points']} pts / {result['capacity']} pts "
              f"({result['utilization_pct']}%)")
    else:
        print("Sprint plan has issues:")
        for issue in result["issues"]:
            print(f"  - {issue}")
        sys.exit(1)
