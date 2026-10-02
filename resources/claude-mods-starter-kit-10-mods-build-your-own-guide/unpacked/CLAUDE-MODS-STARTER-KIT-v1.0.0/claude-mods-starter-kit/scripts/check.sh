#!/usr/bin/env bash
set -euo pipefail
kit_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
claude plugin validate "$kit_dir"
for plugin in "$kit_dir"/plugins/*; do
 claude plugin validate "$plugin"
 claude plugin test "$plugin"
done
claude plugin validate "$kit_dir/templates/starter-mod"
claude plugin test "$kit_dir/templates/starter-mod"
echo 'Validation and unit tests passed. This does not certify live desktop behavior.'
