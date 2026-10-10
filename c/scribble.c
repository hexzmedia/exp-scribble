// Ring buffer of the last MAX_POINTS pointer samples.
// JS host pushes points and reads them back to render segments with
// per-segment alpha from segmentAlpha(i).

#include <emscripten.h>
#include <stdint.h>

#define MAX_POINTS 100
#define MIN_ALPHA  0.05

static double xs[MAX_POINTS];
static double ys[MAX_POINTS];
static uint8_t conn[MAX_POINTS];

static int head = 0;
static int count = 0;

EMSCRIPTEN_KEEPALIVE
void push(double x, double y, int connected) {
    xs[head] = x;
    ys[head] = y;
    conn[head] = connected ? 1 : 0;
    head = (head + 1) % MAX_POINTS;
    if (count < MAX_POINTS) count++;
}

EMSCRIPTEN_KEEPALIVE
void clear_buffer(void) {
    head = 0;
    count = 0;
}

EMSCRIPTEN_KEEPALIVE
int getCount(void) { return count; }

EMSCRIPTEN_KEEPALIVE
int startSlot(void) {
    return count < MAX_POINTS ? 0 : head;
}

EMSCRIPTEN_KEEPALIVE
int slotAt(int i) {
    return (startSlot() + i) % MAX_POINTS;
}

EMSCRIPTEN_KEEPALIVE
double getX(int slot) { return xs[slot]; }

EMSCRIPTEN_KEEPALIVE
double getY(int slot) { return ys[slot]; }

EMSCRIPTEN_KEEPALIVE
int getConnected(int slot) { return conn[slot] != 0; }

// Newest segment fully opaque, oldest fades toward MIN_ALPHA.
EMSCRIPTEN_KEEPALIVE
double segmentAlpha(int i) {
    if (count < 2) return 1.0;
    double age = (double)(count - 1 - i);
    double maxAge = (double)(count - 1);
    return 1.0 - (age / maxAge) * (1.0 - MIN_ALPHA);
}
