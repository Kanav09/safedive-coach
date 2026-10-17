// Badges are pure functions of stored data; each one must be earnable and not earned by an empty swimmer.
const assert = require('assert');
const { BADGES, earnedBadges } = require('../js/badges.js');
assert.deepStrictEqual(earnedBadges({}), [], 'nothing earned with no data');
const lap = (score, daysAgo, extra = {}) => Object.assign({ date: new Date(Date.now() - daysAgo * 864e5).toISOString(), score, torsoAngle: 40 }, extra);
let e = earnedBadges({ sessions: [lap(50, 0)] }); assert.deepStrictEqual(e, ['first_lap']);
e = earnedBadges({ sessions: [lap(50, 1), lap(85, 0, { torsoAngle: 12 })] }); assert.ok(e.includes('strong_lap') && e.includes('flat_board') && e.includes('comeback'), 'strong, flat, comeback: ' + e);
e = earnedBadges({ sessions: [lap(50, 2), lap(52, 1), lap(51, 0)] }); assert.ok(e.includes('three_week') && !e.includes('comeback'));
e = earnedBadges({ sessions: [lap(50, 0, { drillDone: true })] }); assert.ok(e.includes('drill_done'));
e = earnedBadges({ plan: { items: [{ kind: 'drill', done: true }, { kind: 'film', done: true }] } }); assert.ok(e.includes('plan_week') && e.includes('drill_done'));
e = earnedBadges({ skills: { float: { how: 'app' } } }); assert.deepStrictEqual(e, ['floater']);
e = earnedBadges({ skills: { enter: {}, float: { how: 'parent' }, turn: {}, swim: {}, exit: {} } }); assert.ok(e.includes('water_safe') && !e.includes('floater'));
e = earnedBadges({ sessions: [lap(50, 0), lap(50, 7), lap(50, 14), lap(50, 21)] }); assert.ok(e.includes('streak_4'), 'streak: ' + e);
for (const b of BADGES) assert.ok(b.key && b.name && b.how, 'badge incomplete');
assert.strictEqual(new Set(BADGES.map(b => b.key)).size, BADGES.length, 'unique keys');
console.log('badges.test.js: all checks passed (' + BADGES.length + ' badges)');
