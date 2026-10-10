const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/config/database');
const DashboardController = require('../src/controllers/DashboardController');

function response() {
  return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
}
function queryFixture(sql) {
  if (sql.includes('WITH ranges')) return { rows: [
    { range: 'weekly', label: '10 Oct', count: '7' },
    { range: 'monthly', label: '05 Oct', count: '13' },
    { range: 'yearly', label: 'Oct', count: '29' },
  ] };
  if (sql.includes('AS recent30 FROM notes')) return { rows: [{ recent7: '12', previous7: '8', recent30: '29' }] };
  if (sql.includes('AS previous7 FROM bookmarks')) return { rows: [{ recent7: '6', previous7: '3' }] };
  if (sql.includes('SUM(donation_amount)')) return { rows: [{ total: '987.65', highest: '250.00', average: '123.46' }] };
  if (sql.includes('SELECT name, donation_amount')) return { rows: [{ name: 'Test Contributor', donation_amount: '42.75', created_at: '2026-10-09T00:00:00Z' }] };
  if (sql.includes("tag->>'name' AS name")) return { rows: [{ name: 'Awareness', count: '11' }] };
  if (sql.includes('SELECT chapter, section')) return { rows: [{ chapter: 'Chapter 4', section: 'Section 2', count: '17' }] };
  if (sql.includes('COUNT(*) as total')) return { rows: [{ total: '317' }] };
  return { rows: [] };
}

test('dashboard returns database values and explicitly unavailable tracking', async () => {
  pool.query = async sql => queryFixture(sql);
  const res = response();
  await DashboardController.getStats({}, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.metrics.notesLast30Days, 29);
  assert.equal(res.body.notes.recent7Days, 12);
  assert.equal(res.body.notes.mostTaggedCategory.count, 11);
  assert.equal(res.body.content.mostNoted.count, 17);
  assert.deepEqual(res.body.activity.weekly.secondaryValues, [7]);
  assert.deepEqual(res.body.activity.monthly.secondaryValues, [13]);
  assert.deepEqual(res.body.activity.yearly.secondaryValues, [29]);
  assert.equal(res.body.activity.weekly.primaryValues, null);
  assert.equal(res.body.metrics.weeklyActiveUsers, null);
  assert.equal(res.body.appUsage, null);
  assert.equal(res.body.donations.summary.total, 987.65);
  assert.equal(res.body.donations.summary.recurring, null);
  assert.equal(res.body.donations.summary.recent30Days, null);
  assert.equal(res.body.donations.recentSupporters[0].date, null);
  assert.equal(res.body.donations.recentSupporters[0].joinedAt, '2026-10-09T00:00:00Z');
});

test('optional report tables missing are unavailable, not zero pending', async () => {
  pool.query = async sql => {
    if (sql.includes('reported_discussions')) throw Object.assign(new Error('Missing table'), { code: '42P01' });
    return queryFixture(sql);
  };
  const res = response();
  await DashboardController.getStats({}, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.reports.pendingCount, null);
});

test('failed database requests do not produce synthetic statistics', async () => {
  pool.query = async () => { throw Object.assign(new Error('Database offline'), { code: 'ECONNREFUSED' }); };
  const originalError = console.error;
  console.error = () => {};
  try {
    const res = response();
    await DashboardController.getStats({}, res);
    assert.equal(res.code, 500);
    assert.equal(res.body.metrics, undefined);
    assert.equal(res.body.donations, undefined);
  } finally { console.error = originalError; }
});
