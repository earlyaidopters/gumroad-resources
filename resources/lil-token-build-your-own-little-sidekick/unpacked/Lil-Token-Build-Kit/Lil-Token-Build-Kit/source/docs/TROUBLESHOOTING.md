# The wall of shame, with fixes

These are the failure patterns from the video and development notes. Start with the smallest failing link and keep the original recording or log until the fix is verified.

| What went wrong | What to inspect or change |
| --- | --- |
| A normal sentence wakes the robot | Check `fuzzy_wake` in `ears.py`. Greeting words and the word after “little” matter. Test negative phrases as well as the wake phrase. |
| A mumbled wake phrase gets missed | Test your own pronunciation at desk distance and across the room. Add representative permitted audio to development data. |
| The robot wakes on its own voice | Check the microphone pause while speech plays, echo cancellation and the restart delay. |
| A wave starts a conversation during a phone call | Keep proximity waves as interruption signals. Use a wake phrase or head tap to start. |
| Quiet room noise starts a dance | Require enough energy above background, sustained sound and repeated music checks. Fans and alarms belong in negative tests. |
| The robot cannot hear “stop dancing” | Inspect the dance listener and motor noise. Test interruption while servos move. |
| Dancing never stops | Motor noise can resemble ongoing music. Add a time limit and a clear stop path. |
| Dancing restarts too often | Persist the last dance time and measure cooldown from the end of the previous dance. |
| The wrong hat appears | Inspect genre scores and uncertainty margins. When the label is unclear, use a neutral response. |
| A known song is called the wrong genre | Re-test through the actual robot microphone. Speaker playback changes the sound the model receives. |
| A web question sits in silence | Inspect model time, search time, speech time and playback separately. Speak a short status line before waiting. |
| Speech waits for the full answer | Split completed sentences and feed the speech queue incrementally. |
| Old voice audio plays after a setting change | Cache by text, voice and speech model. Clear stale cache when testing. |
| A reply stutters | Check overlapping playback, viewfinder traffic and the speech queue. Preserve one owner for the speaker. |
| A head pat does nothing | Inspect `get_touch_state`, failed reads and I2C initialization. The firmware retries failed touch setup. |
| Pickup events disappear after restart | Soft-reset and reinitialize the motion sensor before loading its configuration. A chip can stay powered across an ESP32 restart. |
| An I2C timeout reboots the device | Recover from sensor errors and retry. Check power and wiring before software changes. |
| Asking to “look at my email” opens the camera | Test tool routing with digital objects and physical objects. Email should use the account adapter. |
| The agent names a tool but never calls it | Inspect actual tool-use events and returned results. A fluent sentence is not execution evidence. |
| An app request uses an unexpected connector | Keep strict MCP configuration and inspect the agent’s allowed tools. |
| A webpage tries to change memory | Keep outside text as data and require the owner’s request for memory writes. |
| Speech ends but follow-up listening never starts | Trace ownership of the microphone and speaker locks across the turn boundary. |
| A reconnect produces “What’s up?” | Ignore device startup/listen events briefly after reconnect and distinguish them from intentional wakes. |
| Switching faces stalls the answer | Cache reusable face sets on the robot and avoid blocking speech on a download. |
| Blinking wipes out the hat | Use overlay assets or consistent layered frames for every eye and mouth state. |
| The face has green bands or corrupted pixels | Check RGB565 byte order, dimensions and byte count before transferring it. |
| The camera preview breaks after a resolution change | Check the camera format, dimensions and display path together. The build uses 320×240 for the live preview. |
| The first answer is slower | Allow the local transcription model to load. Measure warm and cold runs separately. |
| A stopped test leaves another process holding a port | Stop the duplicate gateway or brain. Check the intended ports before restarting. |
| The voice sounds flat | Test one short line with supported performance directions and your chosen Fish model. |
| A provider rejects the model name | Read the provider error, check available models and update the local model setting. |
| An account tool returns 401 | Refresh your own access token and confirm scopes. The kit never ships account credentials. |
| Business totals look incomplete | The public adapter returns a bounded first page. Inspect its scope and paginate deliberately if you need accounting totals. |
| A quiet word disappears | Review the original audio around endpointing and speech thresholds. Do not tune only on loud synthetic voices. |
| The robot answers the television | Check active-conversation windows, wake matching and optional speaker enrollment. Turn the processes off when you want silence. |

## Keep one failure record

Write down the input, expected action, actual action, active settings, relevant timestamps and whether the run used real hardware or a stub. Retest the same failure after a fix, then use fresh examples to check for regressions.

The test suites cover routing, interruption, authentication, speech chunking, reactions and optional-tool decisions. They use stubs where hardware or cloud services would otherwise be required. A full microphone-to-speaker test still requires your robot and your accounts.
