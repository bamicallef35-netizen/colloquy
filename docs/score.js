// score.js — a conversation drawn as a score: one lane per agent and one
// for the viewer, time left to right, each emission as its glyph, each
// answer as a tie between lanes, each satisfaction as a filled beam, with
// every agent's drive as a line and its habituation as a grey ground. The
// title block is in the scenario format (programme, area, procedure,
// record). DOM-free: the page's "export score" button and the Node tool
// both draw through this.
import { PROJECTOR } from "./colloquy.js";

const INK = "#111111", INK2 = "#6b6b6b", RULE = "#d4d4d4", PAPER = "#ffffff", PAPER2 = "#ececec", ACCENT = "#0000ee";
const FONT = "IBM Plex Mono, ui-monospace, Menlo, monospace";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, size = 11, fill = INK, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;

// One tick of a conversation, as the score needs it. Call after step().
export function recordTick(state) {
  return {
    t: state.t,
    events: state.events.map((e) => ({ ...e })),
    drives: state.agents.map((a) => a.drive),
    habit: state.agents.map((a) => { let m = 0; for (const h of a.habit) m = Math.max(m, h); return m; }),
  };
}

// A signal class as an SVG glyph centred at (x, y) with half-size s.
export function glyph(h, x, y, s, fill, stroke) {
  x = Number(x); y = Number(y); s = Number(s);   // formatted strings would concatenate in the arithmetic below
  const f = fill ? `fill="${fill}"` : `fill="none" stroke="${stroke || INK}" stroke-width="1"`;
  switch (h % 6) {
    case 0: return `<circle cx="${x}" cy="${y}" r="${s}" ${f}/>`;
    case 1: return `<rect x="${x - s}" y="${y - s}" width="${2 * s}" height="${2 * s}" ${f}/>`;
    case 2: return `<path d="M${x} ${y - s}L${x + s} ${y + s}L${x - s} ${y + s}Z" ${f}/>`;
    case 3: return `<path d="M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z" ${f}/>`;
    case 4: return `<path d="M${x - s / 3} ${y - s}h${2 * s / 3}v${2 * s / 3}h${2 * s / 3}v${2 * s / 3}h${-2 * s / 3}v${2 * s / 3}h${-2 * s / 3}v${-2 * s / 3}h${-2 * s / 3}v${-2 * s / 3}h${2 * s / 3}Z" ${f}/>`;
    default: return `<rect x="${x - s}" y="${y - s / 3}" width="${2 * s}" height="${2 * s / 3}" ${f}/>`;
  }
}

