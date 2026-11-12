# Release validation

Checked on 12 November 2026.

- Reconstructed the pinned upstream source using the public patch.
- Installed core requirements and the patched gateway in a fresh Python 3.12 environment.
- Ran 131 tests covering the brain, gateway and public defaults.
- Ran the offline calendar example with an empty credential environment.
- Checked shipped face and overlay payload sizes.
- Scanned public source and fresh Git history for secrets.
- Compared exported files against private credential values without copying those values into the release.

These checks use stubbed device and provider I/O. This public edition has not been flashed onto a second robot or tested end to end with a new owner's paid API credentials. The working original was demonstrated in the video. Follow the quick start and verify each stage on your own hardware.
