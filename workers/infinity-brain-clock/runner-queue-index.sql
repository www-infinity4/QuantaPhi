-- Manual, reviewed D1 migration; do not apply while storage/quota is exhausted.
CREATE INDEX IF NOT EXISTS work_tickets_runner_candidates_v1
ON work_tickets(owner_hash,created_at,id)
WHERE status IN ('ready','working','blocked')
AND (CASE WHEN json_valid(context_json) THEN json_extract(context_json,'$.kind')='robot-directions' ELSE 0 END);
