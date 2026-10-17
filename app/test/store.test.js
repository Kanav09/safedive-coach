// Storage: profiles, migration of old nameless laps, skills, plan, and that a broken value never throws.
const assert = require('assert');
const { makeStore } = require('../js/store.js');
const mem = {}; const backing = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const store = makeStore(backing);
// old records: name only, no ids
backing.setItem(store.keys.sessions, JSON.stringify([{ date: '2026-10-15T10:00:00Z', swimmer: 'Maya', stroke: 'freestyle', score: 50 }, { date: '2026-10-16T10:00:00Z', swimmer: '', stroke: 'kick', score: 65 }, { date: '2026-10-17T10:00:00Z', swimmer: 'maya', stroke: 'freestyle', score: 82 }]));
assert.strictEqual(store.migrate(), true);
assert.strictEqual(store.swimmers().length, 1, 'Maya and maya are one swimmer');
const maya = store.swimmers()[0];
assert.strictEqual(store.sessionsFor(maya.id).length, 2); assert.ok(store.sessions().every(s => s.id));
assert.strictEqual(store.migrate(), false, 'second migrate is a no-op');
const dev = store.addSwimmer('  Dev '); assert.strictEqual(dev.name, 'Dev'); assert.strictEqual(store.addSwimmer('dev').id, dev.id);
assert.strictEqual(store.addSwimmer('   '), null);
store.setCurrentSwimmer(dev.id); assert.strictEqual(store.currentSwimmer().id, dev.id);
store.setSkill(dev.id, 'float', { date: '2026-10-17', how: 'app', seconds: 64 }); assert.strictEqual(store.skillsFor(dev.id).float.seconds, 64);
store.savePlan({ swimmerId: dev.id, created: 'x', drillKey: 'hips_low', items: [] }); assert.strictEqual(store.plan().swimmerId, dev.id);
store.removeSwimmer(dev.id); assert.strictEqual(store.swimmer(dev.id), null); assert.strictEqual(store.plan(), null); assert.deepStrictEqual(store.skillsFor(dev.id), {});
assert.strictEqual(store.currentSwimmer().id, maya.id, 'falls back to the first swimmer');
backing.setItem(store.keys.sessions, '{not json'); assert.deepStrictEqual(store.sessions(), [], 'broken value reads as empty');
const s2 = makeStore(); assert.deepStrictEqual(s2.swimmers(), [], 'no localStorage: in-memory fallback works');
console.log('store.test.js: all checks passed');
