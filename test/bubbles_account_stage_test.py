"""Bounded, offline checks for the owner-operated paid-account staging path."""

import importlib.util
import io
import json
import pathlib
import sqlite3
import subprocess
import unittest
import urllib.error
from unittest import mock


SOURCE = pathlib.Path(__file__).resolve().parents[1] / "scripts/bubbles-account-stage.py"
SPEC = importlib.util.spec_from_file_location("account_stage", SOURCE)
stage = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(stage)

DB_ID = "11111111-2222-4333-8444-555555555555"
SECRET = "cfut_synthetic_private_token_never_log"


class FakeCloudflare:
    """Execute the actual proposed DDL/readback against real SQLite."""

    def __init__(self, exists=False):
        self.exists = exists
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.calls = []

    def call(self, method, path, body=None):
        self.calls.append((method, path, body))
        root = f"/accounts/{stage.ACCOUNT_ID}/d1/database"
        if method == "GET" and path.startswith(root + "?"):
            return {"result": ([{"uuid": DB_ID, "name": stage.DATABASE_NAME}]
                               if self.exists else []),
                    "result_info": {"page": 1, "total_pages": 1}}
        if method == "POST" and path == root:
            assert not self.exists
            assert body == {"name": stage.DATABASE_NAME}
            self.exists = True
            return {"result": {"uuid": DB_ID, "name": stage.DATABASE_NAME}}
        if method == "POST" and path == root + f"/{DB_ID}/query":
            cursor = self.db.execute(body["sql"])
            rows = [dict(r) for r in cursor.fetchall()]
            return {"result": [{"success": True, "results": rows}]}
        raise AssertionError("unexpected API call")


