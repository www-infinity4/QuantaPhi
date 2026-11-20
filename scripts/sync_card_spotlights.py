#!/usr/bin/env python3
"""Bounded, public official-page metadata checks. Never fabricate a price.

Only catalog-pinned HTTPS hosts and same-host product links are fetched. Failed
checks preserve earlier observations; each item keeps its own observation time.
"""
import argparse
from datetime import datetime, timedelta, timezone
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.request
from urllib.parse import urljoin, urlsplit, urldefrag

MAX_BYTES = 2_000_000
PRODUCT_PATH = re.compile(r"/(?:products?|p|pd|item|shop)/", re.I)
GENERIC_IMAGE = re.compile(r"logo|icon|favicon|goldenarches|android-chrome|sprite|tracking|pixel|qr.?code|nutrition|\.svg(?:[?#]|$)", re.I)
UTILITY_ALT = re.compile(r"\bicon\b|qr.?code|^protein\b|^calories\b|^total fat\b|^sodium\b|download (?:the )?app|app store|google play", re.I)


def clean(value, limit=260):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]*>", "", unescape(str(value or "")))).strip()[:limit]


def public_url(value):
    try:
        u = urlsplit(value)
        host = u.hostname or ""
        if u.scheme != "https" or u.username or u.password or u.port or "." not in host:
            return None
        if host.endswith((".local", ".localhost")) or re.fullmatch(r"[\d.]+", host) or ":" in host:
            return None
        return urldefrag(value)[0] if len(value) <= 1800 else None
    except (ValueError, TypeError):
        return None


def source_url(value, official):
    url = public_url(value)
    host = (urlsplit(official).hostname or "").removeprefix("www.")
    target = urlsplit(url).hostname if url else ""
    return url if target == host or target.endswith("." + host) else None


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta, self.links, self.scripts, self.images = {}, [], [], []
        self.reading = False
        self.script = []
        self.anchor = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            self.meta[a.get("property", a.get("name", "")).lower()] = a.get("content", "")
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
            self.anchor = a["href"]
        if tag == "img":
            image = a.get("src") or a.get("data-src") or ""
            if image.startswith("data:"):
                image = a.get("data-src") or ""
            if not image and a.get("srcset"):
                image = a["srcset"].split(",")[-1].strip().split(" ")[0]
            if image and not GENERIC_IMAGE.search(image) and not UTILITY_ALT.search(a.get("alt", "")):
                self.images.append({"image": image, "title": clean(a.get("alt"), 180), "url": self.anchor})
        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self.reading, self.script = True, []

    def handle_data(self, data):
        if self.reading:
            self.script.append(data)

    def handle_endtag(self, tag):
        if tag == "a":
            self.anchor = ""
        if tag == "script" and self.reading:
            self.scripts.append("".join(self.script))
            self.reading = False


def walk(data, depth=0):
    if depth > 12:
        return
    if isinstance(data, dict):
        yield data
        for value in data.values():
            yield from walk(value, depth + 1)
    elif isinstance(data, list):
        for value in data[:150]:
            yield from walk(value, depth + 1)


def types(data):
    value = data.get("@type", [])
    return value if isinstance(value, list) else [value]


def offer_data(product, now):
    offers = product.get("offers", [])
    for offer in offers if isinstance(offers, list) else [offers]:
        if not isinstance(offer, dict):
            continue
        amount, currency = str(offer.get("price", "")), offer.get("priceCurrency", "")
        if not re.fullmatch(r"\d{1,9}(?:\.\d{1,2})?", amount) or float(amount) <= 0 or not re.fullmatch(r"[A-Z]{3}", currency):
            continue
        output = {"price": amount, "currency": currency, "evidence": "jsonld-offer",
                  "availability": clean(offer.get("availability"), 120)}
        for source, target in [("priceValidUntil", "valid_until"), ("validFrom", "valid_from")]:
            if offer.get(source):
                raw = str(offer[source])
                if len(raw) == 10 and source == "priceValidUntil":
                    raw += "T23:59:59Z"
                try:
                    stamp = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                    if stamp.tzinfo is None:
                        stamp = stamp.replace(tzinfo=timezone.utc)
                    output[target] = stamp.isoformat()
                except ValueError:
                    return None
        if output.get("valid_until") and datetime.fromisoformat(output["valid_until"]) < now:
            continue
        if output.get("valid_from") and datetime.fromisoformat(output["valid_from"]) > now:
            continue
        if re.search(r"OutOfStock|SoldOut|Discontinued", output["availability"], re.I):
            continue
        return output
    return None


