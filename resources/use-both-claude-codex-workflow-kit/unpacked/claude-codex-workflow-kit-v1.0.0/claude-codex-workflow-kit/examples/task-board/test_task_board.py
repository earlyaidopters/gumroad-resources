import unittest
from task_board import visible_tasks


class TaskBoardTests(unittest.TestCase):
    def test_adjacent_completed_tasks(self):
        tasks = [{"id": 1, "completed": True}, {"id": 2, "completed": True}, {"id": 3, "completed": False}]
        self.assertEqual(visible_tasks(tasks, True), [tasks[2]])

    def test_filter_off_preserves_order(self):
        tasks = [{"id": 2, "completed": True}, {"id": 1, "completed": False}]
        self.assertEqual(visible_tasks(tasks), tasks)

    def test_input_is_not_mutated(self):
        tasks = [{"id": 1, "completed": True}, {"id": 2, "completed": False}]
        original = [dict(task) for task in tasks]
        result = visible_tasks(tasks, True)
        self.assertEqual(tasks, original)
        self.assertIsNot(result, tasks)

    def test_empty_input(self):
        self.assertEqual(visible_tasks([], True), [])

    def test_missing_flag(self):
        self.assertEqual(visible_tasks([{"id": 1}], True), [{"id": 1}])


if __name__ == "__main__":
    unittest.main()
