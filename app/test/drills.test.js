// Every issue key the scorer can emit must map to a drill or be a known "nothing to fix" key.
const assert = require('assert');
const { DRILLS, NO_DRILL, drillFor } = require('../js/drills.js');
const src = require('fs').readFileSync(__dirname + '/../js/scoring.js', 'utf8');
const keys = [...src.matchAll(/say\('([a-z_]+)'/g)].map(m => m[1]);
assert.ok(keys.length >= 10, 'found issue keys in scoring.js');
for (const k of keys) assert.ok(DRILLS[k] || NO_DRILL.has(k), `no drill for issue "${k}"`);
for (const k of Object.keys(DRILLS)) { const d = DRILLS[k]; assert.ok(d.name && d.why && d.steps.length >= 3 && d.reps, `drill ${k} incomplete`); }
assert.strictEqual(drillFor('body_flat'), null); assert.strictEqual(drillFor('hips_low').name, 'Press the T');
const { EXAMPLES } = require('../js/examples.js');
for (const e of EXAMPLES) assert.ok(require('fs').existsSync(__dirname + '/../' + e.src), 'missing example image ' + e.src);
console.log('drills.test.js: all checks passed (' + keys.length + ' issue keys, ' + EXAMPLES.length + ' example images)');
