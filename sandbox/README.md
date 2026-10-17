# Bubbles Coder Sandbox

A separate, disposable **Linux workspace** for Bubbles' owner-directed GitHub work.

Run the Bubbles Coder Linux Sandbox workflow with inspect, python, shell, or tests and an optional existing script path under sandbox/. It checks out the selected revision onto an ephemeral Ubuntu runner with Python 3, Node, and Git. No Termux or local pip/apt required.

The existing direct GitHub connection can read source, stage commits on task branches, open a PR, list workflows, dispatch this workflow, and retrieve run receipts. It is separate from the Robot Brain ticket queue. GitHub credentials must remain in server-side secrets.

An accepted dispatch does **not** prove execution. Check the run conclusion and retrieve the logs/artifact. This is a **non-interactive** runner, not an unrestricted Android shell; it cannot control the user's phone. Avoid secrets/private data in scripts. Runner code may have outbound network access because GitHub-hosted runners are not air-gapped, so execute only trusted code. Token is repository-read-only and checkout never persists credentials.

Never equate submitted, queued, committed, merged, deployed, or tested without the matching authenticated receipt.
