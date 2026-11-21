import os
import subprocess
import json
import sys
import argparse

def _run_cmd(cmd: list[str]) -> str:
    """Run a command and return its stdout as a stripped string.
    Raises subprocess.CalledProcessError on failure.
    """
    return subprocess.check_output(cmd, text=True).strip()

def tap(x: int, y: int) -> None:
    """Simulate a screen tap at the given coordinates using ADB."""
    _run_cmd(["adb", "shell", "input", "tap", str(x), str(y)])

def swipe(x1: int, y1: int, x2: int, y2: int, duration_ms: int = 300) -> None:
    """Simulate a swipe gesture from (x1, y1) to (x2, y2)."""
    _run_cmd(["adb", "shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(duration_ms)])

def keyevent(keycode: str) -> None:
    """Send a key event (e.g., KEYCODE_HOME) via ADB."""
    _run_cmd(["adb", "shell", "input", "keyevent", keycode])

def list_files(path: str = ".") -> list[str]:
    """Return a list of file names in the given directory."""
    return os.listdir(path)

def open_file(path: str) -> None:
    """Open a file or URL with the default Android app using termux-open."""
    _run_cmd(["termux-open", path])

def toast(message: str) -> None:
    """Show a short toast notification via termux-toast."""
    _run_cmd(["termux-toast", "-s", message])

def _cmd_tap(args: argparse.Namespace) -> None:
    tap(args.x, args.y)

def _cmd_swipe(args: argparse.Namespace) -> None:
    swipe(args.x1, args.y1, args.x2, args.y2, args.duration)

def _cmd_keyevent(args: argparse.Namespace) -> None:
    keyevent(args.keycode)

def _cmd_list(args: argparse.Namespace) -> None:
    print(json.dumps(list_files(args.path)))

def _cmd_open(args: argparse.Namespace) -> None:
    open_file(args.path)

def _cmd_toast(args: argparse.Namespace) -> None:
    toast(args.msg)

def main() -> None:
    parser = argparse.ArgumentParser(description="Bubbles Termux helper – A small wrapper around ADB and Termux‑API utilities.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_tap = subparsers.add_parser("tap", help="Tap at X Y coordinates")
    p_tap.add_argument("x", type=int, help="X coordinate")
    p_tap.add_argument("y", type=int, help="Y coordinate")
    p_tap.set_defaults(func=_cmd_tap)

    p_swipe = subparsers.add_parser("swipe", help="Swipe from X1 Y1 to X2 Y2")
    p_swipe.add_argument("x1", type=int)
    p_swipe.add_argument("y1", type=int)
    p_swipe.add_argument("x2", type=int)
    p_swipe.add_argument("y2", type=int)
    p_swipe.add_argument("--duration", type=int, default=300, help="Duration in ms")
    p_swipe.set_defaults(func=_cmd_swipe)

    p_key = subparsers.add_parser("keyevent", help="Send a key event code")
    p_key.add_argument("keycode", help="Keycode string, e.g., HOME, BACK")
    p_key.set_defaults(func=_cmd_keyevent)

    p_list = subparsers.add_parser("list", help="List files in a directory")
    p_list.add_argument("path", nargs="?", default=".", help="Directory path (default: current)")
    p_list.set_defaults(func=_cmd_list)

    p_open = subparsers.add_parser("open", help="Open a file or URL with termux-open")
    p_open.add_argument("path", help="File path or URL")
    p_open.set_defaults(func=_cmd_open)

    p_toast = subparsers.add_parser("toast", help="Show a toast notification")
    p_toast.add_argument("msg", help="Message to display")
    p_toast.set_defaults(func=_cmd_toast)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"Command failed: {e}\n")
        sys.exit(e.returncode)
