// Scribble — pure Win32 + GDI+ in C++.
//
// Window structure:
//   Main window (ScribbleMainClass)
//     ├── Color... BUTTON
//     ├── Size TRACKBAR
//     ├── Size readout STATIC
//     ├── Clear BUTTON
//     └── Canvas child (ScribbleCanvasClass)
//          ↳ owns the 100-point ring buffer and renders segments
//             with GDI+ Pen using per-segment alpha.

#include <windows.h>
#include <windowsx.h>
#include <commctrl.h>
#include <gdiplus.h>

#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "gdiplus.lib")
#pragma comment(lib, "comdlg32.lib")
#pragma comment(lib, "comctl32.lib")
#pragma comment(linker, "/SUBSYSTEM:WINDOWS")

// Pull in v6 common controls for themed buttons / trackbar.
#pragma comment(linker, "\"/manifestdependency:type='win32' "             \
                        "name='Microsoft.Windows.Common-Controls' "       \
                        "version='6.0.0.0' "                              \
                        "processorArchitecture='*' "                      \
                        "publicKeyToken='6595b64144ccf1df' language='*'\"")

using namespace Gdiplus;

// ───── Ring buffer ───────────────────────────────────────────────────────
constexpr int    MAX_POINTS = 100;
constexpr double MIN_ALPHA  = 0.05;

struct Sample {
    double x, y;
    bool   connected;
};

static Sample gPoints[MAX_POINTS] = {};
static int    gHead    = 0;
static int    gCount   = 0;
static bool   gDrawing = false;

static COLORREF gColor = RGB(0x11, 0x11, 0x11);
static int      gSize  = 3;

static void PushSample(double x, double y, bool connected) {
    gPoints[gHead] = { x, y, connected };
    gHead = (gHead + 1) % MAX_POINTS;
    if (gCount < MAX_POINTS) gCount++;
}

static double SegmentAlpha(int i) {
    if (gCount < 2) return 1.0;
    double age    = gCount - 1 - i;
    double maxAge = gCount - 1;
    return 1.0 - (age / maxAge) * (1.0 - MIN_ALPHA);
}

// ───── Window handles & IDs ──────────────────────────────────────────────
static HWND       gMainHwnd, gCanvasHwnd;
static HWND       gColorBtn, gSizeSlider, gSizeLabel, gClearBtn;
static ULONG_PTR  gGdiplusToken;

#define ID_COLOR_BTN     101
#define ID_SIZE_SLIDER   102
#define ID_CLEAR_BTN     103
#define TOOLBAR_HEIGHT   52

// ───── Canvas: paint + input ─────────────────────────────────────────────
static void PaintCanvas(HWND hwnd, HDC screenHdc) {
    RECT rc;
    GetClientRect(hwnd, &rc);
    const int w = rc.right - rc.left;
    const int h = rc.bottom - rc.top;
    if (w <= 0 || h <= 0) return;

    // Double-buffer via a memory DC to eliminate flicker.
    HDC     memDc  = CreateCompatibleDC(screenHdc);
    HBITMAP memBmp = CreateCompatibleBitmap(screenHdc, w, h);
    HGDIOBJ oldBmp = SelectObject(memDc, memBmp);

    {
        Graphics g(memDc);
        g.SetSmoothingMode(SmoothingModeAntiAlias);

        SolidBrush white(Color(255, 255, 255, 255));
        g.FillRectangle(&white, 0, 0, w, h);

        if (gCount >= 2) {
            const int   start = gCount < MAX_POINTS ? 0 : gHead;
            const BYTE  cR    = GetRValue(gColor);
            const BYTE  cG    = GetGValue(gColor);
            const BYTE  cB    = GetBValue(gColor);

            Sample prev{};
            bool   havePrev = false;
            for (int i = 0; i < gCount; i++) {
                const int slot = (start + i) % MAX_POINTS;
                Sample    p    = gPoints[slot];

                if (havePrev && p.connected) {
                    const double alpha = SegmentAlpha(i);
                    const BYTE   a     = (BYTE)(alpha * 255.0);
                    Color  col(a, cR, cG, cB);
                    Pen    pen(col, (REAL)gSize);
                    pen.SetStartCap(LineCapRound);
                    pen.SetEndCap(LineCapRound);
                    pen.SetLineJoin(LineJoinRound);
                    g.DrawLine(&pen,
                               (REAL)prev.x, (REAL)prev.y,
                               (REAL)p.x,    (REAL)p.y);
                }
                prev     = p;
                havePrev = true;
            }
        }
    }

    BitBlt(screenHdc, 0, 0, w, h, memDc, 0, 0, SRCCOPY);
    SelectObject(memDc, oldBmp);
    DeleteObject(memBmp);
    DeleteDC(memDc);
}

