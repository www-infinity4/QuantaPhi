"""Offline four-shard Colorado Overture source approval regressions."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

p = Path(__file__).parents[1] / "scripts/attractions-batch-validate.py"
spec = importlib.util.spec_from_file_location("attractions_batch", p)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class BatchValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.paths = []
        for shard in ("nw", "ne", "sw", "se"):
            path = Path(self.temp.name) / f"co-overture-{shard}.json"
            rows = [{
                "id": f"overture:{shard}-{i}",
                "state": "CO",
                "source_name": "Overture Maps",
                "source_url": "https://overturemaps.org/",
                "license": "CDLA-Permissive-2.0",
                "image_url": "",
                "confidence": 0.91,
            } for i in range(6)]
            path.write_text(json.dumps({
                "dataset_version": "2026-10-21.0",
                "state": "CO",
                "source_name": "Overture Maps",
                "license": "CDLA-Permissive-2.0",
                "truncated": False,
                "eligible_count": len(rows),
                "items": rows,
                "closed_ids": [],
            }))
            self.paths.append(path)

    def edit(self, index, transform):
        data = json.loads(self.paths[index].read_text())
        transform(data)
        self.paths[index].write_text(json.dumps(data))

    def test_four_valid_shards(self):
        self.assertEqual(validator.validate(self.paths)["listed"], 24)

    def test_duplicate_id_across_regions_fails(self):
        first = json.loads(self.paths[0].read_text())["items"][0]["id"]
        self.edit(1, lambda d: d["items"][0].update(id=first))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            validator.validate(self.paths)

    def test_mixed_release_fails(self):
        self.edit(2, lambda d: d.update(dataset_version="2026-11-18.0"))
        with self.assertRaisesRegex(ValueError, "mixed Overture"):
            validator.validate(self.paths)

    def test_truncated_or_invalid_confidence_fails(self):
        self.edit(3, lambda d: d.update(truncated=True))
        with self.assertRaisesRegex(ValueError, "truncated"):
            validator.validate(self.paths)
        self.edit(3, lambda d: d.update(truncated=False))
        self.edit(0, lambda d: d["items"][0].update(confidence=float("nan")))
        with self.assertRaisesRegex(ValueError, "invalid"):
            validator.validate(self.paths)

    def test_closure_conflicts_with_listed_fails(self):
        first = json.loads(self.paths[0].read_text())["items"][0]["id"]
        self.edit(1, lambda d: d["closed_ids"].append(first))
        with self.assertRaisesRegex(ValueError, "listed and permanently closed"):
            validator.validate(self.paths)

    def test_missing_region_fails(self):
        with self.assertRaisesRegex(ValueError, "four distinct"):
            validator.validate(self.paths[:3])


if __name__ == "__main__":
    unittest.main()
