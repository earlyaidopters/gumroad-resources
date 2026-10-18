"""Small, tested integration used by the installed gumroad-push publisher."""
from decimal import Decimal
import json
from pathlib import Path
import subprocess


def queue_originals(product_id, files, uploaded_entries, price):
    if Decimal(str(price)) != 0:
        return {'status': 'not-a-free-resource'}
    helper = Path.home() / '.local/bin/gumroad-mirror'
    args = [str(helper), 'enqueue', '--product-id', product_id]
    for path in files:
        args += ['--file', str(path)]
    for entry in uploaded_entries:
        args += ['--expected-file-id', entry['id']]
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=180, check=True)
        receipt = json.loads(result.stdout)
        if receipt.get('status') != 'queued':
            raise ValueError('No durable queue receipt')
        return receipt
    except Exception as error:
        raise RuntimeError(f'Product {product_id} remains a draft: durable source backup failed ({type(error).__name__}). Resume this product; do not create a duplicate.') from None


def finish_mirror(queued, product_id, published):
    if queued['status'] != 'queued':
        return queued
    if not published:
        return {**queued, 'status': 'queued-awaiting-publication'}
    try:
        result = subprocess.run([str(Path.home() / '.local/bin/gumroad-mirror'),
                                 'drain', '--product-id', product_id],
                                capture_output=True, text=True, timeout=180)
        receipts = json.loads(result.stdout)
        delivered = next((r for r in receipts if r.get('status') == 'published'), None)
        if delivered:
            return delivered
    except Exception:
        pass
    # Gumroad has already published. Keep the retry durable and never make callers recreate it.
    return {**queued, 'status': 'retry-pending',
            'message': 'Gumroad published; GitHub delivery remains in the durable retry queue.'}
