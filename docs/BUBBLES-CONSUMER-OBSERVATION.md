# Observe the approved owner-page consumer

Do not infer missing owner authorization, closed Android app, or a busy chat from
queued status alone. The signed five-day route now reports an authenticated
consumer observation alongside its own job state:

- `not_observed`: no successful owner-page heartbeat has been recorded.
- `ready` / `busy`: the owner-authenticated page recently reported that state.
- `stale`: the last observation is older than 45 seconds. Browser throttling or
  disconnection are possibilities; this does not prove the page was closed.
- `approval_inactive` / `unavailable`: observation is not available under the
  existing approval or deployed capability.

Only an owner-authenticated first-party request with both active five-day grants
can update the observation. Store only state and server time in the existing
consent Durable Object; do not store credentials, message text, device identity,
URLs or browsing history. Status reads do not renew consent. Signed runner reads
expose only a fixed state and bounded age, never private reply content.

The process endpoint records a ready observation after owner and consent checks;
busy clients use the heartbeat endpoint without claiming a job. Observation is
diagnostic evidence, never proof that a tap or repository operation completed.
