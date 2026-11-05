# Phone keyboard closes during typing; voice activation appears to reopen it

Reported by owner November 5, 2026. **Observed by owner, not independently reproduced:** While using their Android phone, the keyboard unexpectedly slides down or disappears during text composition. Voice activation sometimes causes it to reappear. Owner suspects possible AI involvement, but no device-level evidence establishes this, another actor, or even whether the cause is browser, app, keyboard, or Android lifecycle behavior.

**Impact:** disrupted typing and lost input focus; risk of unsent text interruption.

**Future diagnosis, only if separately authorized:** screen recording with timestamps, log of editor focus/blur, keyboard/IME events, speech listener start/stop, Android activity/viewport changes and single- versus multi-page navigation. Candidate explanations include focus loss during page rerender, speech-recognition focus changes, viewport resizing, or OS keyboard behavior. These are hypotheses, not proven findings.

**Strict requested scope:** bug summary only. No phone access, recording, voice/listener, keyboard, app permissions or Android code was changed for this issue. Request explicit consent before gathering device logs or recordings.
