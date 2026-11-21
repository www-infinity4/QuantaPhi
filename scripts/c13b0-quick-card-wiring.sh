#!/data/data/com.termux/files/usr/bin/bash
# C13B0 · Website schematic => original-site Quick Card schematic.
# No npm, no backend, no API keys, no credential scraping, no prompts.
set -eu
cd "$HOME"
OUT="$HOME/C13B0-Quick-Card-Wiring"
mkdir -p "$OUT"
if ! command -v python >/dev/null 2>&1; then
  printf '%s\n' 'Python is required. Install it in Termux: pkg install python'
  exit 1
fi
cat > "$OUT/generate.py" <<'PY_CARD_BUILDER'
#!/usr/bin/env python3
"""C13B0 original-site Quick Card study scaffold. Python stdlib only."""
import argparse
import html
import json
import pathlib
import re
from urllib.parse import urlsplit, urlunsplit

ROOT = pathlib.Path.home() / "C13B0-Quick-Card-Wiring"
INPUT = ROOT / "card-input.json"
DEFAULT = {
    "title": "StarMaker · Website Study Card",
    "website": "https://www.starmakerstudios.com/en/songs",
    "description": "Discover official StarMaker song links and inspect real provider actions.",
    "interactionRequest": "Show the original site and route official songbook/sign-in actions.",
    "actions": [],
    "owner_supplied_backing_audio_only": True
}
KNOWN = {
    "starmakerstudios.com": {
        "id": "starmaker",
        "name": "StarMaker",
        "signin": "https://www.starmakerstudios.com/en/web-login",
        "actions": [
            {"label": "Official songbook", "url": "https://www.starmakerstudios.com/en/songs"},
            {"label": "Try QuantaPhi mini card", "url": "https://quantaphi.org/starmaker-embed.html"}
        ]
    },
    "ebay.com": {
        "id": "ebay", "name": "eBay",
        "signin": "https://signin.ebay.com/",
        "actions": [{"label": "eBay item search", "url": "https://www.ebay.com/sch/i.html"}]
    },
    "youtube.com": {
        "id": "youtube", "name": "YouTube",
        "signin": "https://accounts.google.com/",
        "actions": [{"label": "YouTube search", "url": "https://www.youtube.com/results"}]
    }
}

def valid_https(value):
    if not isinstance(value, str):
        return None
    try:
        u = urlsplit(value.strip())
        host = (u.hostname or "").lower()
        if (u.scheme != "https" or not host or u.username or u.password or
            u.port or not re.fullmatch(r"[a-z0-9.-]+", host) or
            host == "localhost" or host.endswith(".localhost")):
            return None
        return urlunsplit((u.scheme, u.netloc, u.path or "/", u.query, ""))
    except (ValueError, TypeError):
        return None

def identity(url):
    host = (urlsplit(url).hostname or "").lower()
    for suffix, data in KNOWN.items():
        if host == suffix or host.endswith("." + suffix):
            return data
    return None

def same_host(url, parent):
    a, b = urlsplit(url), urlsplit(parent)
    return a.hostname == b.hostname or (
        a.hostname in ("www." + str(b.hostname),) or b.hostname in ("www." + str(a.hostname),)
    )

def escape(s):
    return html.escape(str(s), quote=True)

def generate(config):
    url = valid_https(config.get("website"))
    if not url:
        raise SystemExit("Invalid HTTPS source URL. No output was generated.")
    title = str(config.get("title") or "Original Website Quick Card").strip()[:85]
    description = str(config.get("description") or "Explore the original website.")[:600]
    feature = str(config.get("interactionRequest") or "Use the original site features.")[:500]
    provider = identity(url)
    actions = [{"label": "Open actual website", "url": url, "mode": "link"}]
    if provider:
        actions += [{"label": a["label"], "url": a["url"], "mode": "link"}
                    for a in provider["actions"]]
        if provider["signin"]:
            actions.append({"label": "Sign in at " + provider["name"],
                            "url": provider["signin"], "mode": "provider-login"})
    for a in config.get("actions", []):
        if not isinstance(a, dict):
            continue
        target = valid_https(a.get("url"))
        label = str(a.get("label") or "").strip()[:70]
        # User-entered actions are navigation to the original site, not arbitrary redirects.
        if target and same_host(target, url) and label:
            actions.append({"label": label, "url": target, "mode": "site-link"})
    manifest = {
      "schema": "infinity.quick-card-wiring.v1",
      "site": url,
      "title": title,
      "description": description,
      "interactionRequest": feature,
      "providerId": provider["id"] if provider else None,
      "providerLogin": provider["signin"] if provider else None,
      "accountConnection": "not-integrated",
      "browserView": "iframe-only-where-permitted",
      "accountData": "not-imported",
      "cloudBrowser": "manual-owner-authorized-task-with-result-receipt",
      "apiAccess": "not-granted-by-card",
      "quantaControls": ["Follow", "Star", "Collect", "Share", "+1 Build"],
      "actionRoutes": actions,
      "slots": {
        "verifiedSearchUrl": None,
        "officialMediaEmbed": None,
        "permissionReceipt": None,
        "userScopedResult": None,
        "sourceTimestamp": None,
        "backendToolAdapter": None
      }
    }
    (ROOT / "wiring.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    action_html = "\n".join(
       '<a href="' + escape(a["url"]) + '" target="_blank" rel="noopener noreferrer">' +
       escape(a["label"]) + " ↗</a>" for a in actions
    )
    generated = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>''' + escape(title) + '''</title>
