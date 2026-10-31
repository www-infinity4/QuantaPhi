from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("spotlights", Path(__file__).resolve().parents[1] / "scripts/sync_card_spotlights.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = datetime(2026, 10, 31, 1, tzinfo=timezone.utc)
SOURCE = {"id": "source", "name": "Source", "official": "https://www.levi.com/", "category": "Denim"}


def body(product):
    return ('<html><script type="application/ld+json">' + json.dumps(product) + '</script></html>').encode()


class SpotlightTests(unittest.TestCase):
    def test_structured_exact_price_and_photo(self):
        product = {"@type": "Product", "name": "Source jeans", "url": "/p/1", "image": "https://lsco.scene7.com/is/image/1",
                   "offers": {"@type": "Offer", "price": 89, "priceCurrency": "USD", "priceValidUntil": "2026-10-31"}}
        rows, _ = m.parse_page(body(product), SOURCE["official"], SOURCE, NOW)
        self.assertEqual(rows[0]["url"], "https://www.levi.com/p/1")
        self.assertEqual(rows[0]["offer"]["price"], "89")
        self.assertEqual(rows[0]["offer"]["evidence"], "jsonld-offer")
        self.assertTrue(rows[0]["offer"]["valid_until"].startswith("2026-10-31T23:59:59"))

    def test_no_guessed_prices_from_og_or_expired_aggregate_offers(self):
        rows, _ = m.parse_page(b'<meta property="og:image" content="https://images.test/source.jpg"><meta property="og:title" content="Sale $20">', SOURCE["official"], SOURCE, NOW)
        self.assertNotIn("offer", rows[0])
        for offer in [{"lowPrice": "5", "priceCurrency": "USD"}, {"price": "50", "priceCurrency": "USD", "priceValidUntil": "2026-10-20"},
                      {"price": "50", "priceCurrency": "USD", "availability": "https://schema.org/OutOfStock"}]:
            self.assertIsNone(m.offer_data({"offers": offer}, NOW))

    def test_same_host_discovery_rejects_lookalikes_and_local_targets(self):
        self.assertIsNone(m.source_url("https://levi.com.attacker.test/p/1", SOURCE["official"]))
        self.assertIsNone(m.public_url("https://127.0.0.1/img"))
        _, links = m.parse_page(b'<a href="/p/1">Item</a><a href="https://attacker.test/products/x">Bad</a><a href="/login">Login</a>', SOURCE["official"], SOURCE, NOW)
        self.assertEqual(links, ["https://www.levi.com/p/1"])

    def test_generic_merchant_logos_do_not_replace_a_product_photo(self):
        html = b'<meta property="og:image" content="https://images.test/logo.png"><meta property="og:title" content="Source"><a href="/p/1"><img src="https://images.test/product.jpg" alt="Actual denim jacket"></a>'
        rows, _ = m.parse_page(html, SOURCE["official"], SOURCE, NOW)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["image"], "https://images.test/product.jpg")
        self.assertEqual(rows[0]["url"], "https://www.levi.com/p/1")
        self.assertNotIn("offer", rows[0])

    def test_failed_checks_preserve_observation_dates_and_rotate_to_unchecked_sources(self):
        previous = {"cards": {"source": {"attempted_at": "2026-10-30T00:00:00Z", "items": [{"url": "https://www.levi.com/p/1", "image": "https://images.test/i", "title": "Earlier item", "checked_at": "2026-10-30T00:00:00Z"}]}}}
        def fail(url, official):
            raise RuntimeError("Source unavailable")
        next_source = {**SOURCE, "id": "new"}
        result = m.sync([SOURCE, next_source], previous, limit=1, fetcher=fail, now=NOW)
        self.assertIn("new", result["cards"])
        self.assertEqual(result["cards"]["source"]["items"][0]["checked_at"], "2026-10-30T00:00:00Z")
        result = m.sync([SOURCE], previous, fetcher=fail, now=NOW)
        self.assertEqual(result["cards"]["source"]["items"][0]["checked_at"], "2026-10-30T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
