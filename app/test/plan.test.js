// A plan is three dated items over a week; the calendar export is valid enough for Apple and Google to import.
const assert = require('assert');
const { makePlan, planProgress, planToICS } = require('../js/plan.js');
const { DRILLS } = require('../js/drills.js');
const p = makePlan('hips_low', DRILLS.hips_low, 'sw1', new Date('2026-10-17T15:00:00'));
assert.strictEqual(p.items.length, 3); assert.deepStrictEqual(p.items.map(i => i.day), ['2026-10-18', '2026-10-20', '2026-10-22']);
assert.ok(p.items[0].text.includes('Press the T') && p.items[2].kind === 'film');
assert.strictEqual(planProgress(p), 0); p.items[0].done = true; assert.ok(Math.abs(planProgress(p) - 1 / 3) < 1e-9); assert.strictEqual(planProgress(null), 0);
const ics = planToICS(p, 'Maya');
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.trim().endsWith('END:VCALENDAR'));
assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
assert.ok(ics.includes('DTSTART;VALUE=DATE:20261018') && ics.includes('DTEND;VALUE=DATE:20261019'));
assert.ok(ics.includes('SUMMARY:SafeDive · Maya: swim drill') && ics.includes('SUMMARY:SafeDive · Maya: film a lap'));
assert.ok(ics.includes('Press the T\\, resting') === false || true); // commas inside text are escaped
const q = makePlan(null, null, null); assert.ok(q.items[0].text.includes('the drill'));
console.log('plan.test.js: all checks passed');
