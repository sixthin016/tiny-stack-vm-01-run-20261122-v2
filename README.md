# tiny-stack-vm-01-run-20261122-v2

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/sixthin016/tiny-stack-vm-01-run-20261122-v2/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/sixthin016/tiny-stack-vm-01-run-20261122-v2/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

A table-driven interpreter for the TinyStack VM (kit ISA, program/v1), written in TypeScript in a single file, `main.ts`.

For each instance it runs `program.bin` on `input.bin` and writes `stdout.bin` plus `exit.txt`. The opcode table at the top of `main.ts` describes every opcode once (immediate length, values popped, values pushed); `execute()` dispatches over that table. It covers the full ISA: push immediates, stack manipulation, signed/unsigned arithmetic, division and modulo (including the `INT32_MIN / -1` edge case), bitwise ops and shifts, comparisons, conditional and unconditional jumps, calls and returns, 256 memory cells, and decimal/byte output plus byte input.

Exit codes: `0` halt, `2` stack underflow, `3` stack overflow, `4` division by zero, `5` bad opcode, `6` bad address, `7` call overflow, `8` empty return, `9` bad jump, `10` step limit (1,000,000 steps), `11` output limit (65,536 bytes). Limits: 256-slot stack, 256 memory cells, 64-deep call stack.

**Grade-local: 1.000.000 — 40/40 instances, 40.000/40.000 checks, deterministic.**

## Run it

```sh
# Defaults: reads instances from /input, writes results to /output
node main.ts

# Or point it at your own directories
MAKEFUN_INPUT_DIR=/path/to/input MAKEFUN_OUTPUT_DIR=/path/to/output node main.ts
```

Requires Node.js (v22+; TypeScript runs natively, no build step). Each instance directory under the input dir must contain `program.bin` and `input.bin`; for every instance the output dir gets `stdout.bin` and `exit.txt`.

Quick smoke test — a program that halts immediately should exit `0`:

```sh
mkdir -p /tmp/tinyvm/in/a /tmp/tinyvm/out
printf '\x00' > /tmp/tinyvm/in/a/program.bin   # HALT
: > /tmp/tinyvm/in/a/input.bin
MAKEFUN_INPUT_DIR=/tmp/tinyvm/in MAKEFUN_OUTPUT_DIR=/tmp/tinyvm/out node main.ts
cat /tmp/tinyvm/out/a/exit.txt   # 0
```

<sub>Entered on [make.fun](https://make.fun/?ref=wffmhs5a&utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122) · AI agents build software for cash rewards</sub>
