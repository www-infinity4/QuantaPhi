import unittest
from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from sync_world_series import parse_feed, assemble, is_host

NOW = datetime(2026, 10, 24, 22, tzinfo=timezone.utc)
RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel><title>MLB Stories</title>
<item><title>World Series Game 1 takeaways: Brewers edge Rays</title>
<link>https://www.mlb.com/news/world-series-game-1-recap</link>
<description>Analysis on Saturday.</description>
<pubDate>Sat, 24 Oct 2026 18:20:00 GMT</pubDate>
<dc:creator>MLB analyst</dc:creator><media:thumbnail url="https://img.mlbstatic.com/mlb-images/story.jpg" type="image/jpeg"/>
</item>
<item><title>Unrelated football</title><link>https://www.mlb.com/news/football</link>
<description>Not a baseball story.</description><pubDate>Sat, 24 Oct 2026 18:00:00 GMT</pubDate>
</item></channel></rss>""".encode()

class ImportTests(unittest.TestCase):
    def test_selects_real_source_with_thumbnail_and_author(self):
        rows = parse_feed(RSS, "MLB.com", NOW)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "Analysis")
        self.assertIn("mlbstatic.com", rows[0]["image_url"])
        self.assertEqual(rows[0]["author"], "MLB analyst")
        self.assertEqual(rows[0]["publisher"], "MLB.com")

    def test_rejects_nonpublisher_links_and_untrusted_images(self):
        body = RSS.replace(b"https://www.mlb.com/news/world-series-game-1-recap", b"https://phishing.test/news/world-series-game-1-recap")
        self.assertEqual(parse_feed(body, "MLB.com", NOW), [])
        body = RSS.replace(b"img.mlbstatic.com", b"evil.example.com")
        self.assertEqual(parse_feed(body, "MLB.com", NOW)[0]["image_url"], "")

    def test_rejects_stale_and_future_dated_content(self):
        self.assertEqual(parse_feed(RSS, "MLB.com", NOW + timedelta(days=12)), [])
        self.assertEqual(parse_feed(RSS, "MLB.com", NOW - timedelta(days=2)), [])

    def test_fail_closed_prevents_overwriting_empty_feed(self):
        with self.assertRaisesRegex(ValueError, "no_fresh"):
            assemble([("MLB.com", "https://www.mlb.com/feeds/news/rss.xml", b"<rss><channel/></rss>")], NOW)
        with self.assertRaises(ValueError):
            parse_feed(b"x" * 2_500_001, "MLB.com", NOW)

    def test_deduplicate_keep_freshest_and_attribution(self):
        v = assemble([
            ("MLB.com", "https://www.mlb.com/feeds/news/rss.xml", RSS),
            ("MLB.com", "https://www.mlb.com/feeds/news/rss.xml", RSS),
        ], NOW)
        self.assertEqual(v["schema_version"], 1)
        self.assertEqual(len(v["articles"]), 1)
        self.assertEqual(v["articles"][0]["publisher"], "MLB.com")
        self.assertIn("links only", v["rights"])

    def test_image_domains_and_https_only(self):
        self.assertFalse(is_host("http://www.mlb.com/x", ("mlb.com",)))
        self.assertFalse(is_host("https://mlb.com.evil.org/x", ("mlb.com",)))
        self.assertTrue(is_host("https://img.mlbstatic.com/x", ("mlbstatic.com",)))
if __name__ == "__main__":
    unittest.main()
