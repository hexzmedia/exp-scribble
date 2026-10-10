using System.Runtime.InteropServices.JavaScript;

// Top-level statement required as the program entry point.
// The Mono wasm host calls into the JSExport methods below from JS.
return 0;

public partial class Scribble
{
    private const int MaxPoints = 100;
    private const double MinAlpha = 0.05;

    private static readonly double[] xs = new double[MaxPoints];
    private static readonly double[] ys = new double[MaxPoints];
    private static readonly byte[] conn = new byte[MaxPoints];
    private static int head;
    private static int count;

    [JSExport]
    internal static void Push(double x, double y, int connected)
    {
        xs[head] = x;
        ys[head] = y;
        conn[head] = (byte)(connected != 0 ? 1 : 0);
        head = (head + 1) % MaxPoints;
        if (count < MaxPoints) count++;
    }

    [JSExport]
    internal static void Clear()
    {
        head = 0;
        count = 0;
    }

    [JSExport]
    internal static int GetCount() => count;

    private static int StartSlot() => count < MaxPoints ? 0 : head;

    [JSExport]
    internal static int SlotAt(int i) => (StartSlot() + i) % MaxPoints;

    [JSExport]
    internal static double GetX(int slot) => xs[slot];

    [JSExport]
    internal static double GetY(int slot) => ys[slot];

    [JSExport]
    internal static int GetConnected(int slot) => conn[slot];

    // Newest segment fully opaque, oldest fades toward MinAlpha.
    [JSExport]
    internal static double SegmentAlpha(int i)
    {
        if (count < 2) return 1.0;
        double age = count - 1 - i;
        double maxAge = count - 1;
        return 1.0 - (age / maxAge) * (1.0 - MinAlpha);
    }
}
