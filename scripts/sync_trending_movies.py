#!/usr/bin/env python3
"""Generate attributed movie-trailer Quick Cards from real Google Trends and YouTube RSS.

YouTube uploads supply exact video IDs, publishers and titles. Google Trending Now
RSS supplies optional independent trend matches; unmatched uploads are explicitly
labelled newly published trailers, NEVER called Google-trending.
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET

SOURCE = "https://trends.google.com/trending/rss?geo=US"
SOURCE_NAME = "Google Trends RSS + publisher trailer RSS"
YT_FEEDS = {
    "Rotten Tomatoes Trailers": "UCi8e0iOVk1fEOogdfu4YgfA",
    "Warner Bros. Pictures": "UCjmJDM5pRKbUlVIzDYYWb6g",
}
YT_NS = "{http://www.youtube.com/xml/schemas/2015}"
ATOM_NS = "{http://www.w3.org/2005/Atom}"
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
MAX_BYTES = 1_200_000

def normal(value):
    return " ".join(re.findall(r"[a-z0-9]+", str(value).lower()))

def movie_title(video_title):
    text = re.sub(r"\s+", " ", video_title or "").strip()
    if not re.search(r"\b(trailer|teaser)\b", text, re.I):
        return ""
    if re.search(r"\b(reaction|review|explained|breakdown|this week|compilation|ranking)\b", text, re.I):
        return ""
    special = re.search(r"^new\s+trailer\s+for\s+['“\"]([^'”\"]+)['”\"]", text, re.I)
    if special:
        text = special.group(1)
    else:
        text = re.split(r"\s+\|\s+", text)[0]
        text = re.split(r"\s+[-–—]\s+(?=(?:official|final|main|exclusive|teaser|trailer))", text, maxsplit=1, flags=re.I)[0]
        text = re.split(r"\s+(?:(?:official|final|main|exclusive|new)\s+)*(?:teaser|trailer)\b", text, maxsplit=1, flags=re.I)[0]
    text = re.sub(r"\s*\(\d{4}\)\s*$", "", text).strip(" -–—|'\"")
    if not 4 <= len(text) <= 100 or len(normal(text)) < 4:
        return ""
    return text

def parse_youtube_xml(body, publisher, checked_at):
    if len(body) > MAX_BYTES or publisher not in YT_FEEDS:
        raise ValueError("Unexpected YouTube feed source or size")
    root = ET.fromstring(body)
    if root.tag != ATOM_NS + "feed":
        raise ValueError("Not a YouTube Atom feed")
    cards = []
    for entry in root.findall(ATOM_NS + "entry")[:60]:
        video_id = (entry.findtext(YT_NS + "videoId") or "").strip()
        title = (entry.findtext(ATOM_NS + "title") or "").strip()
        published = (entry.findtext(ATOM_NS + "published") or "").strip()
        movie = movie_title(title)
        try:
            date = datetime.fromisoformat(published.replace("Z", "+00:00")).astimezone(timezone.utc)
        except (ValueError, TypeError):
            continue
        if not VIDEO_ID.fullmatch(video_id) or not movie or date > checked_at + timedelta(minutes=5) or checked_at-date > timedelta(days=90):
            continue
        cards.append({
            "id": video_id, "title": movie, "video_id": video_id,
            "video_title": title[:180], "kind": "trailer", "publisher": publisher,
            "published_at": date.isoformat().replace("+00:00", "Z"),
            "source_url": "https://www.youtube.com/watch?v=" + video_id,
            "poster": "https://i.ytimg.com/vi/" + video_id + "/hqdefault.jpg",
            "google_trending": False,
        })
    return cards

def matching_trend(movie_title_value, trends):
    film = normal(movie_title_value)
    tokens = film.split()
    if len(tokens) < 2 and len(film) < 7:
        return None
    for trend in trends:
        query = normal(trend.get("query", ""))
        # Exact title or whole-word extension like "dune part three movie".
        whole = (" " + query + " ")
        matched = query == film or (len(tokens) >= 2 and (" "+film+" ") in whole)
        if not matched and len(tokens) == 1:
            matched = film in query.split() and bool(re.search(r"\b(movie|film|trailer|cinema)\b", query))
        if not matched:
            continue
        published = trend.get("published_at", "")
        if not published or not re.fullmatch(r"\d[\d,]*(?:\.\d+)?[KMB]?\+", trend.get("approx_searches", ""), re.I):
            continue
        return trend
    return None

def compile_movies(trends_snapshot, videos, checked_at, previous=None):
    if trends_snapshot.get("schema_version") != 1 or trends_snapshot.get("source_url") != SOURCE or trends_snapshot.get("region") != "US":
        raise ValueError("Google Trends source not verified")
    trend_checked = datetime.fromisoformat(trends_snapshot["checked_at"].replace("Z", "+00:00"))
    if trend_checked > checked_at + timedelta(minutes=5) or checked_at-trend_checked > timedelta(hours=48):
        raise ValueError("Stale Google Trends snapshot")
    if not isinstance(trends_snapshot.get("topics"), list):
        raise ValueError("Google trend topics missing")
    existing = []
    if isinstance(previous, dict) and previous.get("source") == SOURCE_NAME:
        for movie in previous.get("items", [])[:100]:
            try:
                published = datetime.fromisoformat(movie["published_at"].replace("Z", "+00:00"))
                if published <= checked_at + timedelta(minutes=5) and checked_at-published < timedelta(days=30):
                    existing.append(movie)
            except (ValueError, KeyError, TypeError):
                continue
    unique = {}
    # Only source-backed videos; a topic alone cannot invent a trailer player.
    for movie in existing + videos:
        if not VIDEO_ID.fullmatch(movie.get("video_id", "")) or movie.get("publisher") not in YT_FEEDS:
            continue
        row = dict(movie)
        trend = matching_trend(row["title"], trends_snapshot["topics"])
        if trend:
            row.update({
                "google_trending": True,
                "trend_query": trend["query"][:160],
                "trend_checked_at": trends_snapshot["checked_at"],
                "trend_published_at": trend["published_at"],
                "approx_searches": trend["approx_searches"],
            })
        elif row.get("google_trending"):
            # Retain the actual observed trend temporarily, but never forever.
            stamp = row.get("trend_checked_at")
            try:
                last = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
                if checked_at-last > timedelta(days=14):
                    row["google_trending"] = False
            except (TypeError, ValueError, AttributeError):
                row["google_trending"] = False
        if not row.get("google_trending"):
            for key in ("trend_query", "trend_checked_at", "trend_published_at", "approx_searches"):
                row.pop(key, None)
        unique[row["video_id"]] = row
    rows = sorted(unique.values(), key=lambda x:(not x["google_trending"], x.get("published_at", "")), reverse=False)
    trending = sorted((x for x in rows if x["google_trending"]),
                      key=lambda x:x.get("trend_published_at", ""), reverse=True)
    newest = sorted((x for x in rows if not x["google_trending"]),
                    key=lambda x:x.get("published_at", ""), reverse=True)
    return {
        "schema_version": 1, "source": SOURCE_NAME, "source_url": SOURCE,
        "checked_at": checked_at.isoformat().replace("+00:00", "Z"),
        "source_note": "Google trending titles are independently matched to source-backed trailer uploads. Other cards are labelled NEW TRAILER, not Google-trending. These are previews, not full movies.",
        "items": (trending + newest)[:60],
    }

def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "QuantaPhiMovieCards/1.0",
                                                "Accept": "application/atom+xml, application/json"})
    with urllib.request.urlopen(req, timeout=25) as response:
        if response.geturl().split("/")[2] not in ("www.youtube.com", "raw.githubusercontent.com"):
            raise ValueError("Unexpected feed redirect")
        return response.read(MAX_BYTES + 1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trends", required=True)
    parser.add_argument("--previous")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    checked_at = datetime.now(timezone.utc)
    trends = json.loads(Path(args.trends).read_text(encoding="utf-8"))
    previous = None
    if args.previous and Path(args.previous).exists():
        try:
            previous = json.loads(Path(args.previous).read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    uploads, succeeded = [], 0
    for publisher, channel_id in YT_FEEDS.items():
        try:
            url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + channel_id
            uploads.extend(parse_youtube_xml(download(url), publisher, checked_at))
            succeeded += 1
        except (ValueError, OSError, ET.ParseError) as error:
            print("Video feed unavailable for", publisher, ":", str(error)[:120])
    if not succeeded:
        raise RuntimeError("No verified publisher feeds; preserve existing movie snapshot")
    result = compile_movies(trends, uploads, checked_at, previous)
    if not result["items"]:
        raise RuntimeError("No source-backed trailers; preserve prior movie snapshot")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.with_suffix(".tmp")
    tmp.write_text(json.dumps(result, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    tmp.replace(output)
    print("Verified", len(result["items"]), "movie trailers; Google-trending matches",
          sum(1 for x in result["items"] if x["google_trending"]), "at", result["checked_at"])

if __name__ == "__main__":
    main()
