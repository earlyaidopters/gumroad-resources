# Designing and Optimizing Your Own Harness

The model is not the thing that makes a local setup work. The harness around it is. A harness is everything that sits between the model and your machine, the instructions it always reads, the tools it can reach, the rules that stop it, and the checks that tell it whether it succeeded.

A stock harness ships with the basics. Every addition below exists because something broke, and each one made a free local model behave more like an expensive one. The examples are from pi.dev, but every idea here transfers to Claude Code or any agent that supports instructions plus tools.

The through-line is this. A frontier model can absorb a vague instruction and still do the right thing. A smaller local model cannot. So you stop relying on the model's judgment and start encoding the judgment into the harness itself.

---

## 1. Guard the network, because a laptop is not a server

A laptop loses connectivity. Planes, cafes, a dead hotel wifi. The default failure is ugly, the agent tries to install a package, hangs on a timeout, retries with a different package manager, hangs again, and burns ten minutes of your session doing nothing.

Add an offline guard that checks connectivity before any install or fetch and fails immediately with a clear OFFLINE message. Then write the matching rule into your instructions file: if a command is blocked as offline, do not retry it and do not try another package manager, work with what is on the machine.

Pair it with real timeouts on every network tool. An agent that waits forever is worse than one that fails fast, because you cannot tell the difference between working and stuck.

## 2. Gate the goal, do not trust the declaration

The single highest-leverage addition. An agent will tell you it is finished. Left alone it will tell you that while the build is broken.

Define the conditions for done before the work starts, as commands that either pass or fail:

```
build passes
no unfilled placeholder tokens remain
the design document exists
```

The harness runs those on any attempt to declare completion, and refuses the declaration until all of them pass. Notice what these have in common, they are mechanical. "The site looks good" is not a gate. "npm run build exits zero" is.

Add loop detection alongside it. If the same command fails twice in a row with the same error, stop and rethink rather than trying a third time. Agents left unsupervised will run an identical failing command a dozen times.

## 3. Route skills deterministically for small models

A large model reads a list of twelve available skills and picks the right one. A small model reads the same list and picks whichever description it saw most recently, or invents a hybrid of two.

So take the choice away from it. A routing layer maps the request to exactly one skill by explicit priority rather than by the model's judgment. In our case the editorial skill sits above the immersive one, because "build me a clean product page" was being answered with WebGL and a scroll-scrubbed video, which is enormously more work for a worse result.

Write the routing into the skills themselves too. Each skill should open by naming the cases that belong to a different skill and sending the agent there. Redundant routing is cheap, a wrong archetype costs an entire build.

## 4. Make it look at its own work

Text models will happily describe a page they have never seen. If your agent can take a screenshot, it is a vision model, and it can grade its own output.

The pattern that works is a browser check that returns a screenshot plus console and network errors, called with an explicit expectation, and returning a verdict:

```
check the page at scroll position 0
expect: navigation, serif hero headline, hero media frame visible
VERDICT: PASS or FAIL
```

Run it at several scroll positions and once at mobile width. Loop until every verdict passes. This is the difference between a site that renders and a site that looks right, and no amount of prompting substitutes for it.

Two rules make it honest. Never dismiss a console error or a 404 as unrelated or pre-existing, every asset the page references is yours to prove working or to fix. And judge the design against real references, because generic output that renders correctly is still a failure.

## 5. Tell the model what it is running on

A model does not know it is a 4-bit quantized local model with a limited context, and it will plan like a frontier model with room to spare. It will try to hold four files in its head, or run a full build on a model that should only be doing single edits.

Bake the machine's reality into the instructions. What hardware it has, what it must never do (on a machine already holding a 70GB model, never start a second model server, memory exhaustion takes down the whole machine), and which jobs belong to the big model versus the small one. Full builds go to the largest model you can load. Single edits are fine anywhere.

## 6. Re-read before editing

The most common silent corruption. The agent read a file, did three other things, then edited based on what it remembered. The file changed in between, and the edit lands on stale content or silently reverts someone else's work.

A freshness layer forces a re-read of any file whose content is older than the last modification before an edit is allowed. Cheap to implement, and it eliminates a whole category of "why did my change disappear" bugs.

The same logic applies to context generally. Restate important facts from tool output, versions, paths, error messages, in your own text as you go, because old tool results get dropped from context and the model will confidently misremember them.

## 7. Check that the CSS and the markup agree

This one came from a real failure. The model wrote a beautiful banner section in CSS, class names and all, and never added the corresponding divs to the HTML. The build passed. Nothing errored. The section rendered as cream text on a cream background, invisible, and the model reported success.

The check is mechanical:

```bash
for cls in $(grep -o '^\.[a-z][a-z0-9_-]*' src/style.css | sort -u | tr -d '.'); do
  grep -q "class=\"[^\"]*$cls" index.html || echo "MISSING IN HTML: .$cls"
done
```

Every miss gets investigated. The only legitimate ones are classes created at runtime by JavaScript.

The general principle matters more than this specific script. Any time the agent writes across two files that have to agree, there is a mechanical check that proves they do, and it belongs in the harness rather than in your review.

## 8. When a fix looks the same, stop editing

If you tell the agent nothing changed and it immediately makes another edit, you now have two changes and no idea which did what. Ten minutes later you have a mess neither of you understands.

Write the rule in: on "looks the same", do not stack another edit. Prove the previous change reached the browser first. Was the edited file the one the page actually loads, did the dev server rebuild, is the browser caching, is another rule overriding this one. Then verify visually that pixels actually changed before claiming anything.

## 9. Babysit it, then bake in what you catch

This is the pattern that improved the harness fastest, and it is the one nobody talks about.

Run your local agent on a real job and have a frontier model tail the session logs while it works. Not doing the job, watching it. It spots the failure modes far faster than you will by reading transcripts, because it knows what good looks like.

The important half is what you do next. Every failure it catches becomes a permanent harness addition, not a correction you type into the chat. Caught it retrying an offline install, that is the network guard. Caught it declaring done on a broken build, that is the goal gate. Caught it picking the wrong skill, that is the router.

A correction helps for one session. A harness addition helps forever. Roughly seven of the additions in this setup came from exactly this loop, and by the end the local model was completing full builds with zero tool errors.

## 10. Put your context on a diet

Every skill, tool and instruction you load costs context that the model needs for the actual work. On a local model with a smaller window this bites much sooner than you expect, and the symptom is confusing, quality degrades in the middle of long jobs for no visible reason.

Move rarely-used skills behind a router skill so only the summary is loaded and the full body is pulled on demand. Keep the always-read instructions file short and rule-shaped rather than prose. Push deep reference material into files the agent opens when it needs them, not into the system prompt.

Push the same discipline onto the agent's own output. Narration between tool calls stays under a couple of dozen words, final answers stay short unless the task genuinely needs more. Verbose narration is context you spent on nothing.

---

## Where to start

If you take one thing, take the goal gate. Define done as commands that pass or fail and refuse the declaration until they do. It is an afternoon of work and it converts an agent that claims success into one that earns it.

Then add the browser check, so the agent sees its own output. Then start the babysitting loop and let it tell you which of the rest you actually need. Your failures will not be identical to mine, and a harness built from someone else's failure list is just more context you are paying for.
