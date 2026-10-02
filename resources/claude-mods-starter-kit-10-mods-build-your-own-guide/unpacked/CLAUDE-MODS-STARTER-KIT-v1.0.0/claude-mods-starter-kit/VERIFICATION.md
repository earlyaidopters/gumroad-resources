# Verification · October 2, 2026

Test host: macOS, Claude Code CLI 2.1.287. Release: 1.0.0.

All ten plugin manifests, the marketplace and the teaching template validate. The ten plugins pass 123 unit tests; the template passes one additional test, for 124 passing tests and zero failures. These are development checks using the Claude Code test harness. They are not held-out performance measurements or proof of savings, quality or live desktop parity.

The helper scripts were exercised with a fake Claude binary: all-ten and single-plugin selection, explicit scopes, project paths with spaces, keep-data uninstall, rejection of invalid input, unique demo folders and isolated demo bookmark storage. That check did not modify the test machine's actual plugin settings.

The PDF was rendered and visually inspected. The offline guide was checked at desktop and mobile widths. Public files were scanned for personal paths, creator names, credentials and session exports. Only synthetic demo data is included. All authored content and scripts are inspectable in this repository.

Remaining limits: no fresh live ten-mod desktop session was certified in this packaging run. No Windows/Linux live test, subscription-billing reconciliation, external checkout or downstream customer automation test was performed. Output Tray Open/Reveal currently uses macOS. Unknown model IDs can prevent routing. Host APIs can change.

Two distribution-only regression fixes handle null main-agent IDs in Model Router and Output Tray. Original installed plugins were not changed. See CHANGELOG.md. The guide deliberately keeps these limits visible beside the relevant feature.
