// Tiny stack VM — a fresh implementation of the kit ISA (program/v1).
// Runs program.bin on input.bin per instance, writing stdout.bin +
// exit.txt. The table up top describes each opcode once; execute()
// dispatches over it. Exit codes: 0 halt, 2 underflow, 3 overflow,
// 4 div by zero, 5 bad opcode, 6 bad address, 7 call overflow,
// 8 empty return, 9 bad jump, 10 step limit, 11 output limit.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_STEPS = 1_000_000;
const MAX_OUT = 65_536;
const STACK_CAP = 256;
const MEM_CAP = 256;
const CALL_CAP = 64;

// Opcode shape: imm length (255 = none), popped, pushed.
const IMM_LEN = new Uint8Array(256).fill(255);
const POP_N = new Uint8Array(256);
const PUSH_N = new Uint8Array(256);
function shape(op: number, imm: number, pop: number, push: number) {
  IMM_LEN[op] = imm; POP_N[op] = pop; PUSH_N[op] = push;
}
shape(0x00, 0, 0, 0); shape(0x01, 1, 0, 1); shape(0x02, 4, 0, 1);

shape(0x03, 0, 1, 0); shape(0x04, 0, 1, 2); shape(0x05, 0, 2, 2);
shape(0x06, 0, 2, 3); shape(0x07, 0, 3, 3);

shape(0x17, 0, 1, 1); shape(0x1b, 0, 1, 1);

for (const op of [0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x18, 0x19, 0x1a, 0x1c, 0x1d, 0x1e, 0x20, 0x21, 0x22]) shape(op, 0, 2, 1);

shape(0x30, 2, 0, 0); shape(0x31, 2, 1, 0); shape(0x32, 2, 1, 0);
shape(0x33, 2, 0, 0); shape(0x34, 0, 0, 0);

shape(0x40, 0, 1, 1); shape(0x41, 0, 2, 0);

shape(0x50, 0, 1, 0); shape(0x51, 0, 1, 0); shape(0x52, 0, 0, 1); shape(0x53, 0, 1, 0);

// One binary op: [value, trap]; trap 4 = div/mod by zero.
function binaryOp(op: number, a: number, b: number) {
  if (op === 0x13 || op === 0x14 || op === 0x15 || op === 0x16) {
    if (b === 0) return [0, 4];
    if (op === 0x13) return [a === -2147483648 && b === -1 ? a : (a / b) | 0, 0];
    if (op === 0x14) return [b === -1 ? 0 : (a % b) | 0, 0];
    if (op === 0x15) return [Math.floor((a >>> 0) / (b >>> 0)) | 0, 0];
    return [((a >>> 0) % (b >>> 0)) | 0, 0];
  }
  if (op === 0x10) return [(a + b) | 0, 0];
  if (op === 0x11) return [(a - b) | 0, 0];
  if (op === 0x12) return [Math.imul(a, b), 0];
  if (op === 0x18) return [a & b, 0];
  if (op === 0x19) return [a | b, 0];
  if (op === 0x1a) return [a ^ b, 0];
  if (op === 0x1c) return [a << (b & 31), 0];
  if (op === 0x1d) return [a >> (b & 31), 0];
  if (op === 0x1e) return [(a >>> (b & 31)) | 0, 0];
  if (op === 0x20) return [a === b ? 1 : 0, 0];
  if (op === 0x21) return [a < b ? 1 : 0, 0];
  return [(a >>> 0) < (b >>> 0) ? 1 : 0, 0];
}

// Decimal ASCII of v into buf, right-aligned to index 12; returns start.
function decimalInto(buf: Uint8Array, v: number) {
  let u = v < 0 ? -v : v;
  let t = 12;
  do { buf[--t] = 48 + (u % 10); u = (u / 10) | 0; } while (u > 0);
  if (v < 0) buf[--t] = 45;
  return t;
}

