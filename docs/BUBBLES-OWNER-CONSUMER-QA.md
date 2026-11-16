# Owner-message consumer reliability

The signed five-day server conversation works. A separate signed owner-message
request in Moltnook run 39633368320 remained queued throughout twelve status
reads; that receipt does not identify why the owner's page failed to consume it.
Do not label the whole Brain connection unavailable from that observation.

Confirmed source weaknesses repaired here:

- A backlog of expired messages was handled one entry per poll. Expire stale
  queued entries together before selecting the next job; retain blocked records
  and never replay expired work. A real SQLite test seeds fifty expired entries
  and proves the fresh message is claimed on the same request.
- Poll on initial mount, page focus/resume and verified owner restoration, in
  addition to the existing timer. Reuse the saved approval; never renew it.
- Ask the mounted chat whether it is ready before claiming a message. Busy or
  unready chat leaves it queued. The existing server checks owner identity and
  both consent grants independently.
- Surface the consumer's observed state in the existing connection status:
  waiting for owner restoration, waiting for chat, checking, ready or unavailable.
  Do not silently suppress owner-verification errors or claim a request ran.

The browser can process UI messages only while a permitted owner page is alive.
These changes cannot wake a closed Android app or establish a missing browser
session. Production Worker release and a new signed queued → working → complete
owner-consumer receipt remain required after source tests pass. Physical Motorola
testing is separate. Existing bindings, credentials and five-day expiry stay intact.