export function scoreSheet(trace, p, opts = {}) {
  const px = opts.px || 1.1, pad = 48, labelW = 72, laneH = 40, n = p.projectors + p.responders, lanes = n + 1;
  const gw = Math.max(1, trace.length) * px, gh = lanes * laneH, block = 150;
  const W = gw + pad * 2 + labelW, H = gh + pad * 2 + 30 + block;
  const x0 = pad + labelW, X = (i) => x0 + i * px, laneY = (l) => pad + l * laneH + laneH * 0.62;
  const laneOf = (id) => id < 0 ? 0 : id + 1;
  const roles = opts.roles || [];
  let body = `<rect x="${x0 + 0.5}" y="${pad + 0.5}" width="${gw}" height="${gh}" fill="none" stroke="${RULE}"/>`;
  body += text(pad, pad - 14, `score / seed ${opts.seed ?? p.seed ?? "?"} / ${trace.length} ticks`, 10, INK2);
  body += text(x0 + gw, pad - 14, "benmicallef / a colloquy of signals / after Pask", 10, INK2, "end");
  // lanes: labels, habituation ground, drive line
  for (let l = 0; l < lanes; l++) {
    const yb = laneY(l), label = l === 0 ? "viewer" : `${roles[l - 1] === PROJECTOR ? "caller" : "answerer"} ${l - 1}`;
    body += text(pad, yb + 3, label, 9, INK2);
    body += `<line x1="${x0}" y1="${yb}" x2="${x0 + gw}" y2="${yb}" stroke="${RULE}"/>`;
    if (l === 0 || !trace.length) continue;
    const a = l - 1;
    let ground = `M${X(0)} ${yb}`, drive = "";
    trace.forEach((tk, i) => { ground += `L${X(i).toFixed(1)} ${(yb - tk.habit[a] * laneH * 0.5).toFixed(1)}`; drive += `${i ? "L" : "M"}${X(i).toFixed(1)} ${(yb - tk.drives[a] * laneH * 0.52).toFixed(1)}`; });
    ground += `L${X(trace.length - 1).toFixed(1)} ${yb}Z`;
    body += `<path d="${ground}" fill="${PAPER2}"/>`;
    body += `<path d="${drive}" fill="none" stroke="${INK}" stroke-width="0.6" stroke-opacity="0.8"/>`;
  }
  // events
  let ties = "", marks = "";
  trace.forEach((tk, i) => {
    const x = X(i);
    for (const e of tk.events) {
      if (e.kind === "answer") ties += `<line x1="${x.toFixed(1)}" y1="${laneY(laneOf(e.from))}" x2="${x.toFixed(1)}" y2="${laneY(laneOf(e.to))}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.8"/>`;
      else if (e.kind === "emit") marks += glyph(e.hue, x.toFixed(1), laneY(laneOf(e.from)) - 11, 3.2, e.from < 0 ? ACCENT : INK);
      else if (e.kind === "beam") marks += `<circle cx="${x.toFixed(1)}" cy="${laneY(laneOf(e.from)) + 9}" r="2.4" fill="${ACCENT}"/>`;
    }
  });
  body += ties + marks;
  // scale bar: a hundred ticks
  const sbY = pad + gh + 22;
  body += `<line x1="${x0}" y1="${sbY}" x2="${x0 + 100 * px}" y2="${sbY}" stroke="${INK}" stroke-width="2"/>`;
  body += text(x0 + 100 * px + 8, sbY + 4, "100 ticks", 10, INK2);
  // legend of signal classes
  for (let h = 0; h < p.hues; h++) { const lx = x0 + gw - (p.hues - h) * 34; body += glyph(h, lx, sbY, 3.2, INK); body += text(lx + 7, sbY + 3, String(h), 8, INK2); }
  // title block, scenario format
  const count = (k) => trace.reduce((s, tk) => s + tk.events.filter((e) => e.kind === k).length, 0);
  const viewerSignals = trace.reduce((s, tk) => s + tk.events.filter((e) => e.kind === "emit" && e.from < 0).length, 0);
  const ty = pad + gh + 54, maxChars = Math.floor((gw + labelW - 90) / 6);
  const rows = [
    ["project", "a colloquy of signals — one conversation, as a score"],
    ["programme", `${p.projectors} callers and ${p.responders} answerers with drives that seek a transient satisfaction; a viewer who enters by the callers' channel`],
    ["area", `${trace.length} ticks; ${p.hues} signal classes; a signal stays in the air ${p.signalTTL} ticks`],
    ["procedure", `a caller emits when its drive passes ${p.emitThresh}; an answerer within ±${p.tolerance} class, not habituated past ${p.respondCeil}, answers; an exchange relieves both by ${p.satDrop} and adds ${p.habGain} habituation, ${p.habDecay} of which is forgotten each tick; below ${p.satLevel} an agent beams`],
    ["record", `seed ${opts.seed ?? p.seed ?? "?"} / emitted ${count("emit")} (viewer ${viewerSignals}) / answered ${count("answer")} / beams ${count("beam")}${opts.ledger ? ` / expired ${opts.ledger.expired}` : ""}`],
  ];
  body += `<line x1="${pad}" y1="${ty - 14}" x2="${x0 + gw}" y2="${ty - 14}" stroke="${RULE}"/>`;
  let y = ty;
  for (const [k, v] of rows) {
    const lines = []; let cur = "";
    for (const w of v.split(" ")) { if (cur && (cur + " " + w).length > maxChars) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
    if (cur) lines.push(cur);
    body += text(pad, y, k, 10, INK2); lines.forEach((line, i) => { body += text(pad + 90, y + i * 13, line, 10, INK); }); y += lines.length * 13 + 5;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="score of a conversation, ${trace.length} ticks">
<rect width="${W}" height="${H}" fill="${PAPER}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${RULE}"/>
${body}
</svg>
`;
}