def parse_page(body, url, source, now):
    page = Page()
    page.feed(body.decode("utf-8", errors="replace"))
    rows = []
    stamp = now.isoformat().replace("+00:00", "Z")
    for script in page.scripts[:40]:
        try:
            data = json.loads(script)
        except (ValueError, TypeError):
            continue
        for product in walk(data):
            if "Product" not in types(product):
                continue
            item_url = source_url(urljoin(url, product.get("url") or url), source["official"])
            image = product.get("image")
            if isinstance(image, list):
                image = image[0] if image else None
            if isinstance(image, dict):
                image = image.get("url") or image.get("contentUrl")
            image = public_url(urljoin(url, image)) if isinstance(image, str) else None
            title = clean(product.get("name"), 180)
            if not item_url or not image or not title:
                continue
            rows.append({"url": item_url, "image": image, "title": title, "kind": "product",
                         "description": clean(product.get("description")), "checked_at": stamp,
                         "category": source["category"], "offer": offer_data(product, now)})
    if not rows:
        image = public_url(urljoin(url, page.meta["og:image"])) if page.meta.get("og:image") else None
        title = clean(page.meta.get("og:title"), 180)
        if image and title and not GENERIC_IMAGE.search(image):
            rows.append({"url": url, "image": image, "title": title, "kind": "website",
                         "description": clean(page.meta.get("og:description")),
                         "checked_at": stamp, "category": source["category"]})
        # Many merchant pages advertise a generic logo in Open Graph. Prefer
        # actual visible catalog photos with their original alt text/link.
        seen_images = {row["image"] for row in rows}
        for picture in page.images[:100]:
            picture_url = public_url(urljoin(url, picture["image"]))
            destination = source_url(urljoin(url, picture["url"] or url), source["official"])
            caption = picture["title"]
            if not caption:
                lead = re.sub(r"[^a-z0-9]", "", "".join(clean(page.meta.get("og:title")).lower().split()[:2]))
                if len(lead) >= 6 and lead in re.sub(r"[^a-z0-9]", "", picture["image"].lower()):
                    caption = clean(page.meta.get("og:title"), 180)
            if re.search(r"\.(?:jpg|png|webp)$", caption, re.I):
                caption = clean(page.meta.get("og:title"), 180)
            if not picture_url or not destination or picture_url in seen_images or len(caption) < 6:
                continue
            seen_images.add(picture_url)
            rows.append({"url": destination, "image": picture_url, "title": caption, "kind": "website",
                         "description": "", "checked_at": stamp, "category": source["category"]})
            if len(rows) >= 4:
                break
    links = list(dict.fromkeys(filter(None, (source_url(urljoin(url, x), source["official"]) for x in page.links))))
    return rows[:8], [x for x in links if PRODUCT_PATH.search(urlsplit(x).path)][:3]


class OfficialRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, official):
        self.official = official

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not source_url(newurl, self.official):
            raise ValueError("Off-source redirect refused")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_page(url, official):
    if not source_url(url, official):
        raise ValueError("Off-source page refused")
    opener = urllib.request.build_opener(OfficialRedirect(official))
    req = urllib.request.Request(url, headers={"User-Agent": "QuantaPhiSourcePreview/1.0 (+https://quantaphi.org/)", "Accept": "text/html"})
    with opener.open(req, timeout=12) as response:
        if "text/html" not in response.headers.get("Content-Type", ""):
            raise ValueError("Not HTML")
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError("Source response too large")
        return body, response.geturl()


def sync(sources, previous, limit=24, fetcher=fetch_page, now=None):
    now = now or datetime.now(timezone.utc)
    stamp = now.isoformat().replace("+00:00", "Z")
    cards = dict(previous.get("cards", {}))
    # Oldest checks are next. A blocked site cannot starve all other brands.
    ordered = sorted(sources, key=lambda s: (cards.get(s["id"], {}).get("attempted_at", ""), not s.get("priority", False)))
    fetched = {}
    for source in ordered[:limit]:
        old = cards.get(source["id"], {})
        rows = []
        queue = list(dict.fromkeys([source["official"], *source.get("seeds", [])]))[:3]
        for _ in range(4):
            if not queue:
                break
            url = queue.pop(0)
            if not source_url(url, source["official"]):
                continue
            try:
                if url not in fetched:
                    fetched[url] = fetcher(url, source["official"])
                body, final = fetched[url]
                found, links = parse_page(body, final, source, now)
                rows.extend(found)
                queue.extend(x for x in links if x not in fetched and x not in queue)
            except Exception:
                continue
        fresh_urls = {x["url"] for x in rows}
        rows.extend(x for x in old.get("items", []) if x.get("url") not in fresh_urls and x.get("checked_at", "") > (now - timedelta(days=7)).isoformat())
        unique = {}
        for row in rows:
            unique.setdefault(row["url"] + "|" + row["image"], row)
        cards[source["id"]] = {"schema_version": 1, "attempted_at": stamp, "items": list(unique.values())[:8]}
    return {"schema_version": 1, "checked_at": stamp, "cards": cards}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", required=True)
    parser.add_argument("--previous")
    parser.add_argument("--output", default="data/quick-card-spotlights-latest.json")
    parser.add_argument("--limit", type=int, default=24)
    args = parser.parse_args()
    sources = json.loads(Path(args.sources).read_text())
    previous = json.loads(Path(args.previous).read_text()) if args.previous and Path(args.previous).exists() else {}
    data = sync(sources, previous, max(1, min(40, args.limit)))
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)
    print("Checked", min(args.limit, len(sources)), "source cards;", sum(bool(x.get("items")) for x in data["cards"].values()), "have attributed previews")


if __name__ == "__main__":
    main()
