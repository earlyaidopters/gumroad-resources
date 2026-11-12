# How the little agent came together

I wanted an AI project I could pick up. The useful part of this build was learning how an agent could work through a real device, then making the result pleasant enough to keep on my desk.

The project grew over many iterations. The three prompts in this kit reconstruct a practical way to approach the same work today. They are adapted instructions for your build.

## Start with the object

Identify the exact hardware and the firmware it already runs. Read the manufacturer’s documents and the upstream project. Connect over USB and confirm the chip, flash layout and peripherals before deciding what to change.

The StackChan already has a screen, microphones, camera, speaker, servos and sensors. Keeping those jobs on the device let the Mac handle the larger models.

## Back up before the first write

Make and verify your own full flash backup. Keep its checksum and record the serial device and detected flash size. Treat the backup as private because a device image can include Wi-Fi configuration. Have a recovery procedure ready before flashing.

## Get one loop working

The first milestone is one spoken question and one spoken answer. That requires the microphone, transcription, agent, speech synthesis and speaker to agree on formats and timing. Test each link independently, then join them.

The eventual architecture uses a persistent Claude Agent SDK session. It receives the tool descriptions and decides which function to call. The function runs in ordinary Python, returns a result, and the model writes the reply.

## Give speech its own queue

A robot feels slow when it stays silent until every word is ready. `speech.py` splits completed sentences. `speaker.py` queues them and supports interruption. The agent can say it is checking something while the corresponding tool is running.

Short recurring lines use a speech cache. The key includes the text, voice and model, so a different voice cannot inherit an old recording accidentally.

## Add useful tools

Start with search, then a read-only calendar. Add one integration and test it before adding the next. Return short structured results, avoid giving the model unrelated account data, and handle provider timeouts.

The public adapters use your own access tokens. Google supports calendar, inbox, individual messages and Drive search. Business adapters expose bounded read-only results. Composio is an optional extension with separate controls.

## Connect personality to events

A head pat should do something predictable. A pickup event can show surprise. Speech should move the mouth. Listening, thinking and speaking need distinct behavior. This logic lives in `senses.py`, the face generators and the firmware.

The music system first needs to decide whether music is present. It then compares the sound with genre descriptions and local prototypes before choosing a hat and movement. Background fans, servo noise and speech are useful negative examples.

## Make the robot test itself

Use synthetic voices you have permission to use. Play a question through the computer speaker, wait for the robot’s answer and capture the result. Repeat with different phrasing, pauses and background sound.

Keep development clips for tuning. Once you freeze a change, build a separate fresh evaluation set and label it before evaluating. Record failures with the audio, expected behavior, actual behavior and relevant log time. Never treat the offline example as proof of real microphone or motor behavior.

## Keep the failures readable

The [troubleshooting guide](TROUBLESHOOTING.md) follows the problems in the video and the fixes found while building. It covers missed wake phrases, accidental wakeups, slow answers, tool confusion, touch failures, noisy motors and face rendering.

Change one layer at a time. If the text is right but the robot is quiet, investigate speech and playback. If the calendar answer is wrong, inspect the tool request and result before changing the microphone.

## What this release lets you reuse

The source, prompts, expressions, wardrobe and architecture are available together. Credentials, a trained profile of my voice, personal account content and device backups stay private. Start with your own voice and your own accounts, then change the parts that make the robot useful to you.
