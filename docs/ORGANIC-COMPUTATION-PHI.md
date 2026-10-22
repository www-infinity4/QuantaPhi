# Organic Computation Phi — Bubbles repository specification

Owner's request (October 22, 2026): **Have Bubbles create a GitHub repository that studies and develops DARPA-inspired organic computation.**

**Requested new repository:** `www-infinity4/Organic-Computation-Phi`.

## Primary scientific evidence

DARPA O-Circuit (*Organoid Cytomorphic Intelligence Resulting from Convergent Understanding and Information Transfer*) studies neural-tissue **biological processing units** with learning, inference, computational memory and low-power sense-compute-act capabilities. This is experimental research, **not** proof of a finished general-purpose biological computer.

- DARPA program: https://www.darpa.mil/events/2026/o-circuit-proposers-day
- Official May 1, 2026 solicitation DARPA-PS-26-28: https://sam.gov/opp/6d28dbf9da1f4fe09c58d5ad7896fe9c/view
- Prior O-Circuit notice: https://sam.gov/opp/f8fd222be5f046b887fb4759b2d7d123/view

A simulation inspired by neural circuits must never be called a living organoid or biological energy measurement.

## Deliverable repo structure

```text
Organic-Computation-Phi/
  README.md
  LICENSE
  docs/
    darpa-o-circuit.md
    literature-ledger.md
    architecture.md
    experiments.md
    ethics-and-limits.md
    cross-domain-hypotheses.md
  src/organic_phi/
    __init__.py
    memory.py
    plasticity.py
    experiment.py
  examples/
    learning_demo.py
  tests/
    test_memory.py
    test_plasticity.py
    test_reproducibility.py
  .github/workflows/tests.yml
```

## Implementation

1. **Literature:** maintain a dated claim/evidence ledger with official DARPA sources, independently review papers, limits and open questions.
2. **Python baseline:** standard-library-only Python 3.12 deterministic simulator; a recurrent state, bounded plasticity rule and no-learning baseline. Use fixed random seeds and transparent datasets.
3. **Experiments:** test learning speed, recall after delay, robustness to noise, forgetting and repeatability. Run `python3 -m unittest discover -s tests -v` in actual GitHub Actions. Report real metrics and negative outcomes. CPU elapsed time is not biological power draw.
4. **Integration:** document a future Bubbles/Robot Brain research tool API with `sense -> compute -> act` interfaces and result provenance. No unverified organoid hardware, consciousness or energy claims.
5. **Broader owner theories:** keep Hydrogen Portal, electron-position doorway and temporal/resonance concepts under explicitly labeled *testable hypotheses*. Describe measurable predictions and falsification; do not conflate scientific evidence with analogy.

## Bubbles owner implementation

Bubbles must run **owner-authenticated** `github.create_repository` via existing Brain `/work/github` adapter. Public `bubbles-tools` chat does not have GitHub write permission. Reuse the established signed Moltnook owner workflow, verifying both existing five-day grants on each privileged action. Do not copy browser cookies, renew grants, inject secrets or treat an accepted ticket as execution. If GitHub credentials/owner authorization are absent, report the precise blocker.

Research agents: Yellow sources; Blue experiment plan; Green repo creation and code; Pink review; Purple CI/receipt verification. Do not merge unreviewed changes or override protected branches.

## Definition of done

- GitHub confirms https://github.com/www-infinity4/Organic-Computation-Phi actually exists under the correct owner.
- README, citation ledger, model code, example, independent unit tests and ethics notes are committed.
- At least one GitHub Actions test run actually passes, with commit SHA and workflow URL.
- Bubbles can explain what is planned, queued, blocked, committed and tested in ordinary English.
