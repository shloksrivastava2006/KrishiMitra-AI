import test from 'node:test';
import assert from 'node:assert/strict';
import { isRecoverable, findNewCheck, RECOVER_MS } from '../src/features/disease/recovery.js';

const now = Date.parse('2026-10-16T10:00:00Z');

test('only a recent pending check is worth waiting for', () => {
  assert.equal(isRecoverable({ at: now - 10_000 }, now), true);
  assert.equal(isRecoverable({ at: now - RECOVER_MS - 1 }, now), false);
  assert.equal(isRecoverable(null, now), false);
  assert.equal(isRecoverable({ at: 'x' }, now), false);
});

test('a new top entry (different id) is the answer that arrived', () => {
  const list = [{ id: 'b', createdAt: '2026-10-16T09:59:50Z' }, { id: 'a', createdAt: '2026-10-16T09:00:00Z' }];
  assert.equal(findNewCheck(list, { at: now - 20_000, lastId: 'a' }).id, 'b');
  assert.equal(findNewCheck(list, { at: now - 20_000, lastId: 'b' }), null);   // nothing new yet
});

test('with no earlier history, a check saved after pressing Check counts; an older one does not', () => {
  const fresh = [{ id: 'n', createdAt: '2026-10-16T09:59:55Z' }];
  assert.equal(findNewCheck(fresh, { at: now - 20_000, lastId: null }).id, 'n');
  const old = [{ id: 'o', createdAt: '2026-10-16T08:00:00Z' }];
  assert.equal(findNewCheck(old, { at: now - 20_000, lastId: null }), null);
});

test('empty or odd input never throws', () => {
  assert.equal(findNewCheck([], { at: now, lastId: null }), null);
  assert.equal(findNewCheck(undefined, { at: now }), null);
  assert.equal(findNewCheck([{ id: 'x', createdAt: 'bad' }], null), null);
});
