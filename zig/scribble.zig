// Ring buffer of the last MAX_POINTS pointer samples.
// JS host pushes points and reads them back to render segments with
// per-segment alpha from segmentAlpha(i).

const MAX_POINTS = 100;
const MIN_ALPHA: f64 = 0.05;

var xs: [MAX_POINTS]f64 = [_]f64{0} ** MAX_POINTS;
var ys: [MAX_POINTS]f64 = [_]f64{0} ** MAX_POINTS;
var conn: [MAX_POINTS]u8 = [_]u8{0} ** MAX_POINTS;
var head: i32 = 0;
var count: i32 = 0;

export fn push(x: f64, y: f64, connected: i32) void {
    const h: usize = @intCast(head);
    xs[h] = x;
    ys[h] = y;
    conn[h] = if (connected != 0) 1 else 0;
    head = @mod(head + 1, MAX_POINTS);
    if (count < MAX_POINTS) count += 1;
}

export fn clear() void {
    head = 0;
    count = 0;
}

export fn getCount() i32 {
    return count;
}

// Slot of the oldest point — host iterates (start + i) % MAX_POINTS for i in 0..count.
export fn startSlot() i32 {
    return if (count < MAX_POINTS) 0 else head;
}

export fn slotAt(i: i32) i32 {
    return @mod(startSlot() + i, MAX_POINTS);
}

export fn getX(slot: i32) f64 {
    return xs[@intCast(slot)];
}

export fn getY(slot: i32) f64 {
    return ys[@intCast(slot)];
}

export fn getConnected(slot: i32) i32 {
    return conn[@intCast(slot)];
}

// Newest segment fully opaque, oldest fades toward MIN_ALPHA.
export fn segmentAlpha(i: i32) f64 {
    if (count < 2) return 1.0;
    const age: f64 = @floatFromInt(count - 1 - i);
    const max_age: f64 = @floatFromInt(count - 1);
    return 1.0 - (age / max_age) * (1.0 - MIN_ALPHA);
}
