import { dotnet } from "./_framework/dotnet.js";

const canvas = document.getElementById("scribble");
const ctx = canvas.getContext("2d");
const colorInput = document.getElementById("color");
const sizeInput = document.getElementById("size");
const clearBtn = document.getElementById("clear");
const status = document.getElementById("status");

let wasm = null;
let drawing = false;
let color = colorInput.value;
let size = parseFloat(sizeInput.value);

async function boot() {
  const { getAssemblyExports, getConfig } = await dotnet
    .withDiagnosticTracing(false)
    .create();

  const config = getConfig();
  const exports = await getAssemblyExports(config.mainAssemblyName);
  wasm = exports.Scribble;

  status.remove();
  redraw();
  wireEvents();
}

function pointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return [(e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy];
}

function redraw() {
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const count = wasm.GetCount();
  if (count < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let prevX = 0, prevY = 0, havePrev = false;
  for (let i = 0; i < count; i++) {
    const slot = wasm.SlotAt(i);
    const x = wasm.GetX(slot);
    const y = wasm.GetY(slot);
    const connected = wasm.GetConnected(slot) !== 0;
    if (havePrev && connected) {
      ctx.globalAlpha = wasm.SegmentAlpha(i);
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    prevX = x;
    prevY = y;
    havePrev = true;
  }
  ctx.globalAlpha = 1;
}

function wireEvents() {
  canvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = pointFromEvent(e);
    wasm.Push(x, y, 0);
    redraw();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const [x, y] = pointFromEvent(e);
    wasm.Push(x, y, 1);
    redraw();
  });

  const endStroke = () => { drawing = false; };
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("pointerleave", endStroke);

  colorInput.addEventListener("input", () => {
    color = colorInput.value;
    redraw();
  });

  sizeInput.addEventListener("input", () => {
    size = parseFloat(sizeInput.value);
    redraw();
  });

  clearBtn.addEventListener("click", () => {
    wasm.Clear();
    redraw();
  });
}

boot().catch((err) => {
  console.error(err);
  if (status) {
    status.textContent = `Failed to load wasm: ${err}`;
    status.style.color = "#b00";
  }
});
