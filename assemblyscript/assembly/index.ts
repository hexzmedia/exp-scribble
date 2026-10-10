// Ring buffer of the last MAX_POINTS pointer samples.
// The host (JS) reads points back via getX/getY/getConnected and draws
// segments with per-segment alpha computed from segmentAlpha(index).

export const MAX_POINTS: i32 = 100;
const MIN_ALPHA: f64 = 0.05;

const xs = new StaticArray<f64>(MAX_POINTS);
const ys = new StaticArray<f64>(MAX_POINTS);
const conn = new StaticArray<u8>(MAX_POINTS);

let head: i32 = 0;
let count: i32 = 0;

export function push(x: f64, y: f64, connected: bool): void {
  xs[head] = x;
  ys[head] = y;
  conn[head] = connected ? 1 : 0;
  head = (head + 1) % MAX_POINTS;
  if (count < MAX_POINTS) count++;
}

export function clear(): void {
  head = 0;
  count = 0;
}

export function getCount(): i32 {
  return count;
}

// Slot of the oldest point — host iterates (start + i) % MAX_POINTS for i in 0..count.
export function startSlot(): i32 {
  return count < MAX_POINTS ? 0 : head;
}

export function slotAt(i: i32): i32 {
  return (startSlot() + i) % MAX_POINTS;
}

export function getX(slot: i32): f64 {
  return xs[slot];
}

export function getY(slot: i32): f64 {
  return ys[slot];
}

export function getConnected(slot: i32): bool {
  return conn[slot] != 0;
}

// Alpha for the segment ending at iteration index `i` (0 = oldest, count-1 = newest).
// Newest segment is fully opaque, oldest fades toward MIN_ALPHA.
export function segmentAlpha(i: i32): f64 {
  if (count < 2) return 1.0;
  const age: f64 = <f64>(count - 1 - i);
  const maxAge: f64 = <f64>(count - 1);
  return 1.0 - (age / maxAge) * (1.0 - MIN_ALPHA);
}
