#!/usr/bin/env python3
"""Termux GIT receipt ledger: local pending claims only; never mints or pays.

Uses QuantaPhi's existing Node line-provenance collector on a user's own
committed GitHub repository. Local SQLite records exclude source-code text.
"""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys

REPO = re.compile(r'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')
HASH = re.compile(r'^[a-f0-9]{64}$')
COMMIT = re.compile(r'^(?:[a-f0-9]{40}|[a-f0-9]{64})$')
INTENTS = {'website', 'app', 'repair', 'test', 'integration', 'data', 'other'}
BUILDERS = {'human', 'bubbles', 'gpt', 'copilot', 'other-ai'}
REMOTE_CHECKS = {'github_commit_found', 'not_checked'}
DEFAULT_DB = Path.home() / '.quantaphi' / 'gitcoin' / 'receipts.sqlite3'
SCHEMA = '''
CREATE TABLE IF NOT EXISTS gitcoin_receipts (
  receipt_id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  path TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL,
  git_type TEXT NOT NULL,
  intent TEXT NOT NULL,
  builder_claim TEXT NOT NULL,
  github_login_claim TEXT,
  eligible INTEGER NOT NULL CHECK(eligible IN (0,1)),
  exclusion_reason TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending_review','excluded')),
  remote_check TEXT NOT NULL CHECK(remote_check IN ('github_commit_found','not_checked')),
  saved_utc TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gits_repo ON gitcoin_receipts(repo,commit_sha);
CREATE TABLE IF NOT EXISTS gitcoin_verified_collectors (
  receipt_id TEXT PRIMARY KEY REFERENCES gitcoin_receipts(receipt_id),
  github_login TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source='gh_authenticated_user'),
  verified_utc TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gitcoin_verified_collector ON gitcoin_verified_collectors(github_login);
'''


def fail(message):
    raise ValueError(message)


def valid_path(path):
    return (isinstance(path, str) and 0 < len(path) <= 500 and not path.startswith('/')
            and all(chunk not in ('', '.', '..') for chunk in path.split('/'))
            and not any(ord(c) < 32 for c in path))


