// Scribble — vanilla TypeScript port.
// All logic lives here: ring buffer + DOM + canvas rendering.

const MAX_POINTS = 100;
const MIN_ALPHA = 0.05;

interface Point {
  x: number;
  y: number;
  connected: boolean;
}

class RingBuffer {
  private readonly points: (Point | null)[] = new Array(MAX_POINTS).fill(null);
  private head = 0;
  private _count = 0;

  get count(): number {
    return this._count;
  }

  push(x: number, y: number, connected: boolean): void {
    this.points[this.head] = { x, y, connected };
    this.head = (this.head + 1) % MAX_POINTS;
    if (this._count < MAX_POINTS) this._count++;
  }

  clear(): void {
    this.points.fill(null);
    this.head = 0;
    this._count = 0;
  }

  // Iterate from oldest to newest.
  *entries(): IterableIterator<{ index: number; point: Point }> {
    const start = this._count < MAX_POINTS ? 0 : this.head;
    for (let i = 0; i < this._count; i++) {
      const slot = (start + i) % MAX_POINTS;
      const p = this.points[slot];
      if (p) yield { index: i, point: p };
    }
  }

  // Newest segment fully opaque, oldest fades toward MIN_ALPHA.
  segmentAlpha(i: number): number {
    if (this._count < 2) return 1.0;
    const age = this._count - 1 - i;
    const maxAge = this._count - 1;
    return 1.0 - (age / maxAge) * (1.0 - MIN_ALPHA);
  }
}

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

class Scribble {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buffer = new RingBuffer();
  private drawing = false;
  private color: string;
  private size: number;

  constructor(
    canvas: HTMLCanvasElement,
    colorInput: HTMLInputElement,
    sizeInput: HTMLInputElement,
    clearBtn: HTMLButtonElement,
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.color = colorInput.value;
    this.size = parseFloat(sizeInput.value);

    canvas.addEventListener("pointerdown", (e) => {
      this.drawing = true;
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = this.pointFromEvent(e);
      this.buffer.push(x, y, false);
      this.redraw();
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!this.drawing) return;
      const [x, y] = this.pointFromEvent(e);
      this.buffer.push(x, y, true);
      this.redraw();
    });

    const endStroke = () => { this.drawing = false; };
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", endStroke);

    colorInput.addEventListener("input", () => {
      this.color = colorInput.value;
      this.redraw();
    });

    sizeInput.addEventListener("input", () => {
      this.size = parseFloat(sizeInput.value);
      this.redraw();
    });

    clearBtn.addEventListener("click", () => {
      this.buffer.clear();
      this.redraw();
    });

    this.redraw();
  }

  private pointFromEvent(e: PointerEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    return [(e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy];
  }

  private redraw(): void {
    const { ctx, canvas, buffer } = this;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (buffer.count < 2) return;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let prev: Point | null = null;
    for (const { index, point } of buffer.entries()) {
      if (prev && point.connected) {
        ctx.globalAlpha = buffer.segmentAlpha(index);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      prev = point;
    }
    ctx.globalAlpha = 1;
  }
}

new Scribble(
  getRequiredElement<HTMLCanvasElement>("scribble"),
  getRequiredElement<HTMLInputElement>("color"),
  getRequiredElement<HTMLInputElement>("size"),
  getRequiredElement<HTMLButtonElement>("clear"),
);
