import sys

import pytest

if sys.version_info < (3, 11):
    pytest.skip("needs tomllib (Python 3.11+)", allow_module_level=True)
