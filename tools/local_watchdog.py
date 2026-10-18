#!/usr/bin/env python3
"""Hourly local fallback: drain original packages, then independently inspect live GitHub."""
import fcntl
import json
import os
from pathlib import Path
import sys

from source_mirror import DEFAULT_STATE, atomic_json, drain, prepare_checkout
from watchdog import inspect, public_catalog, repair, now


def main():
    os.umask(0o077)
    root = DEFAULT_STATE
    root.mkdir(parents=True, exist_ok=True)
    with (root / 'local-monitor.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 0
        queue_error = None
        try:
            deliveries = drain(root)
            queue_error = '; '.join(r.get('error', 'Source delivery pending') for r in deliveries
                                    if r['status'] == 'retry-pending') or None
        except Exception as error:
            queue_error = f'Source queue: {type(error).__name__}: {error}'
        try:
            checkout = prepare_checkout(root / 'monitor')
            report = inspect(checkout, public_catalog())
        except Exception as error:
            report = {'checked_at': now().isoformat(), 'healthy': False,
                      'faults': [f'Independent verification unavailable: {type(error).__name__}: {error}']}
        if queue_error:
            report['healthy'] = False
            report['faults'].append(queue_error)
        try:
            repair(report)
        except Exception as error:
            report['healthy'] = False
            report['faults'].append(f'GitHub recovery request failed: {type(error).__name__}: {error}')
        atomic_json(root / 'health.json', report)
        print(json.dumps(report))
        return 0 if report['healthy'] else 1


if __name__ == '__main__':
    sys.exit(main())
