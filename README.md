# One scribble, ten languages

The same small drawing app, built ten times. The smallest is 383 bytes, the largest seven megabytes.

This is the code behind the article [Eén krabbel, tien talen](https://hexz.net/experiment/scribble/) on hexz.net (in Dutch). There you can draw on one surface and switch the language underneath while your scribble stays.

## The question

What can you actually do with WebAssembly?

I knew Figma uses it a lot. I knew you can compile existing C++ or Rust code to it fairly easily. And I kept seeing code being rewritten in Rust, because that is said to be safer than C++.

I wanted to see that for myself. Rebuilding Figma is far too big for an experiment, so I went back to something I already knew.

## A scribble from 2005

In May 2005 I made a variant of the classic scribble: you draw a line, and the line fades behind you. Only the last stretch stays.

This is the code from back then, in C# ([origin/2005-windows-forms/Form1.cs](origin/2005-windows-forms/Form1.cs)):

```csharp
private const int HIS = 40;
private Point[] _p = new Point[HIS];
private int _t;

private void OnMouseMove(object sender, MouseEventArgs e)
{
   if (fMouseDown)
   {
      if (_t<HIS-1)
         _t++;
      else
         _t = 0;
      _p[_t].X = e.X;
      _p[_t].Y = e.Y;
      this.Refresh();
   }
}
```

Forty places, and a counter that starts again at the front when it reaches the end. The newest point overwrites the oldest. When drawing, you walk back from the counter, and every segment gets a little lighter:

```csharp
myColor = Color.FromArgb((255-(i*6)), Color.Black);
```

That is called a ring buffer. I did not know that at the time.

## What I did

It was also an experiment with AI. In the past I would have worked through tutorials and discovered everything myself. Now I asked for a working setup, and it was there in one go: the scribble from 2005, in Rust, in the browser.

That conversation also suggested trying other languages. That is how it became ten:

| Folder | Language | Runs in |
|---|---|---|
| [`rust/`](rust/) | Rust, compiled to WebAssembly (the first one) | browser |
| [`c/`](c/) | C, compiled to WebAssembly | browser |
| [`zig/`](zig/) | Zig, compiled to WebAssembly | browser |
| [`go/`](go/) | Go, compiled to WebAssembly | browser |
| [`assemblyscript/`](assemblyscript/) | AssemblyScript, compiled to WebAssembly | browser |
| [`wat/`](wat/) | WebAssembly text, written by hand, instruction by instruction | browser |
| [`csharp-wasm/`](csharp-wasm/) | C#, with the .NET runtime in the browser | browser |
| [`typescript/`](typescript/) | TypeScript, without WebAssembly, to compare with | browser |
| [`avalonia/`](avalonia/) | C# with Avalonia: one desktop app for every platform | desktop |
| [`win32/`](win32/) | C++ with Win32: as close to the system as possible | Windows |

The agreement is the same for every language. Remember the last hundred points of the pen. When a point is added, the oldest drops off. And the older a part of the line, the more it fades.

That is eight small functions: add a point, clear everything, and six to read the points back (`push`, `clear`, `getCount`, `slotAt`, `getX`, `getY`, `getConnected`, `segmentAlpha`). Most variants also export a ninth helper, `startSlot`. The page draws, the language remembers. That is why the page on hexz.net can switch language while your scribble stays: the points simply move along.

## What surprised me

### The same thing, but eighteen thousand times as large

| Variant | Size |
|---|---|
| WebAssembly text, by hand | 383 bytes |
| C | 401 bytes, plus a 6 kB loader |
| Zig | 513 bytes |
| TypeScript, without WebAssembly | 4.2 kB |
| AssemblyScript | 4.4 kB |
| Rust | 46.8 kB, plus 16 kB of glue |
| Windows program (C++) | 105 kB |
| Go | 1.4 MB |
| C# | 7.0 MB, of which 8 kB is my own code |

Sizes are what the browser has to fetch, uncompressed, measured on 10 October 2026.

The hand-written version is 383 bytes. That is about as much as sixty words of text. The C# version does exactly the same and is over seven megabytes.

### The difference is what travels along

- **WebAssembly text, C and Zig** bring nothing. Only the functions and a bit of memory.
- **AssemblyScript** brings a small piece of runtime: 4.4 kB.
- **Rust** is 47 kB here, but that is not a fair comparison. In this first variant Rust does everything itself, including listening to the pen and drawing. Every call into the browser costs glue.
- **Go** brings its whole runtime: 1.4 MB, for a hundred points.
- **C#** brings .NET. Of the seven megabytes, 8 kB is my own code.

For a scribble, C# and Go overshoot the mark. They bring a whole house along to remember one line.

> The language does not decide how large your program is. What you bring along without noticing does.

### Crossing the border costs something too

Every time the page passes a point, it crosses the border between JavaScript and WebAssembly. How expensive that is differs per language. On the page on hexz.net you can push a hundred thousand points through, on your own device.

On my computer that takes a few milliseconds in most languages. In Go it takes over a second: there, every call takes a detour through JavaScript.

### Closest to the machine is hardest to read

The Windows program in C++ should be the fastest: there is nothing between the code and the system. I have not measured that. What I did notice: it is the variant I find hardest to read.

The C version is 62 lines. The Windows version is 317. Most of that is not about the scribble, but about the conventions of the system: creating windows, handling messages, names like `LRESULT CALLBACK` and `GET_X_LPARAM`.

### A working setup in one go

In 2005 the scribble took me a few evenings, in one language. Now there were ten variants in a few days. Not because I know ten languages, but because I knew what it had to do and could explain that.

That changes what an experiment is. Comparing costs almost nothing any more. The question "what would this look like in Zig?" no longer has to be left unanswered.

## How it works

This is the whole function that adds a point, in Zig ([zig/scribble.zig](zig/scribble.zig)):

```zig
export fn push(x: f64, y: f64, connected: i32) void {
    const h: usize = @intCast(head);
    xs[h] = x;
    ys[h] = y;
    conn[h] = if (connected != 0) 1 else 0;
    head = @mod(head + 1, MAX_POINTS);
    if (count < MAX_POINTS) count += 1;
}
```

And the same function in C ([c/scribble.c](c/scribble.c)):

```c
void push(double x, double y, int connected) {
    xs[head] = x;
    ys[head] = y;
    conn[head] = connected ? 1 : 0;
    head = (head + 1) % MAX_POINTS;
    if (count < MAX_POINTS) count++;
}
```

Put them next to the code from 2005. It is the same idea: a row of fixed places, and a pointer that goes round. When the row is full, the new point overwrites the oldest.

The browser gets a file with these functions, sets it up in a closed-off piece of memory and calls them as if they were ordinary JavaScript.

## Run it

The built files for the browser variants are in the repository (except C#, which is 7 MB), so you can run them without installing a compiler. Browsers do not load WebAssembly from `file://`, so serve the folder:

```bash
npx http-server -p 8080 -c-1 .
```

Then open `http://localhost:8080/` and pick a variant.

Use a server that knows the `.mjs` file type. Python's built-in server on Windows serves it as plain text, and then the C variant does not load.

## Build it

Each folder builds on its own. The scripts were written on Windows (PowerShell).

| Folder | You need | Build |
|---|---|---|
| `wat/` | Node.js | `npm install`, then `npm run build` |
| `c/` | Emscripten (emsdk, activated in the shell) | `.\build.ps1` |
| `zig/` | Zig 0.13 or later | `.\build.ps1` |
| `rust/` | Rust and wasm-pack | `wasm-pack build --target web` |
| `go/` | Go 1.19 or later | `.\build.ps1` |
| `assemblyscript/` | Node.js | `npm install`, then `npm run asbuild` |
| `typescript/` | Node.js | `npm install`, then `npm run build` |
| `csharp-wasm/` | .NET 8 SDK with the `wasm-tools` workload | `dotnet publish -c Release` |
| `avalonia/` | .NET 10 SDK | `dotnet run` |
| `win32/` | Visual Studio with the C++ tools | `build.bat` (adjust the path to `vcvars64.bat`) |

## Good to know

- **The Rust variant is different from the others.** It was the first, and it draws and listens to the pointer itself through `web-sys`. The other browser variants only keep the points and leave drawing to the page. A Rust variant with the same small interface is still to be made.
- **Generated files.** `go/build/wasm_exec.js` comes with Go (copyright The Go Authors, BSD-style licence). `c/build/scribble.mjs` is generated by Emscripten, and `rust/pkg/scribble_wasm.js` by wasm-bindgen.
## Made with the help of AI

This experiment was made with the help of AI: the ten variants, the page on hexz.net and this text. The scribble from 2005, the idea, the questions and the choices are mine.

## Licence

[MIT](LICENSE), copyright Hugo Scheepens. The generated files named above keep their own licence.
