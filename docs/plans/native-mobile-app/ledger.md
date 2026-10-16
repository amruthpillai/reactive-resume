# Ledger: native mobile app

Written only by the coordinator. Status values: TODO, RUNNING, REVIEW, FIXING, BLOCKED, MERGED, DROPPED.

| Task                                          | Harness     | Agent    | Branch            | Status  | Notes                                                                               |
| --------------------------------------------- | ----------- | -------- | ----------------- | ------- | ----------------------------------------------------------------------------------- |
| S1 Forme native module                        | Codex       | 3777064e | mobile/S1         | RUNNING |                                                                                     |
| S2 PDF pipeline on Hermes                     | Claude Code | 30d200d5 | mobile/S2         | RUNNING |                                                                                     |
| S3 Native auth spike                          | Claude Code | ccae31ab | mobile/S3         | RUNNING |                                                                                     |
| DS1 Design directions                         | Claude Code | e6048448 | mobile/DS1        | MERGED  | Started alongside M0 because it is independent of the spikes (coordinator decision) |
| DS2 Review DS1                                | Codex       | 61b41c19 | (in DS1 worktree) | MERGED  | 67 gaps, reports/DS2.md                                                             |
| DS3a Shell, documents, account, utilities     | Claude Code | 53e27e1f | mobile/DS3a       | RUNNING | app.html, tokens.md, index hub                                                      |
| DS3b Builder Write and Page, letters          | Claude Code | 43127d18 | mobile/DS3b       | RUNNING | builder.html                                                                        |
| DS3c Design, Check, Share, History, Assistant | Claude Code | eac233e3 | mobile/DS3c       | RUNNING | design.html                                                                         |
| DS3d Applications and Career                  | Codex       | 8cd42ec8 | mobile/DS3d       | RUNNING | career.html                                                                         |

## Gates

| Gate                        | Status  |
| --------------------------- | ------- |
| G0 spikes reviewed by owner | pending |
| G1 decisions.md frozen      | pending |
| G2a direction picked        | pending |
| G2b mockups approved        | pending |
| G-store owner inputs        | pending |

## Owner design answers (G2a, 2026-10-17)

1. Direction B, "Outline first". Not mixed with A's Page half-sheet.
2. The raised "+" is B's pill, the same as web.
3. No undo/redo controls on phone. Answer was "skip". Hardware-keyboard ⌘Z on tablet stays in M8-T1.
4. In A, Download PDF only inside Share & export: yes. Moot, since B was chosen.
5. Trash as a row at the end of the library: yes.
6. Letter cards show live text until on-device renders exist: yes.

## Log

- 2026-10-17: Plan committed. M0 spikes and DS1 launched.
- 2026-10-17: G2a answered (Direction B). DS2 review running.
- 2026-10-17: S2 found `expo@latest` is SDK 58.0.14 (RN 0.88.0, React 19.3.0). Catalog React 19.3 and `react-reconciler@0.34.0` resolve to one copy, so the S2 React risk is gone. M1 targets SDK 58.
- 2026-10-17: Learned that `paseo send` to a running agent interrupts it. Send only to idle agents.
- 2026-10-17: DS1 merged. DS2 recorded. DS3 split into four parallel parts (a/b/c Claude, d Codex). Merge commits use `chore(mobile): merge …` because commitlint rejects `merge`.
