#!/usr/bin/env python3
"""Bubbles Termux loopback companion: fast LOCAL transport, not an LLM or public API.
No npm, external dependencies, bank/wallet data, shell execution, or WAN listener.
Use: python3 scripts/c13b0-bubbles-termux-daemon.py install|start|status|stop|selftest
"""
import hmac
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SERVICE = "bubbles-termux-loopback"
HOME = Path.home()
ROOT = HOME / ".local" / "share" / "bubbles-termux"
TOKEN = ROOT / "owner-token"
PORT = 18767
ADDRESS = "127.0.0.1"
MAX_BYTES = 4096
BOOT = HOME / ".termux" / "boot" / "bubbles-companion"
STARTED = time.monotonic()


def storage():
    ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(ROOT, 0o700)


def token():
    storage()
    try:
        value = TOKEN.read_text(encoding="ascii").strip()
        if len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
            raise ValueError("invalid owner token")
        return value
    except FileNotFoundError:
        value = secrets.token_hex(32)
        fd = os.open(str(TOKEN), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w", encoding="ascii") as stream:
            stream.write(value + "\n")
        return value


class Loopback(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class Handler(BaseHTTPRequestHandler):
    server_version = "BubblesLocal/1"
    sys_version = ""

    def log_message(self, *_args):
        # No request text, secrets or bearer headers in log files.
        return

    def send(self, code, payload):
        data = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def verify(self):
        # Web pages must not be able to turn localhost into a cross-origin bridge.
        if self.headers.get("Origin"):
            self.send(403, {"ok": False, "error": "browser_origin_denied"})
            return False
        auth = self.headers.get("Authorization", "")
        if not hmac.compare_digest(auth, "Bearer " + self.server.owner_token):
            self.send(401, {"ok": False, "error": "owner_authorization_required"})
            return False
        return True

    def do_GET(self):
        if self.path == "/health":
            self.send(200, {"ok": True, "service": SERVICE, "transport": "loopback",
                            "uptime_seconds": int(time.monotonic() - STARTED),
                            "model": "none", "brain": "not_connected"})
        elif self.path == "/v1/status":
            if self.verify():
                self.send(200, {"ok": True, "service": SERVICE, "ready": True,
                                "exec_enabled": False, "external_network_enabled": False})
        else:
            self.send(404, {"ok": False, "error": "not_found"})

    def do_POST(self):
        if self.path not in ("/v1/roundtrip", "/v1/dialogue/check", "/v1/stop"):
            return self.send(404, {"ok": False, "error": "not_found"})
        if not self.verify():
            return
        raw_length = self.headers.get("Content-Length", "")
        if not raw_length.isdecimal() or int(raw_length) > MAX_BYTES:
            return self.send(413, {"ok": False, "error": "payload_too_large"})
        raw = self.rfile.read(int(raw_length))
        try:
            body = json.loads(raw)
            if not isinstance(body, dict):
                raise ValueError()
        except (ValueError, UnicodeDecodeError):
            return self.send(400, {"ok": False, "error": "invalid_json_object"})
        if self.path == "/v1/roundtrip":
            nonce = body.get("nonce", "")
            if not isinstance(nonce, str) or len(nonce) > 64:
                return self.send(400, {"ok": False, "error": "invalid_nonce"})
            return self.send(200, {"ok": True, "nonce": nonce, "source": "termux_local",
                                   "model_response": False})
        if self.path == "/v1/dialogue/check":
            # Syntax-only check. Does not execute tools, decide authorizations,
            # read chat history, store text, or pretend to be a chatbot.
            role = body.get("role")
            text = body.get("text")
            if role not in ("user", "assistant", "tool") or not isinstance(text, str) or len(text) > 2000:
                return self.send(400, {"ok": False, "error": "invalid_chat_turn"})
            stripped = text.strip()
            structured = stripped.startswith(("{", "[", "```"))
            tool_syntax = structured and any(key in stripped[:500] for key in
                ('"tool_calls"', '"function"', '"tool_name"', '"arguments"', '"action"'))
            self.send(200, {"ok": True, "syntax_checked": True, "has_tool_syntax": tool_syntax,
                            "speech_safe": role == "assistant" and bool(stripped) and not tool_syntax,
                            "executed": False})
            return
        self.send(200, {"ok": True, "stopping": True})
        threading.Thread(target=self.server.shutdown, daemon=True).start()


def endpoint(path, body=None, authorize=False):
    url = f"http://{ADDRESS}:{PORT}{path}"
    headers = {"Accept": "application/json"}
    if authorize:
        headers["Authorization"] = "Bearer " + token()
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
        req = Request(url, data=data, headers=headers, method="POST")
    else:
        req = Request(url, headers=headers)
    with urlopen(req, timeout=1.8) as response:
        return json.loads(response.read(MAX_BYTES + 512))


def serve():
    server = Loopback((ADDRESS, PORT), Handler)
    server.owner_token = token()
    try:
        server.serve_forever(poll_interval=0.15)
    finally:
        server.server_close()


def start():
    try:
        health = endpoint("/health")
        if health.get("service") == SERVICE:
            print("Bubbles Termux loopback already running. No second instance.")
            return
        raise RuntimeError("port occupied by a different program")
    except HTTPError:
        raise RuntimeError("port occupied; refusing to replace service")
    except URLError:
        pass
    storage()
    logfile = ROOT / "service.log"
    with logfile.open("ab") as output:
        subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "_serve"],
                         stdin=subprocess.DEVNULL, stdout=output, stderr=output,
                         cwd=HOME, start_new_session=True, close_fds=True)
    for _ in range(18):
        try:
            response = endpoint("/health")
            if response.get("service") == SERVICE:
                print("Bubbles local companion READY at 127.0.0.1:18767. No public port.")
                return
        except (URLError, OSError):
            time.sleep(0.1)
    raise RuntimeError("service did not start; inspect ~/.local/share/bubbles-termux/service.log")


