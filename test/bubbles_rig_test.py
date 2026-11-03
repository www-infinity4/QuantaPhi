import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import bubbles_rig

class Args:
    run = []
    pr = []
    evidence = None
    output = None

class RigTests(unittest.TestCase):
    def test_missing_evidence_never_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            args = Args()
            args.output = str(Path(directory) / "report.json")
            result = bubbles_rig.run(args)
            self.assertEqual(result["result"], "UNVERIFIED")
            self.assertTrue(all(v["status"] == "UNVERIFIED" for v in result["execution"].values()))

    def test_submitted_receipt_not_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "proof.json"
            path.write_text(json.dumps({"android_execution": {"observed": True, "receipt_url": "https://example.com/receipt"}}))
            args = Args()
            args.evidence = str(path)
            args.output = str(Path(directory) / "report.json")
            result = bubbles_rig.run(args)
            self.assertEqual(result["execution"]["android_execution"]["status"], "EVIDENCE_SUBMITTED")
            self.assertEqual(result["result"], "UNVERIFIED")

    def test_successful_ci_does_not_mean_live(self):
        with tempfile.TemporaryDirectory() as directory:
            args = Args()
            args.run = [123]
            args.output = str(Path(directory) / "report.json")
            with patch.object(bubbles_rig, "fetch", return_value=({"status": "completed", "conclusion": "success", "head_sha": "abc"}, None)):
                result = bubbles_rig.run(args)
            self.assertEqual(result["result"], "CI_PASSED_END_TO_END_UNVERIFIED")

if __name__ == "__main__":
    unittest.main()
