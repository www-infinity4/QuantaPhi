#!/usr/bin/env python3
"""Import real, source-attributed World Series headlines from verified RSS.

Publishes metadata + short attributed teaser and publisher-feed imagery only.
On upstream failure, exits nonzero and preserves the previous checked snapshot.
"""
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from html import unescape
import argparse
import json
from pathlib import Path
import re
import urllib.request
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

FEEDS = (
    ("MLB.com", "https://www.mlb.com/feeds/news/rss.xml", ("mlb.com",)),
    ("ESPN", "https://www.espn.com/espn/rss/mlb/news", ("espn.com",)),
    ("CBS Sports", "https://www.cbssports.com/partners/feeds/rss/mlb_news", ("cbssports.com",)),
)
SOURCE_LINK_HOSTS = ("mlb.com", "espn.com", "cbssports.com")
IMAGE_HOSTS = ("mlb.com", "mlbstatic.com", "espn.com", "espncdn.com", "cbssports.com", "cbsistatic.com")
KEYWORD = re.compile(r"\b(world series|fall classic|brewers|rays|game [1-7]|postseason)\b", re.I)
STRIP_TAGS = re.compile(r"<[^>]*>")
MEDIA = "{http://search.yahoo.com/mrss/}"
DC = "{http://purl.org/dc/elements/1.1/}"
MAX_BYTES = 2_500_000

def is_host(url, hosts):
    try:
        p = urlsplit(url)
        return (p.scheme == "https" and bool(p.hostname) and not p.username and not p.password
                and any(p.hostname == h or p.hostname.endswith("." + h) for h in hosts))
    except (ValueError, TypeError):
        return False

def clean(text, limit):
    return " ".join(unescape(STRIP_TAGS.sub(" ", text or "")).split())[:limit]

def parse_feed(blob, label, checked_at):
    if len(blob) > MAX_BYTES:
        raise ValueError("oversized_rss")
    root = ET.fromstring(blob)
    channel = root.find("channel")
    if root.tag != "rss" or channel is None:
        raise ValueError("not_rss_channel")
    articles = []
    for item in channel.findall("item"):
        title = clean(item.findtext("title"), 170)
        url = (item.findtext("link") or "").strip()
        raw_date = item.findtext("pubDate")
        if not title or not is_host(url, SOURCE_LINK_HOSTS) or not raw_date:
            continue
        try:
            published = parsedate_to_datetime(raw_date)
            if not published.tzinfo:
                continue
            published = published.astimezone(timezone.utc)
        except (ValueError, TypeError, IndexError, OverflowError):
            continue
        if published > checked_at + timedelta(minutes=5) or published < checked_at - timedelta(days=10):
            continue
        summary = clean(item.findtext("description"), 180)
        # Rank actual World Series/Brewers-Rays coverage, not generic baseball links.
        if not KEYWORD.search(title + " " + summary):
            continue
        image = ""
        for candidate in (item.findall(MEDIA + "thumbnail") +
                          item.findall(MEDIA + "content") +
                          item.findall("enclosure")):
            candidate_url = (candidate.get("url") or "").strip()
            media_type = (candidate.get("type") or "").lower()
            if is_host(candidate_url, IMAGE_HOSTS) and not (media_type and not media_type.startswith("image/")):
                image = candidate_url[:950]
                break
        author = clean(item.findtext(DC + "creator") or item.findtext("author"), 90)
        category = "Analysis" if re.search(r"\b(analysis|takeaways|questions|keys|preview|breakdown|why|how|predictions|inside)\b", title, re.I) else "Reporting"
        articles.append({
            "title": title, "url": url[:950], "publisher": label,
            "published_at": published.isoformat().replace("+00:00", "Z"),
            "summary": summary, "author": author, "image_url": image,
            "kind": category, "image_credit": (label + " RSS") if image else "",
        })
    return articles

def fetch_url(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "QuantaPhi-RSS-Reader/1.0 (+https://quantaphi.org/)",
        "Accept": "application/rss+xml, application/xml, text/xml",
    })
    with urllib.request.urlopen(req, timeout=18) as response:
        actual = response.geturl()
        requested = urlsplit(url)
        if not is_host(actual, (requested.hostname,)):
            raise ValueError("rss_redirected_away_from_provider")
        return response.read(MAX_BYTES + 1)

def assemble(samples, checked_at):
    if checked_at.tzinfo is None:
        raise ValueError("naive_datetime")
    combined, checked_sources, seen = [], [], set()
    for label, url, body in samples:
        articles = parse_feed(body, label, checked_at)
        checked_sources.append({"publisher": label, "url": url, "articles_selected": len(articles)})
        for article in articles:
            key = urlsplit(article["url"]).path.rstrip("/").lower()
            if key in seen:
                continue
            seen.add(key)
            combined.append(article)
    combined.sort(key=lambda a: a["published_at"], reverse=True)
    if not combined:
        raise ValueError("no_fresh_attributed_world_series_stories")
    return {
        "schema_version": 1,
        "topic": "2026 World Series",
        "checked_at": checked_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source_kind": "Publisher RSS",
        "rights": "Attribution and links only; no permission to rehost full articles or protected media.",
        "sources": checked_sources,
        "articles": combined[:30],
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/world-series-latest.json")
    args = parser.parse_args()
    checked_at = datetime.now(timezone.utc)
    samples = []
    failures = []
    for label, url, _ in FEEDS:
        try:
            samples.append((label, url, fetch_url(url)))
        except Exception as exc:
            failures.append({"publisher": label, "error": type(exc).__name__})
    data = assemble(samples, checked_at)
    data["unavailable_sources"] = failures
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".json.tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)
    print("World Series RSS: %s verified stories from %s providers" % (len(data["articles"]), len(samples)))

if __name__ == "__main__":
    main()