static LRESULT CALLBACK CanvasWndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
    switch (msg) {
    case WM_ERASEBKGND:
        return 1; // PaintCanvas paints everything; skip the system erase.

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        PaintCanvas(hwnd, hdc);
        EndPaint(hwnd, &ps);
        return 0;
    }

    case WM_LBUTTONDOWN:
        gDrawing = true;
        SetCapture(hwnd);
        PushSample(GET_X_LPARAM(lp), GET_Y_LPARAM(lp), false);
        InvalidateRect(hwnd, NULL, FALSE);
        return 0;

    case WM_MOUSEMOVE:
        if (gDrawing && (wp & MK_LBUTTON)) {
            PushSample(GET_X_LPARAM(lp), GET_Y_LPARAM(lp), true);
            InvalidateRect(hwnd, NULL, FALSE);
        }
        return 0;

    case WM_LBUTTONUP:
        gDrawing = false;
        ReleaseCapture();
        return 0;

    case WM_CAPTURECHANGED:
        gDrawing = false;
        return 0;
    }
    return DefWindowProc(hwnd, msg, wp, lp);
}

// ───── Toolbar actions ───────────────────────────────────────────────────
static void OpenColorPicker(HWND owner) {
    static COLORREF customColors[16] = {};
    CHOOSECOLORW cc = {};
    cc.lStructSize  = sizeof(cc);
    cc.hwndOwner    = owner;
    cc.rgbResult    = gColor;
    cc.lpCustColors = customColors;
    cc.Flags        = CC_RGBINIT | CC_FULLOPEN;
    if (ChooseColorW(&cc)) {
        gColor = cc.rgbResult;
        InvalidateRect(gCanvasHwnd, NULL, FALSE);
    }
}

static void UpdateSizeLabel() {
    wchar_t buf[16];
    wsprintfW(buf, L"%d px", gSize);
    SetWindowTextW(gSizeLabel, buf);
}

static void LayoutChildren(HWND hwnd) {
    RECT rc;
    GetClientRect(hwnd, &rc);
    const int w = rc.right - rc.left;
    const int h = rc.bottom - rc.top;

    MoveWindow(gColorBtn,    12,                14, 100, 28, TRUE);
    MoveWindow(gSizeSlider,  124,               14, 180, 28, TRUE);
    MoveWindow(gSizeLabel,   310,               18,  60, 20, TRUE);
    MoveWindow(gClearBtn,    w - 92,            14,  80, 28, TRUE);
    MoveWindow(gCanvasHwnd,  0,    TOOLBAR_HEIGHT, w, h - TOOLBAR_HEIGHT, TRUE);
}