class StageTests(unittest.TestCase):
    def test_default_check_never_creates_or_calls_model(self):
        api = FakeCloudflare()
        receipt = stage.run(api)
        self.assertEqual(len(api.calls), 1)
        self.assertEqual(api.calls[0][0], "GET")
        self.assertEqual(receipt["status"], "access_verified")
        self.assertFalse(receipt["database_found"])
        self.assertFalse(receipt["production_verified"])

    def test_stage_original_schemas_once_with_no_records_or_cutover(self):
        api = FakeCloudflare()
        receipt = stage.run(api, create=True)
        self.assertTrue(receipt["schema_verified"])
        self.assertEqual(receipt["database_creation"], "created")
        self.assertTrue(receipt["database_found"])
        self.assertFalse(receipt["original_data_imported"])
        self.assertFalse(receipt["writer_activated_by_this_run"])
        self.assertEqual(receipt["ai_calls_this_run"], 0)
        self.assertEqual(receipt["database_id"], DB_ID)
        rows = api.db.execute("PRAGMA table_info(work_tickets)").fetchall()
        self.assertIn("handoff_hash", [r["name"] for r in rows])
        self.assertIn("result_url", [r["name"] for r in rows])
        self.assertEqual(api.db.execute("SELECT count(*) FROM work_tickets").fetchone()[0], 0)
        api.calls.clear()
        again = stage.run(api, create=True)
        self.assertEqual(again["database_creation"], "existing")
        self.assertFalse(any(c[2] and c[2].get("sql", "").startswith("CREATE")
                             for c in api.calls))
        self.assertFalse(any(c[1].endswith("/database") for c in api.calls))

    def test_refuses_unknown_objects_before_ddl(self):
        for sql in ("CREATE TABLE owner_data(value TEXT)",
                    "CREATE TABLE work_tickets(id TEXT PRIMARY KEY)",
                    "CREATE VIEW work_tickets AS SELECT 1 AS id"):
            with self.subTest(sql=sql):
                api = FakeCloudflare(exists=True)
                api.db.execute(sql)
                with self.assertRaises(stage.Blocked):
                    stage.run(api, create=True)
                self.assertFalse(any(c[2] and c[2].get("sql", "").startswith("CREATE")
                                     for c in api.calls))

    def test_wrong_default_and_extra_trigger_are_rejected(self):
        for change in ("default", "trigger"):
            with self.subTest(change=change):
                api = FakeCloudflare(exists=True)
                table_sql = stage.SCHEMA[0]["sql"]
                if change == "default":
                    table_sql = table_sql.replace("'Omni Phi'", "'omni phi'")
                api.db.execute(table_sql)
                if change == "trigger":
                    api.db.execute("CREATE TRIGGER extra AFTER INSERT ON work_tickets "
                                   "BEGIN SELECT 1; END")
                with self.assertRaises(stage.Blocked):
                    stage.run(api, create=True)

    def test_partial_empty_stage_resumes_but_nonempty_stage_is_preserved(self):
        api = FakeCloudflare(exists=True)
        api.db.execute(stage.SCHEMA[0]["sql"])
        self.assertTrue(stage.run(api, create=True)["schema_verified"])
        api.db.execute("INSERT INTO bubbles_chatgpt_bridge VALUES "
                       "('private-id','assist','private-payload','queued',NULL,1,1,2)")
        api.calls.clear()
        with self.assertRaises(stage.Blocked) as raised:
            stage.run(api, create=True)
        self.assertEqual(raised.exception.code, "target_has_records")
        self.assertNotIn("private-payload", str(raised.exception))
        self.assertEqual(api.db.execute("SELECT payload FROM bubbles_chatgpt_bridge").fetchone()[0],
                         "private-payload")
        self.assertFalse(any(c[2] and c[2].get("sql", "").startswith("CREATE")
                             for c in api.calls))

    def test_multiple_or_truncated_results_cannot_create_another_db(self):
        for result in (
            {"result": [{"uuid": DB_ID, "name": stage.DATABASE_NAME}] * 2},
            {"result": [], "result_info": {"total_pages": 2}},
            {"result": [{"uuid": "../other-account", "name": stage.DATABASE_NAME}]},
        ):
            with self.subTest(result=result):
                api = mock.Mock()
                api.call.return_value = result
                with self.assertRaises(stage.Blocked):
                    stage.run(api, create=True)
                self.assertEqual(api.call.call_count, 1)

    def test_network_create_failure_is_not_retried_or_marked_unattempted(self):
        api = FakeCloudflare()
        original = api.call

        def fail(method, path, body=None):
            if method == "POST" and path.endswith("/database"):
                raise stage.Blocked("api_network_failure")
            return original(method, path, body)

        receipt = stage.new_receipt(True)
        with self.assertRaises(stage.Blocked):
            stage.run(mock.Mock(call=fail), create=True, receipt=receipt)
        self.assertEqual(receipt["database_creation"], "attempted_unconfirmed")
        self.assertFalse(receipt["schema_verified"])


