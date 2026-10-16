# Ledger: native mobile app

Written only by the coordinator. Status values: TODO, RUNNING, REVIEW, FIXING, BLOCKED, MERGED, DROPPED.

| Task                      | Harness     | Agent    | Branch     | Status  | Notes                                                                               |
| ------------------------- | ----------- | -------- | ---------- | ------- | ----------------------------------------------------------------------------------- |
| S1 Forme native module    | Codex       | 3777064e | mobile/S1  | RUNNING |                                                                                     |
| S2 PDF pipeline on Hermes | Claude Code | 30d200d5 | mobile/S2  | RUNNING |                                                                                     |
| S3 Native auth spike      | Claude Code | ccae31ab | mobile/S3  | RUNNING |                                                                                     |
| DS1 Design directions     | Claude Code | e6048448 | mobile/DS1 | RUNNING | Started alongside M0 because it is independent of the spikes (coordinator decision) |

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