def install():
    storage()
    token()
    boot_dir = BOOT.parent
    boot_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(boot_dir, 0o700)
    # The installed addon Termux:Boot must be separately enabled on Android.
    code = f"#!/data/data/com.termux/files/usr/bin/sh\nexec python3 {str(Path(__file__).resolve())!r} start\n"
    BOOT.write_text(code, encoding="utf-8")
    os.chmod(BOOT, 0o700)
    start()
    print("Boot hook installed (requires the separately installed Termux:Boot app).")
    print("Android may still stop background processes; no remote AI or login is implied.")


def selftest():
    server = Loopback((ADDRESS, 0), Handler)
    server.owner_token = secrets.token_hex(32)
    runner = threading.Thread(target=server.serve_forever, daemon=True)
    runner.start()
    base = f"http://{ADDRESS}:{server.server_address[1]}"
    try:
        with urlopen(base + "/health", timeout=2) as r:
            assert json.load(r)["model"] == "none"
        request = Request(base + "/v1/roundtrip", method="POST", data=b'{"nonce":"bubbles"}',
                          headers={"Content-Type": "application/json"})
        try:
            urlopen(request, timeout=2)
            raise AssertionError("unauthorized accepted")
        except HTTPError as error:
            assert error.code == 401
        request.add_header("Authorization", "Bearer " + server.owner_token)
        with urlopen(request, timeout=2) as r:
            assert json.load(r)["nonce"] == "bubbles"
        request.add_header("Origin", "https://example.org")
        try:
            urlopen(request, timeout=2)
            raise AssertionError("cross-origin accepted")
        except HTTPError as error:
            assert error.code == 403
    finally:
        server.shutdown()
        runner.join(timeout=3)
        server.server_close()
    print("PASS: local health, no remote model, bearer guard, roundtrip, browser-origin guard")


if __name__ == "__main__":
    op = sys.argv[1] if len(sys.argv) == 2 else ""
    try:
        if op == "_serve":
            serve()
        elif op == "install":
            install()
        elif op == "start":
            start()
        elif op == "status":
            print(json.dumps(endpoint("/health"), indent=2))
        elif op == "stop":
            print(json.dumps(endpoint("/v1/stop", {}, True)))
        elif op == "selftest":
            selftest()
        else:
            print("Usage: python3 c13b0-bubbles-termux-daemon.py install|start|status|stop|selftest")
            sys.exit(2)
    except (OSError, RuntimeError, URLError, HTTPError) as error:
        print("BLOCKED:", type(error).__name__, str(error)[:160], file=sys.stderr)
        sys.exit(1)
