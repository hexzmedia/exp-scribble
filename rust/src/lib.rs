use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement, PointerEvent};

const MAX_POINTS: usize = 100;
const MIN_ALPHA: f64 = 0.05;

#[derive(Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
    connected: bool,
}

struct State {
    ctx: CanvasRenderingContext2d,
    canvas: HtmlCanvasElement,
    drawing: bool,
    color: String,
    size: f64,
    points: [Option<Point>; MAX_POINTS],
    head: usize,
    count: usize,
}

impl State {
    fn point_from_event(&self, e: &PointerEvent) -> (f64, f64) {
        let rect = self.canvas.get_bounding_client_rect();
        let scale_x = self.canvas.width() as f64 / rect.width();
        let scale_y = self.canvas.height() as f64 / rect.height();
        (
            (e.client_x() as f64 - rect.left()) * scale_x,
            (e.client_y() as f64 - rect.top()) * scale_y,
        )
    }

    fn push(&mut self, x: f64, y: f64, connected: bool) {
        self.points[self.head] = Some(Point { x, y, connected });
        self.head = (self.head + 1) % MAX_POINTS;
        if self.count < MAX_POINTS {
            self.count += 1;
        }
        self.redraw();
    }

    fn clear_buffer(&mut self) {
        self.points = [None; MAX_POINTS];
        self.head = 0;
        self.count = 0;
        self.redraw();
    }

    fn redraw(&self) {
        let w = self.canvas.width() as f64;
        let h = self.canvas.height() as f64;
        self.ctx.set_global_alpha(1.0);
        self.ctx.set_fill_style_str("#ffffff");
        self.ctx.fill_rect(0.0, 0.0, w, h);

        if self.count < 2 {
            return;
        }

        self.ctx.set_stroke_style_str(&self.color);
        self.ctx.set_line_width(self.size);
        self.ctx.set_line_cap("round");
        self.ctx.set_line_join("round");

        let start = if self.count < MAX_POINTS {
            0
        } else {
            self.head
        };
        let max_age = (self.count - 1) as f64;

        let mut prev: Option<Point> = None;
        for i in 0..self.count {
            let idx = (start + i) % MAX_POINTS;
            let p = match self.points[idx] {
                Some(p) => p,
                None => {
                    prev = None;
                    continue;
                }
            };
            if let Some(pp) = prev {
                if p.connected {
                    let segment_age = (self.count - 1 - i) as f64;
                    let alpha = 1.0 - (segment_age / max_age) * (1.0 - MIN_ALPHA);
                    self.ctx.set_global_alpha(alpha);
                    self.ctx.begin_path();
                    self.ctx.move_to(pp.x, pp.y);
                    self.ctx.line_to(p.x, p.y);
                    self.ctx.stroke();
                }
            }
            prev = Some(p);
        }
        self.ctx.set_global_alpha(1.0);
    }
}

#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    let window = web_sys::window().ok_or("no window")?;
    let document = window.document().ok_or("no document")?;

    let canvas: HtmlCanvasElement = document
        .get_element_by_id("scribble")
        .ok_or("missing #scribble canvas")?
        .dyn_into()?;

    let ctx: CanvasRenderingContext2d = canvas
        .get_context("2d")?
        .ok_or("no 2d context")?
        .dyn_into()?;

    let state = Rc::new(RefCell::new(State {
        ctx,
        canvas: canvas.clone(),
        drawing: false,
        color: "#111111".to_string(),
        size: 3.0,
        points: [None; MAX_POINTS],
        head: 0,
        count: 0,
    }));

    state.borrow().redraw();

    {
        let state = state.clone();
        let cb = Closure::<dyn FnMut(PointerEvent)>::new(move |e: PointerEvent| {
            let mut s = state.borrow_mut();
            s.drawing = true;
            let (x, y) = s.point_from_event(&e);
            let _ = s.canvas.set_pointer_capture(e.pointer_id());
            s.push(x, y, false);
        });
        canvas.add_event_listener_with_callback("pointerdown", cb.as_ref().unchecked_ref())?;
        cb.forget();
    }

    {
        let state = state.clone();
        let cb = Closure::<dyn FnMut(PointerEvent)>::new(move |e: PointerEvent| {
            let mut s = state.borrow_mut();
            if !s.drawing {
                return;
            }
            let (x, y) = s.point_from_event(&e);
            s.push(x, y, true);
        });
        canvas.add_event_listener_with_callback("pointermove", cb.as_ref().unchecked_ref())?;
        cb.forget();
    }

    {
        let state = state.clone();
        let cb = Closure::<dyn FnMut(PointerEvent)>::new(move |_e: PointerEvent| {
            state.borrow_mut().drawing = false;
        });
        canvas.add_event_listener_with_callback("pointerup", cb.as_ref().unchecked_ref())?;
        canvas.add_event_listener_with_callback("pointercancel", cb.as_ref().unchecked_ref())?;
        canvas.add_event_listener_with_callback("pointerleave", cb.as_ref().unchecked_ref())?;
        cb.forget();
    }

    if let Some(color_input) = document.get_element_by_id("color") {
        let state = state.clone();
        let input_el = color_input.clone();
        let cb = Closure::<dyn FnMut()>::new(move || {
            if let Some(v) = input_el
                .dyn_ref::<web_sys::HtmlInputElement>()
                .map(|i| i.value())
            {
                let mut s = state.borrow_mut();
                s.color = v;
                s.redraw();
            }
        });
        color_input.add_event_listener_with_callback("input", cb.as_ref().unchecked_ref())?;
        cb.forget();
    }

    if let Some(size_input) = document.get_element_by_id("size") {
        let state = state.clone();
        let input_el = size_input.clone();
        let cb = Closure::<dyn FnMut()>::new(move || {
            if let Some(v) = input_el
                .dyn_ref::<web_sys::HtmlInputElement>()
                .and_then(|i| i.value().parse::<f64>().ok())
            {
                let mut s = state.borrow_mut();
                s.size = v;
                s.redraw();
            }
        });
        size_input.add_event_listener_with_callback("input", cb.as_ref().unchecked_ref())?;
        cb.forget();
    }

    if let Some(clear_btn) = document.get_element_by_id("clear") {
        let state = state.clone();
        let cb = Closure::<dyn FnMut()>::new(move || {
            state.borrow_mut().clear_buffer();
        });
        clear_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref())?;
        cb.forget();
    }

    Ok(())
}
