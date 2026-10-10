import createScribble from "./build/scribble.mjs";

const canvas = document.getElementById("scribble");
const ctx = canvas.getContext("2d");
const colorInput = document.getElementById("color");
const sizeInput = document.getElementById("size");
const clearBtn = document.getElementById("clear");

let mod = null;
let drawing = false;
let color = colorInput.value;
let size = parseFloat(sizeInput.value);

async function boot() {
  mod = await createScribble();
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

  const count = mod._getCount();
  if (count < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let prevX = 0, prevY = 0, havePrev = false;
  for (let i = 0; i < count; i++) {
    const slot = mod._slotAt(i);
    const x = mod._getX(slot);
    const y = mod._getY(slot);
    const connected = mod._getConnected(slot) !== 0;
    if (havePrev && connected) {
      ctx.globalAlpha = mod._segmentAlpha(i);
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
    mod._push(x, y, 0);
    redraw();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const [x, y] = pointFromEvent(e);
    mod._push(x, y, 1);
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
    mod._clear_buffer();
    redraw();
  });
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#b00">Failed to load wasm: ${err}</pre>`
  );
});