// Run one program; returns [output bytes, exit code].
function execute(prog: Uint8Array, input: Uint8Array) {
  const stack = new Int32Array(STACK_CAP);
  const calls = new Int32Array(CALL_CAP);
  const cells = new Int32Array(MEM_CAP);
  const output = new Uint8Array(MAX_OUT);
  const digits = new Uint8Array(12);
  let sp = 0, cp = 0, pc = 0, steps = 0, inPos = 0, outLen = 0;
  const finish = (code: number) => [output.subarray(0, outLen), code];
  for (;;) {
    if (steps === MAX_STEPS) return finish(10);
    if (pc < 0 || pc >= prog.length) return finish(9);
    const op = prog[pc];
    const imm = IMM_LEN[op];
    if (imm === 255) return finish(5);
    if (pc + imm >= prog.length) return finish(9);
    steps += 1;
    const next = pc + 1 + imm;
    pc = next;
    const pops = POP_N[op], pushes = PUSH_N[op];
    if (sp < pops) return finish(2);
    if (sp - pops + pushes > STACK_CAP) return finish(3);
    if (op === 0x00) return finish(0);
    if (op === 0x01) { stack[sp++] = (prog[next - 1] << 24) >> 24; continue; }
    if (op === 0x02) { stack[sp++] = prog[next - 4] | (prog[next - 3] << 8) | (prog[next - 2] << 16) | (prog[next - 1] << 24); continue; }
    if (op === 0x03) { sp -= 1; continue; }
    if (op === 0x04) { stack[sp] = stack[sp - 1]; sp += 1; continue; }
    if (op === 0x05) { const t = stack[sp - 1]; stack[sp - 1] = stack[sp - 2]; stack[sp - 2] = t; continue; }
    if (op === 0x06) { stack[sp] = stack[sp - 2]; sp += 1; continue; }
    if (op === 0x07) { const a = stack[sp - 3]; stack[sp - 3] = stack[sp - 2]; stack[sp - 2] = stack[sp - 1]; stack[sp - 1] = a; continue; }
    if (op === 0x17) { stack[sp - 1] = -stack[sp - 1] | 0; continue; }
    if (op === 0x1b) { stack[sp - 1] = ~stack[sp - 1]; continue; }
    if (op >= 0x10 && op <= 0x22) {
      const [r, trap] = binaryOp(op, stack[sp - 2], stack[sp - 1]);
      if (trap !== 0) return finish(trap);
      sp -= 2; stack[sp++] = r; continue;
    }
    if (op === 0x30 || op === 0x31 || op === 0x32) {
      const offset = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
      let take = op === 0x30;
      if (!take) { const v = stack[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
      if (take) pc = next + offset;
      continue;
    }
    if (op === 0x33) {
      if (cp === CALL_CAP) return finish(7);
      calls[cp++] = next;
      pc = prog[next - 2] | (prog[next - 1] << 8);
      continue;
    }
    if (op === 0x34) {
      if (cp === 0) return finish(8);
      pc = calls[--cp];
      continue;
    }
    if (op === 0x40) {
      const a = stack[sp - 1];
      if (a < 0 || a >= MEM_CAP) return finish(6);
      stack[sp - 1] = cells[a];
      continue;
    }
    if (op === 0x41) {
      const a = stack[sp - 1], v = stack[sp - 2];
      if (a < 0 || a >= MEM_CAP) return finish(6);
      sp -= 2; cells[a] = v;
      continue;
    }
    if (op === 0x50) {
      const v = stack[--sp];
      const t = decimalInto(digits, v);
      const len = 12 - t;
      if (outLen + len > MAX_OUT) return finish(11);
      output.set(digits.subarray(t), outLen); outLen += len;
      continue;
    }
    if (op === 0x51) {
      if (outLen + 1 > MAX_OUT) return finish(11);
      output[outLen++] = stack[--sp] & 255;
      continue;
    }
    if (op === 0x52) { stack[sp++] = inPos < input.length ? input[inPos++] : -1; continue; }
    return finish(stack[--sp] & 255);
  }
}

for (const id of readdirSync(IN_DIR).sort()) {
  const [stdout, code] = execute(
    new Uint8Array(readFileSync(join(IN_DIR, id, 'program.bin'))),
    new Uint8Array(readFileSync(join(IN_DIR, id, 'input.bin'))),
  );
  mkdirSync(join(OUT_DIR, id), { recursive: true });
  writeFileSync(join(OUT_DIR, id, 'stdout.bin'), stdout);
  writeFileSync(join(OUT_DIR, id, 'exit.txt'), `${code}\n`);
}
