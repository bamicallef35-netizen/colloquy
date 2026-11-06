// Properties of the model — every one a claim about this code, never about
// Pask's machines.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createState, step, injectViewer, stateHash, run, defaultParams, PROJECTOR, RESPONDER,
} from "../docs/colloquy.js";

// Feed a fixed hue every tick, with no projectors, so we isolate the
// viewer -> responder channel.
function feed(hue, ticks, params) {
  const state = createState({ projectors: 0, ...params });
  const answersByTick = [];
  for (let i = 0; i < ticks; i++) {
    injectViewer(state, hue);
    step(state);
    answersByTick.push(state.events.filter((e) => e.kind === "answer").length);
  }
  return { state, answersByTick };
}

test("determinism: same seed gives the same trace", () => {
  const a = createState({ seed: 11 });
  const b = createState({ seed: 11 });
  for (let i = 0; i < 300; i++) { step(a); step(b); }
  assert.equal(stateHash(a), stateHash(b));
});

test("different seeds diverge", () => {
  const a = createState({ seed: 1 });
  const b = createState({ seed: 2 });
  for (let i = 0; i < 300; i++) { step(a); step(b); }
  assert.notEqual(stateHash(a), stateHash(b));
});

test("boundedness: drives and habituation stay in 0..1", () => {
  const state = createState({ seed: 4 });
  const rng = (() => { let s = 99; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
  for (let i = 0; i < 1500; i++) {
    if (rng() < 0.3) injectViewer(state, Math.floor(rng() * 6));
    step(state);
    for (const a of state.agents) {
      assert.ok(a.drive >= 0 && a.drive <= 1, `drive ${a.drive}`);
      assert.ok(a.satisfaction >= 0);
      for (const h of a.habit) assert.ok(h >= 0 && h <= 1, `habit ${h}`);
    }
  }
});

test("satisfaction is reachable: the agents do answer one another", () => {
  const { state, answers } = run({ seed: 7 }, 400);
  assert.ok(answers > 0, "no exchanges ever happened");
  assert.ok(state.agents.some((a) => a.satisfaction > 0), "nobody was ever satisfied");
});

test("habituation: a repeated signal stops working (Pask's boredom)", () => {
  const { answersByTick } = feed(3, 80, { seed: 2 });
  const early = answersByTick.slice(0, 20).reduce((u, v) => u + v, 0);
  const late = answersByTick.slice(-20).reduce((u, v) => u + v, 0);
  assert.ok(early >= 2, `the hue should land at first (got ${early})`);
  // Habituation forgets slowly, so a repeated signal may revive now and then;
  // the honest claim is that its effectiveness collapses, not that it is zero.
  assert.ok(late < early, `repetition should dull the response (early ${early}, late ${late})`);
  assert.ok(late <= 1, `a worn-out signal should barely land (late ${late})`);
});

test("novelty revives the conversation", () => {
  const state = createState({ projectors: 0, seed: 5 });
  for (let i = 0; i < 80; i++) { injectViewer(state, 3); step(state); }   // bore them with hue 3
  let revived = 0;
  for (let i = 0; i < 30; i++) {                                          // switch to hue 0
    injectViewer(state, 0); step(state);
    revived += state.events.filter((e) => e.kind === "answer").length;
  }
  assert.ok(revived > 0, "a fresh hue should get answered again");
});

test("signal-token conservation: emitted == answered + expired + in-flight", () => {
  const state = createState({ seed: 3 });
  for (let i = 0; i < 600; i++) {
    if (i % 7 === 0) injectViewer(state, (i / 7) % 6);
    step(state);
    const { emitted, answered, expired } = state.ledger;
    assert.equal(emitted, answered + expired + state.signals.length);
  }
});

test("roles and counts are set up as configured", () => {
  const state = createState({ projectors: 2, responders: 3 });
  assert.equal(state.agents.filter((a) => a.role === PROJECTOR).length, 2);
  assert.equal(state.agents.filter((a) => a.role === RESPONDER).length, 3);
  assert.equal(defaultParams().hues, 6);
});

test("the score is one SVG carrying every emission as a glyph and the scenario block", async () => {
  const { recordTick, scoreSheet } = await import("../docs/score.js");
  const state = createState({ seed: 4 }), trace = [];
  let emits = 0;
  for (let t = 0; t < 300; t++) { if (t % 15 === 0) injectViewer(state, t % 6); step(state); trace.push(recordTick(state)); emits += state.events.filter((e) => e.kind === "emit").length; }
  const svg = scoreSheet(trace, state.p, { seed: 4, roles: state.agents.map((a) => a.role) });
  assert.ok(svg.startsWith("<svg") && svg.trimEnd().endsWith("</svg>"));
  for (const k of ["project", "programme", "area", "procedure", "record", "viewer", "caller 0", "answerer 2", "100 ticks"]) assert.ok(svg.includes(k), k);
  assert.ok(emits > 0 && (svg.match(/<(circle|rect|path) /g) || []).length >= emits, "a mark per emission at least");
  for (const d of svg.match(/ d="[^"]*"/g) || []) assert.ok(!/\d\.\d+\.\d/.test(d) && !/NaN/.test(d), "well-formed path data: " + d.slice(0, 40));
});