class TransportTests(unittest.TestCase):
    def response(self, content):
        response = mock.MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.read.return_value = content
        return response

    def test_fixed_https_account_bounded_request_and_no_redirect(self):
        opener = mock.Mock()
        opener.open.return_value = self.response(b'{"success":true,"result":[]}')
        client = stage.Client(SECRET, opener=opener)
        root = f"/accounts/{stage.ACCOUNT_ID}/d1/database"
        client.call("GET", root + stage.LIST_QUERY)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.cloudflare.com/client/v4" + root + stage.LIST_QUERY)
        self.assertEqual(opener.open.call_args.kwargs["timeout"], 20)
        self.assertEqual(request.get_header("Authorization"), "Bearer " + SECRET)
        self.assertEqual(opener.open.return_value.read.call_args.args[0], stage.MAX_RESPONSE + 1)
        for method, path in (("GET", "https://evil.example/"),
                             ("GET", "/accounts/old/d1/database"),
                             ("DELETE", root), ("POST", "/ai/run/model")):
            with self.assertRaises(stage.Blocked):
                client.call(method, path)
        self.assertEqual(opener.open.call_count, 1)
        handler = stage.NoRedirect()
        with self.assertRaises(stage.Blocked) as raised:
            handler.redirect_request(None, None, 302, "moved", {}, "https://evil.example/")
        self.assertEqual(raised.exception.code, "api_redirect_refused")

    def test_error_metadata_is_sanitized_no_retries(self):
        for failure in (
            urllib.error.HTTPError("https://bad/" + SECRET, 403, SECRET, {}, io.BytesIO(SECRET.encode())),
            urllib.error.URLError(SECRET),
            TimeoutError(SECRET),
        ):
            with self.subTest(failure=type(failure).__name__):
                opener = mock.Mock()
                opener.open.side_effect = failure
                with self.assertRaises(stage.Blocked) as raised:
                    stage.Client(SECRET, opener=opener).call(
                        "GET", f"/accounts/{stage.ACCOUNT_ID}/d1/database" + stage.LIST_QUERY)
                self.assertNotIn(SECRET, str(raised.exception))
                self.assertEqual(opener.open.call_count, 1)

    def test_oversize_or_failed_envelope_stops(self):
        for body in (b"x" * (stage.MAX_RESPONSE + 1),
                     b'{"success":false,"errors":[{"code":9109,"message":"private"}]}',
                     b'{"result":[]}', b"not-json"):
            opener = mock.Mock()
            opener.open.return_value = self.response(body)
            with self.assertRaises(stage.Blocked) as raised:
                stage.Client(SECRET, opener=opener).call(
                    "GET", f"/accounts/{stage.ACCOUNT_ID}/d1/database" + stage.LIST_QUERY)
            self.assertNotIn("private", str(raised.exception))
            self.assertEqual(opener.open.call_count, 1)

    def test_no_echo_fallback_or_noninteractive_missing_token(self):
        with mock.patch.dict(stage.os.environ, {}, clear=True), \
             mock.patch.object(stage.shutil, "which", return_value=None), \
             mock.patch.object(stage.sys, "stdin", mock.Mock(isatty=lambda: False)), \
             mock.patch.object(stage.getpass, "getpass") as prompt:
            with self.assertRaises(stage.Blocked):
                stage.read_token()
            prompt.assert_not_called()
        with mock.patch.dict(stage.os.environ, {}, clear=True), \
             mock.patch.object(stage.shutil, "which", return_value=None), \
             mock.patch.object(stage.sys, "stdin", mock.Mock(isatty=lambda: True)), \
             mock.patch.object(stage.getpass, "getpass", side_effect=stage.getpass.GetPassWarning):
            with self.assertRaises(stage.Blocked):
                stage.read_token()

    def test_existing_environment_credentials_are_used_before_prompt(self):
        for variable in (stage.SECRET_NAME, "CLOUDFLARE_API_TOKEN", "CF_API_TOKEN"):
            with self.subTest(variable=variable), \
                 mock.patch.dict(stage.os.environ, {variable: SECRET}, clear=True), \
                 mock.patch.object(stage.getpass, "getpass") as prompt, \
                 mock.patch.object(stage.subprocess, "run") as child:
                receipt = {}
                self.assertEqual(stage.read_token(existing_only=True, receipt=receipt), SECRET)
                self.assertEqual(receipt["credential_source"], variable)
                self.assertEqual(receipt["credential_type"], "api_token")
                self.assertNotIn(SECRET, json.dumps(receipt))
                prompt.assert_not_called()
                child.assert_not_called()

    def test_existing_only_missing_auth_never_prompts(self):
        with mock.patch.dict(stage.os.environ, {}, clear=True), \
             mock.patch.object(stage.shutil, "which", return_value=None), \
             mock.patch.object(stage.getpass, "getpass") as prompt:
            with self.assertRaises(stage.Blocked) as raised:
                stage.read_token(existing_only=True)
        self.assertEqual(raised.exception.code, "existing_cloudflare_credentials_unavailable")
        prompt.assert_not_called()

    def test_normal_private_prompt_still_works_after_unconfigured_wrangler(self):
        with mock.patch.dict(stage.os.environ, {}, clear=True), \
             mock.patch.object(stage, "existing_wrangler_token", side_effect=stage.Blocked("existing_wrangler_auth_unavailable")), \
             mock.patch.object(stage.sys, "stdin", mock.Mock(isatty=lambda: True)), \
             mock.patch.object(stage.getpass, "getpass", return_value=SECRET) as prompt:
            self.assertEqual(stage.read_token(), SECRET)
            prompt.assert_called_once()

    def test_existing_wrangler_auth_is_private_and_has_no_install_or_login(self):
        for kind in ("api_token", "oauth"):
            with self.subTest(kind=kind), \
                 mock.patch.dict(stage.os.environ, {"WRANGLER_LOG": "debug"}, clear=True), \
                 mock.patch.object(stage.shutil, "which", return_value="/existing/wrangler"), \
                 mock.patch.object(stage.subprocess, "run", return_value=subprocess.CompletedProcess(
                     [], 0, json.dumps({"type": kind, "token": SECRET}), "")) as child, \
                 mock.patch.object(stage.getpass, "getpass") as prompt:
                receipt = {}
                self.assertEqual(stage.read_token(existing_only=True, receipt=receipt), SECRET)
                self.assertEqual(receipt["credential_type"], kind)
                self.assertNotIn(SECRET, json.dumps(receipt))
                self.assertEqual(child.call_args.args[0], ["/existing/wrangler", "auth", "token", "--json"])
                self.assertEqual(child.call_args.kwargs["stdin"], subprocess.DEVNULL)
                self.assertEqual(child.call_args.kwargs["timeout"], 20)
                self.assertEqual(child.call_args.kwargs["env"]["WRANGLER_LOG"], "error")
                self.assertEqual(child.call_args.kwargs["env"]["WRANGLER_SEND_METRICS"], "false")
                prompt.assert_not_called()

    def test_wrangler_failures_or_unsupported_global_key_never_leak_or_prompt(self):
        for result in (subprocess.CompletedProcess([], 1, SECRET, SECRET),
                       subprocess.CompletedProcess([], 0, SECRET, SECRET),
                       subprocess.CompletedProcess([], 0, json.dumps({"type": "api_key", "key": SECRET}), ""),
                       subprocess.TimeoutExpired("wrangler", 20, output=SECRET)):
            with self.subTest(result=type(result).__name__), \
                 mock.patch.dict(stage.os.environ, {}, clear=True), \
                 mock.patch.object(stage.shutil, "which", return_value="wrangler"), \
                 mock.patch.object(stage.subprocess, "run") as child, \
                 mock.patch.object(stage.getpass, "getpass") as prompt:
                if isinstance(result, Exception):
                    child.side_effect = result
                else:
                    child.return_value = result
                with self.assertRaises(stage.Blocked) as raised:
                    stage.read_token(existing_only=True)
                self.assertNotIn(SECRET, str(raised.exception))
                prompt.assert_not_called()


