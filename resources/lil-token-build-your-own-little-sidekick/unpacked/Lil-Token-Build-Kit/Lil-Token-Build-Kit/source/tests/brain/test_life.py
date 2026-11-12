"""Eye contact maths (brain/life.py). The camera scale was measured on the robot."""

import os
import sys
import unittest
from pathlib import Path

os.environ["LILTOKEN_AGENT"] = "0"
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "brain"))

import life  # noqa: E402


class Aim(unittest.TestCase):
    def test_a_centred_face_needs_no_move(self):
        self.assertIsNone(life.aim_step(160, 105, 0, 22))
        self.assertIsNone(life.aim_step(170, 115, 0, 22))      # inside the deadband

    def test_face_on_the_right_turns_the_head_right(self):
        yaw, pitch = life.aim_step(280, 105, 0, 22)
        self.assertGreater(yaw, 0)
        self.assertEqual(pitch, 22)

    def test_face_high_in_the_picture_tilts_the_head_up(self):
        yaw, pitch = life.aim_step(160, 20, 0, 22)
        self.assertEqual(yaw, 0)
        self.assertGreater(pitch, 22)

    def test_steps_are_partial_so_it_does_not_overshoot(self):
        full_error_deg = (300 - 160) / life.PX_PER_DEG_YAW
        yaw, _ = life.aim_step(300, 105, 0, 22)
        self.assertLess(yaw, full_error_deg)

    def test_the_head_stays_inside_safe_angles(self):
        yaw, pitch = life.aim_step(319, 0, 58, 54)
        self.assertLessEqual(yaw, life.YAW_LIMIT)
        self.assertLessEqual(pitch, life.PITCH_MAX)
        yaw, pitch = life.aim_step(0, 239, -58, 9)
        self.assertGreaterEqual(yaw, -life.YAW_LIMIT)
        self.assertGreaterEqual(pitch, life.PITCH_MIN)

    def test_it_looks_at_the_nearest_person(self):
        faces = [[10, 10, 20, 20, 0.9], [100, 60, 80, 90, 0.8]]   # x, y, w, h
        self.assertEqual(life.largest_face(faces), (140.0, 105.0))
        self.assertIsNone(life.largest_face(None))
        self.assertIsNone(life.largest_face([]))


if __name__ == "__main__":
    unittest.main()
