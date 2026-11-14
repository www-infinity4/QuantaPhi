#!/usr/bin/env python3
"""Fetch attributed Google Trends RSS snapshots without fabricating live counts.

GitHub Actions publishes the latest checked feed and a dated research history.
A failed fetch or an invalid response preserves the last verified snapshot.
"""
import argparse
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import json
from html import unescape
from pathlib import Path
import re
import urllib.request
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

SOURCE = "https://trends.google.com/trending/rss?geo=US"
NAMESPACE = "{https://trends.google.com/trending/rss}"
MAX_BYTES = 2_000_000
TRAFFIC = re.compile(r"^\d[\d,]*(?:\.\d+)?[KMB]?\+$", re.I)


def parse_rss(body, checked_at=None):
    checked_at = checked_at or datetime.now(timezone.utc)
    if checked_at.tzinfo is None:
        raise ValueError("Checked time must include timezone")
    if len(body) > MAX_BYTES:
        raise ValueError("RSS response too large")
    root = ET.fromstring(body)
    channel = root.find("channel")
    if root.tag != "rss" or channel is None:
        raise ValueError("Expected RSS channel")
    rows, seen = [], set()
    for item in channel.findall("item"):
        query = (item.findtext("title") or "").strip()[:160]
        traffic = (item.findtext(NAMESPACE + "approx_traffic") or "").strip()
        published = item.findtext("pubDate")
        if not query or not TRAFFIC.fullmatch(traffic) or not published:
            continue
        try:
            published_at = parsedate_to_datetime(published)
        except (TypeError, ValueError, IndexError):
            continue
        if published_at.tzinfo is None:
            continue
        published_at = published_at.astimezone(timezone.utc)
        if published_at > checked_at + timedelta(minutes=5):
            continue
        key = " ".join(query.lower().split())
        if key in seen:
            continue
        seen.add(key)
        def safe_url(value):
            try:
                parsed = urlsplit(value)
                host = parsed.hostname or ""
                return value[:1800] if parsed.scheme == "https" and "." in host and not parsed.username and not parsed.password and not parsed.port and not host.endswith((".local", ".localhost")) and not re.fullmatch(r"[\d.]+", host) else None
            except ValueError:
                return None
        def caption(value, limit=220):
            return re.sub(r"\s+", " ", re.sub(r"<[^>]*>", "", unescape(value or ""))).strip()[:limit]
        related, stories = [], []
        for news in item.findall(NAMESPACE + "news_item")[:4]:
            href = (news.findtext(NAMESPACE + "news_item_url") or "").strip()
            if safe_url(href):
                related.append(href[:1000])
                title = caption(news.findtext(NAMESPACE + "news_item_title"), 180)
                if title:
                    stories.append({"url": href[:1000], "title": title,
                                    "publisher": caption(news.findtext(NAMESPACE + "news_item_source"), 90),
                                    "description": caption(news.findtext(NAMESPACE + "news_item_snippet")),
                                    "image_url": safe_url(news.findtext(NAMESPACE + "news_item_picture") or "")})
        rows.append({
            "query": query,
            "approx_searches": traffic,
            "published_at": published_at.isoformat().replace("+00:00", "Z"),
            "related_news_urls": related,
            "image_url": safe_url(item.findtext(NAMESPACE + "picture") or ""),
            "image_credit": caption(item.findtext(NAMESPACE + "picture_source"), 90),
            "news": stories,
        })
        if len(rows) >= 100:
            break
    if not rows:
        raise ValueError("No verifiable trends found: refusing to overwrite existing snapshot")
    return {
        "schema_version": 1,
        "source": "Google Trends Trending Now RSS",
        "source_url": SOURCE,
        "region": "US",
        "checked_at": checked_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "search_volume_meaning": "Google's approximate search buckets, not exact counts or site visits",
        "topics": rows,
    }


def fetch_rss():
    req = urllib.request.Request(SOURCE, headers={
        "User-Agent": "Mozilla/5.0 (compatible; QuantaPhiTrendSync/1.0; https://quantaphi.org/)",
        "Accept": "application/rss+xml, application/xml, text/xml",
    })
    with urllib.request.urlopen(req, timeout=25) as response:
        final = urlsplit(response.geturl())
        if final.scheme != "https" or final.hostname != "trends.google.com":
            raise ValueError("Unexpected source redirect")
        body = response.read(MAX_BYTES + 1)
    return body


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    staged = path.with_name(path.name + ".tmp")
    staged.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    staged.replace(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--latest", default="data/google-trends-latest.json")
    ap.add_argument("--history-dir", default="research/google-trends/observations")
    args = ap.parse_args()
    data = parse_rss(fetch_rss())
    # Only publish after the entire request and parsing/validation have succeeded.
    stamp = data["checked_at"][:10]
    write_json(Path(args.history_dir) / (stamp + "-us.json"), data)
    write_json(Path(args.latest), data)
    print("Verified", len(data["topics"]), "U.S. trends at", data["checked_at"])


if __name__ == "__main__":
    main()
