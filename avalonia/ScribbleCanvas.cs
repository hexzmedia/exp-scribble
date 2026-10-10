using System;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;
using Avalonia.Media.Immutable;

namespace ScribbleAvalonia;

/// <summary>
/// Custom drawing surface. Holds a 100-point ring buffer of pointer samples
/// and renders line segments between them with alpha fading from newest
/// (fully opaque) to oldest (almost transparent).
/// </summary>
public class ScribbleCanvas : Control
{
    private const int MaxPoints = 100;
    private const double MinAlpha = 0.05;

    private readonly Sample?[] _points = new Sample?[MaxPoints];
    private int _head;
    private int _count;
    private bool _drawing;

    private Color _color = Color.Parse("#111111");
    private double _size = 3.0;

    private readonly record struct Sample(Point Pos, bool Connected);

    public Color StrokeColor
    {
        get => _color;
        set
        {
            if (_color == value) return;
            _color = value;
            InvalidateVisual();
        }
    }

    public double StrokeSize
    {
        get => _size;
        set
        {
            if (Math.Abs(_size - value) < 0.0001) return;
            _size = value;
            InvalidateVisual();
        }
    }

    public void ClearStrokes()
    {
        Array.Clear(_points);
        _head = 0;
        _count = 0;
        InvalidateVisual();
    }

    private void Push(Point pos, bool connected)
    {
        _points[_head] = new Sample(pos, connected);
        _head = (_head + 1) % MaxPoints;
        if (_count < MaxPoints) _count++;
        InvalidateVisual();
    }

    private double SegmentAlpha(int i)
    {
        if (_count < 2) return 1.0;
        double age = _count - 1 - i;
        double maxAge = _count - 1;
        return 1.0 - (age / maxAge) * (1.0 - MinAlpha);
    }

    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        _drawing = true;
        e.Pointer.Capture(this);
        Push(e.GetPosition(this), connected: false);
        base.OnPointerPressed(e);
    }

    protected override void OnPointerMoved(PointerEventArgs e)
    {
        if (_drawing)
        {
            Push(e.GetPosition(this), connected: true);
        }
        base.OnPointerMoved(e);
    }

    protected override void OnPointerReleased(PointerReleasedEventArgs e)
    {
        _drawing = false;
        e.Pointer.Capture(null);
        base.OnPointerReleased(e);
    }

    protected override void OnPointerCaptureLost(PointerCaptureLostEventArgs e)
    {
        _drawing = false;
        base.OnPointerCaptureLost(e);
    }

    public override void Render(DrawingContext context)
    {
        // White paper. Filling the bounds also ensures the control is hit-testable
        // across its full area.
        context.FillRectangle(Brushes.White, new Rect(Bounds.Size));

        if (_count < 2) return;

        int start = _count < MaxPoints ? 0 : _head;
        Sample? prev = null;
        for (int i = 0; i < _count; i++)
        {
            int slot = (start + i) % MaxPoints;
            var p = _points[slot];
            if (p is null)
            {
                prev = null;
                continue;
            }
            if (prev is { } pp && p.Value.Connected)
            {
                var brush = new ImmutableSolidColorBrush(_color, SegmentAlpha(i));
                var pen = new ImmutablePen(brush, _size,
                    lineCap: PenLineCap.Round,
                    lineJoin: PenLineJoin.Round);
                context.DrawLine(pen, pp.Pos, p.Value.Pos);
            }
            prev = p;
        }
    }
}
