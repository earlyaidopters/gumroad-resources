# Smoke-test checklist

Defensive use only. Run each check against your own local lab or approved model endpoint.

- Record OS, Python/Node/Harness/runtime versions and exact model ID.
- Run `python3 scripts/doctor.py`.
- Run `python3 -m unittest discover -s tests -v`; this is offline helper testing.
- Start `python3 scripts/local_lab.py` in one terminal. In another, run `python3 scripts/safe_check.py --authorize-local-lab`. Confirm the missing header is reported.
- Stop the lab, restart with `--hardened`, repeat the check and confirm it clears.
- Run the endpoint checker with the exact model ID. Text, tools and image are separate results. Verify a real harmless tool through Harness after API testing.
- For cloud, prove unauthenticated requests fail. Test the idle proxy in dry-run before opting into control of an exact Pod.
- Test that a running/streaming inference request cannot trigger idle stop. Verify the first real stop in the provider console and test restart/persistence.
- Record anything not tested. A mock API test does not prove a real provider account, paid GPU or native app integration.
