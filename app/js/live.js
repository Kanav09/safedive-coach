// SafeDive Coach: live mode. The phone camera runs through the same pose model as a clip, a few times a second.
// The screen shows the body line as a dial against the water line, a state word and one short cue; the cue can be
// spoken so a parent can call it across the pool without looking down. In test mode ('float' / 'tread') it also
// counts how long the swimmer holds at the surface, for the water-safety minute (see safety.js). Mode 'surface' accepts
// floating or treading, since the Red Cross skill allows either.
// The pure parts (liveState, liveCue, HoldCounter) have no browser dependencies and are unit tested.

const LIVE = { flat: 15, low: 30, sinking: 55, smooth: 0.45, cueGapMs: 3500 };

// One frame -> a state word. `m` is frameMetrics() (null when the torso is not readable), `seen` whether anyone was found.
function liveState(m, seen) {
  if (!seen) return 'none';
  if (!m) return 'hidden';
  const a = m.torsoAngle;
  return a <= LIVE.flat ? 'flat' : a <= LIVE.low ? 'low' : a <= LIVE.sinking ? 'sinking' : 'upright';
}
const LIVE_WORDS = { none: 'Looking for a swimmer', hidden: 'Can\'t see the hips', flat: 'Flat', low: 'A little low', sinking: 'Sinking', upright: 'Upright' };
const LIVE_CUES = { none: 'Point the phone at the swimmer, from the side.', hidden: 'Get lower, nearer the water, so the hips show.', flat: 'Nice and flat. Keep it.', low: 'Kick steady. Hips up.', sinking: 'Press the chest down. Eyes to the bottom.', upright: 'Standing or treading, not swimming.' };
function liveCue(state) { return LIVE_CUES[state] || ''; }

// Counts continuous seconds in the wanted state, forgiving short gaps (a splash) the same way safety.js does for clips.
class HoldCounter {
  constructor(wanted, maxGapSeconds = 2) { this.wanted = wanted; this.maxGap = maxGapSeconds; this.held = 0; this.longest = 0; this.gapStart = null; this.last = null; }
  // `ok` = frame is in the wanted state, `t` = seconds since the counter started
  push(ok, t) {
    if (this.last === null) this.last = t;
    const dt = t - this.last; this.last = t;
    if (ok) { this.held += dt + (this.gapStart !== null ? 0 : 0); this.gapStart = null; }
    else if (this.held > 0) { if (this.gapStart === null) this.gapStart = t; if (t - this.gapStart > this.maxGap) { this.held = 0; this.gapStart = null; } else this.held += dt; }
    if (this.held > this.longest) this.longest = this.held;
    return this.held;
  }
}

if (typeof window !== 'undefined') {
  // Browser half: camera, loop, dial, voice. Everything it needs comes in through `deps` so this file owns no globals.
  class LiveCoach {
    constructor(deps) { Object.assign(this, deps); this.running = false; this.stream = null; this.mode = 'coach'; this.smoothed = null; this.lastCueAt = 0; this.lastState = null; this.voice = false; }

    async start(mode = 'coach', opts = {}) {
      this.mode = mode; this.target = opts.seconds || 60; this.onUpdate = opts.onUpdate || (() => {}); this.onDone = opts.onDone || (() => {});
      const det = await this.getDetector();
      const constraints = { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await new Promise(r => { this.video.onloadedmetadata = r; });
      await this.video.play();
      this.canvas.width = this.video.videoWidth; this.canvas.height = this.video.videoHeight;
      this.running = true; this.smoothed = null; this.lastState = null; this.t0 = performance.now(); this.followed = null; this.history = [];
      this.hold = mode === 'coach' ? null : new HoldCounter(mode);
      this.loop(det);
    }

    async loop(det) {
      const ctx = this.canvas.getContext('2d');
      let frames = 0, spent = 0;
      while (this.running) {
        const t0 = performance.now();
        let poses = [];
        try { poses = await det.run(this.video.videoWidth, this.video.videoHeight, this.pixelsFrom(this.video)); } catch (e) { /* a dropped frame is fine */ }
        const ms = performance.now() - t0; spent += ms; frames++;
        if (!this.running) break;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let m = null;
        this.followed = this.pickSwimmer(poses, this.followed, this.track.maxJump);
        if (this.followed) { this.history.push(this.followed.keypoints); if (this.history.length > this.track.smoothWin) this.history.shift(); } else this.history = [];
        if (this.followed) { const kps = this.smoothKeypoints(this.history, this.track.smoothWin); m = this.frameMetrics(kps); this.drawSkeleton(ctx, kps, { target: m && m.torsoAngle > LIVE.flat ? LIVE.flat : null }); }
        if (m) this.smoothed = this.smoothed === null ? m.torsoAngle : this.smoothed + LIVE.smooth * (m.torsoAngle - this.smoothed);
        const state = liveState(m ? { torsoAngle: this.smoothed } : null, poses.length > 0);
        const now = (performance.now() - this.t0) / 1000;
        let held = null, done = false;
        if (this.hold) {
          const fs = this.floatState(m ? { torsoAngle: this.smoothed } : null);
          held = this.hold.push(this.mode === 'surface' ? fs !== null : fs === this.mode, now);   // any readable posture is 'at the surface'
          if (held >= this.target) done = true;
        }
        this.say(state);
        this.onUpdate({ state, word: LIVE_WORDS[state], cue: liveCue(state), angle: m ? this.smoothed : null, held, target: this.target, fps: frames / (spent / 1000), ms });
        if (done) { const r = { seconds: +held.toFixed(1), pass: true, mode: this.mode }; this.stop(); this.onDone(r); return; }
        await new Promise(r => setTimeout(r, 0));      // let the screen paint between frames
      }
    }

    // Spoken cue on a state change, never more often than every few seconds, only for the three swimming states.
    say(state) {
      if (!this.voice || state === this.lastState) { this.lastState = state; return; }
      this.lastState = state;
      if (!['flat', 'low', 'sinking'].includes(state) || !('speechSynthesis' in window)) return;
      const now = performance.now(); if (now - this.lastCueAt < LIVE.cueGapMs) return;
      this.lastCueAt = now;
      try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(liveCue(state)); u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {}
    }

    stop() {
      const result = this.hold ? { seconds: +this.hold.longest.toFixed(1), pass: this.hold.longest >= this.target, mode: this.mode } : null;
      this.running = false;
      if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
      try { this.video.srcObject = null; } catch (e) {}
      try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
      return result;
    }
  }
  window.LiveCoach = LiveCoach;
}

if (typeof module !== 'undefined') module.exports = { LIVE, liveState, liveCue, LIVE_WORDS, LIVE_CUES, HoldCounter };
