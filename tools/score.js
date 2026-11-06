// Draw a scored conversation:  node tools/score.js [seed] [ticks]
// The viewer is scripted: silent for 200 ticks; then one class every 12
// ticks for 220 ticks (the answerers tire of it); then a different class
// every 12 ticks (they re-engage); then silence again.
import { writeFileSync, mkdirSync } from "node:fs";
import { createState, step, injectViewer } from "../docs/colloquy.js";
import { recordTick, scoreSheet } from "../docs/score.js";
const seed = Number(process.argv[2] || 1), ticks = Number(process.argv[3] || 720);
const state = createState({ seed }), trace = [];
for (let t = 0; t < ticks; t++) {
  if (t >= 200 && t < 420 && t % 12 === 0) injectViewer(state, 2);
  if (t >= 420 && t < 600 && t % 12 === 0) injectViewer(state, 5);
  step(state); trace.push(recordTick(state));
}
mkdirSync("media", { recursive: true });
writeFileSync("media/score.svg", scoreSheet(trace, state.p, { seed, ledger: state.ledger, roles: state.agents.map((a) => a.role) }));
console.error(`wrote media/score.svg — seed ${seed}, ${ticks} ticks, answered ${state.ledger.answered}`);
