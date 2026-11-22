// Tiny stack VM — fresh implementation of the kit ISA (program/v1).
// For every instance under the input dir it runs program.bin on input.bin
// and writes stdout.bin + exit.txt for that instance.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_STEPS = 1_000_000;
const MAX_OUT = 65_536;
const STACK_CAP = 256;
const MEM_CAP = 256;
const CALL_CAP = 64;

// Per-opcode shape, built once: immediate length (255 = not an opcode),
// how many values the op pops, and how many it pushes.
const IMM = new Uint8Array(256).fill(255);
const POP = new Uint8Array(256);
const PUSH = new Uint8Array(256);
function def(op: number, imm: number, pop: number, push: number): void {
  IMM[op] = imm; POP[op] = pop; PUSH[op] = push;
}
def(0x00, 0, 0, 0); def(0x01, 1, 0, 1); def(0x02, 4, 0, 1);
def(0x03, 0, 1, 0); def(0x04, 0, 1, 2); def(0x05, 0, 2, 2);
def(0x06, 0, 2, 3); def(0x07, 0, 3, 3);
def(0x17, 0, 1, 1); def(0x1b, 0, 1, 1);
for (const op of [0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x18, 0x19, 0x1a, 0x1c, 0x1d, 0x1e, 0x20, 0x21, 0x22]) def(op, 0, 2, 1);
def(0x30, 2, 0, 0); def(0x31, 2, 1, 0); def(0x32, 2, 1, 0);
def(0x33, 2, 0, 0); def(0x34, 0, 0, 0);
def(0x40, 0, 1, 1); def(0x41, 0, 2, 0);
def(0x50, 0, 1, 0); def(0x51, 0, 1, 0); def(0x52, 0, 0, 1); def(0x53, 0, 1, 0);

// Run one program on its input bytes. Returns [output bytes, exit code].
function run(prog: Uint8Array, input: Uint8Array): [Uint8Array, number] {
  const st = new Int32Array(STACK_CAP);
  const cs = new Int32Array(CALL_CAP);
  const mem = new Int32Array(MEM_CAP);
  const out = new Uint8Array(MAX_OUT);
  const tmp = new Uint8Array(12);
  let sp = 0, cp = 0, pc = 0, steps = 0, ip = 0, olen = 0;
  const done = (code: number): [Uint8Array, number] => [out.subarray(0, olen), code];
  for (;;) {
    if (steps === MAX_STEPS) return done(10);
    if (pc < 0 || pc >= prog.length) return done(9);
    const op = prog[pc];
    const imm = IMM[op];
    if (imm === 255) return done(5);
    if (pc + imm >= prog.length) return done(9);
    steps += 1;
    const nxt = pc + 1 + imm;
    pc = nxt;
    const pops = POP[op], pushes = PUSH[op];
    if (sp < pops) return done(2);
    if (sp - pops + pushes > STACK_CAP) return done(3);
    if (op === 0x00) return done(0);
    if (op === 0x01) { st[sp++] = (prog[nxt - 1] << 24) >> 24; continue; }
    if (op === 0x02) { st[sp++] = prog[nxt - 4] | (prog[nxt - 3] << 8) | (prog[nxt - 2] << 16) | (prog[nxt - 1] << 24); continue; }
    if (op === 0x03) { sp -= 1; continue; }
    if (op === 0x04) { st[sp] = st[sp - 1]; sp += 1; continue; }
    if (op === 0x05) { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; continue; }
    if (op === 0x06) { st[sp] = st[sp - 2]; sp += 1; continue; }
    if (op === 0x07) { const a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; continue; }
    if (op === 0x17) { st[sp - 1] = -st[sp - 1] | 0; continue; }
    if (op === 0x1b) { st[sp - 1] = ~st[sp - 1]; continue; }
    if (op >= 0x10 && op <= 0x22) {
      const b = st[sp - 1], a = st[sp - 2];
      let r: number;
      if (op === 0x13 || op === 0x14 || op === 0x15 || op === 0x16) {
        if (b === 0) return done(4);
        if (op === 0x13) r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        else if (op === 0x14) r = b === -1 ? 0 : (a % b) | 0;
        else if (op === 0x15) r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        else r = ((a >>> 0) % (b >>> 0)) | 0;
      } else if (op === 0x10) r = (a + b) | 0;
      else if (op === 0x11) r = (a - b) | 0;
      else if (op === 0x12) r = Math.imul(a, b);
      else if (op === 0x18) r = a & b;
      else if (op === 0x19) r = a | b;
      else if (op === 0x1a) r = a ^ b;
      else if (op === 0x1c) r = a << (b & 31);
      else if (op === 0x1d) r = a >> (b & 31);
      else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
      else if (op === 0x20) r = a === b ? 1 : 0;
      else if (op === 0x21) r = a < b ? 1 : 0;
      else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      sp -= 2; st[sp++] = r; continue;
    }
    if (op === 0x30 || op === 0x31 || op === 0x32) {
      const rel = ((prog[nxt - 2] | (prog[nxt - 1] << 8)) << 16) >> 16;
      let take = op === 0x30;
      if (!take) { const v = st[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
      if (take) pc = nxt + rel;
      continue;
    }
    if (op === 0x33) {
      if (cp === CALL_CAP) return done(7);
      cs[cp++] = nxt;
      pc = prog[nxt - 2] | (prog[nxt - 1] << 8);
      continue;
    }
    if (op === 0x34) {
      if (cp === 0) return done(8);
      pc = cs[--cp];
      continue;
    }
    if (op === 0x40) {
      const a = st[sp - 1];
      if (a < 0 || a >= MEM_CAP) return done(6);
      st[sp - 1] = mem[a];
      continue;
    }
    if (op === 0x41) {
      const a = st[sp - 1], v = st[sp - 2];
      if (a < 0 || a >= MEM_CAP) return done(6);
      sp -= 2; mem[a] = v;
      continue;
    }
    if (op === 0x50) {
      const v = st[--sp];
      let u = v < 0 ? -v : v;
      let t = 12;
      do { tmp[--t] = 48 + (u % 10); u = (u / 10) | 0; } while (u > 0);
      if (v < 0) tmp[--t] = 45;
      const len = 12 - t;
      if (olen + len > MAX_OUT) return done(11);
      out.set(tmp.subarray(t), olen); olen += len;
      continue;
    }
    if (op === 0x51) {
      if (olen + 1 > MAX_OUT) return done(11);
      out[olen++] = st[--sp] & 255;
      continue;
    }
    if (op === 0x52) { st[sp++] = ip < input.length ? input[ip++] : -1; continue; }
    return done(st[--sp] & 255);
  }
}

for (const id of readdirSync(IN_DIR).sort()) {
  const [stdout, code] = run(
    new Uint8Array(readFileSync(join(IN_DIR, id, 'program.bin'))),
    new Uint8Array(readFileSync(join(IN_DIR, id, 'input.bin'))),
  );
  mkdirSync(join(OUT_DIR, id), { recursive: true });
  writeFileSync(join(OUT_DIR, id, 'stdout.bin'), stdout);
  writeFileSync(join(OUT_DIR, id, 'exit.txt'), `${code}\n`);
}
