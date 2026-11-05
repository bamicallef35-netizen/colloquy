// colloquy.js — an aesthetically potent environment, after Gordon Pask.
//
// A DOM-free model of a small society of signalling agents, an original
// software homage to Pask's Musicolour (c.1953) and his Colloquy of Mobiles
// (Cybernetic Serendipity, ICA London, 1968). It reproduces his IDEAS — agents
// with internal drives that seek a transient "satisfaction", and habituation
// ("boredom") that makes a repeated stimulus stop working — not his relay
// hardware. A physical replica of the Colloquy already exists (Pangaro &
// McLeish, 2018); this is not that. The update equations here are my own.
//
// The viewer is part of the loop: inject a signal and the agents answer, but
// repeat the same one and they tire of it, so staying in conversation means
// actually varying what you say. That is Pask's distinction between a
// conversation and a stimulus-response.
//
// The same module runs under node:test (test/*.test.js) and in the browser
// (docs/index.html). See README.md.

export const PROJECTOR = "projector";
export const RESPONDER = "responder";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function defaultParams() {
  return {
    projectors: 2,          // emit light signals, carrying a hue
    responders: 3,          // answer a matching hue with sound
    hues: 6,                // discrete hue classes
    driveRise: 0.014,       // how fast an unmet drive grows each tick
    emitThresh: 0.62,       // a projector emits once its drive reaches this
    emitCost: 0.16,         // emitting relieves a little pressure
    respondCeil: 0.68,      // a responder habituated past this stops answering
    habGain: 0.22,          // habituation added to a hue on each exchange
    habDecay: 0.004,        // habituation forgotten per tick (novelty recovers)
    satDrop: 0.55,          // drive relieved by a satisfying exchange
    satLevel: 0.22,         // below this, an agent flares a satisfaction beam
    tolerance: 1,           // hue match within +/- this many classes
    signalTTL: 36,          // ticks a signal stays in the air before expiring
    seed: 1,
  };
}

export class Agent {
  constructor(id, role, hue, hues) {
    this.id = id; this.role = role; this.hue = hue;
    this.drive = 0; this.satisfaction = 0;
    this.habit = new Float64Array(hues); // habituation per hue, 0..1
  }
}

export function createState(params) {
  const p = Object.assign(defaultParams(), params || {});
  const rng = mulberry32(p.seed);
  const agents = [];
  let id = 0;
  for (let i = 0; i < p.projectors; i++) {
    const a = new Agent(id++, PROJECTOR, i % p.hues, p.hues);
    a.drive = 0.2 + 0.3 * rng();
    agents.push(a);
  }
  for (let i = 0; i < p.responders; i++) {
    const a = new Agent(id++, RESPONDER, i % p.hues, p.hues);
    a.drive = 0.2 + 0.3 * rng();
    agents.push(a);
  }
  return {
    p, rng, agents, t: 0,
    signals: [],                        // in-flight {hue, from, ttl, viewer}
    ledger: { emitted: 0, answered: 0, expired: 0 },
    events: [],                         // this tick's emits/answers/beams (for rendering)
    viewerQueue: [],                    // hues injected by the viewer, consumed next step
  };
}

// The viewer says something: inject a signal of `hue`, consumed on the next step.
export function injectViewer(state, hue) {
  state.viewerQueue.push(((hue % state.p.hues) + state.p.hues) % state.p.hues);
}

function hueMatch(a, b, tolerance, hues) {
  let d = Math.abs(a - b);
  d = Math.min(d, hues - d);          // hues wrap around a circle
  return d <= tolerance;
}

export function step(state) {
  const { p, agents } = state;
  state.events = [];

  // Drives grow; habituation is slowly forgotten.
  for (const a of agents) {
    a.drive = clamp01(a.drive + p.driveRise);
    for (let h = 0; h < p.hues; h++) a.habit[h] = clamp01(a.habit[h] - p.habDecay);
  }

  // Projectors emit when their drive is high enough.
  for (const a of agents) {
    if (a.role === PROJECTOR && a.drive >= p.emitThresh) {
      state.signals.push({ hue: a.hue, from: a.id, ttl: p.signalTTL, viewer: false });
      a.drive = clamp01(a.drive - p.emitCost);
      state.ledger.emitted++;
      state.events.push({ kind: "emit", from: a.id, hue: a.hue });
    }
  }
  // The viewer's injected signals enter the same way.
  for (const hue of state.viewerQueue) {
    state.signals.push({ hue, from: -1, ttl: p.signalTTL, viewer: true });
    state.ledger.emitted++;
    state.events.push({ kind: "emit", from: -1, hue });
  }
  state.viewerQueue = [];

  // Responders answer. The first un-bored, hue-matching responder consumes a
  // signal; the exchange satisfies both parties a little and habituates both
  // to that hue, so the next identical signal lands on tireder ears.
  const kept = [];
  for (const sig of state.signals) {
    let answered = false;
    for (const r of agents) {
      if (r.role !== RESPONDER) continue;
      if (!hueMatch(r.hue, sig.hue, p.tolerance, p.hues)) continue;
      if (r.habit[sig.hue] >= p.respondCeil) continue;     // bored of this hue
      r.drive = clamp01(r.drive - p.satDrop);
      r.satisfaction++;
      r.habit[sig.hue] = clamp01(r.habit[sig.hue] + p.habGain);
      if (sig.from >= 0) {
        const src = agents[sig.from];
        src.drive = clamp01(src.drive - p.satDrop);
        src.satisfaction++;
        src.habit[sig.hue] = clamp01(src.habit[sig.hue] + p.habGain);
        if (src.drive < p.satLevel) state.events.push({ kind: "beam", from: src.id, hue: sig.hue });
      }
      state.ledger.answered++;
      state.events.push({ kind: "answer", from: sig.from, to: r.id, hue: sig.hue });
      if (r.drive < p.satLevel) state.events.push({ kind: "beam", from: r.id, hue: sig.hue });
      answered = true;
      break;
    }
    if (!answered) {
      sig.ttl -= 1;
      if (sig.ttl > 0) kept.push(sig);
      else state.ledger.expired++;
    }
  }
  state.signals = kept;
  state.t++;
  return state;
}

// Quantised snapshot hash, for determinism tests.
export function stateHash(state) {
  let h = 0x811c9dc5;
  const push = (v) => { h ^= v & 0xff; h = Math.imul(h, 0x01000193) >>> 0; };
  for (const a of state.agents) {
    push(Math.round(a.drive * 255));
    push(a.satisfaction);
    for (let i = 0; i < a.habit.length; i++) push(Math.round(a.habit[i] * 255));
  }
  push(state.signals.length);
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Total answer activity over the last `window` ticks — used to detect boredom.
export function run(params, steps, onStep) {
  const state = createState(params);
  let answers = 0;
  for (let i = 0; i < steps; i++) {
    if (onStep) onStep(state, i);
    step(state);
    answers += state.events.filter((e) => e.kind === "answer").length;
  }
  return { state, answers };
}
