import pathlib
import sqlite3
import unittest

SQL=(pathlib.Path(__file__).resolve().parents[1] / 'bubble-bits' / 'schema.sql').read_text()
class PacketSchemaTest(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.executescript(SQL)
        self.db.execute("INSERT INTO bubble_bit_candidates(packet_id,customer_id,task_id,operation_id,criteria_key,capability,summary,evidence_stage,files_tested,files_changed) VALUES (?,?,?,?,?,?,?,?,?,?)", ('a'*64,'customer_1','task_1','operation_1','deploy','deployment_verification','Deployment validated from receipt','tests_verified',73,0))
    def test_replay_of_operation_is_not_a_second_candidate(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO bubble_bit_candidates(packet_id,customer_id,task_id,operation_id,criteria_key,capability,summary,evidence_stage,files_tested,files_changed) VALUES (?,?,?,?,?,?,?,?,?,?)", ('b'*64,'customer_1','task_1','operation_1','deploy','deployment_verification','Repeated','tests_verified',73,0))
    def test_duplicate_receipt_cannot_back_two_packets(self):
        self.db.execute("INSERT INTO bubble_bit_evidence VALUES(?,?,?,?)", ('receipt_12345678','a'*64,'github.test_result','2026-11-04T18:00:00Z'))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO bubble_bit_evidence VALUES(?,?,?,?)", ('receipt_12345678','a'*64,'github.test_result','2026-11-04T18:00:00Z'))
    def test_no_mutating_wallet_or_spendable_balance_tables(self):
        names=[row[0] for row in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
        self.assertEqual(set(names), {'bubble_bit_candidates','bubble_bit_evidence','bubble_bit_share_grants','bubble_bit_transfer_intents'})
    def test_transfer_intents_cannot_claim_spendability(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO bubble_bit_transfer_intents(transfer_id,packet_id,from_wallet_id,to_wallet_id,authorization_grant_id,state) VALUES (?,?,?,?,?,?)",('request_1','a'*64,'wallet_1','wallet_2','grant_1','settled'))

if __name__=='__main__':unittest.main()
