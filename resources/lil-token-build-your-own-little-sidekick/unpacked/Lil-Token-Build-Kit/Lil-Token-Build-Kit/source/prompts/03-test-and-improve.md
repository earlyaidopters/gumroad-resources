# Test the robot without guessing

Inspect this project and identify its microphone, transcription, wake check, agent, tools, speech queue and firmware boundaries.

Build offline tests with invented data for wake phrases, negative phrases, digital-versus-physical requests, authentication, timeouts, interruptions and tool errors. Do not call my accounts from the test suite.

For hardware tests, ask me to confirm the device and playback setup. Use synthetic speech I have permission to use. Test different phrasings, pauses, speaking levels, background sound and motor noise. Record the original audio and screenshots privately only when I enable capture.

Keep a failure table with expected behavior, actual behavior, active settings and the source timestamp. Change one layer at a time. Re-test the failure, then freeze the change and evaluate fresh examples labelled before the model sees them.

Check that speech does not overlap, a head pat interrupts, the wake phrase still works with music, the robot stops dancing, face files have the expected size, and unknown requests fail clearly. Report which checks used real hardware, which used stubs, and which remain untested.
