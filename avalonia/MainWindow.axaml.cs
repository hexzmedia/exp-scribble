using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Media;

namespace ScribbleAvalonia;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        ColorBox.SelectionChanged += (_, _) =>
        {
            if (ColorBox.SelectedItem is ComboBoxItem item && item.Tag is string hex)
            {
                Surface.StrokeColor = Color.Parse(hex);
            }
        };

        SizeSlider.PropertyChanged += (_, e) =>
        {
            if (e.Property == RangeBase.ValueProperty)
            {
                Surface.StrokeSize = SizeSlider.Value;
                SizeReadout.Text = ((int)SizeSlider.Value).ToString();
            }
        };

        ClearButton.Click += (_, _) => Surface.ClearStrokes();

        // Push initial values from the toolbar into the canvas.
        SizeReadout.Text = ((int)SizeSlider.Value).ToString();
        Surface.StrokeSize = SizeSlider.Value;
    }
}
