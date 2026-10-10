;; Scribble ring buffer in hand-written WebAssembly Text.
;;
;; Memory layout (linear memory, 1 page = 64 KiB, only ~1.7 KiB used):
;;   xs   : offset    0, 100 f64 (800 bytes)
;;   ys   : offset  800, 100 f64 (800 bytes)
;;   conn : offset 1600, 100 u8  (100 bytes)
;;
;; Globals:
;;   $head  : next write slot (0..99)
;;   $count : number of valid samples, saturates at 100

(module
  (memory (export "memory") 1)

  (global $head  (mut i32) (i32.const 0))
  (global $count (mut i32) (i32.const 0))

  ;; push(x, y, connected): write sample at head, advance head, bump count.
  (func $push (export "push")
        (param $x f64) (param $y f64) (param $connected i32)
    (local $h i32)
    (local.set $h (global.get $head))

    ;; xs[h] = x   -> address = h * 8
    (f64.store
      (i32.mul (local.get $h) (i32.const 8))
      (local.get $x))

    ;; ys[h] = y   -> address = h * 8 + 800
    (f64.store offset=800
      (i32.mul (local.get $h) (i32.const 8))
      (local.get $y))

    ;; conn[h] = (connected != 0) ? 1 : 0   -> address = h + 1600
    (i32.store8 offset=1600
      (local.get $h)
      (i32.ne (local.get $connected) (i32.const 0)))

    ;; head = (h + 1) % 100
    (global.set $head
      (i32.rem_s
        (i32.add (local.get $h) (i32.const 1))
        (i32.const 100)))

    ;; if count < 100: count++
    (if (i32.lt_s (global.get $count) (i32.const 100))
      (then
        (global.set $count
          (i32.add (global.get $count) (i32.const 1))))))

  (func $clear (export "clear")
    (global.set $head  (i32.const 0))
    (global.set $count (i32.const 0)))

  (func $getCount (export "getCount") (result i32)
    (global.get $count))

  ;; Slot of the oldest valid sample (0 when not yet wrapped, else head).
  (func $startSlot (export "startSlot") (result i32)
    (if (result i32) (i32.lt_s (global.get $count) (i32.const 100))
      (then (i32.const 0))
      (else (global.get $head))))

  ;; Translate iteration index 0..count-1 into a memory slot.
  (func $slotAt (export "slotAt") (param $i i32) (result i32)
    (i32.rem_s
      (i32.add (call $startSlot) (local.get $i))
      (i32.const 100)))

  (func $getX (export "getX") (param $slot i32) (result f64)
    (f64.load (i32.mul (local.get $slot) (i32.const 8))))

  (func $getY (export "getY") (param $slot i32) (result f64)
    (f64.load offset=800 (i32.mul (local.get $slot) (i32.const 8))))

  (func $getConnected (export "getConnected") (param $slot i32) (result i32)
    (i32.load8_u offset=1600 (local.get $slot)))

  ;; Newest segment fully opaque (1.0), oldest fades toward 0.05.
  ;;   alpha = 1.0 - ((count - 1 - i) / (count - 1)) * 0.95
  (func $segmentAlpha (export "segmentAlpha") (param $i i32) (result f64)
    (local $age f64)
    (local $maxAge f64)
    (if (result f64) (i32.lt_s (global.get $count) (i32.const 2))
      (then (f64.const 1.0))
      (else
        (local.set $age
          (f64.convert_i32_s
            (i32.sub
              (i32.sub (global.get $count) (i32.const 1))
              (local.get $i))))
        (local.set $maxAge
          (f64.convert_i32_s
            (i32.sub (global.get $count) (i32.const 1))))
        (f64.sub
          (f64.const 1.0)
          (f64.mul
            (f64.div (local.get $age) (local.get $maxAge))
            (f64.const 0.95))))))
)
