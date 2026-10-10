using System;
using System.Drawing;
using System.Collections;
using System.ComponentModel;
using System.Windows.Forms;
using System.Data;

namespace WindowsApplication2
{
   /// <summary>
   /// Summary description for Form1.
   /// </summary>
   public class Form1 : System.Windows.Forms.Form
   {
      private System.ComponentModel.IContainer components;
      private Boolean fMouseDown;
      private ArrayList fPoints;
      private const int HIS = 40;
      private Point[] _p = new Point[HIS];
      private System.Windows.Forms.Timer timer1;
      private int _t;
      private Random _r;

      public Form1()
      {
         //
         // Required for Windows Form Designer support
         //
         InitializeComponent();
         fPoints = new ArrayList();
         _r = new Random();
         //this.accountNumber = (int)(r.NextDouble() * 1000000.0)
         for (int i=0; i<HIS; i++)
         {
            _p[i].X = (int)this.Width/2;
            _p[i].Y = (int)this.Height/2;
            _t = 0;
         }
         //
         // TODO: Add any constructor code after InitializeComponent call
         //
      }

      /// <summary>
      /// Clean up any resources being used.
      /// </summary>
      protected override void Dispose( bool disposing )
      {
         if( disposing )
         {
            if (components != null) 
            {
               components.Dispose();
            }
         }
         base.Dispose( disposing );
      }

		#region Windows Form Designer generated code
      /// <summary>
      /// Required method for Designer support - do not modify
      /// the contents of this method with the code editor.
      /// </summary>
      private void InitializeComponent()
      {
         this.components = new System.ComponentModel.Container();
         this.timer1 = new System.Windows.Forms.Timer(this.components);
         // 
         // timer1
         // 
         this.timer1.Tick += new System.EventHandler(this.timer1_Tick);
         // 
         // Form1
         // 
         this.AutoScaleBaseSize = new System.Drawing.Size(5, 13);
         this.ClientSize = new System.Drawing.Size(292, 273);
         this.Name = "Form1";
         this.Text = "Form1";
         this.MouseDown += new System.Windows.Forms.MouseEventHandler(this.OnMouseDown);
         this.MouseUp += new System.Windows.Forms.MouseEventHandler(this.OnMouseUp);
         this.Paint += new System.Windows.Forms.PaintEventHandler(this.OnPaint);
         this.MouseMove += new System.Windows.Forms.MouseEventHandler(this.OnMouseMove);

      }
		#endregion

      private void OnMouseDown (object sender, System.Windows.Forms.MouseEventArgs e)
      {
         fMouseDown = true;
         for (int i=0; i<HIS; i++)
         {
            _p[i].X = e.X;
            _p[i].Y = e.Y;
            _t = 0;
         }
      }
      private void OnMouseMove (object sender, System.Windows.Forms.MouseEventArgs e)
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
      private void OnMouseUp (object sender, System.Windows.Forms.MouseEventArgs e)
      {
         if (_t<HIS-1)
            _t++;
         else
            _t = 0;
         _p[_t].X = e.X;
         _p[_t].Y = e.Y;
         this.Refresh();
         fMouseDown = false;
      }
      private void OnPaint (object sender, System.Windows.Forms.PaintEventArgs e)
      {
         System.Collections.IEnumerator myEnumerator = fPoints.GetEnumerator();
         Pen pen1 = new Pen(Color.FromArgb(150, Color.Purple));
         //int i = 0;
         Color myColor = new Color();

         int j = _t;
         Point p1 = (Point)_p[_t];
         for (int i=0; i<HIS-1; i++)
         {
            if (j<=0)
               j = HIS - 1;
            else
               j--;

            myColor = Color.FromArgb((255-(i*6)), Color.Black);
            pen1 = new Pen(myColor);
            e.Graphics.DrawLine(pen1, _p[j], p1);
            p1 = (Point)_p[j];
         }
      }

      protected void Form1_Paint (object sender, System.Windows.Forms.PaintEventArgs e)
      {
         Point p1 = new Point(0,0);
         Point p2 = new Point(Width, Height-20);
         Pen p = new Pen ( System.Drawing.Color.Black );
         e.Graphics.DrawLine (p, p1, p2);
         Point p3 = new Point(Width, 0);
         Point p4 = new Point(0, Height-20);
         e.Graphics.DrawLine (p, p3, p4);
      }
      /// <summary>
      /// The main entry point for the application.
      /// </summary>
      [STAThread]
      static void Main() 
      {
         Application.Run(new Form1());
      }

      private void timer1_Tick(object sender, System.EventArgs e)
      {
         //
         if (_t<HIS-1)
            _t++;
         else
            _t = 0;
         _p[_t].X += ((int)(_r.NextDouble() * 21.0)-10);
         _p[_t].Y += ((int)(_r.NextDouble() * 21.0)-10);
         this.Refresh();

      }
   }
}
