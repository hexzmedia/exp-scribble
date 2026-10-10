//go:build js && wasm

// Ring buffer of the last MaxPoints pointer samples, exposed to JS as a
// global `scribble` object whose methods (push, clear, getCount, slotAt,
// getX, getY, getConnected, segmentAlpha) the host calls each frame.

package main

import "syscall/js"

const (
	MaxPoints = 100
	MinAlpha  = 0.05
)

var (
	xs    [MaxPoints]float64
	ys    [MaxPoints]float64
	conn  [MaxPoints]uint8
	head  int
	count int
)

func push(_ js.Value, args []js.Value) any {
	x := args[0].Float()
	y := args[1].Float()
	connected := args[2].Int()
	xs[head] = x
	ys[head] = y
	if connected != 0 {
		conn[head] = 1
	} else {
		conn[head] = 0
	}
	head = (head + 1) % MaxPoints
	if count < MaxPoints {
		count++
	}
	return nil
}

func clearBuf(_ js.Value, _ []js.Value) any {
	head = 0
	count = 0
	return nil
}

func getCount(_ js.Value, _ []js.Value) any {
	return count
}

func startSlot() int {
	if count < MaxPoints {
		return 0
	}
	return head
}

func slotAt(_ js.Value, args []js.Value) any {
	return (startSlot() + args[0].Int()) % MaxPoints
}

func getX(_ js.Value, args []js.Value) any {
	return xs[args[0].Int()]
}

func getY(_ js.Value, args []js.Value) any {
	return ys[args[0].Int()]
}

func getConnected(_ js.Value, args []js.Value) any {
	return int(conn[args[0].Int()])
}

// Newest segment fully opaque, oldest fades toward MinAlpha.
func segmentAlpha(_ js.Value, args []js.Value) any {
	if count < 2 {
		return 1.0
	}
	i := args[0].Int()
	age := float64(count - 1 - i)
	maxAge := float64(count - 1)
	return 1.0 - (age/maxAge)*(1.0-MinAlpha)
}

func main() {
	scribble := js.Global().Get("Object").New()
	scribble.Set("push", js.FuncOf(push))
	scribble.Set("clear", js.FuncOf(clearBuf))
	scribble.Set("getCount", js.FuncOf(getCount))
	scribble.Set("slotAt", js.FuncOf(slotAt))
	scribble.Set("getX", js.FuncOf(getX))
	scribble.Set("getY", js.FuncOf(getY))
	scribble.Set("getConnected", js.FuncOf(getConnected))
	scribble.Set("segmentAlpha", js.FuncOf(segmentAlpha))
	js.Global().Set("scribble", scribble)

	// Tell the JS host the bindings are in place.
	event := js.Global().Get("Event").New("scribble-ready")
	js.Global().Call("dispatchEvent", event)

	// Block forever so the Go runtime stays alive and FuncOf closures
	// remain valid.
	select {}
}