// ───── Main window ───────────────────────────────────────────────────────
static LRESULT CALLBACK MainWndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
    switch (msg) {
    case WM_CREATE: {
        HINSTANCE inst = ((LPCREATESTRUCT)lp)->hInstance;

        gColorBtn = CreateWindowExW(0, L"BUTTON", L"Color...",
            WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
            0, 0, 0, 0, hwnd, (HMENU)ID_COLOR_BTN, inst, NULL);

        gSizeSlider = CreateWindowExW(0, TRACKBAR_CLASSW, L"",
            WS_CHILD | WS_VISIBLE | TBS_HORZ | TBS_NOTICKS,
            0, 0, 0, 0, hwnd, (HMENU)ID_SIZE_SLIDER, inst, NULL);
        SendMessage(gSizeSlider, TBM_SETRANGE, TRUE, MAKELPARAM(1, 40));
        SendMessage(gSizeSlider, TBM_SETPOS,   TRUE, gSize);

        gSizeLabel = CreateWindowExW(0, L"STATIC", L"3 px",
            WS_CHILD | WS_VISIBLE | SS_LEFT,
            0, 0, 0, 0, hwnd, NULL, inst, NULL);

        gClearBtn = CreateWindowExW(0, L"BUTTON", L"Clear",
            WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
            0, 0, 0, 0, hwnd, (HMENU)ID_CLEAR_BTN, inst, NULL);

        gCanvasHwnd = CreateWindowExW(WS_EX_CLIENTEDGE,
            L"ScribbleCanvasClass", L"",
            WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS,
            0, 0, 0, 0, hwnd, NULL, inst, NULL);

        UpdateSizeLabel();
        return 0;
    }

    case WM_SIZE:
        LayoutChildren(hwnd);
        return 0;

    case WM_COMMAND:
        switch (LOWORD(wp)) {
        case ID_COLOR_BTN:
            OpenColorPicker(hwnd);
            break;
        case ID_CLEAR_BTN:
            gHead = 0;
            gCount = 0;
            InvalidateRect(gCanvasHwnd, NULL, FALSE);
            break;
        }
        return 0;

    case WM_HSCROLL:
        if ((HWND)lp == gSizeSlider) {
            gSize = (int)SendMessage(gSizeSlider, TBM_GETPOS, 0, 0);
            UpdateSizeLabel();
            InvalidateRect(gCanvasHwnd, NULL, FALSE);
        }
        return 0;

    case WM_GETMINMAXINFO: {
        MINMAXINFO* mmi = (MINMAXINFO*)lp;
        mmi->ptMinTrackSize.x = 600;
        mmi->ptMinTrackSize.y = 400;
        return 0;
    }

    case WM_DESTROY:
        GdiplusShutdown(gGdiplusToken);
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProc(hwnd, msg, wp, lp);
}

// ───── Entry point ───────────────────────────────────────────────────────
int WINAPI wWinMain(HINSTANCE hInst, HINSTANCE, LPWSTR, int nCmdShow) {
    GdiplusStartupInput gdiplusStartupInput;
    GdiplusStartup(&gGdiplusToken, &gdiplusStartupInput, NULL);

    INITCOMMONCONTROLSEX icc = { sizeof(icc), ICC_BAR_CLASSES | ICC_STANDARD_CLASSES };
    InitCommonControlsEx(&icc);

    // Canvas window class.
    WNDCLASSW canvasClass = {};
    canvasClass.lpfnWndProc   = CanvasWndProc;
    canvasClass.hInstance     = hInst;
    canvasClass.lpszClassName = L"ScribbleCanvasClass";
    canvasClass.hCursor       = LoadCursor(NULL, IDC_CROSS);
    canvasClass.hbrBackground = NULL;
    RegisterClassW(&canvasClass);

    // Main window class.
    WNDCLASSW mainClass = {};
    mainClass.lpfnWndProc   = MainWndProc;
    mainClass.hInstance     = hInst;
    mainClass.lpszClassName = L"ScribbleMainClass";
    mainClass.hCursor       = LoadCursor(NULL, IDC_ARROW);
    mainClass.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
    RegisterClassW(&mainClass);

    gMainHwnd = CreateWindowExW(0,
        L"ScribbleMainClass", L"Scribble — Win32 + GDI+",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, 940, 700,
        NULL, NULL, hInst, NULL);

    ShowWindow(gMainHwnd, nCmdShow);
    UpdateWindow(gMainHwnd);

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    return (int)msg.wParam;
}