<style>:root{font:16px/1.55 system-ui,sans-serif;color:#193d64;background:#f6f9fd}*{box-sizing:border-box}body{margin:0}.card{max-width:580px;margin:18px auto;padding:18px;background:white;border:1px solid #d8e5f2;border-radius:20px}h1{font-size:1.6rem;line-height:1.25;margin:4px 0}p{color:#556e86}.k{font-size:.7rem;color:#2e71b2;font-weight:900;letter-spacing:.12em}.routes{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.routes a,button{min-height:44px;display:inline-flex;align-items:center;padding:10px 13px;border:1px solid #cbdcf0;border-radius:12px;background:#eaf3ff;color:#1a60b0;font-weight:800;text-decoration:none;cursor:pointer}button{font:inherit;font-weight:800}iframe{width:100%;height:420px;border:1px solid #d1e1f2;border-radius:12px}.notice{padding:10px;border-radius:10px;background:#fff7e7;border:1px solid #eadab6;font-size:.79rem;color:#694d23}</style></head><body>
<main class="card"><p class="k">QUANTAPHI · ORIGINAL-SITE QUICK CARD STUDY</p><h1>''' + escape(title) + '''</h1><p>''' + escape(description) + '''</p><p>''' + escape(feature) + '''</p>
<div class="routes">''' + action_html + '''</div>
<p class="notice">Real official site, not an imitation login. A signed-in provider frame does not give this card permission to read personal data or copy cookies. If the frame is refused, use the original link.</p>
<button id="show" type="button">Try permitted website view</button>
<p id="status" role="status" aria-live="polite">Provider frame not loaded.</p><iframe id="source" title="Original website if permitted" referrerpolicy="strict-origin-when-cross-origin" hidden></iframe>
<script>document.getElementById('show').addEventListener('click',function(){var f=document.getElementById('source');f.src=document.getElementById('site').href;f.hidden=false;document.getElementById('status').textContent='Framing attempted. The provider may block it. Always use Open actual website if blank.';});</script>
<a id="site" href="''' + escape(url) + '''" target="_blank" rel="noopener noreferrer" hidden>Original URL</a>
</main></body></html>
'''
    (ROOT / "index.html").write_text(generated, encoding="utf-8")
    lines = [
      "# C13B0 · " + title,
      "",
      "Origin: " + url,
      "Verified provider mapping: " + (provider["name"] if provider else "none (user-input website)"),
      "",
      "## Schematic wiring slots",
      "1. Source URL (link, no copied HTML): " + url,
      "2. Official sign-in handoff: " + (provider["signin"] if provider else "unverified; do not invent"),
      "3. Search/media actions: supply observed official URLs with permission.",
      "4. Native display: try provider frame only where permitted, always keep real-site fallback.",
      "5. Provider logged-in DOM, cookies, data: NOT accessible through QuantaPhi origin.",
      "6. Cloud browser: must have a separately authorized identity and a typed result receipt.",
      "7. QuantaPhi controls: Follow, Star, Collect, Share, +1 Build with real ledger checks.",
      "8. Integra: validate domain, input/output, consent, content rights and deployment evidence.",
      "",
      "## Files",
      "- card-input.json: editable blanks; modify and rerun python generate.py",
      "- wiring.json: generated machine-readable wiring inventory",
      "- index.html: working original-site handoff and optional permitted viewer",
      "",
      "This card never captures passwords, proxies a provider login, strips frame policy,",
      "scrapes the logged-in DOM, or asserts unauthorized platform integration.",
      ""
    ]
    (ROOT / "WIRING.md").write_text("\n".join(lines), encoding="utf-8")
    print("C13B0 QUICK CARD BUILT")
    print("Website:", url)
    print("Card:", ROOT / "index.html")
    print("Editable blanks:", INPUT)
    print("Wiring inventory:", ROOT / "wiring.json")
    print("Study notes:", ROOT / "WIRING.md")

def main():
    parser = argparse.ArgumentParser(description="No paid services, no prompts. Use --website and --title to select source.")
    parser.add_argument("--website", help="Original HTTPS website to use (never fetches or clones it)")
    parser.add_argument("--title", help="Short human-facing card title")
    args = parser.parse_args()
    ROOT.mkdir(parents=True, exist_ok=True)
    if INPUT.exists():
        config = json.loads(INPUT.read_text(encoding="utf-8"))
    else:
        config = dict(DEFAULT)
    if args.website:
        config["website"] = args.website
    if args.title:
        config["title"] = args.title
    if not isinstance(config.get("actions"), list):
        config["actions"] = []
    url = valid_https(config.get("website"))
    if not url:
        raise SystemExit("Source must be a valid credential-free HTTPS URL. No files overwritten.")
    INPUT.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    generate(config)

if __name__ == "__main__":
    main()
PY_CARD_BUILDER
chmod +x "$OUT/generate.py"
python "$OUT/generate.py" "$@"
