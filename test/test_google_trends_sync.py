"""Offline fixture tests: no fake live records are ever generated."""
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("trends", Path(__file__).resolve().parents[1] / "scripts/sync_google_trends.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
NOW = datetime(2026, 10, 23, 12, 0, tzinfo=timezone.utc)
NS = "https://trends.google.com/trending/rss"


def rss(items):
    return ('<rss version="2.0" xmlns:ht="' + NS + '"><channel><title>Trends</title>' +
            ''.join('<item><title>' + title + '</title><pubDate>' + date +
                    '</pubDate><ht:approx_traffic>' + traffic +
                    '</ht:approx_traffic><ht:news_item><ht:news_item_url>https://example.org/story</ht:news_item_url></ht:news_item></item>'
                    for title, date, traffic in items) + '</channel></rss>').encode()


class TrendFeedTests(unittest.TestCase):
    def test_attributed_rss_and_volume_labels(self):
        feed = module.parse_rss(rss([("Example trend", "Fri, 23 Oct 2026 11:00:00 GMT", "200K+")]), NOW)
        self.assertEqual(feed["topics"][0]["approx_searches"], "200K+")
        self.assertEqual(feed["topics"][0]["related_news_urls"], ["https://example.org/story"])
        self.assertEqual(feed["source_url"], module.SOURCE)
        self.assertEqual(feed["checked_at"], "2026-10-23T12:00:00Z")

    def test_source_picture_and_publisher_metadata_survive_import(self):
        data = rss([("Example", "Fri, 23 Oct 2026 11:00:00 GMT", "20K+")])
        data = data.replace(b"<ht:news_item>", b'<ht:picture>https://images.test/topic.jpg</ht:picture><ht:picture_source>Publisher</ht:picture_source><ht:news_item><ht:news_item_title>Source headline</ht:news_item_title><ht:news_item_source>Publisher</ht:news_item_source><ht:news_item_snippet>Source summary</ht:news_item_snippet>')
        topic = module.parse_rss(data, NOW)["topics"][0]
        self.assertEqual(topic["image_url"], "https://images.test/topic.jpg")
        self.assertEqual(topic["news"][0]["title"], "Source headline")
        self.assertEqual(topic["news"][0]["publisher"], "Publisher")

    def test_bad_future_and_duplicate_rows_are_not_published(self):
        data = rss([("One", "Fri, 23 Oct 2026 11:00:00 GMT", "20K+"),
                    (" ONE ", "Fri, 23 Oct 2026 11:00:00 GMT", "20K+"),
                    ("Tomorrow", "Sat, 24 Oct 2026 11:00:00 GMT", "20K+")])
        self.assertEqual([x["query"] for x in module.parse_rss(data, NOW)["topics"]], ["One"])

    def test_refuses_non_rss_and_empty_snapshots(self):
        with self.assertRaises(ValueError):
            module.parse_rss(b"<html><body>Blocked</body></html>", NOW)
        with self.assertRaises(ValueError):
            module.parse_rss(rss([("No volume", "Fri, 23 Oct 2026 11:00:00 GMT", "?")]), NOW)
        with self.assertRaises(ValueError):
            module.parse_rss(b"x" * (module.MAX_BYTES + 1), NOW)


if __name__ == "__main__":
    unittest.main()
