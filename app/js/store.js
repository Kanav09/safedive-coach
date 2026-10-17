// SafeDive Coach: everything that is kept on the device, in one place.
// localStorage only; every reader tolerates a missing or broken value so the app still works in private mode.
// Shapes (also in docs/ANALYSIS_SCHEMA.md):
//   swimmers  [{ id, name, ink, created }]                       ink 0..3 picks the stamp colour
//   sessions  [{ id, date, swimmerId, swimmer, stroke, score, torsoAngle, readable, issues, parts, timeline, fps, drillDone }]
//   skills    { [swimmerId]: { [skillKey]: { date, how: 'parent' | 'app', seconds } } }
//   plan      { swimmerId, created, drillKey, items: [{ day, kind: 'drill' | 'film', text, done }] }
// The backing object can be swapped for tests (plain object instead of window.localStorage).

const STORE_KEYS = {
  sessions: 'safedive.sessions.v1', swimmers: 'safedive.swimmers.v1', current: 'safedive.swimmer.current',
  skills: 'safedive.skills.v1', plan: 'safedive.plan.v1', consent: 'safedive.consent.v1', settings: 'safedive.settings.v1',
};

function makeStore(backing) {
  const mem = {};
  const box = backing || (typeof localStorage !== 'undefined' ? localStorage : { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } });
  const read = (key, fallback) => { try { const v = box.getItem(key); return v === null || v === undefined ? fallback : JSON.parse(v); } catch (e) { return fallback; } };
  const write = (key, value) => { try { box.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode or full: the app keeps working for this visit */ } };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const store = {
    keys: STORE_KEYS, uid,
    // ---- swimmers ----
    swimmers() { return read(STORE_KEYS.swimmers, []); },
    saveSwimmers(list) { write(STORE_KEYS.swimmers, list); },
    addSwimmer(name) {
      const clean = String(name || '').trim().slice(0, 24); if (!clean) return null;
      const list = store.swimmers();
      const existing = list.find(s => s.name.toLowerCase() === clean.toLowerCase()); if (existing) return existing;
      const s = { id: uid(), name: clean, ink: list.length % 4, created: new Date().toISOString() };
      list.push(s); store.saveSwimmers(list); return s;
    },
    swimmer(id) { return store.swimmers().find(s => s.id === id) || null; },
    currentSwimmerId() { try { return box.getItem(STORE_KEYS.current) || null; } catch (e) { return null; } },
    setCurrentSwimmer(id) { try { if (id) box.setItem(STORE_KEYS.current, id); else box.removeItem(STORE_KEYS.current); } catch (e) {} },
    currentSwimmer() { const id = store.currentSwimmerId(); return (id && store.swimmer(id)) || store.swimmers()[0] || null; },
    removeSwimmer(id) {
      store.saveSwimmers(store.swimmers().filter(s => s.id !== id));
      store.saveSessions(store.sessions().filter(s => s.swimmerId !== id));
      const sk = store.skills(); delete sk[id]; store.saveSkills(sk);
      const p = store.plan(); if (p && p.swimmerId === id) store.savePlan(null);
      if (store.currentSwimmerId() === id) store.setCurrentSwimmer(null);
    },
    // ---- sessions (scored laps) ----
    sessions() { return read(STORE_KEYS.sessions, []); },
    saveSessions(list) { write(STORE_KEYS.sessions, list); },
    addSession(s) { const list = store.sessions(); const rec = Object.assign({ id: uid() }, s); list.push(rec); store.saveSessions(list); return rec; },
    updateSession(id, patch) { const list = store.sessions(); const i = list.findIndex(s => s.id === id); if (i < 0) return null; list[i] = Object.assign(list[i], patch); store.saveSessions(list); return list[i]; },
    sessionsFor(swimmerId) { return store.sessions().filter(s => !swimmerId || s.swimmerId === swimmerId); },
    // ---- water-safety skills ----
    skills() { return read(STORE_KEYS.skills, {}); },
    saveSkills(all) { write(STORE_KEYS.skills, all); },
    skillsFor(swimmerId) { return store.skills()[swimmerId] || {}; },
    setSkill(swimmerId, key, entry) { const all = store.skills(); all[swimmerId] = all[swimmerId] || {}; if (entry) all[swimmerId][key] = entry; else delete all[swimmerId][key]; store.saveSkills(all); },
    // ---- weekly plan ----
    plan() { return read(STORE_KEYS.plan, null); },
    savePlan(p) { if (p) write(STORE_KEYS.plan, p); else { try { box.removeItem(STORE_KEYS.plan); } catch (e) {} } },
    // ---- small settings (voice on/off, install hint dismissed) ----
    settings() { return read(STORE_KEYS.settings, {}); },
    setSetting(k, v) { const s = store.settings(); s[k] = v; write(STORE_KEYS.settings, s); },
    // ---- consent ----
    consented() { try { return !!box.getItem(STORE_KEYS.consent); } catch (e) { return false; } },
    setConsented() { try { box.setItem(STORE_KEYS.consent, new Date().toISOString()); } catch (e) {} },
    // ---- wipe ----
    clearAll() { for (const k of Object.values(STORE_KEYS)) { if (k === STORE_KEYS.consent) continue; try { box.removeItem(k); } catch (e) {} } },

    // One-time upgrade of records written by v0.2/v0.3: laps had only a swimmer name, no id, no swimmer profile.
    // Every distinct name becomes a profile; nameless laps are kept under no swimmer and still count.
    migrate() {
      const list = store.sessions(); let changed = false;
      const swimmers = store.swimmers();
      for (const s of list) {
        if (!s.id) { s.id = uid(); changed = true; }
        if (!s.swimmerId && s.swimmer) {
          let sw = swimmers.find(x => x.name.toLowerCase() === s.swimmer.toLowerCase());
          if (!sw) { sw = { id: uid(), name: s.swimmer, ink: swimmers.length % 4, created: s.date || new Date().toISOString() }; swimmers.push(sw); }
          s.swimmerId = sw.id; changed = true;
        }
      }
      if (changed) { store.saveSessions(list); store.saveSwimmers(swimmers); }
      return changed;
    },
  };
  return store;
}

if (typeof module !== 'undefined') module.exports = { makeStore, STORE_KEYS };
