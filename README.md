# A Colloquy of Signals

An *aesthetically potent environment*, after Gordon Pask. A small society of signalling agents with inner drives: they answer one another's signals, reach a brief satisfaction, and tire of anything repeated — so a viewer who wants to stay in the conversation has to keep varying what they say.

**[▶ Live piece](https://benmicallef.github.io/colloquy/)** — tap a colour to say something; repeat yourself and watch them stop listening.

## What this is, and what it is not

This is an original software homage to two of Pask's machines. It reproduces their *ideas* and is explicit that the mechanics are mine.

**Musicolour** (c. 1953, built with Robin McKinnon-Wood at System Research Ltd) was a light show driven by a live performer. Its response thresholds rose whenever a musical figure repeated, so the machine "got bored" and went dark until the player tried something new. The novelty criterion is the whole invention: a machine that rewards variation.

**The Colloquy of Mobiles** (1968) hung in *Cybernetic Serendipity* at the ICA in London (2 August – 20 October 1968): five computer-controlled mobiles, which Pask labelled "male" and "female", carrying internal drives that sought a transient "satisfaction". The males projected light; the females answered with sound and reflection; an exchange relieved both. Visitors joined in with mirrors and torches, and became part of the loop.

What this repo does **not** do: it does not recreate either machine. A full-scale physical replica of the Colloquy already exists (Paul Pangaro and TJ McLeish, 2018; now in the ZKM collection). Pask's circuits were analog and relay-driven and their internal specifics are largely undocumented; the update rules here are my own design, built to carry his two mechanisms — drives seeking satisfaction, and habituation to repetition. It does not implement Pask's Conversation Theory (entailment meshes, CASTE, THOUGHTSTICKER); it gestures at his distinction between a conversation and a stimulus–response, which is the distinction the viewer feels when the agents tire of them.

## The model

Two projectors and three responders sit in a ring ([`docs/colloquy.js`](docs/colloquy.js)). Each agent has a **drive** that rises every tick, a **hue**, and a per-hue **habituation**.

- A projector whose drive reaches a threshold **emits** a signal carrying its hue. Emitting relieves a little pressure.
- A responder whose hue matches (within a tolerance, around a colour wheel) and who is not yet bored of that hue **answers**. The exchange drops both parties' drives — a transient satisfaction — and raises both parties' habituation to that hue. If a drive falls low enough the agent flares a satisfaction beam.
- Habituation is slowly forgotten, so a worn-out signal regains its power with time; a *different* hue works at once.
- The **viewer** injects signals through the same channel as a projector. Repeat one and the responders stop answering it; vary it and they re-engage.
- **Sound**, off by default, is a render-only layer on the live page: each exchange is a short tone whose pitch is its signal class, a satisfaction beam an octave above it. The deterministic core stays silent, so the tests are unaffected.

Every random choice routes through a seeded PRNG, so a run is a pure function of its seed and parameters.

## Tests

```bash
npm test   # node --test, zero dependencies
```

[`test/colloquy.test.js`](test/colloquy.test.js) pins properties of the code — never claims about Pask's hardware: determinism (same seed, same trace; different seeds diverge); boundedness (drives and habituation stay in 0–1 under random input); satisfaction reachability (the agents do answer one another, and someone is satisfied); **habituation** (a signal repeated every tick lands at first and then its effectiveness collapses — Pask's boredom); **novelty revival** (a fresh hue is answered again after the old one has worn out); and **signal-token conservation** (every signal emitted is exactly one of answered, expired, or still in flight, at every tick).

## Why Pask

Pask wrote "The Architectural Relevance of Cybernetics" for *Architectural Design* in September 1969, arguing that a building could be a system in conversation with its occupants, in place of a fixed container. He had spent the earlier 1960s as cybernetician to Cedric Price and Joan Littlewood's unbuilt Fun Palace, chairing its Cybernetics Committee. Those arguments are why this piece sits beside a stigmergic construction sim and a reflex tortoise in the same set of projects: all three are small machines whose behaviour comes from the loop, not from a plan.

## Precedents, kept to what is verified

*Une architecture des humeurs* (R&Sie(n), Le Laboratoire, Paris, 2010) read visitors' body chemistry as moods and let those readings set a construction protocol. It is cited here as a case of physiology treated as the input side of a design loop; colloquy's loop is Pask's conversation, and it reads and models no physiology. Roche's position that communication needs misunderstanding (the 2009 *Speeches from LA* interview; *Stuttering Fall*, with Natanel Elfassy, *Log* 19, 2010) is the one point of contact with the way this piece handles a signal that lands on tired ears.

## Sources

- Gordon Pask, "A comment, a case history and a plan", in Jasia Reichardt (ed.), *Cybernetics, Art and Ideas* (Studio Vista, 1971) — the source of the phrase "aesthetically potent environment".
- Gordon Pask, "The Architectural Relevance of Cybernetics", *Architectural Design*, September 1969, pp. 494–496.
- Jasia Reichardt (ed.), *Cybernetic Serendipity: The Computer and the Arts* (Studio International, 1968).
- Paul Pangaro and TJ McLeish, "Remaking Pask's Colloquy of Mobiles", AISB 2018; replica now at ZKM, Karlsruhe.
- Usman Haque, "The Architectural Relevance of Gordon Pask", *Architectural Design*, 2007 — on Musicolour's boredom criterion.
- Paul Pangaro's Pask archive, [pangaro.com/pask](https://www.pangaro.com/pask/).

## License

MIT — see [`LICENSE`](LICENSE).
