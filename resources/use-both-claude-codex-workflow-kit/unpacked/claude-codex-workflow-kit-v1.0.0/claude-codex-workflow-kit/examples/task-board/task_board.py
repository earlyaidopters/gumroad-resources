"""Synthetic example; task dictionaries use boolean completion flags."""


def visible_tasks(tasks, hide_completed=False):
    return [task for task in tasks if not hide_completed or not task.get("completed", False)]
