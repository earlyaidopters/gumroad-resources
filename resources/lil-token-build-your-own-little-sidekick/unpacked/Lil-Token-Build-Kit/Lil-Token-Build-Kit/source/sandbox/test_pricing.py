import unittest

from pricing import order_total


class OrderTotal(unittest.TestCase):
    def test_no_discount(self):
        self.assertEqual(order_total([10, 5.5]), 15.5)

    def test_ten_percent_off(self):
        self.assertEqual(order_total([100, 50], discount_percent=10), 135.0)


if __name__ == "__main__":
    unittest.main()