class GithubTests(unittest.TestCase):
    def test_secret_uses_stdin_only_and_existing_secrets_are_not_replaced(self):
        for exists in (False, True, "lowercase"):
            with self.subTest(exists=exists), \
                 mock.patch.object(stage.shutil, "which", return_value="/usr/bin/gh"), \
                 mock.patch.object(stage.subprocess, "run") as run:
                listing = {"total_count": int(bool(exists)), "secrets":
                           ([{"name": stage.SECRET_NAME.lower() if exists == "lowercase" else stage.SECRET_NAME}]
                            if exists else [])}
                run.side_effect = [subprocess.CompletedProcess([], 0, json.dumps(listing), ""),
                                   subprocess.CompletedProcess([], 0, "", ""),
                                   subprocess.CompletedProcess([], 0, json.dumps({"name": stage.SECRET_NAME}), "")]
                with mock.patch.dict(stage.os.environ, {stage.SECRET_NAME: SECRET, "GH_DEBUG": "api",
                                                       "GH_HOST": "evil.example"}):
                    result = stage.connect_github(SECRET)
                self.assertEqual(result, "existing_unmodified" if exists else "stored")
                self.assertEqual(run.call_count, 1 if exists else 3)
                for call in run.call_args_list:
                    self.assertNotIn(SECRET, repr(call.args))
                    self.assertNotIn(stage.SECRET_NAME, call.kwargs["env"])
                    self.assertNotIn("GH_DEBUG", call.kwargs["env"])
                    self.assertEqual(call.kwargs["env"]["GH_HOST"], "github.com")
                if not exists:
                    saved = run.call_args_list[1]
                    self.assertEqual(saved.kwargs["input"], SECRET)
                    self.assertEqual(saved.args[0][-2:], ["--repo", "www-infinity4/QuantaPhi"])

    def test_github_failure_does_not_print_subprocess_output(self):
        with mock.patch.object(stage.shutil, "which", return_value="gh"), \
             mock.patch.object(stage.subprocess, "run", return_value=
                               subprocess.CompletedProcess([], 1, SECRET, SECRET)):
            with self.assertRaises(stage.Blocked) as raised:
                stage.connect_github(SECRET)
            self.assertNotIn(SECRET, str(raised.exception))

    def test_workflow_has_no_schedule_no_pr_secrets_and_fixed_target(self):
        text = (SOURCE.parents[1] / ".github/workflows/bubbles-account-stage.yml").read_text()
        self.assertNotIn("schedule:", text)
        self.assertNotIn("pull_request_target", text)
        self.assertIn("github.ref == 'refs/heads/main'", text)
        self.assertIn("github.repository == 'www-infinity4/QuantaPhi'", text)
        self.assertIn("contents: read", text)
        self.assertIn("persist-credentials: false", text)
        self.assertNotIn("id-token: write", text)
        self.assertNotIn("CLOUDFLARE_API_TOKEN:", text.replace(stage.SECRET_NAME + ":", "DEDICATED:"))

    def test_uncertain_secret_write_receipt_preserves_verified_stage(self):
        with mock.patch.object(stage, "read_token", return_value=SECRET), \
             mock.patch.object(stage, "Client", return_value=FakeCloudflare()), \
             mock.patch.object(stage, "connect_github", side_effect=stage.Blocked("github_secret_connection_failed")), \
             mock.patch.object(stage.sys, "stdout", new_callable=io.StringIO) as output:
            self.assertEqual(stage.main(["--stage", "--connect-github"]), 1)
        receipt = json.loads(output.getvalue())
        self.assertEqual(receipt["github_secret"], "connection_attempted_unconfirmed")
        self.assertTrue(receipt["schema_verified"])
        self.assertEqual(receipt["status"], "blocked")
        self.assertNotIn(SECRET, output.getvalue())

    def test_main_missing_token_emits_only_sanitized_json(self):
        with mock.patch.dict(stage.os.environ, {}, clear=True), \
             mock.patch.object(stage.shutil, "which", return_value=None), \
             mock.patch.object(stage.sys, "stdin", mock.Mock(isatty=lambda: False)), \
             mock.patch.object(stage.sys, "stdout", new_callable=io.StringIO) as output:
            self.assertEqual(stage.main([]), 1)
        receipt = json.loads(output.getvalue())
        self.assertEqual(receipt["reason"], "token_required_in_private_terminal")
        self.assertEqual(receipt["database_creation"], "not_attempted")

    def test_temporary_oauth_is_not_exported_to_github(self):
        def original_session(*, existing_only, receipt):
            self.assertTrue(existing_only)
            receipt["credential_type"] = "oauth"
            receipt["credential_source"] = "existing_wrangler"
            return SECRET

        with mock.patch.object(stage, "read_token", side_effect=original_session), \
             mock.patch.object(stage, "Client", return_value=FakeCloudflare()), \
             mock.patch.object(stage, "connect_github") as connect, \
             mock.patch.object(stage.sys, "stdout", new_callable=io.StringIO) as output:
            self.assertEqual(stage.main(["--stage", "--existing-credentials", "--connect-github"]), 0)
        receipt = json.loads(output.getvalue())
        self.assertTrue(receipt["schema_verified"])
        self.assertEqual(receipt["github_secret"], "skipped_temporary_oauth")
        connect.assert_not_called()

    def test_malformed_secret_list_cannot_upsert(self):
        for secrets in ([{}], ["bad"], [{"name": "ok"}, {"name": "ok"}]):
            with self.subTest(secrets=secrets), \
                 mock.patch.object(stage.shutil, "which", return_value="gh"), \
                 mock.patch.object(stage.subprocess, "run", return_value=subprocess.CompletedProcess(
                     [], 0, json.dumps({"total_count": len(secrets), "secrets": secrets}), "")) as run:
                with self.assertRaises(stage.Blocked):
                    stage.connect_github(SECRET)
                self.assertEqual(run.call_count, 1)


if __name__ == "__main__":
    unittest.main()