def validate_manifest(m):
    if not isinstance(m, dict) or m.get('version') != 1 or m.get('currency') != 'GIT' or m.get('status') != 'provisional_not_minted':
        fail('manifest_not_provisional')
    repo, commit, intent, builder = (m.get('repo'), m.get('commit'), m.get('intent'), m.get('builder_claim'))
    if not isinstance(repo, str) or not REPO.fullmatch(repo) or any(x in ('.', '..') for x in repo.split('/')):
        fail('invalid_repo')
    if not isinstance(commit, str) or not COMMIT.fullmatch(commit):
        fail('invalid_commit')
    if intent not in INTENTS or builder not in BUILDERS:
        fail('invalid_intent_or_builder')
    login = m.get('github_login_claim')
    if login is not None and (not isinstance(login, str) or not re.fullmatch(r'[A-Za-z0-9-]{1,39}', login)):
        fail('invalid_login')
    lines = m.get('lines')
    if not isinstance(lines, list) or not 0 < len(lines) <= 10_000:
        fail('invalid_receipt_list')
    found = set()
    count_eligible = 0
    for row in lines:
        if not isinstance(row, dict) or 'content' in row or 'source' in row:
            fail('source_text_not_permitted')
        rid, path, n, digest = (row.get('id'), row.get('path'), row.get('line_number'), row.get('content_sha256'))
        if (not isinstance(rid, str) or not HASH.fullmatch(rid) or rid in found or not valid_path(path)
                or type(n) is not int or n < 1 or type(digest) is not str or not HASH.fullmatch(digest)):
            fail('invalid_line_receipt')
        expected = sha256(json.dumps(['git-line-v1', repo, commit, path, n, digest], separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
        if rid != expected:
            fail('receipt_provenance_hash_mismatch')
        if row.get('git_type') != 'git:' + intent or type(row.get('eligible')) is not bool:
            fail('invalid_line_classification')
        if row.get('eligible') is False and not isinstance(row.get('reason'), str):
            fail('missing_exclusion_reason')
        found.add(rid)
        count_eligible += int(row['eligible'])
    summary = m.get('summary')
    if not isinstance(summary, dict) or summary.get('added') != len(lines) or summary.get('eligible') != count_eligible or summary.get('excluded') != len(lines) - count_eligible:
        fail('manifest_summary_mismatch')
    return m


def open_db(db_path):
    db_path = Path(db_path).expanduser()
    db_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(db_path.parent, 0o700)
    if db_path.is_symlink():
        fail('db_symlink_not_allowed')
    con = sqlite3.connect(db_path)
    os.chmod(db_path, 0o600)
    con.executescript(SCHEMA)
    return con


def save_manifest(db_path, manifest, remote_check='not_checked', authenticated_collector=None):
    validate_manifest(manifest)
    if remote_check not in REMOTE_CHECKS:
        fail('invalid_remote_check')
    if authenticated_collector is not None and (
            not isinstance(authenticated_collector, str)
            or not re.fullmatch(r'[A-Za-z0-9-]{1,39}', authenticated_collector)):
        fail('invalid_authenticated_github_login')
    new = 0
    duplicates = 0
    now = datetime.now(timezone.utc).isoformat()
    with open_db(db_path) as con:
        for row in manifest['lines']:
            result = con.execute('''INSERT OR IGNORE INTO gitcoin_receipts
              (receipt_id,repo,commit_sha,path,line_number,content_sha256,git_type,intent,builder_claim,
               github_login_claim,eligible,exclusion_reason,status,remote_check,saved_utc)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
              (row['id'], manifest['repo'], manifest['commit'], row['path'], row['line_number'],
               row['content_sha256'], row['git_type'], manifest['intent'], manifest['builder_claim'],
               manifest.get('github_login_claim'), int(row['eligible']), row.get('reason'),
               'pending_review' if row['eligible'] else 'excluded', remote_check, now))
            new += int(result.rowcount == 1)
            duplicates += int(result.rowcount == 0)
            if authenticated_collector is not None:
                # This is the signed-in GH collector, not proof of code authorship.
                previous = con.execute(
                    'SELECT github_login FROM gitcoin_verified_collectors WHERE receipt_id=?',
                    (row['id'],)).fetchone()
                if previous and previous[0].casefold() != authenticated_collector.casefold():
                    fail('collector_identity_conflict')
                con.execute('''INSERT OR IGNORE INTO gitcoin_verified_collectors
                  (receipt_id,github_login,source,verified_utc) VALUES(?,?,'gh_authenticated_user',?)''',
                  (row['id'], authenticated_collector, now))
    return new, duplicates


def list_receipts(db_path, limit=50):
    """Private local audit list. References are NOT minted global coin serials."""
    if not isinstance(limit, int) or not 1 <= limit <= 200:
        fail('invalid_receipt_limit')
    if not Path(db_path).expanduser().exists():
        return []
    with open_db(db_path) as con:
        rows = con.execute('''SELECT r.receipt_id,r.repo,r.commit_sha,r.path,r.line_number,
          r.status,r.remote_check,c.github_login
          FROM gitcoin_receipts r LEFT JOIN gitcoin_verified_collectors c
          ON c.receipt_id=r.receipt_id ORDER BY r.rowid DESC LIMIT ?''', (limit,)).fetchall()
    return [{'receipt_reference': 'GIT-P-' + rid, 'coin_status': 'provisional_not_minted',
             'repo': repo, 'commit': commit, 'path': path, 'line_number': n, 'review_status': status,
             'remote_check': remote, 'verified_collector': login}
            for rid,repo,commit,path,n,status,remote,login in rows]


def balance(db_path):
    base = {'currency': 'GIT', 'status': 'local_provisional_only', 'total_records': 0,
            'pending_candidates': 0, 'excluded_lines': 0, 'settled_gits': 0,
            'verified_wallet_balance': None, 'cash_value': None}
    if not Path(db_path).expanduser().exists():
        return base
    with open_db(db_path) as con:
        rows = con.execute('SELECT status,COUNT(*) FROM gitcoin_receipts GROUP BY status').fetchall()
    totals = dict(rows)
    return {**base, 'total_records': sum(totals.values()),
            'pending_candidates': totals.get('pending_review', 0), 'excluded_lines': totals.get('excluded', 0)}


def remote_matches(url, repo):
    if not isinstance(url, str) or not REPO.fullmatch(repo):
        return False
    normalized = url.removesuffix('.git')
    return normalized in ('https://github.com/' + repo, 'git@github.com:' + repo, 'ssh://git@github.com/' + repo)


def invoke(argv, cwd=None):
    return subprocess.run(argv, cwd=cwd, check=True, text=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, timeout=45).stdout.strip()


def scan(args):
    worktree = Path(args.worktree).expanduser().resolve()
    if invoke(['git', 'rev-parse', '--is-inside-work-tree'], cwd=worktree) != 'true':
        fail('not_a_git_worktree')
    if not remote_matches(invoke(['git', 'remote', 'get-url', 'origin'], cwd=worktree), args.repo):
        fail('origin_repository_mismatch')
    commit = invoke(['git', 'rev-parse', '--verify', (args.commit or 'HEAD') + '^{commit}'], cwd=worktree).lower()
    if not COMMIT.fullmatch(commit):
        fail('invalid_commit')
    # A GitHub read verifies the commit exists on the named remote repository.
    # It does NOT prove default-branch ancestry, passing CI, authorship or quality.
    remote = invoke(['gh', 'api', f'repos/{args.repo}/commits/{commit}', '--jq', '.sha'], cwd=worktree)
    if remote.lower() != commit:
        fail('github_commit_not_confirmed')
    script = Path(__file__).with_name('gh-gitcoin.mjs')
    if not script.is_file():
        fail('gh_gitcoin_collector_not_installed')
    command = ['node', str(script), 'scan', '--repo', args.repo, '--intent', args.intent,
               '--builder', args.builder, '--commit', commit]
    authenticated_login = invoke(['gh', 'api', 'user', '--jq', '.login'], cwd=worktree)
    if not re.fullmatch(r'[A-Za-z0-9-]{1,39}', authenticated_login):
        fail('github_authenticated_login_unavailable')
    if args.github_login and args.github_login.casefold() != authenticated_login.casefold():
        fail('github_authenticated_login_mismatch')
    command += ['--github-login', authenticated_login]
    manifest = json.loads(invoke(command, cwd=worktree))
    if manifest['repo'] != args.repo or manifest['commit'] != commit:
        fail('unexpected_scan_provenance')
    inserted, duplicate = save_manifest(args.db, manifest, 'github_commit_found', authenticated_collector=authenticated_login)
    return {'remote_commit_found': True, 'added_receipts': inserted, 'duplicates': duplicate,
            **balance(args.db)}


def main():
    p = argparse.ArgumentParser(description='QuantaPhi local GIT receipt database — no minting or money')
    p.add_argument('--db', default=str(DEFAULT_DB), help='Local private SQLite path')
    cmds = p.add_subparsers(dest='command', required=True)
    c = cmds.add_parser('scan', help='Scan a GitHub-pushed commit and record pending lines')
    c.add_argument('--worktree', required=True)
    c.add_argument('--repo', required=True)
    c.add_argument('--intent', required=True, choices=sorted(INTENTS))
    c.add_argument('--builder', choices=sorted(BUILDERS), default='human')
    c.add_argument('--github-login')
    c.add_argument('--commit')
    cmds.add_parser('balance', help='Display pending local receipts, not spendable coins')
    cmds.add_parser('receipts', help='List serialized provisional references and verified GH collector')
    args = p.parse_args()
    try:
        result = (scan(args) if args.command == 'scan' else
                  list_receipts(args.db) if args.command == 'receipts' else balance(args.db))
        print(json.dumps(result, indent=2))
    except (ValueError, subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError, json.JSONDecodeError) as exc:
        print('gitcoin-local: ' + str(exc), file=sys.stderr)
        raise SystemExit(2) from None

if __name__ == '__main__':
    main()