# Release checklist

Mark each item PASS, FAIL or UNVERIFIED and add evidence. A blank box is not a pass.

## Learning and interaction
- [ ] Each mission has one outcome and a transfer check.
- [ ] Correct and incorrect choices have distinct useful feedback.
- [ ] Hints, answer reveal, retries and skipping behave as designed.
- [ ] Rapid/repeated input cannot duplicate rewards or trap the player.
- [ ] Navigation and completion work through every mission.
- [ ] Progress survives reload when storage is available; reset is intentional.
- [ ] Blocked storage and unavailable assets fail visibly and recoverably.

## Presentation and access
- [ ] Inspect arrival, interaction and completion in the real renderer.
- [ ] Character, lighting, scale and camera framing are coherent.
- [ ] Text remains readable and controls remain reachable at target sizes.
- [ ] Keyboard focus and navigation are usable.
- [ ] Reduced motion, mute and captions preserve required information.
- [ ] A 3D failure has a useful fallback.
- [ ] World Tour can stop, replay and return without losing progress.
- [ ] Measure load and responsiveness on declared target devices.

## Distribution
- [ ] Production build starts with correct asset paths.
- [ ] Public bundle contains no secrets or private material.
- [ ] Included assets have recorded permission or licenses.
- [ ] Hosted URL has intended audience access.
- [ ] Complete a lesson at the actual hosted URL; verify reload and downloads.
- [ ] Save release archive, source revision and rollback route.
- [ ] Document actual tests separately from emulated or unverified cases.

Release blockers include a broken core journey, false teaching, unreadable essential text, inaccessible required controls, leaked credentials or missing rights to a distributed asset. Set numerical performance targets for your audience before testing; do not invent passing measurements afterward.
