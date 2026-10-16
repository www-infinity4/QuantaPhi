import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ticketStatusFromJobs } from '../workers/infinity-brain-clock/ticket-status.mjs';

/**
 * Helper to create a job fixture.
 * @param {string} id - Job identifier.
 * @param {string} status - One of 'blocked', 'queued', 'working', 'complete'.
 * @param {string[]} [dependencies=[]] - IDs this job depends on.
 * @returns {{id:string,status:string,dependencies:string[]}}
 */
function job(id, status, dependencies = []) {
  return { id, status, dependencies };
}

// 1. Blocked scenario – a blocked job with a queued dependent should yield "blocked".
test('ticketStatusFromJobs – blocked scenario', () => {
  const jobs = [
    job('TASK-1', 'blocked'),
    job('TASK-2', 'queued', ['TASK-1']),
  ];
  const status = ticketStatusFromJobs(jobs);
  assert.strictEqual(status, 'blocked');
});

// 2. Ready scenario – an independent queued job should yield "ready".
test('ticketStatusFromJobs – ready scenario', () => {
  const jobs = [
    job('TASK-3', 'queued'),
  ];
  const status = ticketStatusFromJobs(jobs);
  assert.strictEqual(status, 'ready');
});

// 3. Working scenario – any job in "working" state should yield "working".
test('ticketStatusFromJobs – working scenario', () => {
  const jobs = [
    job('TASK-1', 'complete'),
    job('TASK-2', 'working'),
    job('TASK-3', 'queued'),
  ];
  const status = ticketStatusFromJobs(jobs);
  assert.strictEqual(status, 'working');
});

// 4. Complete scenario – when all jobs are "complete" the overall status is "complete".
test('ticketStatusFromJobs – complete scenario', () => {
  const jobs = [
    job('TASK-1', 'complete'),
    job('TASK-2', 'complete'),
    job('TASK-3', 'complete'),
  ];
  const status = ticketStatusFromJobs(jobs);
  assert.strictEqual(status, 'complete');
});
