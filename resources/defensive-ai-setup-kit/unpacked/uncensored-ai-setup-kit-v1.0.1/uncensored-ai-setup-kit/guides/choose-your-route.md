# Choose how to run your model

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

| Route | Good fit | What you pay for | Your main responsibility |
| --- | --- | --- | --- |
| Hosted API | Fast setup; no capable local GPU | Provider API usage; subscription and API billing can differ | Provider trust, key handling, usage limits |
| RunPod | More control over model/runtime | GPU time plus storage and any additional quoted charges | Patching, authentication, uptime and shutdown |
| Local / LM Studio | Compatible machine with enough spare memory | Hardware, power and time; no rented GPU for local inference | Downloads, runtime updates and local permissions |

Choose hosted when avoiding infrastructure is worth the markup. Choose cloud when you need a particular model beyond your machine's capacity. Choose local when your machine fits it and you want direct control over the runtime. None makes a model automatically safe or more capable.

Start with text. Add one harmless function call. Add screenshots only when needed, and verify each layer separately. These checks catch a common trap: a model can answer a greeting while failing the exact tool or image feature you need.

If you already have one working route, keep it as a fallback while trying another. Do not replace working settings just to match this video.
