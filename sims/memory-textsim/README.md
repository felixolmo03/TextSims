# Memory Project — Text Simulation

A web-based text simulation of the Memory Project narrative game, used for two purposes:

1. **Human playtest**: play through scenes as they are written, feel pacing, catch broken paths, generate baseline traces.
2. **LLM validation**: run LLM personas through the same scenes at scale to validate the clustering model can recover archetypes from behavior traces.

Both surfaces produce identical schema-compliant `PlayerProfile` JSON output.

## Structure

```
memory-textsim/
├── src/                          Svelte browser app
│   ├── App.svelte                Root component
│   ├── main.js                   Entry point
│   ├── components/
│   │   ├── SceneView.svelte      Renders scene + choices
│   │   └── TraceDownload.svelte  End-of-playthrough export
│   └── engine/
│       ├── game.js               Framework-agnostic game logic
│       ├── tracer.js             Schema-compliant trace recorder
│       └── scenes/
│           └── memory_1.json     Memory 1 scene data
├── llm_client/                   Python + Node bridge for LLM runs
│   ├── engine_bridge.js          HTTP wrapper around game.js
│   ├── run_persona.py            LLM playthrough driver
│   ├── personas.json             The 5 archetype prompts
│   └── package.json              Node deps for the bridge
├── docs/                         Architecture notes
├── index.html                    Browser entry
├── package.json                  Svelte + Vite
├── vite.config.js
└── README.md
```

## Human playtest (browser)

```bash
npm install
npm run dev
```

Opens on http://localhost:5173. Play through Memory 1, download the trace JSON at the end.

## LLM validation (headless)

Requires the shared engine to be exposed over HTTP so Python can drive it.

Terminal 1 — start the engine bridge:

```bash
cd llm_client
npm install
node engine_bridge.js
```

Terminal 2 — run a persona:

```bash
cd llm_client
pip install openai
export MICRODC_API_KEY=your_key_here
export MICRODC_API_BASE=https://api.microdc.ai/v1
python run_persona.py --persona withdrawer --model qwen3:32b --count 10 --output-dir traces/
```

Available personas: `withdrawer`, `mask`, `reacher`, `observer`, `recoverer`.

## Schema

All output conforms to Behavior Trace Schema v1.1 (see the design docs). The tracer produces PlayerProfile objects with metadata, per-memory event traces, and a placeholder for the final clustering result. Feature vectors and cluster assignments are computed downstream by a separate Python pipeline.

## What's in this build

- Full Memory 1 playable (12 scenes, all branches lead to valid endings)
- Human-mode browser UI
- LLM-mode Python + Node bridge
- The 5 archetype personas
- Trace export in schema v1.1 format

## What's next

- Memory 2 scenes
- Memory 3 scenes
- Memory 4 scenes (design pending)
- Memory 5 scenes (design pending)
- Feature extraction pipeline (Python)
- Clustering + evaluation pipeline (Python)
