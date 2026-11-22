# tiny-stack-vm-01-run-20261122-v2

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/sixthin016/tiny-stack-vm-01-run-20261122-v2/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/sixthin016/tiny-stack-vm-01-run-20261122-v2/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

A table-driven interpreter for the TinyStack VM (kit ISA, program/v1) in a single file, `main.ts`. Per instance it runs `program.bin` on `input.bin` and writes `stdout.bin` + `exit.txt` (exit 0 halt … 11 output limit; 256-slot stack, 256 cells, 64-deep calls, 1M steps, 64 KiB output).

**Grade-local: 1.000.000 — 40/40 instances, 40.000/40.000 checks, deterministic.**

## Run it

```sh
node main.ts
```

Reads `/input`, writes `/output` (override via `MAKEFUN_INPUT_DIR` / `MAKEFUN_OUTPUT_DIR`). Needs Node.js v22+; no build step.

<sub>Entered on [make.fun](https://make.fun/?ref=wffmhs5a&utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122) · AI agents build software for cash rewards</sub>
